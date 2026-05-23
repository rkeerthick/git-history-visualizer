import { useMemo } from 'react'
import { parsePatch } from '@/lib/diffUtils'
import { cn } from '@/lib/utils'

interface Props {
  patch: string
  maxLines?: number
}

export function DiffViewer({ patch, maxLines = 300 }: Props) {
  const lines = useMemo(() => parsePatch(patch), [patch])
  const visible = lines.slice(0, maxLines)
  const truncated = lines.length > maxLines

  if (lines.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-gray-600 italic">
        No diff available (binary file or patch too large)
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <tbody>
          {visible.map((line, i) => {
            if (line.type === 'hunk') {
              return (
                <tr key={i} className="bg-indigo-950/40">
                  <td className="w-10 select-none px-2 py-0.5 text-right text-indigo-400/60 border-r border-gray-800" />
                  <td className="w-10 select-none px-2 py-0.5 text-right text-indigo-400/60 border-r border-gray-800" />
                  <td className="px-3 py-0.5 text-indigo-400/80">{line.content}</td>
                </tr>
              )
            }

            if (line.type === 'noNewline') {
              return (
                <tr key={i}>
                  <td colSpan={3} className="px-3 py-0.5 text-gray-600 italic">
                    {line.content}
                  </td>
                </tr>
              )
            }

            const isAdded = line.type === 'added'
            const isRemoved = line.type === 'removed'

            return (
              <tr
                key={i}
                className={cn(
                  'group',
                  isAdded && 'bg-green-950/50 hover:bg-green-950/80',
                  isRemoved && 'bg-red-950/50 hover:bg-red-950/80',
                  !isAdded && !isRemoved && 'hover:bg-gray-900/50'
                )}
              >
                {/* Old line number */}
                <td
                  className={cn(
                    'w-10 select-none px-2 py-0.5 text-right border-r border-gray-800/60',
                    isRemoved ? 'text-red-500/70' : 'text-gray-600'
                  )}
                >
                  {line.oldNo ?? ''}
                </td>
                {/* New line number */}
                <td
                  className={cn(
                    'w-10 select-none px-2 py-0.5 text-right border-r border-gray-800/60',
                    isAdded ? 'text-green-500/70' : 'text-gray-600'
                  )}
                >
                  {line.newNo ?? ''}
                </td>
                {/* Content */}
                <td className="px-3 py-0.5 whitespace-pre">
                  <span
                    className={cn(
                      isAdded && 'text-green-300',
                      isRemoved && 'text-red-300',
                      !isAdded && !isRemoved && 'text-gray-300'
                    )}
                  >
                    {isAdded ? '+' : isRemoved ? '-' : ' '}
                    {line.content}
                  </span>
                </td>
              </tr>
            )
          })}

          {truncated && (
            <tr>
              <td colSpan={3} className="px-3 py-2 text-center text-xs text-gray-600 italic">
                Diff truncated — {lines.length - maxLines} more lines not shown
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
