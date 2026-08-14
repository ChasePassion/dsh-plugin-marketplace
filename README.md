# DSH 插件市场 (dsh-plugin-marketplace)

DeepSeek Harness (DSH) 插件市场：**所有开发者给 DSH 开发的插件的全量目录**——官方随附插件 + npm/GitHub 生态中的社区插件，统一浏览、搜索、一键安装。

> 生态现状：npm 上已有 120+ 个第三方 DSH 插件（`dsh-plugin-*`、`dsh-*` 前缀），但没有任何统一目录，发现与安装全靠手动。

## 仓库结构

| 目录 | 用途 |
|---|---|
| `indexer/` | 索引器：自动扫描 npm，识别 DSH 插件并生成 `registry.json` |
| `registry/` | 生成的插件目录数据（CI 每 6 小时自动产出） |
| `packages/marketplace/` | DSH 端集成包（Host 服务 + 浏览器市场标签页，双面插件） |
| `docs/` | 契约与设计文档 |

## 架构

```
Web GUI: 设置 → 插件 → [市场] 标签页 (dsh-client-ui-marketplace)
   │ ctx.remote.marketplace.* (Typert Remote, 自挂载)
Host: dsh-marketplace (ctx.marketplace)
   ├─ registry 客户端: 拉取/缓存/刷新 registry.json (GitHub Pages)
   ├─ 安装器: pnpm add → 写 cordis.patch.yml (带 # marketplace 标记) → HMR 热生效
   ├─ 卸载器: 移除 patch 块 (可选 pnpm remove)
   ├─ 官方扫描: 本地 @deepseek-ai/dsh-* 全量清单 (启用即写 patch 行)
   └─ 已装状态: patch 行扫描 + pluginInventory 交集
   │ HTTPS
Registry: indexer (GitHub Action) → registry.json → GitHub Pages
```

## 安装与使用

1. 构建市场包并链接进 web profile（重启 DSH 后生效）：
   ```powershell
   cd packages/marketplace
   npm install && node build.mjs
   # 在 $DSH_HOME/profiles/web 的 cordis.patch.yml 追加：
   # - insert:
   #     - id: marketplace
   #       name: '@dsh-marketplace/marketplace'
   ```
2. 打开 DSH Web GUI → 设置 → 插件 → **市场** 标签页
3. 浏览社区插件（自动收录自 npm）与官方插件（本地已随 DSH 安装）
4. 安装 = pnpm add + 写 patch 行（HMR 热生效，无需重启）；卸载/更新/启用/停用同理

## 契约

- `registry.json` v1 见 `docs/contract.md`
- `cordis.patch.yml` 编辑协议：`# marketplace: <id>` 标记块，幂等、行级编辑、保留注释

## 状态

- ✅ Task 1: 索引器（200+ 插件自动收录，GitHub stars 流行度）
- ✅ Task 2: Pages CI（每 6 小时自动刷新）
- ✅ Task 3: Host 半（安装/卸载/更新/启用/停用 + 15 项测试全过）
- ✅ Task 4: Client 半（市场标签页 UI，中文文案）
- 🔄 Task 5: 端到端浏览器验证（待 DSH 实例重启加载插件）
