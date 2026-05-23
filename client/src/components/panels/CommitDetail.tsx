import { useState } from 'react'
import { X, Plus, Minus, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import type { CommitDetail as CommitDetailType, FileDiff } from '@git-viz/shared'
import { useRepoStore } from '@/store/repoStore'
import { DiffViewer } from './DiffViewer'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  commit: CommitDetailType
}

export function CommitDetail({ commit }: Props) {
  const setSelectedCommit = useRepoStore(s => s.setSelectedCommit)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    () => new Set(commit.files.slice(0, 3).map(f => f.path))
  )

  function toggleFile(path: string) {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  function expandAll() {
    setExpandedFiles(new Set(commit.files.map(f => f.path)))
  }
  function collapseAll() {
    setExpandedFiles(new Set())
  }

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-800 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-white font-medium leading-snug">{commit.message}</h2>
          <button
            onClick={() => setSelectedCommit(null)}
            className="shrink-0 p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {commit.body && (
          <p className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap">{commit.body}</p>
        )}

        <div className="space-y-1 text-xs text-gray-400 bg-gray-900 rounded-lg p-3">
          <MetaRow label="Hash" value={commit.hash} mono />
          <MetaRow label="Author" value={`${commit.author.name} <${commit.author.email}>`} />
          <MetaRow label="Date" value={formatDate(commit.timestamp)} />
          {commit.parents.length > 0 && (
            <MetaRow label="Parents" value={commit.parents.map(p => p.slice(0, 7)).join(', ')} mono />
          )}
        </div>

        {/* Overall stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {commit.stats.filesChanged} file{commit.stats.filesChanged !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-green-400 flex items-center gap-0.5">
              <Plus className="w-3 h-3" />{commit.stats.additions}
            </span>
            <span className="text-red-400 flex items-center gap-0.5">
              <Minus className="w-3 h-3" />{commit.stats.deletions}
            </span>
          </span>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {/* Expand / collapse controls */}
        {commit.files.length > 1 && (
          <div className="flex gap-3 px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
            <button onClick={expandAll} className="hover:text-gray-300 transition-colors">
              Expand all
            </button>
            <button onClick={collapseAll} className="hover:text-gray-300 transition-colors">
              Collapse all
            </button>
          </div>
        )}

        {commit.files.map(file => (
          <FileSection
            key={file.path}
            file={file}
            isExpanded={expandedFiles.has(file.path)}
            onToggle={() => toggleFile(file.path)}
          />
        ))}
      </div>
    </div>
  )
}

function FileSection({
  file,
  isExpanded,
  onToggle,
}: {
  file: FileDiff
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusColor =
    file.status === 'added'
      ? 'text-green-400'
      : file.status === 'deleted'
      ? 'text-red-400'
      : file.status === 'renamed'
      ? 'text-amber-400'
      : 'text-gray-300'

  const statusBadge =
    file.status === 'added' ? 'A'
    : file.status === 'deleted' ? 'D'
    : file.status === 'renamed' ? 'R'
    : 'M'

  const badgeColor =
    file.status === 'added'
      ? 'bg-green-500/20 text-green-400'
      : file.status === 'deleted'
      ? 'bg-red-500/20 text-red-400'
      : file.status === 'renamed'
      ? 'bg-amber-500/20 text-amber-400'
      : 'bg-gray-700 text-gray-400'

  return (
    <div className="border-b border-gray-800/60 last:border-0">
      {/* File header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-900/50 transition-colors text-left group"
      >
        {isExpanded
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        }

        <span className={cn('text-xs font-bold px-1 rounded shrink-0', badgeColor)}>
          {statusBadge}
        </span>

        <span className={cn('text-xs truncate flex-1 min-w-0', statusColor)}>
          {file.status === 'renamed' && file.oldPath
            ? `${file.oldPath} → ${file.path}`
            : file.path}
        </span>

        <span className="shrink-0 flex items-center gap-2 text-xs ml-2">
          {file.additions > 0 && (
            <span className="text-green-500">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-500">-{file.deletions}</span>
          )}
        </span>
      </button>

      {/* Diff content */}
      {isExpanded && (
        <div className="border-t border-gray-800/60 bg-gray-950">
          {file.patch ? (
            <DiffViewer patch={file.patch} />
          ) : (
            <p className="px-4 py-3 text-xs text-gray-600 italic">
              {file.status === 'deleted'
                ? 'File deleted — no diff available'
                : 'Diff not available for this file'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-600 shrink-0 w-14">{label}</span>
      <span className={cn('text-gray-300 break-all', mono && 'text-xs')}>{value}</span>
    </div>
  )
}
