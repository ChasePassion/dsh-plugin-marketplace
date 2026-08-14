# Registry 契约（registry.json）

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-08-20T00:00:00Z",
  "plugins": [
    {
      "id": "wechat-bridge",
      "kind": "cordis",
      "name": "微信桥接",
      "summary": "Tencent iLink Bot 微信消息桥接",
      "description": "把 DSH 接入微信，支持私聊/群聊消息收发",
      "author": { "name": "ccchase", "url": "https://github.com/ccchase" },
      "license": "MIT",
      "tags": ["chat", "bridge"],
      "version": "0.1.8",
      "package": "@ccchase/dsh-plugin-wechat",
      "entry": {
        "id": "wechat-bridge",
        "name": "@ccchase/dsh-plugin-wechat",
        "config": { "autoStart": true }
      },
      "verified": false,
      "homepage": "https://github.com/ccchase/dsh-plugin-wechat",
      "updatedAt": "2026-08-01T00:00:00Z"
    }
  ]
}
```

- `entry` 是安装时写入 `cordis.patch.yml` 的插件行模板
- `verified: true` 仅限官方组织或通过审核的插件
