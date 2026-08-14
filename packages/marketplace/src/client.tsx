/**
 * Client half of the marketplace: the "市场" tab under Settings > Plugins.
 * Mounts its own Typert Remote contribution (this package ships without
 * touching @deepseek-ai/dsh-api-remotes), then renders the catalog.
 *
 * UI model follows the VS Code extensions view: search, origin filter chips,
 * cards with icon/name/publisher/summary/stars/verified badge/install state,
 * an expandable detail pane with the entry preview, and an install-confirm
 * dialog showing exactly what will be written and executed.
 */
import * as React from "react";
import { TYPERT } from "./typert";

const NS = "settings.marketplace";
const inject = ["slots", "locale", "remote"];

const zh = {
  tab: "市场",
  loading: "正在读取市场…",
  error: "暂时无法读取插件市场。",
  retry: "重试",
  refresh: "刷新",
  search: "搜索插件",
  count: "个插件",
  updatedAt: "更新于",
  filterAll: "全部",
  filterOfficial: "官方",
  filterCommunity: "社区",
  filterInstalled: "已安装",
  installed: "已安装",
  enabled: "已启用",
  updateAvailable: "可更新",
  notInstalled: "未安装",
  verified: "官方",
  stars: "星标",
  install: "安装",
  uninstall: "卸载",
  update: "更新",
  enable: "启用",
  disable: "停用",
  installing: "正在安装…",
  uninstalling: "正在卸载…",
  updating: "正在更新…",
  detail: "详情",
  version: "版本",
  license: "许可",
  repository: "仓库",
  tags: "标签",
  entryPreview: "将写入 cordis.patch.yml",
  pnpmCommand: "将执行的命令",
  confirmTitle: "确认安装插件",
  confirmCancel: "取消",
  confirmInstall: "确认安装",
  confirmUninstallTitle: "确认卸载插件",
  confirmUninstallBody: "将从 cordis.patch.yml 移除该插件行。依赖包默认保留，可在下方勾选一并移除。",
  removeDeps: "同时移除 npm 依赖包",
  operationFailed: "操作失败",
  bundleTag: "组合包",
  pluginTag: "插件",
  libraryTag: "核心库",
  officialSection: "官方插件（本地已随 DSH 安装，启用无需下载）",
  communitySection: "社区插件（来自 npm 生态，自动收录）",
  empty: "暂无匹配的插件。",
  unknownAuthor: "未知作者",
};
const en = {
  tab: "Marketplace",
  loading: "Loading marketplace…",
  error: "Marketplace is temporarily unavailable.",
  retry: "Retry",
  refresh: "Refresh",
  search: "Search plugins",
  count: "plugins",
  updatedAt: "Updated",
  filterAll: "All",
  filterOfficial: "Official",
  filterCommunity: "Community",
  filterInstalled: "Installed",
  installed: "Installed",
  enabled: "Enabled",
  updateAvailable: "Update available",
  notInstalled: "Not installed",
  verified: "Verified",
  stars: "stars",
  install: "Install",
  uninstall: "Uninstall",
  update: "Update",
  enable: "Enable",
  disable: "Disable",
  installing: "Installing…",
  uninstalling: "Uninstalling…",
  updating: "Updating…",
  detail: "Details",
  version: "Version",
  license: "License",
  repository: "Repository",
  tags: "Tags",
  entryPreview: "Will be written to cordis.patch.yml",
  pnpmCommand: "Command to run",
  confirmTitle: "Confirm install",
  confirmCancel: "Cancel",
  confirmInstall: "Install",
  confirmUninstallTitle: "Confirm uninstall",
  confirmUninstallBody: "The plugin row will be removed from cordis.patch.yml. The npm dependency stays by default.",
  removeDeps: "Also remove the npm package",
  operationFailed: "Operation failed",
  bundleTag: "Bundle",
  pluginTag: "Plugin",
  libraryTag: "Core library",
  officialSection: "Official plugins (already installed with DSH; enable without download)",
  communitySection: "Community plugins (auto-indexed from npm)",
  empty: "No matching plugins.",
  unknownAuthor: "Unknown author",
};

