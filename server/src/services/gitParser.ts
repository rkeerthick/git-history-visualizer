import simpleGit from 'simple-git'
import type { CommitNode, CommitDetail, RepoSummary, BranchInfo, FileDiff, ContributorStat } from '@git-viz/shared'

interface GetCommitsOptions {
  branch: string
  limit: number
  offset: number
}

async function hasCommits(repoPath: string): Promise<boolean> {
  try {
    await simpleGit(repoPath).raw(['rev-parse', 'HEAD'])
    return true
  } catch {
    return false
  }
}

function parseRefs(refs: string): { branches: string[]; tags: string[] } {
  const branches: string[] = []
  const tags: string[] = []
  if (!refs?.trim()) return { branches, tags }
  for (const part of refs.split(',').map(s => s.trim()).filter(Boolean)) {
    if (part.startsWith('tag: ')) {
      tags.push(part.slice(5))
    } else if (part.startsWith('HEAD -> ')) {
      branches.push(part.slice(8))
    } else if (part !== 'HEAD') {
      branches.push(part)
    }
  }
  return { branches, tags }
}

function parseDiffToFiles(diffOutput: string): FileDiff[] {
  if (!diffOutput.trim()) return []

  const files: FileDiff[] = []
  const chunks = diffOutput.split(/^diff --git /m).filter(Boolean)

  for (const chunk of chunks) {
    const firstLine = chunk.split('\n')[0]
    const pathMatch = firstLine.match(/^a\/(.+?) b\/(.+)$/)
    if (!pathMatch) continue

    const oldFilePath = pathMatch[1]
    const newFilePath = pathMatch[2]

    let status: FileDiff['status'] = 'modified'
    if (/\nnew file mode/.test(chunk)) status = 'added'
    else if (/\ndeleted file mode/.test(chunk)) status = 'deleted'
    else if (oldFilePath !== newFilePath) status = 'renamed'

    const patchStart = chunk.indexOf('\n@@')
    const patch = patchStart !== -1 ? chunk.slice(patchStart + 1) : undefined

    let additions = 0
    let deletions = 0
    if (patch) {
      for (const line of patch.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++
        else if (line.startsWith('-') && !line.startsWith('---')) deletions++
      }
    }

    files.push({
      path: newFilePath,
      additions,
      deletions,
      status,
      oldPath: oldFilePath !== newFilePath ? oldFilePath : undefined,
      patch,
    })
  }

  return files
}

export async function getRepoSummary(repoPath: string): Promise<RepoSummary> {
  const git = simpleGit(repoPath)
  const branchData = await git.branch(['-a'])

  const branches: BranchInfo[] = Object.entries(branchData.branches).map(([name, b]) => ({
    name,
    headHash: b.commit,
    isRemote: name.startsWith('remotes/'),
    isCurrent: b.current,
  }))

  if (!(await hasCommits(repoPath))) {
    return {
      name: repoPath.split(/[\\/]/).pop() ?? repoPath,
      defaultBranch: branchData.current,
      totalCommits: 0,
      branches,
      contributors: [],
      firstCommitAt: 0,
      lastCommitAt: 0,
    }
  }

  const logData = await git.log(['--all'])
  const commits = logData.all
  const contributorMap = new Map<string, ContributorStat>()

  for (const c of commits) {
    const key = c.author_email
    const existing = contributorMap.get(key)
    const ts = new Date(c.date).getTime()
    if (existing) {
      existing.commits++
      if (ts < existing.firstCommit) existing.firstCommit = ts
      if (ts > existing.lastCommit) existing.lastCommit = ts
    } else {
      contributorMap.set(key, {
        author: { name: c.author_name, email: c.author_email },
        commits: 1,
        additions: 0,
        deletions: 0,
        firstCommit: ts,
        lastCommit: ts,
      })
    }
  }

  const timestamps = commits.map(c => new Date(c.date).getTime())
  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits)

  return {
    name: repoPath.split(/[\\/]/).pop() ?? repoPath,
    defaultBranch: branchData.current,
    totalCommits: commits.length,
    branches,
    contributors,
    firstCommitAt: timestamps.length ? Math.min(...timestamps) : 0,
    lastCommitAt: timestamps.length ? Math.max(...timestamps) : 0,
  }
}

export async function getCommits(
  repoPath: string,
  { branch, limit, offset }: GetCommitsOptions
): Promise<CommitNode[]> {
  if (!(await hasCommits(repoPath))) return []

  const git = simpleGit(repoPath)
  const ref = branch === 'HEAD' ? 'HEAD' : branch

  const [logResult, rawParents] = await Promise.all([
    git.log([ref, `--max-count=${limit + offset}`]),
    git.raw(['log', ref, `--max-count=${limit + offset}`, '--format=%H %P']),
  ])

  const parentMap = new Map<string, string[]>()
  for (const line of rawParents.trim().split('\n')) {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 0) {
      const [hash, ...parents] = parts
      parentMap.set(hash, parents)
    }
  }

  const sliced = logResult.all.slice(offset, offset + limit)

  return sliced.map(c => {
    const { branches, tags } = parseRefs(c.refs)
    return {
      hash: c.hash,
      shortHash: c.hash.slice(0, 7),
      message: c.message,
      author: { name: c.author_name, email: c.author_email },
      timestamp: new Date(c.date).getTime(),
      parents: parentMap.get(c.hash) ?? [],
      branches,
      tags,
    }
  })
}

export async function getCommitDetail(repoPath: string, hash: string): Promise<CommitDetail> {
  const git = simpleGit(repoPath)

  const showResult = await git.show(['--format=%H|%h|%s|%b|%an|%ae|%at|%P', '--no-patch', hash])
  const header = showResult.trim().split('|')

  let patchOutput = ''
  try {
    patchOutput = await git.diff([`${hash}^`, hash, '--patch', '--unified=3'])
  } catch {
    patchOutput = await git.diff([
      '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
      hash,
      '--patch',
      '--unified=3',
    ])
  }

  const files = parseDiffToFiles(patchOutput)

  return {
    hash: header[0] ?? hash,
    shortHash: header[1] ?? hash.slice(0, 7),
    message: header[2] ?? '',
    body: header[3] ?? '',
    author: { name: header[4] ?? '', email: header[5] ?? '' },
    timestamp: parseInt(header[6] ?? '0', 10) * 1000,
    parents: (header[7] ?? '').split(' ').filter(Boolean),
    branches: [],
    tags: [],
    files,
    stats: {
      additions: files.reduce((s, f) => s + f.additions, 0),
      deletions: files.reduce((s, f) => s + f.deletions, 0),
      filesChanged: files.length,
    },
  }
}
