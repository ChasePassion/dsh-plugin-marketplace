// DeepSeek Harness plugin marketplace indexer.
// Zero-dependency Node script: scans npm registry for DSH plugins,
// enriches metadata (icon, GitHub stars), and writes registry/registry.json.
// Runs locally and in CI (GitHub Actions). See docs/dev/phase1/plan-active/phase1.1-dsh-plugin-marketplace-mvp.md
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REGISTRY_OUT = join(ROOT, "registry", "registry.json");
const STARS_CACHE = join(ROOT, "registry", "cache", "stars.json");

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";
const GH_REPOS = (repo) => `https://api.github.com/repos/${repo}`;

const UA = { "User-Agent": "dsh-marketplace-indexer (github.com/ChasePassion/dsh-plugin-marketplace)" };
const GH_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GH_HEADERS = GH_TOKEN ? { ...UA, Authorization: `Bearer ${GH_TOKEN}` } : UA;

// ---- recognition signals (verified against npm, 2026-08) ----
const STRONG_KEYWORDS = ["dsh-plugin", "deepseek-harness"];
const BLOCKED_PREFIXES = [
  "@babel/", "eslint-", "@typescript-eslint/", "@react-native-harness/",
  "react-native-harness", "create-dsh-plugin", // scaffolder, not a plugin
];
const OFFICIAL_SCOPE = "@deepseek-ai/"; // official packages are surfaced by DSH-local scan, not the registry

// Queries whose union forms the candidate set. Text-search over name/desc is
// too noisy (25w hits); keyword signals are the practical entry point.
const QUERIES = ["keywords:dsh-plugin", "keywords:deepseek-harness", "keywords:dsh"];
const MAX_PAGES = 2; // size=250 per page

