// Small id helper (no external dep at call site). Uses the platform CSPRNG
// instead of Math.random to avoid collisions between ids generated in the
// same millisecond.
export function uid(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
