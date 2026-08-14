# DSH 插件市场 (dsh-plugin-marketplace)

DeepSeek Harness (DSH) 插件市场：**所有开发者给 DSH 开发的插件的全量目录**——官方随附插件 + npm/GitHub 生态中的社区插件，统一浏览、搜索、一键安装。

> 生态现状：npm 上已有 120+ 个第三方 DSH 插件（`dsh-plugin-*`、`dsh-*` 前缀），但没有任何统一目录，发现与安装全靠手动。

## 仓库结构

| 目录 | 用途 |
|---|---|
| `indexer/` | 索引器：自动扫描 npm / GitHub，识别 DSH 插件并生成 `registry.json` |
| `registry/` | 生成的插件目录数据（CI 自动产出，勿手改） |
| `packages/` | DSH 端集成包（`dsh-host-marketplace` 服务 + `dsh-client-ui-marketplace` 市场标签页） |
| `docs/` | 契约与设计文档 |

## 核心思路

1. **索引器自动收录**（SkillsMP 模式）：开发者 npm 发包即自动入市，零门槛，不靠人工 PR 精选
2. **DSH 内置市场标签页**：设置 → 插件 → 市场，浏览/搜索/一键安装
3. **安装 = 写 `cordis.patch.yml` 插件行**：官方插件本地已存在直接启用；社区插件 `pnpm add` + 写行，HMR 热生效，无需重启
4. **Registry 托管在 GitHub Pages**：静态 `registry.json`，零服务器成本

## 识别信号（判断一个 npm 包是否是 DSH 插件）

- 包名 `dsh-*` / `dsh-plugin-*` 前缀
- keywords 含 `dsh` / `deepseek-harness` / `dsh-plugin` / `cordis`
- 依赖 `@deepseek-ai/dsh-*` 系列包
- package.json 声明 `dsh.bundle` 字段

## 状态

Phase 1 进行中：索引器 + registry + DSH 端市场标签页。
