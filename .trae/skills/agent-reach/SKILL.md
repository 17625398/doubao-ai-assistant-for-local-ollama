---
name: "agent-reach"
description: "用 Agent Reach（Jina Reader）提取网页正文并转为可喂给模型的文本。用户让你“读链接/提取网页内容/总结网页”时调用。"
---

# Agent Reach（网页内容提取）

## 你能做什么

- 从任意 URL 提取网页主要内容，得到干净的可读文本/Markdown（基于 Agent Reach 选型：Jina Reader）
- 适用于：用户粘贴链接让你总结、对比、提取要点、做笔记、生成结构化信息

## 何时调用

- 用户说：读一下这个链接 / 总结这个网页 / 从网页里提取正文 / 把页面内容整理成要点
- 用户需要把网页内容喂给大模型，但当前上下文只有一个 URL

## 在本项目中的集成用法（推荐）

1) 让前端调用：

- `GET /api/read?url=<ENCODED_URL>`

2) 返回内容追加到对话上下文中再发给模型：

- 追加格式建议：`【网页内容】\n<content>`

## 直接使用 Jina Reader（参考 Agent Reach）

- 读取网页：
  - `https://r.jina.ai/<URL>`
  - 示例：`https://r.jina.ai/https://example.com`

## 输出建议

- 保留标题、章节结构、列表、代码块
- 长内容优先提取：摘要 + 关键段落 + 重要数据/链接
