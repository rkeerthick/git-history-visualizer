# Git History Visualizer

An interactive web application that transforms git repository history into beautiful, explorable visualizations — commit graphs, branch timelines, contributor stats, and file change heatmaps.

**Live Demo:** _coming soon_

---

## Features

- **Interactive Commit Graph** — visual DAG of commits, branches, and merges with pan/zoom
- **Branch Timeline** — side-by-side branch view with merge points highlighted
- **Contributor Analytics** — contribution heatmaps, per-author commit frequency, and code churn stats
- **File Change Explorer** — drill into any file to see its full change history across commits
- **Commit Detail Panel** — diff viewer, metadata, and linked parent/child commits
- **Search & Filter** — filter commits by author, date range, file path, or message keyword
- **Repo Import** — analyze any public GitHub repo or paste a local `.git` path

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Visualization** | D3.js (commit graph, heatmaps) |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **State Management** | Zustand |
| **Backend / API** | Node.js + Express |
| **Git Parsing** | simple-git (Node.js) |
| **GitHub Integration** | GitHub REST API (Octokit) |
| **Testing** | Vitest + React Testing Library |
| **Deployment** | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
git-history-visualizer/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph/          # D3-powered commit graph
│   │   │   ├── panels/         # Commit detail, file explorer panels
│   │   │   ├── stats/          # Contributor analytics, heatmaps
│   │   │   └── ui/             # Reusable UI components (shadcn)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand state slices
│   │   ├── lib/                # Utilities, API client, D3 helpers
│   │   ├── types/              # Shared TypeScript types
│   │   └── App.tsx
│   ├── public/
│   ├── index.html
│   └── vite.config.ts
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── routes/             # Express route handlers
│   │   ├── services/
│   │   │   ├── gitParser.ts    # simple-git integration
│   │   │   └── github.ts       # GitHub API (Octokit)
│   │   ├── models/             # Commit, Branch, Author types
│   │   └── index.ts
│   └── tsconfig.json
│
├── shared/                     # Types shared by client + server
│   └── types.ts
│
├── README.md
├── CLAUDE.md
└── package.json                # Monorepo root (npm workspaces)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- (Optional) A GitHub Personal Access Token for private repos / higher rate limits

### Installation

```bash
git clone https://github.com/your-username/git-history-visualizer.git
cd git-history-visualizer
npm install
```

### Environment Variables

Create a `.env` file in `server/`:

```env
PORT=3001
GITHUB_TOKEN=your_github_pat_here   # optional but recommended
```

### Running Locally

```bash
# Start both frontend and backend in dev mode
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Running Tests

```bash
npm run test
```

---

## Roadmap

- [ ] Core commit graph with D3 (v1)
- [ ] GitHub repo import via URL
- [ ] Contributor heatmap
- [ ] File change explorer
- [ ] Local repo support (drag & drop `.git` folder)
- [ ] Export graph as PNG/SVG
- [ ] Dark / light theme toggle

---

## License

MIT
