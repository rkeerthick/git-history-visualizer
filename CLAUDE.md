# CLAUDE.md — Git History Visualizer

## Project Overview

A full-stack interactive web app that visualizes git repository history as explorable graphs and analytics. The user is building this as a portfolio project.

## Architecture

Monorepo with npm workspaces:

- `client/` — React 18 + TypeScript frontend, built with Vite
- `server/` — Node.js + Express backend that parses git data
- `shared/` — TypeScript types shared across both packages

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, D3.js
- **Backend:** Node.js, Express, TypeScript, simple-git, Octokit (GitHub REST API)
- **Testing:** Vitest, React Testing Library
- **Deployment:** Vercel (client), Railway (server)

## Key Conventions

- All new files use TypeScript (`.ts` / `.tsx`). No plain `.js` files.
- Tailwind for all styling — no inline styles, no CSS modules.
- shadcn/ui for standard UI components (buttons, dialogs, inputs). Build custom only for the D3 graph components.
- Zustand stores live in `client/src/store/`, one file per domain slice.
- Shared types (Commit, Branch, Author, Diff) live in `shared/types.ts` — import from there in both client and server.
- Express routes are thin; business logic lives in `server/src/services/`.
- D3 logic lives in `client/src/lib/` as pure functions that accept data and return SVG/canvas instructions. Keep D3 out of React component bodies.

## Data Flow

```
GitHub URL / local .git
        ↓
  server/services/gitParser.ts  (simple-git)
  server/services/github.ts     (Octokit)
        ↓
  Express REST API  (/api/repo, /api/commits, /api/stats)
        ↓
  Zustand store  (client)
        ↓
  D3 graph + React panels
```

## Dev Commands

```bash
npm run dev          # start client + server concurrently
npm run build        # production build
npm run test         # vitest + RTL
npm run lint         # eslint
npm run typecheck    # tsc --noEmit across all packages
```

## Goals

- Portfolio-quality code: clean architecture, good TypeScript coverage, tested core logic
- Visually impressive: smooth D3 animations, polished UI
- Performance: large repos (10k+ commits) must render without freezing — use canvas for the graph, not SVG, when commit count exceeds 1000
