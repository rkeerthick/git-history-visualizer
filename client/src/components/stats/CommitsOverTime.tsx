import { useMemo, useRef, useState, useEffect } from 'react'
import * as d3 from 'd3'
import type { CommitNode } from '@git-viz/shared'
import { binCommitsByPeriod, autoGranularity, type Granularity } from '@/lib/chartUtils'
import { cn } from '@/lib/utils'

const MARGIN = { top: 12, right: 16, bottom: 52, left: 40 }
const INNER_H = 180

interface Tooltip {
  svgX: number
  svgY: number
  label: string
  count: number
}

interface Props {
  commits: CommitNode[]
  authorEmail?: string | null
}

export function CommitsOverTime({ commits, authorEmail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const filtered = useMemo(
    () => (authorEmail ? commits.filter(c => c.author.email === authorEmail) : commits),
    [commits, authorEmail]
  )

  const defaultGranularity = useMemo(() => autoGranularity(filtered), [filtered])
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity)
  useEffect(() => { setGranularity(defaultGranularity) }, [defaultGranularity])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const bins = useMemo(
    () => binCommitsByPeriod(filtered, granularity),
    [filtered, granularity]
  )

  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const svgH = INNER_H + MARGIN.top + MARGIN.bottom

  const xScale = useMemo(
    () => d3.scaleBand<string>()
      .domain(bins.map(b => b.label))
      .range([0, innerW])
      .padding(bins.length > 60 ? 0.05 : 0.25),
    [bins, innerW]
  )

  const yScale = useMemo(() => {
    const max = Math.max(1, ...bins.map(b => b.count))
    return d3.scaleLinear().domain([0, max]).range([INNER_H, 0]).nice()
  }, [bins])

  const yTicks = yScale.ticks(4)
  const labelStep = Math.max(1, Math.ceil(bins.length / Math.floor(innerW / 56)))

  if (commits.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Commits over time</h3>
        <div className="flex gap-1">
          {(['week', 'month', 'quarter'] as Granularity[]).map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize',
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg width={width} height={svgH}>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* Gridlines + Y labels */}
            {yTicks.map(tick => (
              <g key={tick}>
                <line
                  x1={0} x2={innerW}
                  y1={yScale(tick)} y2={yScale(tick)}
                  stroke="#1f2937" strokeWidth={1}
                />
                <text
                  x={-8} y={yScale(tick)} dy="0.35em"
                  textAnchor="end"
                  style={{ fontSize: 10, fill: '#6b7280' }}
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
                </text>
              </g>
            ))}

            {/* Bars */}
            {bins.map(bin => {
              const barH = INNER_H - yScale(bin.count)
              const x = xScale(bin.label) ?? 0
              const bw = xScale.bandwidth()
              const isHovered = tooltip?.label === bin.label
              return (
                <rect
                  key={bin.label}
                  x={x}
                  y={yScale(bin.count)}
                  width={bw}
                  height={Math.max(0, barH)}
                  rx={bw > 4 ? 2 : 0}
                  fill={bin.count === 0 ? '#111827' : isHovered ? '#818cf8' : '#6366f1'}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setTooltip({
                      svgX: x + MARGIN.left + bw / 2,
                      svgY: yScale(bin.count) + MARGIN.top,
                      label: bin.label,
                      count: bin.count,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}

            {/* X axis labels */}
            {bins.map((bin, i) => {
              if (i % labelStep !== 0) return null
              const x = (xScale(bin.label) ?? 0) + xScale.bandwidth() / 2
              return (
                <text
                  key={bin.label}
                  x={x}
                  y={INNER_H + 14}
                  textAnchor="end"
                  transform={`rotate(-40,${x},${INNER_H + 14})`}
                  style={{ fontSize: 9, fill: '#6b7280' }}
                >
                  {bin.label}
                </text>
              )
            })}

            {/* Baseline */}
            <line
              x1={0} x2={innerW}
              y1={INNER_H} y2={INNER_H}
              stroke="#374151" strokeWidth={1}
            />
          </g>
        </svg>

        {tooltip && (
          <div
            className="absolute z-50 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 pointer-events-none shadow-lg whitespace-nowrap -translate-x-1/2"
            style={{ left: tooltip.svgX, top: tooltip.svgY - 40 }}
          >
            <span className="font-semibold text-indigo-300">{tooltip.count}</span>
            <span className="text-gray-400"> commit{tooltip.count !== 1 ? 's' : ''} · {tooltip.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
