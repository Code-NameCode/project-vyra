// Next.js instrumentation hook — runs once when the server process boots.
// Recovers executions orphaned by a previous run: the agent runtime is
// in-memory, so anything left in queued/running can never resume and is
// marked interrupted instead of staying stuck forever.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Skip build-time worker phases: recovery must only run when a real server
  // boots, never against the database during `next build`.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const { profileRepository } = await import("@/lib/server/repositories");
    const { recoverInterruptedExecutions } = await import("@/lib/agent/execution-manager");
    const profile = await profileRepository.getOrCreate(process.env.VYRA_WORKSPACE_ROOT || process.cwd());
    const result = await recoverInterruptedExecutions(profile.id);
    if (result.count > 0) {
      console.log(`[vyra] marked ${result.count} orphaned execution(s) as interrupted on startup`);
    }
  } catch (error) {
    console.error("[vyra] startup execution recovery failed:", error);
  }
}
