import { create } from 'zustand'
import type { RepoSummary, CommitNode, CommitDetail } from '@git-viz/shared'

export type RepoSource = 'local' | 'github'

export interface CommitFilter {
  query: string
  authorEmail: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTER: CommitFilter = {
  query: '',
  authorEmail: '',
  dateFrom: '',
  dateTo: '',
}

export function isFilterActive(f: CommitFilter) {
  return f.query !== '' || f.authorEmail !== '' || f.dateFrom !== '' || f.dateTo !== ''
}

interface RepoState {
  repoPath: string | null
  repoSource: RepoSource
  summary: RepoSummary | null
  commits: CommitNode[]
  filter: CommitFilter
  selectedCommit: CommitDetail | null
  activeBranch: string
  isLoading: boolean
  error: string | null

  setRepo: (path: string, source: RepoSource) => void
  setSummary: (summary: RepoSummary) => void
  setCommits: (commits: CommitNode[]) => void
  appendCommits: (commits: CommitNode[]) => void
  setFilter: (patch: Partial<CommitFilter>) => void
  clearFilter: () => void
  setSelectedCommit: (commit: CommitDetail | null) => void
  setActiveBranch: (branch: string) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useRepoStore = create<RepoState>(set => ({
  repoPath: null,
  repoSource: 'local',
  summary: null,
  commits: [],
  filter: EMPTY_FILTER,
  selectedCommit: null,
  activeBranch: 'HEAD',
  isLoading: false,
  error: null,

  setRepo: (path, source) => set({ repoPath: path, repoSource: source }),
  setSummary: summary => set({ summary }),
  setCommits: commits => set({ commits }),
  appendCommits: commits => set(s => ({ commits: [...s.commits, ...commits] })),
  setFilter: patch => set(s => ({ filter: { ...s.filter, ...patch } })),
  clearFilter: () => set({ filter: EMPTY_FILTER }),
  setSelectedCommit: commit => set({ selectedCommit: commit }),
  setActiveBranch: branch => set({ activeBranch: branch }),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),
  reset: () =>
    set({
      repoPath: null,
      repoSource: 'local',
      summary: null,
      commits: [],
      filter: EMPTY_FILTER,
      selectedCommit: null,
      activeBranch: 'HEAD',
      isLoading: false,
      error: null,
    }),
}))
