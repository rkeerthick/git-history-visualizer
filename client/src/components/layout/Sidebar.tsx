import { GitBranch, Users, RotateCcw } from 'lucide-react'
import { useRepoStore } from '@/store/repoStore'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { summary, activeBranch, setActiveBranch, reset } = useRepoStore()

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white truncate">
              {summary?.name ?? 'Repository'}
            </span>
          </div>
          <button
            onClick={reset}
            className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            title="Open different repo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        {summary && (
          <p className="mt-1 text-xs text-gray-500">
            {summary.totalCommits.toLocaleString()} commits
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
            <GitBranch className="w-3 h-3" /> Branches
          </h3>
          <ul className="space-y-0.5">
            {summary?.branches
              .filter(b => !b.isRemote)
              .map(branch => (
                <li key={branch.name}>
                  <button
                    onClick={() => setActiveBranch(branch.name)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-xs truncate transition-colors',
                      activeBranch === branch.name
                        ? 'bg-indigo-600/20 text-indigo-300'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    )}
                  >
                    {branch.isCurrent && (
                      <span className="mr-1 text-green-400">*</span>
                    )}
                    {branch.name}
                  </button>
                </li>
              ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Contributors
          </h3>
          <ul className="space-y-1.5">
            {summary?.contributors.slice(0, 8).map(c => (
              <li key={c.author.email} className="flex items-center gap-2 px-2">
                <div className="w-5 h-5 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {c.author.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 truncate">{c.author.name}</p>
                  <p className="text-xs text-gray-600">{c.commits} commits</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