const css = [
  ".mkt-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:14px}",
  ".mkt-toolbar{display:flex;align-items:center;gap:8px}",
  ".mkt-search{flex:1;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}",
  ".mkt-search:focus-visible{border-color:var(--dsw-alias-state-business-primary)}",
  ".mkt-chips{display:flex;gap:6px;flex-wrap:wrap}",
  ".mkt-chip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;border-radius:999px;padding:3px 12px;font-size:12px}",
  ".mkt-chip[data-active=true]{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-on-accent)}",
  ".mkt-status{color:var(--dsw-alias-label-tertiary);font-size:13px;margin:0}",
  ".mkt-refresh{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:none;border:none;font-size:13px;text-decoration:underline}",
  ".mkt-sectionTitle{font-size:13px;font-weight:600;margin:4px 0 0}",
  ".mkt-cards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
  "@media (max-width:680px){.mkt-cards{grid-template-columns:minmax(0,1fr)}}",
  ".mkt-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;min-width:0}",
  ".mkt-card[data-open=true]{border-color:var(--dsw-alias-border-l1)}",
  ".mkt-cardHead{width:100%;min-height:56px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:none;border:0;display:flex;align-items:center;gap:10px;padding:10px 12px}",
  ".mkt-icon{width:32px;height:32px;border-radius:6px;background:var(--dsw-alias-bg-module-platform);flex:none;display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden}",
  ".mkt-icon img{width:100%;height:100%;object-fit:cover}",
  ".mkt-title{min-width:0;flex:1}",
  ".mkt-name{font-size:14px;font-weight:600;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px}",
  ".mkt-author{color:var(--dsw-alias-label-tertiary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".mkt-badge{border-radius:999px;padding:1px 8px;font-size:11px;white-space:nowrap}",
  ".mkt-badge[data-kind=installed]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent);color:var(--dsw-alias-state-success-primary)}",
  ".mkt-badge[data-kind=update]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-state-business-primary)}",
  ".mkt-badge[data-kind=verified]{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-on-accent)}",
  ".mkt-badge[data-kind=kind]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}",
  ".mkt-stars{color:var(--dsw-alias-label-tertiary);font-size:12px;flex:none}",
  ".mkt-summary{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0 12px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
  ".mkt-details{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:12px;display:flex;flex-direction:column;gap:10px}",
  ".mkt-meta{display:flex;gap:6px;flex-wrap:wrap}",
  ".mkt-tag{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:5px;padding:1px 8px;font-size:11px}",
  ".mkt-desc{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;margin:0;white-space:pre-wrap}",
  ".mkt-entry{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px;margin:0;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;overflow:auto;white-space:pre;color:var(--dsw-alias-label-primary)}",
  ".mkt-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}",
  ".mkt-btn{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:6px;padding:5px 12px;font-size:13px}",
  ".mkt-btn[data-primary=true]{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:var(--dsw-alias-label-on-accent)}",
  ".mkt-btn[data-danger=true]{color:var(--dsw-alias-state-error-primary)}",
  ".mkt-btn:disabled{opacity:.55;cursor:default}",
  ".mkt-link{color:var(--dsw-alias-state-business-primary);font-size:12px}",
  ".mkt-failure{color:var(--dsw-alias-state-error-primary);font-size:12px;margin:0}",
  ".mkt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:100}",
  ".mkt-dialog{background:var(--dsw-alias-bg-layer-3);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;max-width:560px;width:calc(100% - 32px);max-height:80vh;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}",
  ".mkt-dialog h3{margin:0;font-size:15px}",
  ".mkt-dialog label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-secondary)}",
].join("");

const STYLE_TAG = "@dsh-marketplace/marketplace/marketplace.css";
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-plugin-css=" + JSON.stringify(STYLE_TAG) + "]")) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "@dsh-marketplace/marketplace";
  tag.dataset.pluginCss = STYLE_TAG;
  tag.textContent = css;
  document.head.appendChild(tag);
}

function shortName(name) {
  const base = name.includes("/") ? name.split("/").slice(1).join("-") : name;
  return base.replace(/^dsh-plugin-/, "").replace(/^dsh-/, "");
}

