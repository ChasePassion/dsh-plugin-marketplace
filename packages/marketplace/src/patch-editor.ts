/**
 * Line-level editor for the active profile's cordis.patch.yml.
 *
 * Protocol (docs/contract.md §4.3):
 * - install/enable appends a block at file end, marked `# marketplace: <id>`
 * - the marker is the idempotency key: an existing marker means entry-conflict
 * - disable/uninstall removes exactly that block; all other lines (comments,
 *   hand-written rows) are preserved verbatim
 * - the file is never re-serialized: only line slices are touched
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export interface PatchEntry {
  id: string;
  name: string;
  config?: Record<string, unknown>;
}
export interface InstalledInfo {
  id: string;
  name: string;
  source: "marketplace" | "manual";
  marketId: string | null;
}

export class EntryConflictError extends Error {
  readonly code = "entry-conflict";
  readonly entryId: string;
  constructor(entryId: string) {
    super(`plugin row '${entryId}' already exists in the patch layer`);
    this.entryId = entryId;
  }
}

const MARKER_RE = /^#\s*marketplace:\s*([a-z0-9][a-z0-9-]*)\s*$/i;
const ROW_ID_RE = /^\s{2,}- id:\s*([^\s#]+)/; // insert-list child row
const ROW_NAME_RE = /^\s{4,}name:\s*(\S+)/;
const TOP_LEVEL_RE = /^(?:- |#)/; // top-level row or comment

/** Parse every plugin row currently present in the patch layer. */
export function scanInstalled(content: string): InstalledInfo[] {
  const lines = content.split(/\r?\n/);
  const out: InstalledInfo[] = [];
  let marketId: string | null = null;
  let inInsert = false;
  for (const line of lines) {
    const marker = line.match(MARKER_RE);
    if (marker) { marketId = marker[1]; inInsert = false; continue; }
    if (line.trim() === "- insert:" || /^\s*- insert:/.test(line)) { inInsert = true; continue; }
    if (inInsert) {
      const row = line.match(ROW_ID_RE);
      if (row) {
        // find name on a following indented line within the same block
        let name = "";
        const idx = lines.indexOf(line);
        for (let j = idx + 1; j < Math.min(idx + 10, lines.length); j++) {
          const nl = lines[j];
          const nm = nl.match(ROW_NAME_RE);
          if (nm) { name = nm[1].replace(/^['"](.*)['"]$/, "$1"); break; }
          if (TOP_LEVEL_RE.test(nl) && nl.trim() !== "") break;
        }
        out.push({ id: row[1], name, source: marketId ? "marketplace" : "manual", marketId });
        continue;
      }
      if (TOP_LEVEL_RE.test(line)) inInsert = false;
      continue;
    }
    if (/^- /.test(line)) inInsert = false; // top-level row resets insert state
    if (line.trim() === "") continue;
  }
  return out;
}

/** Serialize one marketplace block (with marker comment). */
export function serializeBlock(marketId: string, entry: PatchEntry): string {
  let block = `# marketplace: ${marketId}\n- insert:\n    - id: ${entry.id}\n      name: ${entry.name}\n`;
  if (entry.config && Object.keys(entry.config).length > 0) {
    block += `      config: ${JSON.stringify(entry.config)}\n`;
  }
  return block;
}

/** Append a marketplace block; rejects on any existing row with the same id/marker. */
export function appendBlock(content: string, marketId: string, entry: PatchEntry): string {
  const existing = scanInstalled(content);
  if (existing.some((p) => p.marketId === marketId || p.id === entry.id)) {
    throw new EntryConflictError(entry.id);
  }
  const block = serializeBlock(marketId, entry);
  const base = content.endsWith("\n") ? content : content + "\n";
  return base + block;
}

/** Remove exactly the block marked with marketId. */
export function removeBlock(content: string, marketId: string): { content: string; removed: boolean } {
  const lines = content.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(MARKER_RE);
    if (m && m[1] === marketId) { start = i; break; }
  }
  if (start === -1) return { content, removed: false };
  let end = start + 1;
  while (end < lines.length) {
    const l = lines[end];
    // block body: the insert row, indented rows, and blank separators
    if (l.trim() === "" || /^\s/.test(l) || l.trim() === "- insert:") { end++; continue; }
    break; // comments and other top-level rows end the block
  }
  // also drop a single blank line left behind by the removed block
  let tail = lines.slice(end);
  if (tail[0] === "") tail = tail.slice(1);
  const next = [...lines.slice(0, start), ...tail];
  return { content: next.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n", removed: true };
}

/** Read the profile patch file (empty string when missing). */
export function readPatch(profileDir: string): string {
  const file = patchPath(profileDir);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}
export function writePatch(profileDir: string, content: string): void {
  writeFileSync(patchPath(profileDir), content, "utf8");
}
export function patchPath(profileDir: string): string {
  return profileDir.endsWith(".yml") ? profileDir : `${profileDir}/cordis.patch.yml`;
}
