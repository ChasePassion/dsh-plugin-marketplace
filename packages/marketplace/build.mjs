/**
 * Build script: esbuild for both faces.
 * - dist/index.js  — Host half, ESM, external @deepseek-ai/* / zod / node:*
 * - dist/client.js — Client half, browser script registering a ModuleLoader
 *                    factory (`window.__ModuleLoader__.load`), external react
 *                    and @deepseek-ai/* (resolved by the ModuleLoader at
 *                    runtime), zod vendored into the bundle.
 * - dist/types.d.ts / dist/types.js — shared types re-export.
 */
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");
mkdirSync(DIST, { recursive: true });

const EXTERNAL_DSH = ["@deepseek-ai/*"];

// ── host half ─────────────────────────────────────────────────────
await build({
  entryPoints: [join(__dirname, "src/host.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: join(DIST, "index.js"),
  external: [...EXTERNAL_DSH, "zod"], // node: builtins are external on platform=node
  sourcemap: false,
  logLevel: "warning",
});

// ── client half ───────────────────────────────────────────────────
const clientEntry = join(__dirname, "src/client.tsx");
if (existsSync(clientEntry)) {
  await build({
    entryPoints: [clientEntry],
    bundle: true,
    format: "cjs",
    platform: "browser",
    target: "es2020",
    outfile: join(DIST, "client.bundle.cjs"),
    external: ["react", "react/jsx-runtime", ...EXTERNAL_DSH],
    jsx: "automatic",
    loader: { ".tsx": "tsx" },
    logLevel: "warning",
  });
  const bundle = readFileSync(join(DIST, "client.bundle.cjs"), "utf8");
  const id = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8")).name;
  const wrapped = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(id)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
${bundle}
		return module.exports;
	}
});
`;
  writeFileSync(join(DIST, "client.js"), wrapped, "utf8");
  console.log("client bundle written");
} else {
  console.log("src/client.tsx missing — client bundle skipped");
}

// ── typert host face (registered by dsh-typert-loader) ───────────
await build({
  entryPoints: [join(__dirname, "src/typert.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: join(DIST, "typert.js"),
  external: [...EXTERNAL_DSH, "zod"],
  logLevel: "warning",
});

// ── shared types re-export ────────────────────────────────────────
copyFileSync(join(__dirname, "src/types.ts"), join(DIST, "types.js"));
console.log("build done");