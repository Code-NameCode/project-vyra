import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.VYRA_TEST_DB_PATH;
const workspaceRoot = process.env.VYRA_TEST_WORKSPACE;
if (!databasePath || !workspaceRoot) throw new Error("Playwright test paths are not configured");
fs.mkdirSync(workspaceRoot, { recursive: true });
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
for (const migration of ["20261122193000_phase2_runtime", "20261122210000_phase32_sessions_projects"]) {
  const sql = fs.readFileSync(path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8");
  db.exec(sql);
}
db.close();
