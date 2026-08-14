import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scanInstalled, appendBlock, removeBlock, serializeBlock, EntryConflictError,
} from "../src/patch-editor.ts";

const SAMPLE = `# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; '!!js' expressions allowed).

# WeChat bridge: @ccchase/dsh-plugin-wechat (Tencent iLink Bot)
- insert:
    - id: wechat-bridge
      name: '@ccchase/dsh-plugin-wechat'
      config:
        cwd: 'C:\\Users\\test'
        autoStart: true
`;

test("scanInstalled: empty content", () => {
  assert.deepEqual(scanInstalled(""), []);
  assert.deepEqual(scanInstalled("# only comments\n\n"), []);
});

test("scanInstalled: manual row without marker", () => {
  const rows = scanInstalled(SAMPLE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "wechat-bridge");
  assert.equal(rows[0].name, "@ccchase/dsh-plugin-wechat");
  assert.equal(rows[0].source, "manual");
  assert.equal(rows[0].marketId, null);
});

test("scanInstalled: marketplace block with marker", () => {
  const content = SAMPLE + serializeBlock("chat-import", { id: "chat-import", name: "dsh-chat-import", config: {} });
  const rows = scanInstalled(content);
  assert.equal(rows.length, 2);
  const m = rows.find((r) => r.marketId === "chat-import");
  assert.ok(m);
  assert.equal(m.id, "chat-import");
  assert.equal(m.name, "dsh-chat-import");
  assert.equal(m.source, "marketplace");
});

test("scanInstalled: top-level - id: row is not a plugin row", () => {
  const content = `- id: system-prompt\n  config:\n    persona: ''\n`;
  assert.deepEqual(scanInstalled(content), []);
});

test("appendBlock: appends at end and is idempotent by marker", () => {
  const next = appendBlock("", "abc", { id: "abc", name: "dsh-abc" });
  assert.ok(next.includes("# marketplace: abc"));
  assert.ok(next.includes("- id: abc"));
  assert.ok(next.includes("name: dsh-abc"));
  assert.throws(() => appendBlock(next, "abc", { id: "abc", name: "dsh-abc" }), EntryConflictError);
  assert.throws(() => appendBlock(next, "other", { id: "abc", name: "x" }), EntryConflictError, "same row id conflicts");
});

test("appendBlock: config serialization", () => {
  const next = appendBlock("", "abc", { id: "abc", name: "dsh-abc", config: { autoStart: true, cwd: "C:\\x" } });
  assert.ok(next.includes('config: {"autoStart":true,"cwd":"C:\\\\x"}'));
});

test("removeBlock: removes exactly the marked block, preserves everything else", () => {
  const withBlock = appendBlock(SAMPLE, "abc", { id: "abc", name: "dsh-abc" });
  const { content, removed } = removeBlock(withBlock, "abc");
  assert.equal(removed, true);
  assert.ok(!content.includes("# marketplace: abc"));
  assert.ok(!content.includes("- id: abc"));
  assert.ok(content.includes("wechat-bridge"), "manual rows preserved");
  assert.ok(content.includes("Tencent iLink Bot"), "comments preserved");
  // idempotent: second removal is a no-op
  const again = removeBlock(content, "abc");
  assert.equal(again.removed, false);
  assert.equal(again.content, content);
});

test("removeBlock: unknown marker", () => {
  const { content, removed } = removeBlock(SAMPLE, "nope");
  assert.equal(removed, false);
  assert.equal(content, SAMPLE);
});
