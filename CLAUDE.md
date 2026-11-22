# CLAUDE.md — working rules for this repo

AI coding-agent workspace: Next.js 16 App Router + React 19 + Bun + Prisma/SQLite + Zustand + Tailwind 4. Hand-rolled SSE/provider layer; **no Vercel AI SDK**. Single-user, localhost app.

## Commands

```bash
bun install && bun run db:push   # setup
bun run dev                      # dev on :3000
bun run typecheck                # tsc --noEmit — run after every change
bun test                         # unit tests
bunx playwright test             # e2e on :3100 (isolated DB + workspace)
bun run build                    # must keep emitting .next/standalone/server.js
```

## Invariants — do not break these

1. **SSE event contracts.** Plain chat: `/api/chat` emits `{type:"token"|"done"|"error"}`; client parser is `readSSE()` in `src/lib/streaming.ts`. Executions: `GET /api/executions/[id]/events` emits `id: <sequence>` lines; client dedupes by id. Changing either breaks streaming.
2. **Approval gate.** Non-read tools (`src/lib/agent/tools.ts`) must go through `src/lib/security/approvals.ts` — action+input+executionId hash-match, 10-min TTL. Never bypass it for "read" reclassification.
3. **Workspace confinement.** Every filesystem path from user/DB data goes through `assertWorkspacePath`/`resolveWorkspacePath` (`src/lib/security/workspace.ts`). Keep the realpath containment checks.
4. **Standalone output.** `next.config.ts` keeps `output: "standalone"` and `serverExternalPackages: ["@lydell/node-pty"]`. The deploy scaffold depends on both.
5. **DB access** goes through `src/lib/server/repositories.ts`. `db/custom.db` must exist at boot (deploy start.sh refuses otherwise).
6. **Bun-first.** Tests are `bun:test`; server runs under bun. Don't add node-only test harnesses.
7. **Runtime state is in-memory** (`execution-manager.ts` runtimes, PTY sessions in `/api/terminal`). Don't assume restart-survival for them; their event logs are persisted.

## Gotchas

- `src/lib/db.ts` rewrites relative/home-style `DATABASE_URL` values to an absolute `db/custom.db` under cwd (Windows/dev convenience).
- The workspace lives under **OneDrive** — file locks can appear; a running dev server holds the Prisma engine DLL (stop it before `prisma generate`/`db push` regen).
- `.zscripts/*` hardcode the cloud-sandbox path `/home/z/my-project`; they only matter for platform deploys, not local dev.
- `/api/research`, `/api/tasks/run`, and the `/api/github/repos` mock fallback are simulated — don't present their output as real data.
- Secrets live in the encrypted vault (`.vyra/credentials.enc`, AES-256-GCM keyed by `VYRA_CREDENTIAL_KEY`). Never store keys in code, DB, or URLs.
