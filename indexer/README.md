# 索引器

自动扫描 npm registry，识别 DSH 插件，生成 `registry.json`。

## 识别信号

1. `keywords` 含 `dsh-plugin` / `deepseek-harness` / `dsh` / `cordis`
2. 包名 `dsh-*` / `dsh-plugin-*` 前缀
3. 依赖 `@deepseek-ai/dsh-*` 系列包（需拉取 tarball 检查或依赖反向依赖服务）

## 过滤噪声

- 排除 `@babel/*`、`eslint-*` 等误命中（信号 1 关键词过宽）
- 排除与 DSH 无关但名字含 dsh 的包
- 校验：包必须实际可安装（`npm view` 成功）、描述存在

## 输出

`registry/registry.json`（契约见 `docs/contract.md`），CI 发布到 GitHub Pages。
