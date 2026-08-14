/**
 * Typert wiring for the marketplace Remote namespace.
 * Hand-written equivalent of @deepseek-ai/dsh-typert-generator output:
 * - Host side: TYPERT (face "host") registered by @deepseek-ai/dsh-typert-loader
 *   via the `./typert` export.
 * - Client side: the same manifest shape is bundled into the client half and
 *   mounted with ctx.remote.$mount().
 *
 * Invocation shape follows the generator contract: single "request" JSON
 * parameter (or none), strict codecs backed by zod v4 schemas.
 */
import { z } from "zod";

const idSchema = z.object({ id: z.string().min(1) });
const listRequestSchema = z.object({
  query: z.string().optional(),
  origin: z.string().optional(),
  installedOnly: z.boolean().optional(),
});
const actionRequestSchema = z.object({
  id: z.string().min(1),
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

function codec(typeSymbol, schema) {
  return { mode: "strict", typeSymbol, schema };
}

const PACKAGE = "@dsh-marketplace/marketplace";
const LIST_RESULT = PACKAGE + "/types#MarketplaceListResult";
const DETAIL_RESULT = PACKAGE + "/types#MarketplaceDetailResult";
const ACTION_RESULT = PACKAGE + "/types#MarketplaceActionResult";
const REFRESH_RESULT = PACKAGE + "/types#MarketplaceRefreshResult";

export const TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas: [],
  invocations: [
    {
      id: PACKAGE + "#marketplace/list",
      service: "marketplace",
      namespace: "marketplace",
      method: "list",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceListRequest", listRequestSchema) }],
      result: codec(LIST_RESULT, z.unknown()),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/detail",
      service: "marketplace",
      namespace: "marketplace",
      method: "detail",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceIdRequest", idSchema) }],
      result: codec(DETAIL_RESULT, z.unknown()),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/install",
      service: "marketplace",
      namespace: "marketplace",
      method: "install",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceActionRequest", actionRequestSchema) }],
      result: codec(ACTION_RESULT, z.union([actionResultSchema, errorResultSchema])),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/uninstall",
      service: "marketplace",
      namespace: "marketplace",
      method: "uninstall",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceActionRequest", actionRequestSchema) }],
      result: codec(ACTION_RESULT, z.union([actionResultSchema, errorResultSchema])),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/update",
      service: "marketplace",
      namespace: "marketplace",
      method: "update",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceActionRequest", actionRequestSchema) }],
      result: codec(ACTION_RESULT, z.union([actionResultSchema, errorResultSchema])),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/enable",
      service: "marketplace",
      namespace: "marketplace",
      method: "enable",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceActionRequest", actionRequestSchema) }],
      result: codec(ACTION_RESULT, z.union([actionResultSchema, errorResultSchema])),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/disable",
      service: "marketplace",
      namespace: "marketplace",
      method: "disable",
      invocation: { kind: "direct" },
      parameters: [{ name: "request", wire: "request", source: "json", codec: codec(PACKAGE + "/types#MarketplaceActionRequest", actionRequestSchema) }],
      result: codec(ACTION_RESULT, z.union([actionResultSchema, errorResultSchema])),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
    {
      id: PACKAGE + "#marketplace/refresh",
      service: "marketplace",
      namespace: "marketplace",
      method: "refresh",
      invocation: { kind: "direct" },
      parameters: [],
      result: codec(REFRESH_RESULT, z.object({ updatedAt: z.string() })),
      sourceLocation: { file: "packages/marketplace/src/gateway.ts", line: 1, column: 1 },
    },
  ],
  model: { services: [], events: [], objects: [] },
} as const;