// ---- npm helpers ----
async function npmSearch(text, page = 0) {
  const url = `${NPM_SEARCH}?text=${encodeURIComponent(text)}&size=250&from=${page * 250}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`npm search ${text} page ${page} -> HTTP ${res.status}`);
  return res.json();
}

function isRelevant(pkg) {
  const name = pkg.name ?? "";
  const desc = (pkg.description ?? "").toLowerCase();
  if (!name || !desc) return false;
  if (name.startsWith(OFFICIAL_SCOPE)) return false;
  if (BLOCKED_PREFIXES.some((p) => name.startsWith(p))) return false;
  const kw = (pkg.keywords ?? []).map((k) => k.toLowerCase());
  const strong = STRONG_KEYWORDS.some((k) => kw.includes(k));
  const base = name.includes("/") ? name.split("/")[1] : name;
  const nameSignal = base.startsWith("dsh-");
  if (strong) return true; // explicit self-declared DSH plugin
  if (!nameSignal) return false;
  // name-prefix hits still need DSH context (dsh-m-ui etc. are unrelated)
  return (
    base.startsWith("dsh-plugin-") ||
    kw.includes("dsh") ||
    desc.includes("deepseek") ||
    desc.includes("harness") ||
    desc.includes(" dsh")
  );
}

// ---- enrichment ----
function deriveEntryId(name) {
  const base = name.includes("/") ? name.split("/").slice(1).join("-") : name;
  let id = base.toLowerCase()
    .replace(/^dsh-plugin-/, "")
    .replace(/^dsh-/, "");
  if (!id) id = base.toLowerCase();
  id = id.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return id || "plugin";
}

function repoFromLinks(links) {
  const raw = links?.repository ?? "";
  const m = raw.match(/(?:github\.com[:\/])([^\/\s]+\/[^\/\s#\.]+)/);
  return m ? m[1].replace(/\.git$/, "") : null;
}

function summaryOf(desc) {
  const first = desc.split(/[\n。]/)[0].trim();
  return first.length > 120 ? first.slice(0, 117) + "…" : first;
}

function tagsOf(keywords) {
  const meta = new Set(["dsh", "dsh-plugin", "deepseek-harness", "deepseek", "harness",
    "plugin", "cordis", "dsh-bundle", "agent", "ai", "cli", "mcp", "mcp-server",
    "claude-code", "codex", "chatgpt", "typescript", "javascript", "node"]);
  return (keywords ?? [])
    .map((k) => String(k).toLowerCase().replace(/[^a-z0-9-]/g, "-"))
    .filter((k) => k && !meta.has(k) && !k.startsWith("dsh"))
    .slice(0, 5);
}

// ---- GitHub stars (cached, rate-limit friendly) ----
function loadStarsCache() {
  if (!existsSync(STARS_CACHE)) return {};
  try { return JSON.parse(readFileSync(STARS_CACHE, "utf8")); } catch { return {}; }
}

async function fetchStars(repo, cache) {
  const hit = cache[repo];
  if (hit && hit.fetchedAt) return hit.stars; // only trust completed fetches
  try {
    const res = await fetch(GH_REPOS(repo), { headers: GH_HEADERS });
    if (res.status === 403 || res.status === 429) {
      console.warn(`github rate limit hit at ${repo}; remaining repos stay 0 until next run`);
      return null; // signal: stop fetching
    }
    if (!res.ok) return 0;
    const data = await res.json();
    return data.stargazers_count ?? 0;
  } catch {
    return 0;
  }
}

// ---- main ----
async function main() {
  console.log("indexer: collecting candidates from npm search...");
  const seen = new Map(); // name -> search package object
  for (const q of QUERIES) {
    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const data = await npmSearch(q, page);
        for (const obj of data.objects ?? []) {
          const pkg = obj.package;
          if (isRelevant(pkg) && !seen.has(pkg.name)) seen.set(pkg.name, pkg);
        }
        console.log(`  ${q} page ${page + 1}: ${(data.objects ?? []).length} rows, ${seen.size} unique candidates`);
        if ((data.objects ?? []).length < 250) break; // no more pages
      } catch (e) {
        console.warn(`  ${q} page ${page + 1} failed: ${e.message}`);
        break;
      }
    }
  }
  console.log(`indexer: ${seen.size} relevant packages`);

  // entry id uniqueness (name -> final id)
  const ids = new Map();
  const used = new Set();
  for (const pkg of seen.values()) {
    let id = deriveEntryId(pkg.name);
    if (used.has(id)) id = (pkg.name.includes("/") ? pkg.name.split("/").join("-") : pkg.name).toLowerCase();
    used.add(id);
    ids.set(pkg.name, id);
  }

  // GitHub stars (serial to respect the anonymous 60/hr limit; cached)
  const cache = loadStarsCache();
  let stopped = false;
  const repos = [...new Set([...seen.values()].map((p) => repoFromLinks(p.links)).filter(Boolean))];
  console.log(`indexer: fetching ${repos.length} GitHub repos for stars...`);
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    if (stopped) { cache[repo] = { stars: cache[repo]?.stars ?? 0, fetchedAt: null }; continue; }
    const stars = await fetchStars(repo, cache);
    if (stars === null) { stopped = true; cache[repo] = { stars: cache[repo]?.stars ?? 0, fetchedAt: null }; continue; }
    cache[repo] = { stars, fetchedAt: new Date().toISOString() };
    if (i % 10 === 0) console.log(`  stars ${i + 1}/${repos.length}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  mkdirSync(dirname(STARS_CACHE), { recursive: true });
  writeFileSync(STARS_CACHE, JSON.stringify(cache, null, 2) + "\n", "utf8");

  const now = new Date().toISOString();
  const plugins = [];
  for (const pkg of seen.values()) {
    const repo = repoFromLinks(pkg.links);
    const owner = repo?.split("/")[0];
    const stars = repo ? (cache[repo]?.stars ?? 0) : 0;
    const icon = pkg.icon && /^https?:\/\//.test(pkg.icon)
      ? pkg.icon
      : owner ? `https://avatars.githubusercontent.com/${owner}?size=96` : null;
    plugins.push({
      id: ids.get(pkg.name),
      origin: "community",
      name: pkg.name,
      summary: summaryOf(pkg.description),
      description: pkg.description,
      author: (() => {
        const authorName = pkg.maintainers?.[0]?.username ?? pkg.publisher?.username ?? "";
        return { name: authorName, url: authorName ? `https://www.npmjs.com/~${authorName}` : "" };
      })(),
      license: pkg.license ?? "unknown",
      tags: tagsOf(pkg.keywords),
      version: pkg.version,
      package: pkg.name,
      entry: { id: ids.get(pkg.name), name: pkg.name, config: {} },
      verified: false,
      homepage: pkg.links?.homepage ?? pkg.links?.npm ?? "",
      repository: repo ? `https://github.com/${repo}` : "",
      icon,
      stars,
      publishedAt: pkg.date ?? now,
      updatedAt: pkg.date ?? now,
    });
  }
  plugins.sort((a, b) => (b.stars - a.stars) || a.name.localeCompare(b.name));

  const out = { schemaVersion: 1, updatedAt: now, plugins };
  mkdirSync(dirname(REGISTRY_OUT), { recursive: true });
  const tmp = REGISTRY_OUT + ".tmp";
  writeFileSync(tmp, JSON.stringify(out, null, 2) + "\n", "utf8");
  writeFileSync(REGISTRY_OUT, readFileSync(tmp, "utf8"), "utf8");
  console.log(`indexer: wrote ${plugins.length} plugins to registry/registry.json`);
}

main().catch((e) => { console.error("indexer failed:", e); process.exit(1); });
