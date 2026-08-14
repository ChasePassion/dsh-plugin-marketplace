/**
 * MarketplaceGateway: the Host-side Remote service behind ctx.remote.marketplace.
 * Registered via typertRemote binding (source-mode discovery by the API proxy).
 */
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { readPatch, writePatch, appendBlock, removeBlock, scanInstalled, EntryConflictError } from "./patch-editor";
import { RegistryClient } from "./registry";
import { runPnpm } from "./pnpm-runner";
import { scanOfficial, withProfileState } from "./official-scan";
import { profileDir } from "./profile";
import type {
  MarketplaceListResult,
  MarketplaceDetailResult,
  MarketplaceActionResult,
  MarketplaceRefreshResult,
  MarketplaceRemoteResult,
  RegistryIndex,
  RegistryEntry,
  MarketplaceEntry,
  InstalledInfo,
  OfficialPackage,
} from "./types";

const DEFAULT_REGISTRY_URL = "https://chasepassion.github.io/dsh-plugin-marketplace/registry.json";

function idValid(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(id);
}

export interface MarketplaceConfig {
  registryUrl?: string;
  profileName?: string;
  installRoot?: string;
  fetchImpl?: typeof fetch;
}

/** Validate a package name (npm spec-ish, no path traversal). */
function packageNameValid(name: string): boolean {
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}

export class MarketplaceGateway extends TypertRemoteService {
  static inject = [];
  private readonly registry: RegistryClient;
  private readonly profile: string;

  constructor(ctx: any, config: MarketplaceConfig = {}) {
    super(ctx, "marketplace");
    this.profile = config.profileName ?? "web";
    this.registry = new RegistryClient(
      config.registryUrl ?? DEFAULT_REGISTRY_URL,
      config.fetchImpl,
    );
    this.#applyRemoteMarkers();
  }

