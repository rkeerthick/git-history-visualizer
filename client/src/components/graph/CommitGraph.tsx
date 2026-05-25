import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useRepoStore } from '@/store/repoStore'
import { fetchCommits, fetchCommitDetail, fetchGitHubCommits, fetchGitHubCommitDetail } from '@/lib/api'
import { formatRelativeDate } from '@/lib/utils'
import { filterCommits } from '@/lib/filterUtils'
import type { CommitNode } from '@git-viz/shared'

const PAGE_SIZE = 100

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
  const {
    commits, filter, repoPath, repoSource, activeBranch,
    setSelectedCommit, selectedCommit, appendCommits,
  } = useRepoStore()
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Infinite scroll state
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const displayCommits = useMemo(() => filterCommits(commits, filter), [commits, filter])

  // Reset focus and scroll when filter changes
  useEffect(() => {
    setFocusedIndex(-1)
    if (containerRef.current) containerRef.current.scrollTop = 0
  }, [filter])

  // Reset pagination when repo or branch changes
  useEffect(() => {
    hasMoreRef.current = true
    setHasMore(true)
    loadingRef.current = false
    setIsLoadingMore(false)
  }, [repoPath, activeBranch])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !repoPath) return
    loadingRef.current = true
    setIsLoadingMore(true)
    try {
      const next = repoSource === 'github'
        ? await fetchGitHubCommits(repoPath, activeBranch, Math.floor(commits.length / PAGE_SIZE) + 1, PAGE_SIZE)
        : await fetchCommits(repoPath, activeBranch, PAGE_SIZE, commits.length)
      if (next.length < PAGE_SIZE) {
        hasMoreRef.current = false
        setHasMore(false)
      }
      if (next.length > 0) appendCommits(next)
    } catch { /* ignore */ } finally {
      loadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [repoPath, repoSource, activeBranch, commits.length, appendCommits])

  // Attach scroll listener for infinite scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    function onScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container!
      if (scrollHeight - scrollTop - clientHeight < 400) loadMore()
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [loadMore])

  // Open commit detail — shared by click and Enter key
  const openCommit = useCallback(async (index: number) => {
    const commit = displayCommits[index]
    if (!commit || !repoPath) return
    try {
      const detail = repoSource === 'github'
        ? await fetchGitHubCommitDetail(repoPath, commit.hash)
        : await fetchCommitDetail(repoPath, commit.hash)
      setSelectedCommit(detail)
    } catch { /* ignore */ }
  }, [displayCommits, repoPath, repoSource, setSelectedCommit])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, displayCommits.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0) openCommit(focusedIndex)
      } else if (e.key === 'Escape') {
        setSelectedCommit(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [displayCommits.length, focusedIndex, openCommit, setSelectedCommit])

  // Scroll to keep focused row visible
  useEffect(() => {
    const container = containerRef.current
    if (!container || focusedIndex < 0) return
    const rowTop = focusedIndex * ROW_HEIGHT
    const rowBottom = rowTop + ROW_HEIGHT
    if (rowTop < container.scrollTop) {
      container.scrollTop = rowTop
    } else if (rowBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = rowBottom - container.clientHeight
    }
  }, [focusedIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || displayCommits.length === 0) return

    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      draw()
    })
    return () => { cancelled = true }

    function draw() {
    const laneMap = assignLanes(displayCommits)
    const maxLane = Math.max(0, ...displayCommits.map(c => laneMap.get(c.hash) ?? 0))
    const graphWidth = (maxLane + 1) * LANE_WIDTH + 16

    const dpr = window.devicePixelRatio || 1
    const cssWidth = container.clientWidth
    const cssHeight = displayCommits.length * ROW_HEIGHT

    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    canvas.style.width = `${cssWidth}px`
    canvas.style.height = `${cssHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    displayCommits.forEach((commit, i) => {
      const lane = laneMap.get(commit.hash) ?? 0
      const cx = lane * LANE_WIDTH + 16
      const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2
      const color = COLORS[lane % COLORS.length]
      const isSelected = selectedCommit?.hash === commit.hash
      const isFocused = i === focusedIndex

      // Selected row: filled highlight + left border
      if (isSelected) {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.12)'
        ctx.fillRect(0, i * ROW_HEIGHT, canvas.width, ROW_HEIGHT)
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(0, i * ROW_HEIGHT, 3, ROW_HEIGHT)
      }
      // Focused row (keyboard cursor): outline only
      if (isFocused && !isSelected) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(1, i * ROW_HEIGHT + 1, canvas.width - 2, ROW_HEIGHT - 2)
      }

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
      const maxMsgWidth = cssWidth - refX - 20
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
    } // end draw()
  }, [displayCommits, selectedCommit, focusedIndex])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!repoPath || displayCommits.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top
    const index = Math.floor(y / ROW_HEIGHT)
    if (!displayCommits[index]) return

    setFocusedIndex(index)
    openCommit(index)
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
        style={{ display: 'block' }}
      />
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        </div>
      )}
      {!hasMore && commits.length > PAGE_SIZE && (
        <p className="text-center text-xs text-gray-700 py-3">
          All {commits.length.toLocaleString()} commits loaded
        </p>
      )}
    </div>
  )
}
