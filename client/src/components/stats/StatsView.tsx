import { useState, useMemo } from 'react'
import { Users } from 'lucide-react'
import { useRepoStore } from '@/store/repoStore'
import { ContributorHeatmap } from './ContributorHeatmap'
import { cn } from '@/lib/utils'

export function StatsView() {
  const { commits, summary } = useRepoStore()
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)

  const contributors = useMemo(() => {
    if (summary) return summary.contributors
    // Fall back to deriving from commits if summary is missing
    const map = new Map<string, { name: string; email: string; count: number }>()
    for (const c of commits) {
      const key = c.author.email
      const entry = map.get(key)
      if (entry) {
        entry.count++
      } else {
        map.set(key, { name: c.author.name, email: c.author.email, count: 1 })
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map(c => ({
        author: { name: c.name, email: c.email },
        commits: c.count,
        additions: 0,
        deletions: 0,
        firstCommit: 0,
        lastCommit: 0,
      }))
  }, [commits, summary])

  const maxCommits = useMemo(
    () => Math.max(1, ...contributors.map(c => c.commits)),
    [contributors]
  )

  const selectedContributor = contributors.find(c => c.author.email === selectedEmail)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Contribution Activity</h2>
        <p className="text-sm text-gray-500">
          {selectedContributor
            ? `Showing activity for ${selectedContributor.author.name}`
            : `All contributors · last 12 months`}
        </p>
      </div>

      {/* Contributor filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedEmail(null)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            selectedEmail === null
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
          )}
        >
          <Users className="w-3 h-3" />
          All contributors
        </button>
        {contributors.slice(0, 8).map(c => (
          <button
            key={c.author.email}
            onClick={() => setSelectedEmail(c.author.email)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              selectedEmail === c.author.email
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold shrink-0"
              style={{ fontSize: 8 }}>
              {c.author.name[0]?.toUpperCase()}
            </span>
            {c.author.name}
          </button>
        ))}
      </div>

      {/* Heatmap */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <ContributorHeatmap commits={commits} authorEmail={selectedEmail} />
      </div>

      {/* Contributor leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          Contributors
        </h3>
        <ul className="space-y-3">
          {contributors.map((c, i) => (
            <li key={c.author.email}>
              <button
                onClick={() =>
                  setSelectedEmail(prev =>
                    prev === c.author.email ? null : c.author.email
                  )
                }
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  selectedEmail === c.author.email
                    ? 'bg-indigo-600/15 border border-indigo-500/30'
                    : 'hover:bg-gray-800 border border-transparent'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-gray-600 w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {c.author.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-200 truncate">{c.author.name}</p>
                    <p className="text-xs text-gray-600 truncate">{c.author.email}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-300 shrink-0">
                    {c.commits.toLocaleString()}
                  </span>
                </div>
                {/* Bar */}
                <div className="ml-8 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${(c.commits / maxCommits) * 100}%` }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
