import type { CommitNode } from '@git-viz/shared'

export interface TimeBin {
  label: string
  count: number
  startMs: number
}

export type Granularity = 'week' | 'month' | 'quarter'

function floorToSunday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(r.getDate() - r.getDay())
  return r
}

function floorToMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function floorToQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
}

function advance(d: Date, g: Granularity): Date {
  const r = new Date(d)
  if (g === 'week') r.setDate(r.getDate() + 7)
  else if (g === 'month') r.setMonth(r.getMonth() + 1)
  else r.setMonth(r.getMonth() + 3)
  return r
}

function makeLabel(d: Date, g: Granularity): string {
  if (g === 'week')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (g === 'month')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  return `Q${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(2)}`
}

function floor(d: Date, g: Granularity): Date {
  if (g === 'week') return floorToSunday(d)
  if (g === 'month') return floorToMonth(d)
  return floorToQuarter(d)
}

export function binCommitsByPeriod(
  commits: CommitNode[],
  granularity: Granularity
): TimeBin[] {
  if (commits.length === 0) return []

  const timestamps = commits.map(c => c.timestamp)
  const minTs = Math.min(...timestamps)
  const maxTs = Math.max(...timestamps)

  const bucketMap = new Map<number, TimeBin>()
  let cursor = floor(new Date(minTs), granularity)
  const endCursor = advance(floor(new Date(maxTs), granularity), granularity)

  while (cursor < endCursor) {
    bucketMap.set(cursor.getTime(), {
      label: makeLabel(cursor, granularity),
      count: 0,
      startMs: cursor.getTime(),
    })
    cursor = advance(cursor, granularity)
  }

  for (const c of commits) {
    const key = floor(new Date(c.timestamp), granularity).getTime()
    const bin = bucketMap.get(key)
    if (bin) bin.count++
  }

  return Array.from(bucketMap.values())
}

export function autoGranularity(commits: CommitNode[]): Granularity {
  if (commits.length < 2) return 'month'
  const timestamps = commits.map(c => c.timestamp)
  const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000
  if (spanDays < 180) return 'week'
  if (spanDays < 1095) return 'month'
  return 'quarter'
}
