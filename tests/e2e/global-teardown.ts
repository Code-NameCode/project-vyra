import fs from "node:fs/promises";
import { runtimeRoot } from "./runtime";

export default async function globalTeardown() {
  await fs.rm(runtimeRoot, { recursive: true, force: true });
}
