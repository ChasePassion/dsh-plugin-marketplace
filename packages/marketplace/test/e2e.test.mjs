/**
 * End-to-end verification of the marketplace Host half against a real Cordis
 * runtime and an isolated temp profile (no pollution of the real web profile).
 * Covers: plugin load, registry list, install (real pnpm add), patch write,
 * conflict, uninstall with dependency removal, official enable/disable.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { apply } from "../dist/index.js";

const home = mkdtempSync(join(tmpdir(), "dsh-mkt-e2e-"));
process.env.DSH_HOME = home;
const profile = join(home, "profiles", "test-web");
mkdirSync(profile, { recursive: true });
writeFileSync(join(profile, "package.json"), JSON.stringify({
  name: "dsh-profile-test-web", private: true, dependencies: {},
}, null, 2));
const PATCH = "# e2e test patch layer\n";
writeFileSync(join(profile, "cordis.patch.yml"), PATCH);

let ctx;
let gw;

before(async () => {
  ctx = new Context();
  const fiber = ctx.plugin({ name: "marketplace", inject: [], apply }, { profileName: "test-web" });
  await fiber; // cordis 4: plugin apply runs asynchronously on the fiber
  gw = ctx.marketplace;
  assert.ok(gw, "gateway registered as ctx.marketplace");
});

after(async () => {
  if (ctx) await ctx[Symbol.dispose]?.();
});

test("list: community entries + official scan", async () => {
  const result = await gw.list();
  assert.ok(result.entries.length > 50, "registry has entries (got " + result.entries.length + ")");
  assert.ok(result.official.length > 50, "official scan finds packages (got " + result.official.length + ")");
  const first = result.entries[0];
  assert.ok(first.id && first.package && first.entry.name, "entry fields present");
});

test("install: real pnpm add + patch block, then uninstall with deps", async () => {
  const inst = await gw.install({ id: "chat-import" });
  assert.equal(inst.ok, true, JSON.stringify(inst));
  const patchAfter = readFileSync(join(profile, "cordis.patch.yml"), "utf8");
  assert.ok(patchAfter.includes("# marketplace: chat-import"), "marker written");
  assert.ok(patchAfter.includes("name: dsh-chat-import"), "row written");
  assert.ok(existsSync(join(profile, "node_modules", "dsh-chat-import")), "package installed by pnpm");

  // installed state visible
  const after = await gw.list("chat-import");
  const row = after.entries.find((e) => e.id === "chat-import");
  assert.ok(row && row.local.installed, "installed state visible");

  // conflict: installing again must fail without touching the file
  const conflict = await gw.install({ id: "chat-import" });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.code, "entry-conflict");

  // uninstall with dependency removal
  const un = await gw.uninstall({ id: "chat-import", removeDeps: true });
  assert.equal(un.ok, true, JSON.stringify(un));
  const patchFinal = readFileSync(join(profile, "cordis.patch.yml"), "utf8");
  assert.ok(!patchFinal.includes("chat-import"), "block removed");
  assert.ok(patchFinal.includes("# e2e test patch layer"), "original comments preserved");
});

test("install failure path: unknown id leaves patch untouched", async () => {
  const before = readFileSync(join(profile, "cordis.patch.yml"), "utf8");
  const bad = await gw.install({ id: "definitely-not-a-real-plugin-xyz" });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "not-found");
  assert.equal(readFileSync(join(profile, "cordis.patch.yml"), "utf8"), before, "patch untouched");
});

test("uninstall failure path: not-installed", async () => {
  const un = await gw.uninstall({ id: "never-installed" });
  assert.equal(un.ok, false);
  assert.equal(un.code, "not-installed");
});

test("official enable/disable writes and removes a patch row", async () => {
  const official = (await gw.list()).official;
  const target = official.find((p) => p.kind === "plugin");
  assert.ok(target, "official plugin found");
  const en = await gw.enable({ id: target.name });
  assert.equal(en.ok, true, JSON.stringify(en));
  const patch = readFileSync(join(profile, "cordis.patch.yml"), "utf8");
  assert.ok(patch.includes("name: " + target.name), "official row written");
  const dis = await gw.disable({ id: target.name });
  assert.equal(dis.ok, true, JSON.stringify(dis));
  const patch2 = readFileSync(join(profile, "cordis.patch.yml"), "utf8");
  assert.ok(!patch2.includes("name: " + target.name), "official row removed");
});

test("refresh pulls the registry again", async () => {
  const r = await gw.refresh();
  assert.ok(r.updatedAt.length > 0);
});
