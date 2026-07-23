# UX Analyzer

AI-powered product analysis tool that performs 7-methodology UX and engineering teardowns of any product by URL. Uses SSE streaming for real-time progress and delivers structured JSON results across Design Teardown, Deconstruction, Spec Extraction, Pattern Mining, Reverse Engineering, UX Audit, and Heuristic Evaluation.

[![Status: WIP](https://img.shields.io/badge/Status-WIP-yellow.svg?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Agent Rules](#agent-rules)
- [License](#license)

## Features

- **7-methodology analysis** - Design Teardown, Deconstruction, Spec Extraction, Pattern Mining, Reverse Engineering, UX Audit, Heuristic Evaluation
- **SSE streaming** - real-time 5-step progress: Page Reader, Web Search, AI Analysis, Processing, Complete
- **Single and batch URL input** - analyze one product or compare multiple via pattern mining
- **Tabbed results** - 6 tabs for single analysis, 7 tabs for batch (includes cross-product patterns)
- **History management** - persistent analysis history with delete and clear-all, instant result reload
- **Macro-typography design** - static editorial aesthetic with scroll-reveal animations
- **JSON export** - copy to clipboard or download as file
- **Responsive** - desktop and mobile layouts

## Tech Stack

- **Next.js 16** - React framework with App Router and API routes
- **TypeScript** - type-safe development
- **Tailwind CSS 4** - utility-first styling
- **Prisma + SQLite** - ORM with embedded database
- **Zustand** - client-side state management
- **shadcn/ui** - component library (Radix UI primitives)
- **Framer Motion** - animation library
- **z-ai-web-dev-sdk** - AI SDK for web search, page reading, and LLM completions
- **Bun** - package manager and runtime

## Getting Started

### Prerequisites

- Bun (or Node.js 18+)

### Installation

```bash
git clone https://github.com/owner/ux-analyzer.git
cd ux-analyzer
bun install
bun run db:push
```

### Run

```bash
bun run dev
```

Open http://localhost:3000 in your browser.

## Architecture

The app follows a client-server architecture with SSE streaming. The frontend submits URLs to a Next.js API route, which orchestrates a multi-step pipeline: page content extraction via web-reader, context enrichment via web-search, structured analysis via LLM prompts, and result persistence in SQLite. Client state is managed by Zustand. The 7 methodology prompt system supports both single-URL and multi-URL (batch) analysis modes with different output schemas.

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/analysis/` - domain components (URL input, progress, results, history)
- `src/components/ui/` - shadcn/ui base components
- `src/store/` - Zustand state stores
- `src/lib/` - utilities, DB client, analysis prompts
- `src/hooks/` - custom React hooks
- `prisma/` - database schema and migrations

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Start a new analysis (SSE stream response) |
| `/api/analyses` | GET | List analysis history |
| `/api/analyses` | DELETE | Delete one or all analyses |
| `/api/analyses/[id]` | GET | Get a single analysis by ID |

## Configuration

### Environment Variables

See `.env.example`:

```env
DATABASE_URL="file:./db/dev.db"
```

For Vercel deployment, SQLite is not supported (ephemeral filesystem). Switch to Turso or Vercel Postgres and update `prisma/schema.prisma` datasource provider accordingly.

## Agent Rules

Any AI agent working on this project MUST read and follow `AGENT_RULES.md` before performing any operations.

## License

MIT

---
Built with: Next.js + TypeScript + Tailwind CSS + Prisma