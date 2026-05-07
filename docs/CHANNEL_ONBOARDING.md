# 渠道入职指南

本文档详细描述了豆包AI助手的渠道入职流程，包括如何添加、配置和管理各种消息渠道。

## 📑 目录

- [渠道入职概述](#渠道入职概述)
- [支持的渠道](#支持的渠道)
- [渠道入职流程](#渠道入职流程)
- [渠道配置指南](#渠道配置指南)
- [渠道管理](#渠道管理)
- [故障排除](#故障排除)

---

## 渠道入职概述

豆包AI助手支持多种消息渠道，用户可以通过这些渠道与AI助手进行交互。渠道入职流程包括以下步骤：

1. **选择渠道**：选择要添加的消息渠道
2. **获取认证信息**：获取渠道所需的认证信息
3. **配置渠道**：在豆包AI助手中配置渠道
4. **测试连接**：测试渠道连接是否正常
5. **启用渠道**：启用渠道，开始使用

---

## 支持的渠道

豆包AI助手支持以下消息渠道：

| 渠道 | 类型 | 认证方式 |
|------|------|----------|
| WhatsApp | 消息应用 | 扫码登录 |
| Telegram | 消息应用 | Bot Token |
| Slack | 团队协作 | API Token |
| Discord | 游戏社区 | Bot Token |
| Google Chat | 企业通讯 | Service Account |
| Signal | 加密通讯 | 电话号码 |
| iMessage | 苹果消息 | BlueBubbles |
| IRC | 聊天网络 | 服务器地址和昵称 |
| Microsoft Teams | 企业通讯 | App Registration |
| Matrix | 开源通讯 | 账号密码 |
| Feishu | 企业通讯 | App ID和Secret |
| LINE | 消息应用 | Channel Token |
| Mattermost | 团队协作 | API Token |
| Nextcloud Talk | 开源通讯 | 账号密码 |
| Nostr | 去中心化社交 | NIP-07 |
| Synology Chat | 企业通讯 | API Token |
| Tlon | 社交网络 | 账号密码 |
| Twitch | 直播平台 | OAuth Token |
| Zalo | 消息应用 | App ID和Secret |
| Zalo Personal | 个人消息 | 电话号码 |
| WeChat | 消息应用 | 公众号/企业号 |
| WebChat | 网页聊天 | 无需认证 |

---

## 渠道入职流程

### 1. 通用入职流程

1. **打开渠道管理界面**：在豆包AI助手的设置中，点击"渠道管理"。
2. **选择渠道类型**：从列表中选择要添加的渠道类型。
3. **填写渠道信息**：根据渠道类型，填写相应的认证信息。
4. **测试连接**：点击"测试连接"按钮，验证渠道连接是否正常。
5. **保存配置**：点击"保存"按钮，保存渠道配置。
6. **启用渠道**：在渠道列表中，将渠道状态设置为"启用"。

### 2. 特定渠道入职流程

#### 2.1 Telegram入职流程

1. **创建Telegram Bot**：
   - 在Telegram中搜索"@BotFather"
   - 发送"/newbot"命令
   - 按照提示创建新的bot
   - 获取Bot Token

2. **配置Telegram渠道**：
   - 在豆包AI助手的渠道管理中，选择"Telegram"
   - 输入Bot Token
   - 设置DM策略（pairing/open）
   - 设置允许的用户ID列表

3. **测试连接**：
   - 点击"测试连接"按钮
   - 向Telegram Bot发送消息，验证是否能收到响应

#### 2.2 WhatsApp入职流程

1. **获取WhatsApp会话**：
   - 在豆包AI助手的渠道管理中，选择"WhatsApp"
   - 点击"生成二维码"
   - 使用WhatsApp手机客户端扫描二维码
   - 完成登录验证

2. **配置WhatsApp渠道**：
   - 设置会话ID
   - 设置DM策略（pairing/open）
   - 设置允许的电话号码列表

3. **测试连接**：
   - 点击"测试连接"按钮
   - 向WhatsApp发送消息，验证是否能收到响应

#### 2.3 Slack入职流程

1. **创建Slack App**：
   - 访问Slack API网站（https://api.slack.com/apps）
   - 点击"Create New App"
   - 选择"From scratch"
   - 填写App名称和工作区
   - 点击"Create App"

2. **配置Slack App**：
   - 在"OAuth & Permissions"中，添加以下权限：
     - chat:write
     - im:history
     - im:read
     - im:write
   - 安装App到工作区
   - 获取Bot User OAuth Token

3. **配置Slack渠道**：
   - 在豆包AI助手的渠道管理中，选择"Slack"
   - 输入Bot User OAuth Token
   - 设置DM策略（pairing/open）
   - 设置允许的用户ID列表

4. **测试连接**：
   - 点击"测试连接"按钮
   - 在Slack中向App发送消息，验证是否能收到响应

---

## 渠道配置指南

### 1. 通用配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| enabled | 是否启用渠道 | false |
| dmPolicy | DM策略（pairing/open） | pairing |
| allowFrom | 允许的用户列表 | [] |
| name | 渠道名称 | 渠道类型名称 |
| description | 渠道描述 | 空 |

### 2. 渠道特定配置项

#### 2.1 Telegram配置

| 配置项 | 说明 | 必需 |
|--------|------|--------|
| token | Telegram Bot Token | 是 |
| chatId | 聊天ID（可选） | 否 |

#### 2.2 WhatsApp配置

| 配置项 | 说明 | 必需 |
|--------|------|--------|
| sessionId | 会话ID | 是 |
| phoneNumber | 电话号码（可选） | 否 |

#### 2.3 Slack配置

| 配置项 | 说明 | 必需 |
|--------|------|--------|
| token | Bot User OAuth Token | 是 |
| channel | 频道名称（可选） | 否 |

### 3. 配置示例

```typescript
// Telegram配置示例
{
  "telegram": {
    "enabled": true,
    "token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    "dmPolicy": "pairing",
    "allowFrom": ["123456789", "987654321"],
    "name": "Telegram",
    "description": "Telegram消息渠道"
  }
}

// WhatsApp配置示例
{
  "whatsapp": {
    "enabled": true,
    "sessionId": "session-1",
    "dmPolicy": "pairing",
    "allowFrom": ["+1234567890", "+0987654321"],
    "name": "WhatsApp",
    "description": "WhatsApp消息渠道"
  }
}

// Slack配置示例
{
  "slack": {
    "enabled": true,
    "token": "xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwxyz",
    "dmPolicy": "pairing",
    "allowFrom": ["U12345678", "U87654321"],
    "name": "Slack",
    "description": "Slack消息渠道"
  }
}
```

---

## 渠道管理

### 1. 渠道列表

在渠道管理界面中，可以查看所有已配置的渠道，包括渠道名称、状态、类型和操作。

### 2. 渠道操作

| 操作 | 说明 |
|------|------|
| 编辑 | 修改渠道配置 |
| 测试 | 测试渠道连接 |
| 启用/禁用 | 启用或禁用渠道 |
| 删除 | 删除渠道 |

### 3. 渠道状态

| 状态 | 说明 |
|------|------|
| 未配置 | 渠道未配置 |
| 已配置 | 渠道已配置但未启用 |
| 启用中 | 渠道已启用 |
| 连接失败 | 渠道连接失败 |
| 认证过期 | 渠道认证信息过期 |

---

## 故障排除

### 1. 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 渠道连接失败 | 网络问题 | 检查网络连接，重试连接 |
| 认证失败 | 认证信息错误 | 检查认证信息，重新配置 |
| 消息发送失败 | 渠道限制 | 检查渠道限制，遵守使用规则 |
| 消息接收失败 | 权限不足 | 检查渠道权限，确保有接收消息的权限 |

### 2. 调试步骤

1. **检查网络连接**：确保网络连接正常
2. **检查认证信息**：确保认证信息正确且未过期
3. **检查渠道状态**：查看渠道状态，了解具体问题
4. **查看日志**：查看应用日志，定位问题原因
5. **重新配置**：重新配置渠道，确保所有设置正确

### 3. 支持资源

- [集成文档](INTEGRATION.md)
- [API文档](API.md)
- [故障排除指南](TROUBLESHOOTING.md)
