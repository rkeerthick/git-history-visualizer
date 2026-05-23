import { Router, Request, Response } from 'express'
import {
  parseGitHubUrl,
  getGitHubRepoSummary,
  getGitHubCommits,
  getGitHubCommitDetail,
} from '../services/github'
import type { ApiResponse, RepoSummary, CommitNode, CommitDetail } from '@git-viz/shared'

const router = Router()

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0]
  return undefined
}

// GET /api/github/summary?url=<github-url>
router.get('/summary', async (req: Request, res: Response) => {
  const url = qs(req.query.url)
  if (!url) { res.status(400).json({ error: 'url param required' }); return }
  try {
    const { owner, repo } = parseGitHubUrl(url)
    const data = await getGitHubRepoSummary(owner, repo)
    res.json({ data } as ApiResponse<RepoSummary>)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/github/commits?url=<github-url>&branch=HEAD&page=1&perPage=100
router.get('/commits', async (req: Request, res: Response) => {
  const url = qs(req.query.url)
  const branch = qs(req.query.branch) ?? 'HEAD'
  const page = parseInt(qs(req.query.page) ?? '1', 10)
  const perPage = Math.min(parseInt(qs(req.query.perPage) ?? '100', 10), 100)

  if (!url) { res.status(400).json({ error: 'url param required' }); return }
  try {
    const { owner, repo } = parseGitHubUrl(url)
    const data = await getGitHubCommits(owner, repo, branch, perPage, page)
    res.json({ data } as ApiResponse<CommitNode[]>)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// GET /api/github/commit/:sha?url=<github-url>
router.get('/commit/:sha', async (req: Request, res: Response) => {
  const url = qs(req.query.url)
  const sha = String(req.params['sha'])

  if (!url) { res.status(400).json({ error: 'url param required' }); return }
  try {
    const { owner, repo } = parseGitHubUrl(url)
    const data = await getGitHubCommitDetail(owner, repo, sha)
    res.json({ data } as ApiResponse<CommitDetail>)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
