import { Octokit } from '@octokit/rest'
import type { RestEndpointMethodTypes } from '@octokit/rest'
import type { RepoSummary, CommitNode, CommitDetail, BranchInfo, FileDiff } from '@git-viz/shared'

type Contributor = RestEndpointMethodTypes['repos']['listContributors']['response']['data'][number]

function octokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN || undefined })
}

export function parseGitHubUrl(raw: string): { owner: string; repo: string } {
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')

  const parts = cleaned.split('/').filter(Boolean)
  if (parts.length < 2) {
    throw new Error(
      'Invalid GitHub URL. Use: https://github.com/owner/repo  or  owner/repo'
    )
  }
  return { owner: parts[0], repo: parts[1] }
}

export async function getGitHubRepoSummary(owner: string, repo: string): Promise<RepoSummary> {
  const gh = octokit()

  const [repoRes, branchesRes, contributorsRes] = await Promise.all([
    gh.repos.get({ owner, repo }),
    gh.repos.listBranches({ owner, repo, per_page: 100 }),
    gh.repos.listContributors({ owner, repo, per_page: 100 }).catch(() => ({ data: [] as Contributor[] })),
  ])

  const branches: BranchInfo[] = branchesRes.data.map(b => ({
    name: b.name,
    headHash: b.commit.sha,
    isRemote: false,
    isCurrent: b.name === repoRes.data.default_branch,
  }))

  const contributors = contributorsRes.data.map(c => ({
    author: {
      name: c.login ?? 'Unknown',
      email: `${c.login ?? 'unknown'}@users.noreply.github.com`,
      avatarUrl: c.avatar_url ?? undefined,
    },
    commits: c.contributions ?? 0,
    additions: 0,
    deletions: 0,
    firstCommit: 0,
    lastCommit: 0,
  }))

  return {
    name: repoRes.data.name,
    defaultBranch: repoRes.data.default_branch,
    totalCommits: contributors.reduce((s, c) => s + c.commits, 0),
    branches,
    contributors,
    firstCommitAt: 0,
    lastCommitAt: repoRes.data.pushed_at
      ? new Date(repoRes.data.pushed_at).getTime()
      : 0,
  }
}

export async function getGitHubCommits(
  owner: string,
  repo: string,
  branch: string,
  perPage: number,
  page: number
): Promise<CommitNode[]> {
  const gh = octokit()

  const [commitsRes, branchesRes, tagsRes] = await Promise.all([
    gh.repos.listCommits({
      owner,
      repo,
      sha: branch === 'HEAD' ? undefined : branch,
      per_page: perPage,
      page,
    }),
    gh.repos.listBranches({ owner, repo, per_page: 100 }),
    gh.repos.listTags({ owner, repo, per_page: 100 }),
  ])

  const hashToBranches = new Map<string, string[]>()
  for (const b of branchesRes.data) {
    const list = hashToBranches.get(b.commit.sha) ?? []
    list.push(b.name)
    hashToBranches.set(b.commit.sha, list)
  }

  const hashToTags = new Map<string, string[]>()
  for (const t of tagsRes.data) {
    const list = hashToTags.get(t.commit.sha) ?? []
    list.push(t.name)
    hashToTags.set(t.commit.sha, list)
  }

  return commitsRes.data.map(c => ({
    hash: c.sha,
    shortHash: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: {
      name: c.commit.author?.name ?? c.author?.login ?? 'Unknown',
      email: c.commit.author?.email ?? '',
      avatarUrl: c.author?.avatar_url ?? undefined,
    },
    timestamp: c.commit.author?.date ? new Date(c.commit.author.date).getTime() : 0,
    parents: c.parents.map(p => p.sha),
    branches: hashToBranches.get(c.sha) ?? [],
    tags: hashToTags.get(c.sha) ?? [],
  }))
}

function mapStatus(s: string): FileDiff['status'] {
  if (s === 'added') return 'added'
  if (s === 'removed' || s === 'deleted') return 'deleted'
  if (s === 'renamed') return 'renamed'
  return 'modified'
}

export async function getGitHubCommitDetail(
  owner: string,
  repo: string,
  sha: string
): Promise<CommitDetail> {
  const gh = octokit()
  const { data: c } = await gh.repos.getCommit({ owner, repo, ref: sha })

  const files: FileDiff[] = (c.files ?? []).map(f => ({
    path: f.filename ?? '',
    additions: f.additions ?? 0,
    deletions: f.deletions ?? 0,
    status: mapStatus(f.status ?? 'modified'),
    oldPath: f.previous_filename,
    patch: f.patch,
  }))

  const msgLines = c.commit.message.split('\n')
  return {
    hash: c.sha,
    shortHash: c.sha.slice(0, 7),
    message: msgLines[0],
    body: msgLines.slice(2).join('\n'),
    author: {
      name: c.commit.author?.name ?? c.author?.login ?? 'Unknown',
      email: c.commit.author?.email ?? '',
      avatarUrl: c.author?.avatar_url ?? undefined,
    },
    timestamp: c.commit.author?.date ? new Date(c.commit.author.date).getTime() : 0,
    parents: c.parents.map(p => p.sha),
    branches: [],
    tags: [],
    files,
    stats: {
      additions: c.stats?.additions ?? 0,
      deletions: c.stats?.deletions ?? 0,
      filesChanged: files.length,
    },
  }
}
