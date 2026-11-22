# Goodstuff-VYRA

An AI coding-agent workspace: a self-hosted, web-based IDE where you configure AI providers, chat with an agent, run agent executions with approvals and rollback, manage projects, sessions, tasks, and skills, and drive a real terminal — all in one place.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, `output: "standalone"` |
| Runtime | Bun (package manager, test runner, production server) |
| UI | Tailwind CSS 4, shadcn/ui (new-york), Radix primitives, Zustand (state) |
| Database | Prisma 6 + SQLite (`db/custom.db`) |
| Terminal | `@xterm/xterm` + `@lydell/node-pty` |
| AI layer | Hand-rolled SSE proxy to OpenAI-compatible / Anthropic / Ollama endpoints (no AI SDK) |

## Getting started

```bash
bun install
bun run db:push     # sync Prisma schema to db/custom.db
bun run dev         # http://localhost:3000
```

Configure a provider in **Settings** (API keys are stored in an encrypted local vault at `.vyra/credentials.enc`, keyed by `VYRA_CREDENTIAL_KEY`) or connect a local Ollama instance (auto-detected).

## Scripts

| Script | What it does |
|---|---|
| `bun run dev` | Dev server on :3000 |
| `bun run build` | Production build → `.next/standalone` (+ copies static/public via `scripts/copy-standalone.mjs`) |
| `bun run start` | Runs the standalone server (`bun .next/standalone/server.js`) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun test` | Unit tests (vault, providers/agent, workspace policy, persistence) |
| `bun run db:push / db:generate / db:migrate / db:reset` | Prisma workflows |

## How it works

**Client.** `src/app/page.tsx` is an IDE shell (top bar, icon rail, sidebar, chat view, resizable right panel, command palette). State lives in 7 Zustand stores; `src/stores/useChatStore.ts` is the core: per-tab conversations, optimistic messages, streaming consumption, persistence to localStorage + server.

**Two chat transports, one provider layer.** Both stream through the shared `streamProvider()` in `src/lib/server/providers.ts` (OpenAI-compatible incl. Ollama, Anthropic; thinking deltas, tool-call reassembly, and usage events parsed identically; Z.ai/GLM thinking params applied in both):
1. **Plain chat**: `POST /api/chat` maps shared events to `{type:"token"|"thinking"|"usage"|"done"|"error"}` SSE (upstream connection/auth failures return JSON 502 `UPSTREAM_<status>`). No tools are executed here.
2. **Agent executions**: `POST /api/executions` starts a background loop (`src/lib/agent/execution-manager.ts`) that streams persisted, sequence-numbered events over `GET /api/executions/[id]/events` (cursor replay supported), executes tools from `TOOL_REGISTRY`, and pauses for approvals.

**Safety rails.** Non-read tool actions require an approval (`src/lib/security/approvals.ts`, hash-matched, 10-min TTL). All filesystem operations are confined to the workspace root (`src/lib/security/workspace.ts`: resolve + containment + symlink checks). File writes go through `src/lib/server/file-transactions.ts` (atomic write, hash-guarded optimistic concurrency, snapshots + diffs + rollback endpoint). On startup, `src/instrumentation.ts` marks executions orphaned by a restart as `interrupted` (the runtime is in-memory).

**Data.** All DB access goes through `src/lib/server/repositories.ts`. The schema (Prisma/SQLite): profile → projects → conversations → messages; executions → event log + file changes; providers; approvals; tasks; artifacts; migrations.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite location (default `file:../db/custom.db`) |
| `VYRA_WORKSPACE_ROOT` | Filesystem root for projects/browsing/executions (default: cwd) |
| `VYRA_CREDENTIAL_KEY` | Master key for the encrypted credential vault (required before storing API keys) |
| `VYRA_DATA_DIR` | Where the vault file lives (default `.vyra/` under cwd) |
| `VYRA_MAX_ITERATIONS` / `VYRA_MAX_TOOL_CALLS` / `VYRA_MAX_EXECUTION_MS` | Agent loop limits (12 / 40 / 15 min) |

## Testing

```bash
bun test                      # unit suites
bunx playwright test          # e2e (isolated server on :3100 with test DB/workspace)
```

## Deployment notes

`.zscripts/` is the platform deploy scaffold: `build.sh` produces a tarball (standalone output + static + public + db + Caddyfile + start.sh); `start.sh` boots the Next server on :3000 behind **Caddy :81**, which multiplexes side services via the `XTransformPort` query param (see `examples/websocket/`). The build self-heals `output: "standalone"` if missing — keep that setting intact.

## Known limitations

- Single-user by design (no auth); intended to run on localhost. Do not expose it directly to the internet.
- `/api/research` and `/api/tasks/run` are simulated endpoints (they stream canned mock output).
- Executions/PTY sessions are in-memory and don't survive restarts (their event logs do).
