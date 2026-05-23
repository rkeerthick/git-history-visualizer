import axios from 'axios'
import type { ApiResponse, RepoSummary, CommitNode, CommitDetail } from '@git-viz/shared'

const http = axios.create({ baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api' })

// ── Local git ────────────────────────────────────────────────────────────────

export async function fetchSummary(repoPath: string): Promise<RepoSummary> {
  const { data } = await http.get<ApiResponse<RepoSummary>>('/repo/summary', {
    params: { path: repoPath },
  })
  return data.data
}

export async function fetchCommits(
  repoPath: string,
  branch = 'HEAD',
  limit = 100,
  offset = 0
): Promise<CommitNode[]> {
  const { data } = await http.get<ApiResponse<CommitNode[]>>('/repo/commits', {
    params: { path: repoPath, branch, limit, offset },
  })
  return data.data
}

export async function fetchCommitDetail(
  repoPath: string,
  hash: string
): Promise<CommitDetail> {
  const { data } = await http.get<ApiResponse<CommitDetail>>(`/repo/commit/${hash}`, {
    params: { path: repoPath },
  })
  return data.data
}

// ── GitHub ───────────────────────────────────────────────────────────────────

export async function fetchGitHubSummary(url: string): Promise<RepoSummary> {
  const { data } = await http.get<ApiResponse<RepoSummary>>('/github/summary', {
    params: { url },
  })
  return data.data
}

export async function fetchGitHubCommits(
  url: string,
  branch = 'HEAD',
  page = 1,
  perPage = 100
): Promise<CommitNode[]> {
  const { data } = await http.get<ApiResponse<CommitNode[]>>('/github/commits', {
    params: { url, branch, page, perPage },
  })
  return data.data
}

export async function fetchGitHubCommitDetail(
  url: string,
  sha: string
): Promise<CommitDetail> {
  const { data } = await http.get<ApiResponse<CommitDetail>>(`/github/commit/${sha}`, {
    params: { url },
  })
  return data.data
}
