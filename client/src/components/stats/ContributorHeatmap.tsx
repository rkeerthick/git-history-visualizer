import { useMemo, useState, useRef } from 'react'
import * as d3 from 'd3'
import type { CommitNode } from '@git-viz/shared'
import {
  buildDayMap,
  buildWeekGrid,
  computeStreak,
  mostActiveDayOfWeek,
  MONTH_LABELS,
} from '@/lib/heatmapUtils'

const CELL = 13
const GAP = 3
const STRIDE = CELL + GAP
const MONTH_H = 22
const DAY_LABEL_W = 32
const WEEKS = 53
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

const EMPTY_COLOR = '#1f2937'

interface Tooltip {
  x: number
  y: number
  date: string
  count: number
}

interface Props {
  commits: CommitNode[]
  authorEmail?: string | null
}

export function ContributorHeatmap({ commits, authorEmail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const filtered = useMemo(
    () => (authorEmail ? commits.filter(c => c.author.email === authorEmail) : commits),
    [commits, authorEmail]
  )

  const { dayMap, maxCount, startDate, totalActiveDays } = useMemo(
    () => buildDayMap(filtered),
    [filtered]
  )

  const grid = useMemo(() => buildWeekGrid(startDate, dayMap), [startDate, dayMap])

  const colorScale = useMemo(
    () => d3.scaleSequential(d3.interpolateGreens).domain([0, Math.max(maxCount, 1)]),
    [maxCount]
  )

  const { current: currentStreak, longest: longestStreak } = useMemo(
    () => computeStreak(dayMap),
    [dayMap]
  )

  const bestDay = useMemo(() => mostActiveDayOfWeek(filtered), [filtered])

  const monthLabels = useMemo(() => {
    const seen = new Set<number>()
    return grid
      .map((week, wi) => {
        const d = new Date(week[0].date + 'T00:00:00')
        const m = d.getMonth()
        if (seen.has(m)) return null
        seen.add(m)
        return { label: MONTH_LABELS[m], x: DAY_LABEL_W + wi * STRIDE }
      })
      .filter(Boolean) as { label: string; x: number }[]
  }, [grid])

  const svgW = DAY_LABEL_W + WEEKS * STRIDE
  const svgH = MONTH_H + 7 * STRIDE + 4

  function handleMouseEnter(e: React.MouseEvent, date: string, count: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      date,
      count,
    })
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active days" value={totalActiveDays} />
        <StatCard label="Current streak" value={`${currentStreak}d`} />
        <StatCard label="Longest streak" value={`${longestStreak}d`} />
        <StatCard label="Most active" value={bestDay} />
      </div>

      {/* Heatmap */}
      <div ref={containerRef} className="relative overflow-x-auto">
        <svg
          width={svgW}
          height={svgH}
          className="overflow-visible select-none"
          style={{ minWidth: svgW }}
        >
          {/* Month labels */}
          {monthLabels.map(({ label, x }) => (
            <text
              key={`${label}-${x}`}
              x={x}
              y={13}
              style={{ fontSize: 10, fill: '#6b7280' }}
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={label}
                x={DAY_LABEL_W - 5}
                y={MONTH_H + i * STRIDE + CELL - 1}
                textAnchor="end"
                style={{ fontSize: 9, fill: '#6b7280' }}
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {grid.map((week, wi) =>
            week.map((cell, di) => {
              const x = DAY_LABEL_W + wi * STRIDE
              const y = MONTH_H + di * STRIDE
              const fill = cell.count === 0 ? EMPTY_COLOR : colorScale(cell.count)
              return (
                <rect
                  key={cell.date}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={fill}
                  className="cursor-pointer transition-opacity hover:opacity-75"
                  onMouseEnter={e => handleMouseEnter(e, cell.date, cell.count)}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })
          )}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-1.5 justify-end">
          <span className="text-xs text-gray-600">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <div
              key={t}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 2,
                background: t === 0 ? EMPTY_COLOR : colorScale(t * maxCount),
                flexShrink: 0,
              }}
            />
          ))}
          <span className="text-xs text-gray-600">More</span>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-50 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 pointer-events-none shadow-lg whitespace-nowrap"
            style={{ left: tooltip.x + 14, top: tooltip.y - 40 }}
          >
            <span className="font-semibold">{tooltip.count} commit{tooltip.count !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">
              {' on '}
              {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
