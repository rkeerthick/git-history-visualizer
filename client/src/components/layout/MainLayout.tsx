import { useState, useRef, useCallback } from 'react'
import { GitBranch, BarChart2 } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { CommitGraph } from '@/components/graph/CommitGraph'
import { CommitDetail } from '@/components/panels/CommitDetail'
import { StatsView } from '@/components/stats/StatsView'
import { SearchBar } from '@/components/graph/SearchBar'
import { useRepoStore } from '@/store/repoStore'
import { cn } from '@/lib/utils'

type Tab = 'graph' | 'stats'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'graph', label: 'Graph', icon: <GitBranch className="w-3.5 h-3.5" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart2 className="w-3.5 h-3.5" /> },
]

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 900
const DEFAULT_PANEL_WIDTH = 384

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('graph')
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isDragging, setIsDragging] = useState(false)
  const selectedCommit = useRepoStore(s => s.selectedCommit)

  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const onMouseMove = useCallback((e: MouseEvent) => {
    // Panel is on the right — dragging the left handle leftward widens it
    const delta = dragStartX.current - e.clientX
    const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, dragStartWidth.current + delta))
    setPanelWidth(next)
  }, [])

  const onMouseUp = useCallback(() => {
    setIsDragging(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  function handleDragStart(e: React.MouseEvent) {
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="shrink-0 flex items-center gap-1 px-4 h-11 border-b border-gray-800 bg-gray-950">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'graph' ? (
            <>
              <SearchBar />

              <div className="flex-1 flex overflow-hidden">
              <CommitGraph />

              {selectedCommit && (
                <aside
                  className="relative flex shrink-0 border-l border-gray-800 overflow-hidden"
                  style={{ width: panelWidth }}
                >
                  {/* Drag handle */}
                  <div
                    onMouseDown={handleDragStart}
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-1 z-10 cursor-col-resize group',
                      'transition-colors hover:bg-indigo-500/60',
                      isDragging && 'bg-indigo-500/60'
                    )}
                  >
                    {/* Visual grip dots */}
                    <div className={cn(
                      'absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2',
                      'flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                      isDragging && 'opacity-100'
                    )}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="w-1 h-1 rounded-full bg-indigo-400" />
                      ))}
                    </div>
                  </div>

                  {/* Panel content — offset by handle width */}
                  <div className="flex-1 overflow-y-auto pl-1">
                    <CommitDetail commit={selectedCommit} />
                  </div>
                </aside>
              )}
              </div>
            </>
          ) : (
            <StatsView />
          )}
        </main>
      </div>
    </div>
  )
}
