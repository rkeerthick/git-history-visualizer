import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import repoRoutes from './routes/repo'
import githubRoutes from './routes/github'

const app = express()
const PORT = process.env.PORT ?? 3002

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')
app.use(cors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/repo', repoRoutes)
app.use('/api/github', githubRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
