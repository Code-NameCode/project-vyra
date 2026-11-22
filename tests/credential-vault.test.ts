import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The vault reads its configuration on every call, so tests can point it at a
// fresh temp directory and a known key without touching the real vault.
process.env.VYRA_CREDENTIAL_KEY = "test-master-key";
process.env.VYRA_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "vyra-vault-test-"));

import { deleteCredential, getCredential, listCredentialIds, setCredential } from "../src/lib/server/credential-vault";

describe("credential vault", () => {
  test("roundtrips a secret through encrypt/decrypt", async () => {
    await setCredential("prov-a", "sk-super-secret");
    expect(await getCredential("prov-a")).toBe("sk-super-secret");
    expect(await listCredentialIds()).toContain("prov-a");
    expect(await getCredential("never-stored")).toBeNull();
  });

  test("overwrites an existing entry in place", async () => {
    await setCredential("prov-b", "first");
    await setCredential("prov-b", "second");
    expect(await getCredential("prov-b")).toBe("second");
    expect(await listCredentialIds()).toContain("prov-a");
  });

  test("deletes an entry", async () => {
    await setCredential("prov-c", "gone soon");
    await deleteCredential("prov-c");
    expect(await getCredential("prov-c")).toBeNull();
    expect(await listCredentialIds()).not.toContain("prov-c");
  });

  test("concurrent writes must not lose entries", async () => {
    // 12 parallel saves over the same vault file; before the write lock this
    // intermittently lost entries (last-writer-wins over a stale snapshot).
    const providers = Array.from({ length: 12 }, (_, i) => `race-${i}`);
    await Promise.all(providers.map((id, i) => setCredential(id, `key-${i}`)));
    const ids = await listCredentialIds();
    for (const id of providers) expect(ids).toContain(id);
    expect(await getCredential("race-7")).toBe("key-7");
  });
});