function MarketplaceTab(props) {
  const { t, api } = props;
  const [request, setRequest] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [expanded, setExpanded] = React.useState(null);
  const [state, setState] = React.useState({ status: "loading" });
  const [busy, setBusy] = React.useState(null); // id of in-flight operation
  const [confirm, setConfirm] = React.useState(null); // { entry, action }
  const [removeDeps, setRemoveDeps] = React.useState(false);
  const [opError, setOpError] = React.useState(null);

  React.useEffect(() => {
    let current = true;
    Promise.resolve()
      .then(() => api.list({ query: "", origin: "all", installedOnly: false }))
      .then((snapshot) => { if (current) setState({ status: "ready", snapshot }); }, (e) => {
        console.error("[marketplace] initial list FAILED:", e);
        if (current) setState({ status: "error" });
      });
    return () => { current = false; };
  }, [api, request]);

  const q = query.trim().toLowerCase();
  const allEntries = state.status === "ready" ? state.snapshot.entries : [];
  const official = state.status === "ready" ? state.snapshot.official : [];
  let shown;
  if (filter === "official") {
    shown = official.filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  } else if (filter === "installed") {
    shown = allEntries.filter((e) => e.local.installed && (!q || e.name.toLowerCase().includes(q)));
  } else {
    shown = allEntries.filter((e) => !q || e.name.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q) || e.tags.some((tag) => tag.includes(q)));
  }

  const retry = () => { setState({ status: "loading" }); setRequest((v) => v + 1); };
  const refresh = () => {
    setState({ status: "loading" });
    Promise.resolve(api.refresh()).then(() => setRequest((v) => v + 1), () => setState({ status: "error" }));
  };

  const runAction = async (entry, action) => {
    setBusy(entry.id);
    setOpError(null);
    try {
      if (action === "install") await api.install(entry.id);
      else if (action === "uninstall") await api.uninstall(entry.id, removeDeps);
      else if (action === "update") await api.update(entry.id);
      else if (action === "enable") await api.enable(entry.id);
      else if (action === "disable") await api.disable(entry.id);
      setConfirm(null);
      setRequest((v) => v + 1); // reload list
    } catch (e) {
      console.error("[marketplace] action failed:", action, JSON.stringify(e?.message ?? String(e)));
      setOpError(String(e && e.message ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const renderEntryCard = (e) => {
    const open = expanded === e.id;
    return (
      <li className="mkt-card" data-open={open || undefined} key={e.id}>
        <button type="button" className="mkt-cardHead" aria-expanded={open} onClick={() => setExpanded(open ? null : e.id)}>
          <span className="mkt-icon">{e.icon ? React.createElement("img", { src: e.icon, alt: "" }) : "🧩"}</span>
          <span className="mkt-title">
            <span className="mkt-name">
              {shortName(e.name)}
              {e.verified ? <span className="mkt-badge" data-kind="verified">{t("verified")}</span> : null}
              {e.local.installed ? (
                <span className="mkt-badge" data-kind="installed">{e.local.updateAvailable ? t("updateAvailable") : t("installed")}</span>
              ) : null}
            </span>
            <span className="mkt-author">{e.author.name || t("unknownAuthor")}</span>
          </span>
          <span className="mkt-stars">{e.stars > 0 ? "★ " + e.stars : ""}</span>
        </button>
        <p className="mkt-summary">{e.summary}</p>
        {open ? (
          <div className="mkt-details">
            <p className="mkt-desc">{e.description}</p>
            <div className="mkt-meta">
              <span className="mkt-tag">{t("version")} {e.version}</span>
              <span className="mkt-tag">{t("license")} {e.license}</span>
              {e.tags.slice(0, 5).map((tag) => <span className="mkt-tag" key={tag}>{tag}</span>)}
            </div>
            {e.repository ? <a className="mkt-link" href={e.repository} target="_blank" rel="noreferrer">{t("repository")}</a> : null}
            <p className="mkt-status">{t("entryPreview")}:</p>
            <pre className="mkt-entry">{[
              "# marketplace: " + e.id,
              "- insert:",
              "    - id: " + e.entry.id,
              "      name: " + e.entry.name,
            ].join("\n")}</pre>
            <div className="mkt-actions">
              {!e.local.installed ? (
                <button className="mkt-btn" data-primary="true" type="button" disabled={busy !== null} onClick={() => setConfirm({ entry: e, action: "install" })}>{t("install")}</button>
              ) : null}
              {e.local.installed && e.local.updateAvailable ? (
                <button className="mkt-btn" type="button" disabled={busy !== null} onClick={() => runAction(e, "update")}>{busy === e.id ? t("updating") : t("update")}</button>
              ) : null}
              {e.local.installed ? (
                <button className="mkt-btn" data-danger="true" type="button" disabled={busy !== null} onClick={() => setConfirm({ entry: e, action: "uninstall" })}>{t("uninstall")}</button>
              ) : null}
              {busy === e.id && !e.local.installed ? <span className="mkt-status">{t("installing")}</span> : null}
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  const renderOfficialCard = (p) => {
    const open = expanded === "official-" + p.name;
    const kindLabel = p.kind === "bundle" ? t("bundleTag") : p.kind === "plugin" ? t("pluginTag") : t("libraryTag");
    return (
      <li className="mkt-card" data-open={open || undefined} key={p.name}>
        <button type="button" className="mkt-cardHead" aria-expanded={open} onClick={() => setExpanded(open ? null : "official-" + p.name)}>
          <span className="mkt-icon">📦</span>
          <span className="mkt-title">
            <span className="mkt-name">
              {shortName(p.name)}
              <span className="mkt-badge" data-kind="kind">{kindLabel}</span>
              {p.enabled ? <span className="mkt-badge" data-kind="installed">{t("enabled")}</span> : null}
            </span>
            <span className="mkt-author">{p.name}</span>
          </span>
        </button>
        <p className="mkt-summary">{p.description}</p>
        {open ? (
          <div className="mkt-details">
            <p className="mkt-desc">{p.description}</p>
            <div className="mkt-meta"><span className="mkt-tag">{t("version")} {p.version}</span></div>
            <div className="mkt-actions">
              {p.enabled ? (
                <button className="mkt-btn" data-danger="true" type="button" disabled={busy !== null} onClick={() => runAction({ id: p.name }, "disable")}>{busy === p.name ? t("updating") : t("disable")}</button>
              ) : (
                <button className="mkt-btn" data-primary="true" type="button" disabled={busy !== null} onClick={() => runAction({ id: p.name }, "enable")}>{t("enable")}</button>
              )}
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="mkt-section" aria-busy={state.status === "loading"}>
      {state.status === "loading" ? <p className="mkt-status">{t("loading")}</p> : null}
      {state.status === "error" ? (
        <p className="mkt-failure">{t("error")} <button className="mkt-btn" type="button" onClick={retry}>{t("retry")}</button></p>
      ) : null}
      {state.status === "ready" ? (
        <>
          <div className="mkt-toolbar">
            <input className="mkt-search" type="search" placeholder={t("search")} value={query} onChange={(e) => setQuery(e.currentTarget.value)} aria-label={t("search")} />
            <button className="mkt-refresh" type="button" onClick={refresh}>{t("refresh")}</button>
          </div>
          <div className="mkt-chips">
            {[["all", t("filterAll")], ["official", t("filterOfficial")], ["community", t("filterCommunity")], ["installed", t("filterInstalled")]].map(([key, label]) => (
              <button className="mkt-chip" data-active={filter === key} type="button" key={key} onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>
          <p className="mkt-status">{t("count")}: {filter === "official" ? official.length : shown.length} · {t("updatedAt")} {state.snapshot.updatedAt.slice(0, 10)}</p>
          {opError ? <p className="mkt-failure">{t("operationFailed")}: {opError}</p> : null}
          {filter !== "official" ? (
            <>
              <h3 className="mkt-sectionTitle">{t("communitySection")}</h3>
              {shown.length === 0 ? <p className="mkt-status">{t("empty")}</p> : <ul className="mkt-cards">{shown.map(renderEntryCard)}</ul>}
            </>
          ) : null}
          {(filter === "all" || filter === "official") && official.length > 0 ? (
            <>
              <h3 className="mkt-sectionTitle">{t("officialSection")}</h3>
              <ul className="mkt-cards">{official.map(renderOfficialCard)}</ul>
            </>
          ) : null}
        </>
      ) : null}
      {confirm ? (
        <div className="mkt-overlay" role="dialog" aria-modal="true">
          <div className="mkt-dialog">
            <h3>{confirm.action === "uninstall" ? t("confirmUninstallTitle") : t("confirmTitle")}</h3>
            {confirm.action === "uninstall" ? (
              <>
                <p className="mkt-status">{t("confirmUninstallBody")}</p>
                <label><input type="checkbox" checked={removeDeps} onChange={(e) => setRemoveDeps(e.currentTarget.checked)} /> {t("removeDeps")}</label>
              </>
            ) : (
              <>
                <p className="mkt-desc">{confirm.entry.summary}</p>
                <p className="mkt-status">{t("entryPreview")}:</p>
                <pre className="mkt-entry">{
                  [
                    "# marketplace: " + confirm.entry.id,
                    "- insert:",
                    "    - id: " + confirm.entry.entry.id,
                    "      name: " + confirm.entry.entry.name,
                  ].join("\n")
                }</pre>
                <p className="mkt-status">{t("pnpmCommand")}:</p>
                <pre className="mkt-entry">pnpm add {confirm.entry.package}@{confirm.entry.version}</pre>
              </>
            )}
            <div className="mkt-actions">
              <button className="mkt-btn" type="button" onClick={() => setConfirm(null)}>{t("confirmCancel")}</button>
              <button className="mkt-btn" data-primary="true" type="button" disabled={busy !== null} onClick={() => runAction(confirm.entry, confirm.action)}>
                {confirm.action === "uninstall" ? t("uninstall") : t("confirmInstall")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function apply(ctx) {
  console.log("[marketplace] client apply: registering tab");
  ensureStyle();
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "marketplace: dictionaries");
  const t = ctx.locale.bind(NS);
  let disposeMount = null;
  const mountPromise = Promise.resolve(ctx.remote.$mount(TYPERT)).then(
    (dispose) => { disposeMount = dispose; console.log("[marketplace] remote $mount OK"); },
    (e) => { console.error("[marketplace] remote $mount FAILED:", e); },
  );

  const call = async (method, ...args) => {
    console.log("[marketplace] remote call:", method, JSON.stringify(args));
    let result;
    try {
      result = await ctx.remote.marketplace[method](...args);
    } catch (e) {
      console.error("[marketplace] remote call THREW for", method, e);
      throw e;
    }
    if (!result.ok) {
      console.error("[marketplace] remote call error result:", method, JSON.stringify(result.error ?? result));
      throw new Error((result.error?.code || "remote") + ": " + (result.error?.message ?? JSON.stringify(result.error ?? result)));
    }
    console.log("[marketplace] remote call OK:", method);
    return result.value;
  };
  const api = {
    list: (opts) => call("list", { query: opts?.query ?? "", origin: opts?.origin ?? "all", installedOnly: Boolean(opts?.installedOnly) }),
    refresh: () => call("refresh"),
    install: async (id) => { await mountPromise; const out = await call("install", { id }); if (!out.ok) throw new Error(out.code + ": " + out.message); },
    uninstall: async (id, removeDeps) => { const out = await call("uninstall", { id, removeDeps }); if (!out.ok) throw new Error(out.code + ": " + out.message); },
    update: async (id) => { const out = await call("update", { id }); if (!out.ok) throw new Error(out.code + ": " + out.message); },
    enable: async (id) => { const out = await call("enable", { id }); if (!out.ok) throw new Error(out.code + ": " + out.message); },
    disable: async (id) => { const out = await call("disable", { id }); if (!out.ok) throw new Error(out.code + ": " + out.message); },
  };
  const injected = () => ({ t, api });

  const register = () => ctx.slots.register({
    name: "settings.plugins.tab",
    id: "marketplace",
    order: 20,
    label: () => t("tab"),
    locale: NS,
    inject: injected,
  }, MarketplaceTab);

  const disposeSlot = ctx.slots.inject("settings.plugins.tab", register);
  return () => {
    disposeSlot?.();
    disposeMount?.();
  };
}

export { apply, inject };