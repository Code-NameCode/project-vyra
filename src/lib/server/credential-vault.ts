import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

interface Vault { version: 1; entries: Record<string, { iv: string; tag: string; data: string; updatedAt: string }> }

function key() {
  const secret = process.env.VYRA_CREDENTIAL_KEY;
  if (!secret) throw new Error("VYRA_CREDENTIAL_KEY must be configured before storing credentials");
  return createHash("sha256").update(secret).digest();
}

function vaultPath() { return path.join(process.env.VYRA_DATA_DIR || path.join(process.cwd(), ".vyra"), "credentials.enc"); }

async function load(): Promise<Vault> {
  try { return JSON.parse(await fs.readFile(vaultPath(), "utf8")) as Vault; } catch { return { version: 1, entries: {} }; }
}

async function save(vault: Vault) {
  await fs.mkdir(path.dirname(vaultPath()), { recursive: true });
  const tmp = `${vaultPath()}.tmp-${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(vault), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, vaultPath());
}

// Serialize read-modify-write mutations so concurrent requests can't lose
// entries; reads stay lock-free because save() replaces the file atomically.
let writeChain: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => { });
  return next;
}

export async function setCredential(providerId: string, value: string) {
  return withWriteLock(async () => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);
    const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const vault = await load();
    vault.entries[providerId] = { iv: iv.toString("base64"), tag: tag.toString("base64"), data: data.toString("base64"), updatedAt: new Date().toISOString() };
    await save(vault);
  });
}

export async function getCredential(providerId: string): Promise<string | null> {
  const item = (await load()).entries[providerId];
  if (!item) return null;
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(item.iv, "base64"));
  decipher.setAuthTag(Buffer.from(item.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(item.data, "base64")), decipher.final()]).toString("utf8");
}

export async function deleteCredential(providerId: string) {
  return withWriteLock(async () => {
    const vault = await load();
    delete vault.entries[providerId];
    await save(vault);
  });
}

export async function listCredentialIds() { return Object.keys((await load()).entries); }
