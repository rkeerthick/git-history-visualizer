import type { CommitNode } from '@git-viz/shared'
import type { CommitFilter } from '@/store/repoStore'

export function filterCommits(commits: CommitNode[], f: CommitFilter): CommitNode[] {
  const q = f.query.trim().toLowerCase()
  const dateFrom = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00').getTime() : null
  const dateTo = f.dateTo ? new Date(f.dateTo + 'T23:59:59').getTime() : null

  return commits.filter(c => {
    if (q) {
      const inMsg = c.message.toLowerCase().includes(q)
      const inAuthor = c.author?.name?.toLowerCase().includes(q) ?? false
      if (!inMsg && !inAuthor) return false
    }
    if (f.authorEmail && c.author?.email !== f.authorEmail) return false
    if (dateFrom !== null && c.timestamp < dateFrom) return false
    if (dateTo !== null && c.timestamp > dateTo) return false
    return true
  })
}
