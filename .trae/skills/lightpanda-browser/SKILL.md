---
name: "lightpanda-browser"
description: "用 Lightpanda（CDP/CLI）渲染执行 JS 后抓取网页内容。用户需要抓动态网页、SPA、或 Jina Reader 不可用时调用。"
---

# Lightpanda Browser（动态网页内容提取）

## 适用场景

- 网页依赖 JavaScript 执行（SPA、Ajax、无限加载），普通 HTTP 抓取拿不到正文
- 需要一个轻量级“可执行 JS 的无头浏览器”来提取 DOM/正文
- 你的网络环境无法访问某些第三方 reader（例如 r.jina.ai），希望改用本地/内网方式抓取

## 上游能力（来自项目说明）

- 提供 CLI：`lightpanda fetch <url>` 可渲染并输出 HTML
- 提供 CDP Server：`lightpanda serve --host 127.0.0.1 --port 9222`，可被 Playwright/Puppeteer 通过 CDP 连接使用

## 在本项目里的使用方式

- Web 应用内置了网页提取接口：`GET /api/read?url=<ENCODED_URL>`
- 该接口支持 `engine` 参数：
  - `engine=auto`（默认）：优先尝试 Lightpanda（若已配置），否则 fallback 到 Jina Reader
  - `engine=lightpanda`：只用 Lightpanda（失败会返回 error）
  - `engine=jina`：只用 Jina Reader

## 启用 Lightpanda（本项目）

在运行 Web 服务的环境里准备好 lightpanda，并设置环境变量：

- `LIGHTPANDA_BIN`：lightpanda 可执行文件路径或命令名（例：`lightpanda` 或绝对路径）
- `LIGHTPANDA_TIMEOUT_MS`：可选，抓取超时（默认 15000）

禁用 Lightpanda：

- `LIGHTPANDA_BIN=disabled`
