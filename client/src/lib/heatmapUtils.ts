import type { CommitNode } from '@git-viz/shared'

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface DayMapResult {
  dayMap: Map<string, number>
  maxCount: number
  startDate: string
  endDate: string
  totalActiveDays: number
}

export interface StreakResult {
  current: number
  longest: number
}

function toDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export function buildDayMap(commits: CommitNode[]): DayMapResult {
  const dayMap = new Map<string, number>()

  for (const commit of commits) {
    const d = toDateStr(commit.timestamp)
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
  }

  const latestTs = commits.length > 0 ? Math.max(...commits.map(c => c.timestamp)) : Date.now()
  const end = new Date(latestTs)
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 1)
  start.setDate(start.getDate() + 1)

  return {
    dayMap,
    maxCount: dayMap.size === 0 ? 0 : Math.max(...dayMap.values()),
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    totalActiveDays: dayMap.size,
  }
}

export function computeStreak(dayMap: Map<string, number>): StreakResult {
  const active = Array.from(dayMap.entries())
    .filter(([, n]) => n > 0)
    .map(([d]) => d)
    .sort()

  if (active.length === 0) return { current: 0, longest: 0 }

  let longest = 1
  let run = 1

  for (let i = 1; i < active.length; i++) {
    const diff =
      (new Date(active[i]).getTime() - new Date(active[i - 1]).getTime()) / 86_400_000
    if (diff === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const last = active[active.length - 1]
  const gap = (new Date(today).getTime() - new Date(last).getTime()) / 86_400_000
  const current = gap <= 1 ? run : 0

  return { current, longest }
}

export function mostActiveDayOfWeek(commits: CommitNode[]): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = new Array<number>(7).fill(0)
  for (const c of commits) counts[new Date(c.timestamp).getDay()]++
  const max = counts.indexOf(Math.max(...counts))
  return DAYS[max]
}

export function buildWeekGrid(
  startDate: string,
  dayMap: Map<string, number>
): Array<Array<{ date: string; count: number }>> {
  const WEEKS = 53
  const start = new Date(startDate + 'T00:00:00')
  // Rewind to the Sunday of the start week
  start.setDate(start.getDate() - start.getDay())

  const grid: Array<Array<{ date: string; count: number }>> = []
  for (let w = 0; w < WEEKS; w++) {
    const week: Array<{ date: string; count: number }> = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start)
      cell.setDate(start.getDate() + w * 7 + d)
      const dateStr = cell.toISOString().slice(0, 10)
      week.push({ date: dateStr, count: dayMap.get(dateStr) ?? 0 })
    }
    grid.push(week)
  }
  return grid
}
