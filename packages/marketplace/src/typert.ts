/**
 * Typert wiring for the marketplace Remote namespace.
 * Hand-written equivalent of @deepseek-ai/dsh-typert-generator output:
 * Host side uses TYPERT.invocations; Client side mounts TYPERT as a
 * contribution via ctx.remote.$mount().
 */
import { z } from "zod";

const idSchema = z.string().min(1);
const actionRequestSchema = z.object({
  id: idSchema,
  version: z.string().optional(),
  entryOverrides: z.object({
    id: z.string().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  removeDeps: z.boolean().optional(),
});
const actionResultSchema = z.object({ id: z.string(), ok: z.literal(true) });
const errorResultSchema = z.object({
  id: z.string().optional(),
  ok: z.literal(false),
  code: z.enum([
    "not-found", "not-installed", "entry-conflict", "pnpm-failed",
    "registry-unreachable", "invalid-argument", "internal",
  ]),
  message: z.string(),
});

export const TYPERT = {
  package: "@dsh-marketplace/marketplace",
  face: "host",
  schemas: [],
  invocations: [
    {
      id: "@dsh-marketplace/marketplace#marketplace/list",
      service: "marketplace",
      namespace: "marketplace",
      method: "list",
      invocation: { kind: "direct" },
      parameters: [{ name: "query", schema: z.string().optional() }, { name: "origin", schema: z.string().optional() }, { name: "installed", schema: z.boolean().optional() }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceListResult", schema: z.unknown() },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/detail",
      service: "marketplace",
      namespace: "marketplace",
      method: "detail",
      invocation: { kind: "direct" },
      parameters: [{ name: "id", schema: idSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceDetailResult", schema: z.unknown() },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/install",
      service: "marketplace",
      namespace: "marketplace",
      method: "install",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", schema: actionRequestSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceActionResult", schema: z.union([actionResultSchema, errorResultSchema]) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/uninstall",
      service: "marketplace",
      namespace: "marketplace",
      method: "uninstall",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", schema: actionRequestSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceActionResult", schema: z.union([actionResultSchema, errorResultSchema]) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/update",
      service: "marketplace",
      namespace: "marketplace",
      method: "update",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", schema: actionRequestSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceActionResult", schema: z.union([actionResultSchema, errorResultSchema]) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/enable",
      service: "marketplace",
      namespace: "marketplace",
      method: "enable",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", schema: actionRequestSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceActionResult", schema: z.union([actionResultSchema, errorResultSchema]) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/disable",
      service: "marketplace",
      namespace: "marketplace",
      method: "disable",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", schema: actionRequestSchema }],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceActionResult", schema: z.union([actionResultSchema, errorResultSchema]) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: "@dsh-marketplace/marketplace#marketplace/refresh",
      service: "marketplace",
      namespace: "marketplace",
      method: "refresh",
      invocation: { kind: "direct" },
      parameters: [],
      result: { mode: "strict", typeSymbol: "@dsh-marketplace/marketplace/types#MarketplaceRefreshResult", schema: z.object({ updatedAt: z.string() }) },
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
  ],
  model: { services: [], events: [], objects: [] },
} as const;
