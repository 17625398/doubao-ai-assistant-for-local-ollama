# OpenClaw 集成使用指南

## 概述

本项目已成功集成 OpenClaw，提供了完整的个人 AI 助手功能，包括多渠道通讯、语音交互、实时画布、技能系统等。

## 功能特性

### 1. Gateway 管理
- Gateway 状态监控
- 配置管理
- 会话管理

### 2. 多渠道通讯
- 支持 WhatsApp、Telegram、Slack、Discord 等主流通讯渠道
- 通道配置和管理
- 消息路由和处理

### 3. AI 助手核心功能
- 多代理管理
- 对话处理和上下文管理
- 多轮对话和记忆功能

### 4. 语音功能
- 语音唤醒
- 通话模式
- 支持 macOS/iOS/Android 平台

### 5. 实时画布功能
- 画布渲染和交互
- A2UI 交互模式
- 画布服务配置

### 6. 技能系统
- 技能加载、管理和执行
- 内置聊天、知识库、天气、文件操作等技能
- 支持自定义技能

### 7. 安全的 DM 访问控制
- DM 策略配置（pairing、open 等）
- 配对码机制
- 白名单管理

## 快速开始

### 1. 导入服务

```typescript
import {
  chatClawOpenClawService,
  chatClawOpenClawSkillService,
  chatClawGatewayService,
  chatClawAgentService,
  chatClawCanvasService,
  openClawIntegrationExample
} from '@ai-intelligent-analysis-platform/core';
```

### 2. 运行示例

```typescript
// 运行所有示例
await openClawIntegrationExample.runAllExamples();
```

### 3. 管理通道

```typescript
// 获取所有通道
const channels = chatClawOpenClawService.getAllOpenClawChannels();

// 启用通道
chatClawOpenClawService.enableOpenClawChannel('openclaw-telegram');

// 获取通道统计
const stats = chatClawOpenClawService.getOpenClawChannelStats();
```

### 4. 使用技能

```typescript
// 获取所有技能
const allSkills = chatClawOpenClawSkillService.getAllSkills();

// 搜索技能
const searchResults = chatClawOpenClawSkillService.searchSkills('天气');

// 执行技能
const weatherResult = await chatClawOpenClawSkillService.executeSkillTool(
  'weather',
  'getWeather',
  { location: '北京', unit: 'celsius' }
);
```

### 5. 管理代理

```typescript
// 获取所有代理
const agents = chatClawAgentService.getAgents();

// 获取活跃代理
const activeAgent = chatClawAgentService.getActiveAgent();

// 为通道分配代理
chatClawOpenClawService.assignAgentToChannel('openclaw-telegram', activeAgent.id);
```

## 服务说明

### ChatClawOpenClawService
主要的 OpenClaw 集成服务，负责通道管理、DM 访问控制等。

**主要方法**：
- `getAllOpenClawChannels()` - 获取所有通道
- `getOpenClawChannel(channelId)` - 获取指定通道
- `updateOpenClawChannel(channelId, updates)` - 更新通道配置
- `enableOpenClawChannel(channelId)` - 启用通道
- `disableOpenClawChannel(channelId)` - 禁用通道
- `assignAgentToChannel(channelId, agentId)` - 为通道分配代理
- `getOpenClawChannelStats()` - 获取通道统计
- `verifyChannelAuth(channelId)` - 验证通道认证
- `getChannelAuthUrl(channelId)` - 获取通道认证 URL
- `cleanupConversationContexts()` - 清理过期的会话上下文

### ChatClawOpenClawSkillService
技能系统服务，负责技能的加载、管理和执行。

**主要方法**：
- `getAllSkills()` - 获取所有技能
- `getEnabledSkills()` - 获取启用的技能
- `getSkillCategories()` - 获取技能分类
- `getSkillsByCategory(category)` - 获取指定分类的技能
- `searchSkills(query)` - 搜索技能
- `executeSkillTool(skillId, toolName, params)` - 执行技能工具
- `getSkillStats()` - 获取技能统计

### ChatClawGatewayService
Gateway 服务，负责 Gateway 的启动、停止和监控。

**主要方法**：
- `getStatus()` - 获取 Gateway 状态
- `getConfig()` - 获取 Gateway 配置

### ChatClawAgentService
代理服务，负责代理的管理和路由。

**主要方法**：
- `getAgents()` - 获取所有代理
- `getActiveAgent()` - 获取活跃代理

### ChatClawCanvasService
画布服务，负责实时画布的渲染和交互。

**主要方法**：
- `getState()` - 获取画布状态

## 内置技能

### 聊天技能
- `chat` - 基础的 AI 聊天对话功能

### 知识库技能
- `searchKnowledge` - 搜索知识库中的内容
- `uploadDocument` - 上传文档到知识库

### 天气技能
- `getWeather` - 获取指定位置的天气信息

### 文件操作技能
- `listFiles` - 列出目录中的文件
- `readFile` - 读取文件内容
- `writeFile` - 写入文件内容

### 系统信息技能
- `getSystemInfo` - 获取系统信息
- `executeCommand` - 执行系统命令

## 支持的通道

- WhatsApp
- Telegram
- Slack
- Discord
- Google Chat
- Signal
- iMessage
- BlueBubbles
- IRC
- Microsoft Teams
- Matrix
- Feishu
- LINE
- Mattermost
- Nextcloud Talk
- Nostr
- Synology Chat
- Tlon
- Twitch
- Zalo
- Zalo Personal
- WeChat
- WebChat

## 注意事项

1. 确保 Node.js 版本 >= 22.16（推荐 24）
2. 根据需要配置相应的通道 API 密钥
3. 配置 AI 模型 API 密钥（如 OpenAI API Key）
4. 注意安全设置，合理配置 DM 策略
5. 定期清理过期的会话上下文

## 故障排除

### 编译错误
确保所有依赖都已正确安装，运行 `npm install` 安装依赖。

### 通道连接失败
检查通道配置是否正确，确保 API 密钥有效。

### 技能执行失败
检查技能是否已启用，参数是否正确。

## 更多信息

- OpenClaw 官方网站: https://github.com/openclaw/openclaw
- OpenClaw 文档: https://docs.openclaw.io

## 许可证

MIT License
