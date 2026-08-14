/**
 * Registry client: fetches registry.json (GitHub Pages by default),
 * caches in memory, supports forced refresh.
 */
import type { RegistryIndex } from "./types";

export class RegistryClient {
  private cache: RegistryIndex | null = null;
  private fetching: Promise<RegistryIndex> | null = null;

  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 15000,
  ) {}

  async list(): Promise<RegistryIndex> {
    if (this.cache) return this.cache;
    return this.fetchOnce();
  }
  async refresh(): Promise<RegistryIndex> {
    const idx = await this.fetchOnce(true);
    return idx;
  }
  private fetchOnce(force = false): Promise<RegistryIndex> {
    if (this.fetching && !force) return this.fetching;
    const p = (async () => {
      const res = await this.fetchImpl(this.url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) {
        if (this.cache) return this.cache; // stale-while-revalidate
        throw new Error(`registry unreachable: HTTP ${res.status}`);
      }
      const idx = (await res.json()) as RegistryIndex;
      this.cache = idx;
      return idx;
    })();
    this.fetching = p;
    p.finally(() => { if (this.fetching === p) this.fetching = null; }).catch(() => {});
    return p;
  }
}
