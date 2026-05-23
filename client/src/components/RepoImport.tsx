import { useState } from 'react'
import { GitBranch, FolderOpen, Github, Loader2, AlertCircle } from 'lucide-react'
import { useRepoStore } from '@/store/repoStore'
import {
  fetchSummary,
  fetchCommits,
  fetchGitHubSummary,
  fetchGitHubCommits,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import type { RepoSource } from '@/store/repoStore'

type Tab = RepoSource

export function RepoImport() {
  const [tab, setTab] = useState<Tab>('local')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { setRepo, setSummary, setCommits } = useRepoStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = inputValue.trim()
    if (!value) return

    setIsLoading(true)
    setError(null)

    try {
      if (tab === 'local') {
        const [summary, commits] = await Promise.all([
          fetchSummary(value),
          fetchCommits(value),
        ])
        setSummary(summary)
        setCommits(commits)
        setRepo(value, 'local')
      } else {
        const [summary, commits] = await Promise.all([
          fetchGitHubSummary(value),
          fetchGitHubCommits(value),
        ])
        setSummary(summary)
        setCommits(commits)
        setRepo(value, 'github')
      }
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load repository')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <GitBranch className="w-10 h-10 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Git History Visualizer
          </h1>
          <p className="text-gray-400 text-sm">
            Explore any repository's commit history as an interactive graph.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-gray-900 border border-gray-800 p-1 gap-1">
          <TabBtn active={tab === 'local'} onClick={() => { setTab('local'); setError(null) }}>
            <FolderOpen className="w-3.5 h-3.5" />
            Local path
          </TabBtn>
          <TabBtn active={tab === 'github'} onClick={() => { setTab('github'); setError(null) }}>
            <Github className="w-3.5 h-3.5" />
            GitHub URL
          </TabBtn>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              {tab === 'local' ? 'Repository path' : 'GitHub repository'}
            </label>
            <div className="relative">
              {tab === 'local' ? (
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              ) : (
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              )}
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={
                  tab === 'local'
                    ? 'C:\\Users\\you\\projects\\my-app'
                    : 'https://github.com/owner/repo'
                }
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-lg text-sm',
                  'bg-gray-900 border border-gray-700 text-gray-100',
                  'placeholder:text-gray-600',
                  'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                  'transition-colors'
                )}
              />
            </div>

            {tab === 'github' && (
              <p className="text-xs text-gray-600 flex items-start gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                Unauthenticated requests are limited to 60/hr.
                Add <code className="text-amber-500/80">GITHUB_TOKEN</code> to{' '}
                <code className="text-amber-500/80">server/.env</code> for 5,000/hr.
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={cn(
              'w-full py-3 rounded-lg font-medium text-sm',
              'bg-indigo-600 hover:bg-indigo-500 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors flex items-center justify-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading repository…
              </>
            ) : (
              'Visualize History'
            )}
          </button>
        </form>

        {/* Example hints */}
        <div className="text-center text-xs text-gray-600 space-y-1">
          {tab === 'local' ? (
            <p>Example: <span className="text-gray-500">C:\Users\you\projects\my-app</span></p>
          ) : (
            <div className="space-y-0.5">
              <p>Examples:</p>
              <p className="text-gray-500">facebook/react &nbsp;·&nbsp; github.com/torvalds/linux</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-gray-800 text-white'
          : 'text-gray-500 hover:text-gray-300'
      )}
    >
      {children}
    </button>
  )
}
