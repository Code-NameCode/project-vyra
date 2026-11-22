import { NextResponse } from "next/server";
import * as pty from "@lydell/node-pty";
import { assertWorkspacePath } from "@/lib/security/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TermSession {
  id: string;
  pty: pty.IPty;
  listeners: Set<(chunk: string) => void>;
  closed: boolean;
  shell: string;
}

/**
 * Live PTY sessions keyed by id. Kept on the module scope so the SSE stream
 * (GET) and the input/resize/close calls (POST) can share them.
 */
const sessions = new Map<string, TermSession>();

function defaultShell(): { file: string; args: string[] } {
  if (process.platform === "win32") {
    const pwsh = process.env.PWSH_PATH || "powershell.exe";
    return { file: pwsh, args: ["-NoLogo"] };
  }
  const shell = process.env.SHELL || "/bin/bash";
  return { file: shell, args: ["-l"] };
}

function sessionId(): string {
  return `term_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createSession(opts: {
  cwd?: string;
  cols?: number;
  rows?: number;
}): TermSession {
  const { file, args } = defaultShell();
  const id = sessionId();
  const child = pty.spawn(file, args, {
    name: "xterm-256color",
    cols: Math.max(20, opts.cols ?? 80),
    rows: Math.max(5, opts.rows ?? 24),
    cwd: opts.cwd && opts.cwd.trim() ? opts.cwd : process.cwd(),
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    } as Record<string, string>,
  });

  const session: TermSession = {
    id,
    pty: child,
    listeners: new Set(),
    closed: false,
    shell: file,
  };

  const broadcast = (chunk: string) => {
    for (const listener of session.listeners) {
      try {
        listener(chunk);
      } catch {
        /* listener removed on cancel */
      }
    }
  };

  child.onData((data) => broadcast(data));
  child.onExit(({ exitCode }) => {
    session.closed = true;
    broadcast(`\r\n\x1b[90m[process exited with code ${exitCode}]\x1b[0m\r\n`);
    sessions.delete(id);
  });

  sessions.set(id, session);
  return session;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("session") || "";
  const session = sessions.get(id);
  if (!session) {
    return NextResponse.json(
      { error: "Terminal session not found" },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("ready", session.shell);

      const listener = (chunk: string) => send("data", chunk);
      session.listeners.add(listener);

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* stream closed */
        }
      }, 15000);

      // If the process already exited, close the stream shortly after.
      if (session.closed) {
        setTimeout(() => {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }, 0);
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      // Remove this stream's listeners; the PTY stays alive until closed via
      // POST so the terminal survives panel re-mounts.
      session.listeners.clear();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  let body: {
    action?: string;
    sessionId?: string;
    data?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action || "";

  if (action === "create") {
    try {
      const cwd = await assertWorkspacePath(body.cwd || ".", { allowRoot: true });
      const session = createSession({
        cwd,
        cols: body.cols,
        rows: body.rows,
      });
      return NextResponse.json({
        sessionId: session.id,
        shell: session.shell,
        error: null,
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Unable to start terminal",
        },
        { status: 500 }
      );
    }
  }

  const session = body.sessionId ? sessions.get(body.sessionId) : undefined;
  if (!session) {
    return NextResponse.json(
      { error: "Terminal session not found" },
      { status: 404 }
    );
  }

  if (action === "input") {
    session.pty.write(body.data ?? "");
    return NextResponse.json({ ok: true });
  }

  if (action === "resize") {
    const cols = Math.max(20, Math.floor(body.cols ?? 80));
    const rows = Math.max(5, Math.floor(body.rows ?? 24));
    try {
      session.pty.resize(cols, rows);
    } catch {
      /* process may have exited */
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    try {
      session.pty.kill();
    } catch {
      /* already gone */
    }
    sessions.delete(session.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
