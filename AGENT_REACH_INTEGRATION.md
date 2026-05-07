# Agent-Reach 集成指南

## 概述

Agent-Reach 是为 AI Agent 提供互联网访问能力的深度集成模块，借鉴自 [zhimaAi/ChatClaw](https://github.com/zhimaAi/ChatClaw) 和 [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach) 项目。

## 核心功能

### 支持的渠道

| 渠道 | 功能 | 状态 |
|------|------|------|
| **Jina Reader** | 网页内容提取 | ✅ 可用 |
| **Exa Search** | 语义搜索 | ⚙️ 需 API Key |
| **DuckDuckGo** | 备选搜索 | ✅ 可用 |
| **GitHub** | 代码仓库信息 | ✅ 可用 |
| **YouTube** | 视频信息/字幕 | ✅ 可用 |
| **Bilibili** | 视频信息 | ✅ 可用 |
| **RSS/Atom** | 订阅源解析 | ✅ 可用 |
| **Twitter/X** | 社交内容 | ✅ 可用 |
| **Reddit** | 社区内容 | ✅ 可用 |
| **LinkedIn** | 职业内容 | ⚠️ 需认证 |
| **Facebook** | 公开页面/群组 | ⚠️ 需认证 |
| **Instagram** | 公开主页/话题 | ⚠️ 需认证 |

### API Key 配置

```typescript
import { agentReachService } from '@ai-intelligent-analysis-platform/core';

// 配置 Exa API Key（用于高质量语义搜索）
agentReachService.setExaApiKey('your-exa-api-key');

// 获取配置状态
const hasKey = agentReachService.getExaApiKey();
```

## 快速开始

### 1. 基础使用

```typescript
import { agentReachService } from '@ai-intelligent-analysis-platform/core';

// 读取网页内容
const page = await agentReachService.readWebPage('https://example.com');
console.log(page.title, page.content);

// 全网搜索
const results = await agentReachService.search('AI news', { numResults: 10 });
console.log(results);

// 获取 GitHub 仓库信息
const repo = await agentReachService.getGitHubInfo({
  action: 'repo',
  owner: 'facebook',
  repo: 'react'
});

// 获取视频字幕
const video = await agentReachService.getVideoInfo('https://youtube.com/watch?v=xxx', {
  extractSubtitles: true
});
```

### 2. AI Agent 集成

```typescript
import { 
  ChatClawAgentService, 
  createAgentReachTools 
} from '@ai-intelligent-analysis-platform/core';
import { agentReachService } from '@ai-intelligent-analysis-platform/core';

// 创建 AgentReach 工具集
const reachTools = createAgentReachTools(agentReachService);

// 创建具备互联网访问能力的 Agent
const agent = new ChatClawAgentService({
  name: 'Research Agent',
  description: '研究助手，可搜索互联网信息',
  tools: reachTools,
  systemPrompt: '你是一个研究助手，可以搜索互联网获取最新信息。'
});

// Agent 自动使用工具搜索
const result = await agent.execute('帮我查找今天有什么 AI 新闻');
```

### 3. 社交媒体获取

```typescript
// Reddit 搜索
const redditPosts = await agentReachService.getRedditInfo({
  action: 'subreddit',
  subreddit: 'programming',
  sort: 'hot',
  limit: 10
});

// Twitter 用户信息
const twitterUser = await agentReachService.getTwitterInfo({
  action: 'user',
  username: 'elonmusk'
});

// Twitter 关键词搜索
const tweets = await agentReachService.getTwitterInfo({
  action: 'search',
  query: 'AI technology',
  maxResults: 20
});

// Facebook 页面获取
const facebookPage = await agentReachService.getFacebookInfo({
  action: 'page',
  pageId: 'facebook'
});

// Facebook 群组搜索
const facebookGroup = await agentReachService.getFacebookInfo({
  action: 'group',
  groupId: 'programming'
});

// Facebook 关键词搜索
const facebookSearch = await agentReachService.getFacebookInfo({
  action: 'search',
  query: 'web development',
  limit: 10
});

// Facebook 帖子读取
const facebookPost = await agentReachService.getFacebookInfo({
  action: 'post',
  postUrl: 'https://www.facebook.com/xxxx/posts/xxxxx'
});

// Instagram 用户主页
const instagramProfile = await agentReachService.getInstagramInfo({
  action: 'profile',
  username: 'instagram'
});

// Instagram 话题标签
const instagramHashtag = await agentReachService.getInstagramInfo({
  action: 'hashtag',
  hashtag: 'photography',
  limit: 12
});

// Instagram 搜索
const instagramSearch = await agentReachService.getInstagramInfo({
  action: 'search',
  query: 'landscape photo'
});

// Instagram 帖子读取
const instagramPost = await agentReachService.getInstagramInfo({
  action: 'post',
  postUrl: 'https://www.instagram.com/p/xxxxx/'
});
```

### 4. 缓存管理

```typescript
// 获取缓存统计
const stats = agentReachService.getCacheStats();
console.log(`
  缓存条目: ${stats.size}
  命中率: ${stats.hitRate}
  命中次数: ${stats.hits}
  未命中: ${stats.misses}
`);

// 清除缓存
agentReachService.clearCache(); // 清除所有
agentReachService.clearCache('search'); // 只清除搜索缓存
```

### 5. 渠道诊断

```typescript
// 检查所有渠道状态
const diagnosis = await agentReachService.diagnose();
console.log(`
  整体状态: ${diagnosis.overall}
  可用渠道: ${diagnosis.channels.filter(c => c.available).length}/${diagnosis.channels.length}
`);

// 查看各渠道详情
diagnosis.channels.forEach(ch => {
  console.log(`${ch.name}: ${ch.available ? '✅' : '❌'} ${ch.error || ''}`);
});
```

## Web UI 使用

### 访问路径
1. 打开应用主界面
2. 进入 **ChatClaw/OpenClaw 配置面板**
3. 点击 **Agent-Reach** 标签页

### 功能模块

#### 1. 渠道状态诊断
- 实时显示所有渠道可用性
- 整体健康状态指示
- 问题和建议提示

#### 2. Exa API 配置
- 输入 Exa API Key
- 保存后自动启用高质量搜索

#### 3. 全网搜索
- 输入关键词搜索
- 显示标题、摘要、URL

#### 4. 网页读取
- 输入任意网页 URL
- 自动提取内容
- 显示阅读时间估算

#### 5. Reddit 内容
- 订阅板块浏览
- 关键词搜索

#### 6. Twitter/X 内容
- 用户资料获取
- 推文搜索

#### 7. 缓存管理
- 查看缓存统计
- 清除缓存

## 工具函数参考

### `createAgentReachTools(service)`

创建可注册到 Agent 的工具数组：

| 工具名称 | 参数 | 描述 |
|----------|------|------|
| `internet_search` | query, num_results | 搜索互联网 |
| `read_webpage` | url, extract | 读取网页内容 |
| `search_github` | query, type, limit | 搜索 GitHub |
| `get_video_info` | url, extract_subtitles, extract_transcript | 获取视频信息 |
| `get_reddit` | action, subreddit, post_id, username, query, sort, limit | Reddit 内容 |
| `get_twitter` | action, username, tweet_id, query, limit | Twitter 内容 |
| `get_facebook` | action, page_id, group_id, query, post_url, limit | Facebook 内容 |
| `get_instagram` | action, username, hashtag, query, post_url, limit | Instagram 内容 |
| `get_rss` | url, limit | RSS 订阅源 |

## 缓存策略

| 数据类型 | TTL | 最大条目 |
|----------|-----|----------|
| 搜索结果 | 5 分钟 | 100 |
| 网页内容 | 30 分钟 | 50 |
| GitHub 数据 | 10 分钟 | 50 |
| 社交媒体 | 2 分钟 | 100 |

## 注意事项

1. **速率限制**：注意 API 调用频率限制
2. **认证要求**：部分渠道（如 LinkedIn、Facebook、Instagram）需要额外认证
3. **网络环境**：确保网络可访问外部服务
4. **缓存清理**：定期清理缓存避免过期数据
5. **公开内容**：Facebook/Instagram 主要获取公开页面和话题内容，隐私内容需要认证

## 获取 API Key

- **Exa**: https://exa.ai （有免费额度）
- **Jina Reader**: 免费使用
- **GitHub**: 无需认证（有速率限制）
