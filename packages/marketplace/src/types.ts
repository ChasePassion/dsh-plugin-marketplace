/**
 * Shared types for the DSH plugin marketplace (client-safe).
 * Mirrors docs/contract.md — registry.json v1.
 */
import type { z } from "zod";
import type { TYPERT } from "./typert";

// ── registry index ────────────────────────────────────────────────
export interface RegistryAuthor {
  name: string;
  url: string;
}
export interface RegistryEntry {
  id: string;
  origin: "community";
  name: string;
  summary: string;
  description: string;
  author: RegistryAuthor;
  license: string;
  tags: string[];
  version: string;
  package: string;
  entry: { id: string; name: string; config: Record<string, unknown> };
  verified: boolean;
  homepage: string;
  repository: string;
  icon: string | null;
  stars: number;
  publishedAt: string;
  updatedAt: string;
}
export interface RegistryIndex {
  schemaVersion: number;
  updatedAt: string;
  plugins: RegistryEntry[];
}

// ── official local scan (surfaced alongside registry entries) ─────
export type OfficialPackageKind = "bundle" | "plugin" | "library";
export interface OfficialPackage {
  name: string;
  description: string;
  version: string;
  kind: OfficialPackageKind;
  installed: boolean; // dependency of the active profile
  enabled: boolean;   // patch row with this package name exists
}

// ── installed state from the patch layer ──────────────────────────
export type InstalledSource = "marketplace" | "manual";
export interface InstalledInfo {
  id: string;
  name: string;
  source: InstalledSource;
  marketId: string | null; // "# marketplace: <id>" marker, when marketplace-installed
}

// ── marketplace list row (registry entry + local state merged) ────
export interface MarketplaceEntry extends RegistryEntry {
  local: {
    installed: boolean;
    enabled: boolean;
    localVersion: string | null;
    updateAvailable: boolean;
  };
}
export interface MarketplaceListResult {
  updatedAt: string;
  entries: MarketplaceEntry[];
  official: OfficialPackage[];
  installed: InstalledInfo[];
}

// ── detail ────────────────────────────────────────────────────────
export interface MarketplaceDetailResult {
  entry: MarketplaceEntry;
  readme: string | null;
}

// ── remote results ────────────────────────────────────────────────
export interface MarketplaceActionResult {
  id: string;
  ok: true;
}
export interface MarketplaceRefreshResult {
  updatedAt: string;
}
export interface MarketplaceErrorResult {
  id?: string;
  ok: false;
  code:
    | "not-found"
    | "not-installed"
    | "entry-conflict"
    | "pnpm-failed"
    | "registry-unreachable"
    | "invalid-argument"
    | "internal";
  message: string;
}
export type MarketplaceRemoteResult<T> =
  | (T & { ok: true })
  | (MarketplaceErrorResult & { ok: false });

// install/uninstall/update/enable/disable request
export interface MarketplaceActionRequest {
  id: string;
  version?: string;
  entryOverrides?: { id?: string; config?: Record<string, unknown> };
  removeDeps?: boolean;
}

// ── typert wiring ─────────────────────────────────────────────────
export type { TYPERT };
export type MarketplaceTypert = typeof TYPERT;
