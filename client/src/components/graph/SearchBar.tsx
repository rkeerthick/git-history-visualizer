import { useRef, useEffect, useMemo } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { useRepoStore, isFilterActive } from '@/store/repoStore'
import { filterCommits } from '@/lib/filterUtils'
import { cn } from '@/lib/utils'

export function SearchBar() {
  const { commits, filter, setFilter, clearFilter } = useRepoStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const authors = useMemo(() => {
    const seen = new Map<string, string>()
    for (const c of commits) {
      if (c.author?.email) seen.set(c.author.email, c.author.name || c.author.email)
    }
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name }))
  }, [commits])

  const matchCount = useMemo(
    () => (isFilterActive(filter) ? filterCommits(commits, filter).length : commits.length),
    [commits, filter]
  )

  // Ctrl+K / Cmd+K focuses the search input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = isFilterActive(filter)

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-950">

      {/* Text search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={filter.query}
          onChange={e => setFilter({ query: e.target.value })}
          placeholder="Search commits… (⌘K)"
          className={cn(
            'w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-gray-900 border text-gray-200',
            'placeholder:text-gray-600 focus:outline-none transition-colors',
            filter.query
              ? 'border-indigo-500/60 ring-1 ring-indigo-500/30'
              : 'border-gray-700 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30'
          )}
        />
      </div>

      {/* Author filter */}
      <div className="relative shrink-0">
        <select
          value={filter.authorEmail}
          onChange={e => setFilter({ authorEmail: e.target.value })}
          className={cn(
            'appearance-none pl-2.5 pr-6 py-1.5 rounded-md text-xs bg-gray-900 border text-gray-200',
            'focus:outline-none transition-colors cursor-pointer',
            filter.authorEmail
              ? 'border-indigo-500/60 ring-1 ring-indigo-500/30 text-indigo-300'
              : 'border-gray-700 focus:border-indigo-500/60'
          )}
        >
          <option value="">All authors</option>
          {authors.map(a => (
            <option key={a.email} value={a.email}>{a.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
      </div>

      {/* Date from */}
      <input
        type="date"
        value={filter.dateFrom}
        onChange={e => setFilter({ dateFrom: e.target.value })}
        title="From date"
        className={cn(
          'px-2 py-1.5 rounded-md text-xs bg-gray-900 border text-gray-300',
          'focus:outline-none transition-colors cursor-pointer',
          '[color-scheme:dark]',
          filter.dateFrom
            ? 'border-indigo-500/60 ring-1 ring-indigo-500/30'
            : 'border-gray-700 focus:border-indigo-500/60'
        )}
      />

      {/* Date to */}
      <input
        type="date"
        value={filter.dateTo}
        onChange={e => setFilter({ dateTo: e.target.value })}
        title="To date"
        className={cn(
          'px-2 py-1.5 rounded-md text-xs bg-gray-900 border text-gray-300',
          'focus:outline-none transition-colors cursor-pointer',
          '[color-scheme:dark]',
          filter.dateTo
            ? 'border-indigo-500/60 ring-1 ring-indigo-500/30'
            : 'border-gray-700 focus:border-indigo-500/60'
        )}
      />

      {/* Match count + clear */}
      <div className="shrink-0 flex items-center gap-2">
        <span className={cn(
          'text-xs tabular-nums whitespace-nowrap',
          active ? 'text-indigo-400' : 'text-gray-600'
        )}>
          {matchCount.toLocaleString()} / {commits.length.toLocaleString()}
        </span>

        {active && (
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Clear all filters"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
