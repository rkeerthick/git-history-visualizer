import { useEffect, useRef, useMemo } from 'react'
import { useRepoStore } from '@/store/repoStore'
import { fetchCommitDetail, fetchGitHubCommitDetail } from '@/lib/api'
import { formatRelativeDate } from '@/lib/utils'
import { filterCommits } from '@/lib/filterUtils'
import type { CommitNode } from '@git-viz/shared'

const ROW_HEIGHT = 48
const LANE_WIDTH = 20
const DOT_RADIUS = 5
const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#a855f7', '#84cc16',
]

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baselineY: number,
  bgColor: string,
  textColor: string
): number {
  const label = text.length > 22 ? text.slice(0, 20) + '…' : text
  ctx.font = '500 9px "JetBrains Mono", monospace'
  const tw = ctx.measureText(label).width
  const pw = tw + 8
  const ph = 13
  const py = baselineY - 10
  const r = 3

  ctx.beginPath()
  ctx.moveTo(x + r, py)
  ctx.lineTo(x + pw - r, py)
  ctx.quadraticCurveTo(x + pw, py, x + pw, py + r)
  ctx.lineTo(x + pw, py + ph - r)
  ctx.quadraticCurveTo(x + pw, py + ph, x + pw - r, py + ph)
  ctx.lineTo(x + r, py + ph)
  ctx.quadraticCurveTo(x, py + ph, x, py + ph - r)
  ctx.lineTo(x, py + r)
  ctx.quadraticCurveTo(x, py, x + r, py)
  ctx.closePath()
  ctx.fillStyle = bgColor
  ctx.fill()

  ctx.fillStyle = textColor
  ctx.fillText(label, x + 4, baselineY)

  return pw + 4
}

function assignLanes(commits: CommitNode[]): Map<string, number> {
  const laneMap = new Map<string, number>()
  const activeLanes: (string | null)[] = []

  for (const commit of commits) {
    const existingLane = laneMap.get(commit.hash)
    let lane: number

    if (existingLane !== undefined) {
      lane = existingLane
    } else {
      lane = activeLanes.indexOf(null)
      if (lane === -1) lane = activeLanes.length
      activeLanes[lane] = commit.hash
    }

    laneMap.set(commit.hash, lane)

    activeLanes[lane] = null

    commit.parents.forEach((parentHash, i) => {
      if (!laneMap.has(parentHash)) {
        if (i === 0) {
          activeLanes[lane] = parentHash
          laneMap.set(parentHash, lane)
        } else {
          const newLane = activeLanes.indexOf(null)
          const assignedLane = newLane === -1 ? activeLanes.length : newLane
          activeLanes[assignedLane] = parentHash
          laneMap.set(parentHash, assignedLane)
        }
      }
    })
  }

  return laneMap
}

export function CommitGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { commits, filter, repoPath, repoSource, setSelectedCommit } = useRepoStore()

  const displayCommits = useMemo(() => filterCommits(commits, filter), [commits, filter])

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0
  }, [filter])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || displayCommits.length === 0) return

    const laneMap = assignLanes(displayCommits)
    const maxLane = Math.max(0, ...displayCommits.map(c => laneMap.get(c.hash) ?? 0))
    const graphWidth = (maxLane + 1) * LANE_WIDTH + 16

    canvas.width = container.clientWidth
    canvas.height = displayCommits.length * ROW_HEIGHT

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    displayCommits.forEach((commit, i) => {
      const lane = laneMap.get(commit.hash) ?? 0
      const cx = lane * LANE_WIDTH + 16
      const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2
      const color = COLORS[lane % COLORS.length]

      commit.parents.forEach(parentHash => {
        const parentIdx = displayCommits.findIndex(c => c.hash === parentHash)
        if (parentIdx === -1) return
        const parentLane = laneMap.get(parentHash) ?? 0
        const px = parentLane * LANE_WIDTH + 16
        const py = parentIdx * ROW_HEIGHT + ROW_HEIGHT / 2

        ctx.beginPath()
        ctx.strokeStyle = COLORS[parentLane % COLORS.length]
        ctx.lineWidth = 2
        if (lane === parentLane) {
          ctx.moveTo(cx, cy)
          ctx.lineTo(px, py)
        } else {
          ctx.moveTo(cx, cy)
          ctx.bezierCurveTo(cx, cy + ROW_HEIGHT * 0.5, px, py - ROW_HEIGHT * 0.5, px, py)
        }
        ctx.stroke()
      })

      ctx.beginPath()
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#030712'
      ctx.lineWidth = 2
      ctx.stroke()

      const textX = graphWidth + 8

      // Short hash
      ctx.fillStyle = '#f3f4f6'
      ctx.font = '500 12px "JetBrains Mono", monospace'
      ctx.fillText(commit.shortHash, textX, cy - 5)

      // Branch & tag pills immediately after the hash
      let refX = textX + ctx.measureText(commit.shortHash).width + 8
      for (const branch of commit.branches.slice(0, 3)) {
        refX += drawPill(ctx, branch, refX, cy - 5, 'rgba(99,102,241,0.25)', '#a5b4fc')
      }
      for (const tag of commit.tags.slice(0, 2)) {
        refX += drawPill(ctx, tag, refX, cy - 5, 'rgba(245,158,11,0.25)', '#fcd34d')
      }

      // Commit message (after pills)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '400 11px "JetBrains Mono", monospace'
      const maxMsgWidth = canvas.width - refX - 20
      if (maxMsgWidth > 40) {
        let msg = commit.message
        if (ctx.measureText(msg).width > maxMsgWidth) {
          while (ctx.measureText(msg + '…').width > maxMsgWidth && msg.length > 0) {
            msg = msg.slice(0, -1)
          }
          msg += '…'
        }
        ctx.fillText(msg, refX, cy - 5)
      }

      // Author & date on second line
      ctx.fillStyle = '#6b7280'
      ctx.font = '400 10px "JetBrains Mono", monospace'
      ctx.fillText(commit.author.name, textX, cy + 12)
      ctx.fillStyle = '#4b5563'
      ctx.fillText(formatRelativeDate(commit.timestamp), textX + 64, cy + 12)
    })
  }, [displayCommits])

  async function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!repoPath || displayCommits.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop ?? 0)
    const index = Math.floor(y / ROW_HEIGHT)
    const commit = displayCommits[index]
    if (!commit) return

    try {
      const detail =
        repoSource === 'github'
          ? await fetchGitHubCommitDetail(repoPath, commit.hash)
          : await fetchCommitDetail(repoPath, commit.hash)
      setSelectedCommit(detail)
    } catch {
      // ignore
    }
  }

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        No commits loaded
      </div>
    )
  }

  if (displayCommits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        No commits match the current filters
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-auto bg-gray-950">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ height: `${displayCommits.length * ROW_HEIGHT}px`, display: 'block' }}
      />
    </div>
  )
}
