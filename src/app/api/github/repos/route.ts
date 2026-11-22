import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOCK_REPOS = [
  { owner: "goodstuff", name: "agent-app", fullName: "goodstuff/agent-app" },
  { owner: "goodstuff", name: "docs", fullName: "goodstuff/docs" },
  { owner: "octocat", name: "hello-world", fullName: "octocat/hello-world" },
];

/** GET /api/github/repos — list repos; token comes from the Authorization header (never the URL). */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json({ repos: MOCK_REPOS, real: false });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://api.github.com/user/repos?per_page=50&sort=updated", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json({ repos: MOCK_REPOS, real: false, error: `GitHub API ${res.status}` });
    }
    const data = (await res.json()) as { full_name: string; name: string; owner: { login: string } }[];
    const repos = data.map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
    }));
    return NextResponse.json({ repos, real: true });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ repos: MOCK_REPOS, real: false, error: "GitHub unreachable" });
  }
}
