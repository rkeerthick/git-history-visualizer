export interface Author {
  name: string
  email: string
  avatarUrl?: string
}

export interface CommitNode {
  hash: string
  shortHash: string
  message: string
  author: Author
  timestamp: number
  parents: string[]
  branches: string[]
  tags: string[]
}

export interface BranchInfo {
  name: string
  headHash: string
  isRemote: boolean
  isCurrent: boolean
}

export interface FileDiff {
  path: string
  additions: number
  deletions: number
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  oldPath?: string
  patch?: string
}

export interface CommitDetail extends CommitNode {
  body: string
  files: FileDiff[]
  stats: { additions: number; deletions: number; filesChanged: number }
}

export interface ContributorStat {
  author: Author
  commits: number
  additions: number
  deletions: number
  firstCommit: number
  lastCommit: number
}

export interface RepoSummary {
  name: string
  defaultBranch: string
  totalCommits: number
  branches: BranchInfo[]
  contributors: ContributorStat[]
  firstCommitAt: number
  lastCommitAt: number
}

export interface ApiResponse<T> {
  data: T
  error?: string
}
