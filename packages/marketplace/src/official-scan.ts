/**
 * Official plugin scanner: enumerates @deepseek-ai/dsh-* packages already
 * installed on this machine (the DSH installation and the profile flat
 * fallback), so the marketplace can show every official plugin without a
 * download — "enable" only writes a patch row.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { OfficialPackage, OfficialPackageKind } from "./types";
import { profileDir, dshHome } from "./profile";
import { readPatch, scanInstalled } from "./patch-editor";

const __dirname = dirname(fileURLToPath(import.meta.url));

function kindOf(name: string, manifest: Record<string, unknown>): OfficialPackageKind {
  const dsh = manifest.dsh as { bundle?: unknown } | undefined;
  if (dsh?.bundle) return "bundle";
  const short = name.replace(/^@deepseek-ai\/dsh-(?:host-|client-)?/, "");
  if (/^(tool-|command-|host-|client-|client-ui-|skill-|agent-|web-|mcp-)/.test(short)) return "plugin";
  return "library";
}

/** Walk upward from a directory to the nearest node_modules/@deepseek-ai scope. */
function nearestDshScope(fromDir: string): string | null {
  let dir = fromDir;
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, "node_modules", "@deepseek-ai");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** Candidate roots holding @deepseek-ai packages, most authoritative first. */
export function scanRoots(installRoot?: string): string[] {
  const roots: string[] = [];
  const fallback = join(dshHome(), "profiles", "node_modules", "@deepseek-ai");
  if (existsSync(fallback)) roots.push(fallback);
  if (installRoot && existsSync(join(installRoot, "node_modules", "@deepseek-ai"))) {
    roots.push(join(installRoot, "node_modules", "@deepseek-ai"));
  }
  // nearest scope from this package (covers npm installs and test trees)
  const nearest = nearestDshScope(__dirname);
  if (nearest && !roots.includes(nearest)) roots.push(nearest);
  const prof = join(profileDir(), "node_modules", "@deepseek-ai");
  if (existsSync(prof) && !roots.includes(prof)) roots.push(prof);
  return roots;
}

function readManifest(dir: string): Record<string, unknown> | null {
  const file = join(dir, "package.json");
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; }
}

export function scanOfficial(installRoot?: string): OfficialPackage[] {
  const seen = new Map<string, OfficialPackage>();
  for (const root of scanRoots(installRoot)) {
    for (const dir of readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const name = `@deepseek-ai/${dir.name}`;
      if (seen.has(name)) continue;
      const manifest = readManifest(join(root, dir.name));
      if (!manifest) continue;
      seen.set(name, {
        name,
        description: String(manifest.description ?? ""),
        version: String(manifest.version ?? ""),
        kind: kindOf(name, manifest),
        installed: false,
        enabled: false,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Merge "installed/enabled" state from the active profile. */
export function withProfileState(pkgs: OfficialPackage[], profileName: string): OfficialPackage[] {
  const patch = readPatch(profileDir(profileName));
  const rows = scanInstalled(patch);
  const byName = new Map(rows.map((r) => [r.name, r]));
  return pkgs.map((p) => ({
    ...p,
    installed: byName.has(p.name),
    enabled: byName.has(p.name),
  }));
}