  /**
   * Manual application of the standard Remote decorator: esbuild transforms
   * decorators with legacy semantics, which the typert-protocol Remote
   * decorator rejects. Applying it by hand keeps the bundle build
   * tool-agnostic. Must run after super() so the instance has its prototype.
   */
  #applyRemoteMarkers(): void {
    const methods = ["list", "detail", "install", "uninstall", "update", "enable", "disable", "refresh"] as const;
    for (const method of methods) {
      const context = {
        kind: "method",
        name: method,
        static: false,
        private: false,
        access: {
          has: (obj: unknown) => method in (obj as object),
          get: (obj: unknown) => (obj as Record<string, unknown>)[method],
        },
        addInitializer: (fn: (this: unknown) => void) => { fn.call(this); },
      };
      Remote(method)((this as unknown as Record<string, unknown>)[method] as never, context as never);
    }
  }

  private async index(): Promise<RegistryIndex> {
    return this.registry.list();
  }

  private installed(): InstalledInfo[] {
    return scanInstalled(readPatch(profileDir(this.profile)));
  }

  private official(): OfficialPackage[] {
    return withProfileState(scanOfficial(), this.profile);
  }

  private async mergeLocal(entry: RegistryEntry): Promise<MarketplaceEntry> {
    const rows = this.installed();
    const row = rows.find((r) => r.id === entry.id || r.name === entry.package);
    const localVersion = row ? await this.localVersionOf(row.name) : null;
    return {
      ...entry,
      local: {
        installed: Boolean(row),
        enabled: Boolean(row),
        localVersion,
        updateAvailable: Boolean(row && localVersion && localVersion !== entry.version),
      },
    };
  }

  private async localVersionOf(packageName: string): Promise<string | null> {
    const dir = profileDir(this.profile);
    try {
      const manifestPath = new URL(`file://${dir}/node_modules/${packageName}/package.json`).pathname
        .replace(/^\/([A-Za-z]:)/, "$1");
      const fs = await import("node:fs");
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      return String(manifest.version ?? null);
    } catch {
      return null;
    }
  }

  async list(query?: string, origin?: string, installedOnly?: boolean): Promise<MarketplaceListResult> {
    const idx = await this.index();
    let entries = idx.plugins;
    const q = (query ?? "").trim().toLowerCase();
    if (q) {
      entries = entries.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (origin && origin !== "all") {
      entries = entries.filter((e) => e.origin === origin);
    }
    const merged = await Promise.all(entries.map((e) => this.mergeLocal(e)));
    if (installedOnly) {
      const filtered = merged.filter((e) => e.local.installed);
      return { updatedAt: idx.updatedAt, entries: filtered, official: this.official(), installed: this.installed() };
    }
    return { updatedAt: idx.updatedAt, entries: merged, official: this.official(), installed: this.installed() };
  }

  async detail(id: string): Promise<MarketplaceDetailResult> {
    const idx = await this.index();
    const entry = idx.plugins.find((p) => p.id === id);
    if (!entry) throw new Error(`not-found: ${id}`);
    let readme: string | null = null;
    if (entry.repository) {
      try {
        const m = entry.repository.match(/(?:github\.com[:\/])([^\/\s]+\/[^\/\s#\.]+)/);
        if (m) {
          const res = await fetch(`https://raw.githubusercontent.com/${m[1]}/HEAD/README.md`, { signal: AbortSignal.timeout(8000) });
          if (res.ok) readme = (await res.text()).slice(0, 60000);
        }
      } catch { readme = null; }
    }
    return { entry: await this.mergeLocal(entry), readme };
  }

  async install(request: { id: string; version?: string; entryOverrides?: { id?: string; config?: Record<string, unknown> } }): Promise<MarketplaceRemoteResult<MarketplaceActionResult>> {
    try {
      const idx = await this.index();
      const entry = idx.plugins.find((p) => p.id === request.id);
      if (!entry) return { id: request.id, ok: false, code: "not-found", message: `plugin '${request.id}' not in registry` };
      if (!packageNameValid(entry.package)) return { id: request.id, ok: false, code: "invalid-argument", message: `invalid package name '${entry.package}'` };
      const entryId = request.entryOverrides?.id ?? entry.entry.id;
      if (!idValid(entryId)) return { id: request.id, ok: false, code: "invalid-argument", message: `invalid plugin id '${entryId}'` };
      const config = request.entryOverrides?.config ?? entry.entry.config;

      const patchFile = profileDir(this.profile);
      const current = readPatch(patchFile);
      // conflict check BEFORE any write
      appendBlock(current, entry.id, { id: entryId, name: entry.package, config });

      const spec = request.version ? `${entry.package}@${request.version}` : entry.package;
      const result = await runPnpm(patchFile, ["add", spec]);
      if (!result.ok) {
        return { id: request.id, ok: false, code: "pnpm-failed", message: result.outputTail };
      }
      writePatch(patchFile, appendBlock(current, entry.id, { id: entryId, name: entry.package, config }));
      return { id: entry.id, ok: true };
    } catch (e) {
      if (e instanceof EntryConflictError) return { id: request.id, ok: false, code: "entry-conflict", message: e.message };
      return { id: request.id, ok: false, code: "internal", message: String(e) };
    }
  }

  async uninstall(request: { id: string; removeDeps?: boolean }): Promise<MarketplaceRemoteResult<MarketplaceActionResult>> {
    const patchFile = profileDir(this.profile);
    const current = readPatch(patchFile);
    const removed = removeBlock(current, request.id);
    if (!removed.removed) return { id: request.id, ok: false, code: "not-installed", message: `'${request.id}' has no marketplace block` };
    if (request.removeDeps) {
      const row = scanInstalled(current).find((r) => r.marketId === request.id);
      if (row?.name) {
        const result = await runPnpm(patchFile, ["remove", row.name]);
        if (!result.ok) return { id: request.id, ok: false, code: "pnpm-failed", message: result.outputTail };
      }
    }
    writePatch(patchFile, removed.content);
    return { id: request.id, ok: true };
  }

  async update(request: { id: string; version?: string }): Promise<MarketplaceRemoteResult<MarketplaceActionResult>> {
    const rows = this.installed();
    const row = rows.find((r) => r.marketId === request.id || r.id === request.id);
    if (!row || !row.name) return { id: request.id, ok: false, code: "not-installed", message: `'${request.id}' is not installed` };
    const spec = request.version ? `${row.name}@${request.version}` : row.name;
    const result = await runPnpm(profileDir(this.profile), ["update", spec]);
    if (!result.ok) return { id: request.id, ok: false, code: "pnpm-failed", message: result.outputTail };
    return { id: request.id, ok: true };
  }

  async enable(request: { id: string }): Promise<MarketplaceRemoteResult<MarketplaceActionResult>> {
    const official = this.official();
    const pkg = official.find((p) => p.name === request.id || p.name === `@deepseek-ai/${request.id}`);
    if (!pkg) return { id: request.id, ok: false, code: "not-found", message: `official package '${request.id}' not found` };
    const patchFile = profileDir(this.profile);
    const current = readPatch(patchFile);
    try {
      const next = appendBlock(current, `official-${pkg.name.replace(/^@deepseek-ai\//, "")}`, { id: `${pkg.name.replace(/^@deepseek-ai\//, "")}`, name: pkg.name });
      writePatch(patchFile, next);
      return { id: pkg.name, ok: true };
    } catch (e) {
      if (e instanceof EntryConflictError) return { id: request.id, ok: false, code: "entry-conflict", message: e.message };
      throw e;
    }
  }

  async disable(request: { id: string }): Promise<MarketplaceRemoteResult<MarketplaceActionResult>> {
    const rows = this.installed();
    const row = rows.find((r) => r.marketId?.startsWith("official-") && (r.name === request.id || r.name === `@deepseek-ai/${request.id}`));
    if (!row?.marketId) return { id: request.id, ok: false, code: "not-installed", message: `no enabled official row for '${request.id}'` };
    const patchFile = profileDir(this.profile);
    const removed = removeBlock(readPatch(patchFile), row.marketId);
    if (!removed.removed) return { id: request.id, ok: false, code: "not-installed", message: "block disappeared" };
    writePatch(patchFile, removed.content);
    return { id: row.name, ok: true };
  }

  async refresh(): Promise<MarketplaceRefreshResult> {
    const idx = await this.registry.refresh();
    return { updatedAt: idx.updatedAt };
  }
}
