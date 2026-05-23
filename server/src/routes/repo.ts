import { Router, Request, Response } from 'express'
import { getRepoSummary, getCommits, getCommitDetail } from '../services/gitParser'
import type { ApiResponse, RepoSummary, CommitNode, CommitDetail } from '@git-viz/shared'

const router = Router()

function queryStr(val: unknown): string | undefined {
  if (typeof val === 'string') return val
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0]
  return undefined
}

// GET /api/repo/summary?path=<local-git-path>
router.get('/summary', async (req: Request, res: Response) => {
  const repoPath = queryStr(req.query.path)
  if (!repoPath) {
    res.status(400).json({ error: 'path query param is required' })
    return
  }
  try {
    const data = await getRepoSummary(repoPath)
    const response: ApiResponse<RepoSummary> = { data }
    res.json(response)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/repo/commits?path=<path>&branch=<branch>&limit=<n>&offset=<n>
router.get('/commits', async (req: Request, res: Response) => {
  const repoPath = queryStr(req.query.path)
  const branch = queryStr(req.query.branch) ?? 'HEAD'
  const limit = parseInt(queryStr(req.query.limit) ?? '100', 10)
  const offset = parseInt(queryStr(req.query.offset) ?? '0', 10)

  if (!repoPath) {
    res.status(400).json({ error: 'path query param is required' })
    return
  }
  try {
    const data = await getCommits(repoPath, { branch, limit, offset })
    const response: ApiResponse<CommitNode[]> = { data }
    res.json(response)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/repo/commit/:hash?path=<path>
router.get('/commit/:hash', async (req: Request, res: Response) => {
  const repoPath = queryStr(req.query.path)
  const hash = String(req.params['hash'])

  if (!repoPath) {
    res.status(400).json({ error: 'path query param is required' })
    return
  }
  try {
    const data = await getCommitDetail(repoPath, hash)
    const response: ApiResponse<CommitDetail> = { data }
    res.json(response)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
