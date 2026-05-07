---
name: "bb-browser-integration"
description: "Integrates bb-browser to extract web content using real browser login state. Invoke when user needs to extract content from websites requiring authentication, bypassing login walls, or accessing personalized content."
---

# bb-browser 深度集成技能

## 技能概述

本技能整合了 [bb-browser](https://github.com/epiral/bb-browser) 的核心思想："Your browser is the API"，用于优化豆包AI助手的网页内容提取功能，特别是在需要登录状态的场景下。

## 核心优势

### 1. 使用真实浏览器登录状态
- **无需重新登录**：直接使用用户已登录的浏览器会话
- **Cookie 自动携带**：自动使用浏览器的 Cookie 和 Session
- **绕过反爬机制**：网站认为是真实用户访问

### 2. 解决的核心问题
- **登录墙**：需要登录才能访问的内容
- **个性化内容**：基于用户身份的数据
- **复杂认证**：OAuth、2FA、企业 SSO 等
- **动态内容**：JavaScript 渲染的 SPA 应用

### 3. 与现有方案对比

| 特性 | Lightpanda | Jina.ai | bb-browser 方案 |
|------|-----------|---------|----------------|
| 登录状态 | ❌ 无 | ❌ 无 | ✅ 使用真实浏览器 |
| 反爬检测 | ⚠️ 可能被检测 | ⚠️ 可能被限制 | ✅ 不可检测 |
| 复杂认证 | ❌ 不支持 | ❌ 不支持 | ✅ 自动处理 |
| 部署难度 | 中等 | 简单 | 简单 |

## 实现方案

### 方案1: 浏览器扩展模式（推荐）
利用现有的 Chrome 扩展，在已登录的标签页中执行内容提取：

```typescript
// 内容脚本直接访问页面
const content = document.body.innerText;
const cookies = document.cookie;

// 发送回后台
chrome.runtime.sendMessage({
  type: 'extractWithLoginState',
  content,
  url: window.location.href,
  cookies
});
```

### 方案2: CDP 连接现有 Chrome
连接到用户正在运行的 Chrome 实例：

```typescript
// 启动 Chrome 时添加 --remote-debugging-port=9222
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://localhost:9222',
});

// 使用已登录的页面
const pages = await browser.pages();
const page = pages[0]; // 使用第一个已登录的页面
```

### 方案3: Playwright 连接现有浏览器
```typescript
const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0];
```

## 使用场景

### 场景1: 内网系统数据提取
```
用户已登录内网系统，需要提取数据：
1. 在已登录的标签页中执行提取
2. 自动携带 session cookie
3. 获取完整的数据表单内容
```

### 场景2: 社交媒体内容
```
提取 Twitter、知乎、微博等需要登录的内容：
1. 使用已登录的浏览器会话
2. 获取个性化推荐内容
3. 访问私密/关注内容
```

### 场景3: 企业系统自动化
```
访问企业内部的 ERP、CRM、OA 系统：
1. 复用现有的 SSO 登录状态
2. 无需处理复杂的认证流程
3. 直接访问受保护的数据
```

## 技术实现参考

### 扩展内容脚本增强
```typescript
// content-script/index.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'extractWithBrowserState') {
    // 直接访问页面 DOM，包括登录后的内容
    const result = extractPageContent();
    
    // 获取当前页面的 Cookie
    const cookies = document.cookie;
    
    sendResponse({
      success: true,
      content: result.content,
      title: document.title,
      url: window.location.href,
      cookies: cookies, // 可用于后续请求
      loginState: detectLoginState(),
    });
  }
});

function detectLoginState() {
  // 检测常见的登录状态标志
  const indicators = {
    hasLogoutButton: !!document.querySelector('a[href*="logout"], button[class*="logout"]'),
    hasUserAvatar: !!document.querySelector('img[class*="avatar"], .user-avatar'),
    hasUsername: !!document.querySelector('.username, .user-name, [class*="user-name"]'),
    noLoginForm: !document.querySelector('input[type="password"]'),
  };
  
  return {
    isLoggedIn: indicators.hasLogoutButton || indicators.hasUserAvatar || indicators.hasUsername,
    indicators,
  };
}
```

### API 端点增强
```typescript
// /api/read/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const useBrowserState = searchParams.get('useBrowserState') === 'true';
  
  if (useBrowserState) {
    // 通过扩展获取已登录页面的内容
    const result = await extractViaExtension(url);
    return NextResponse.json(result);
  }
  
  // 回退到常规提取
  return NextResponse.json(await engineManager.extract({ url }));
}
```

### 浏览器扩展消息传递
```typescript
// 从 Web 应用发送消息到内容脚本
async function extractViaExtension(url: string) {
  // 查找匹配的标签页
  const tabs = await chrome.tabs.query({ url: `${url}*` });
  
  if (tabs.length === 0) {
    return { 
      success: false, 
      error: '未找到已登录的标签页，请先打开并登录该网站' 
    };
  }
  
  // 向内容脚本发送提取请求
  const response = await chrome.tabs.sendMessage(tabs[0].id, {
    type: 'extractWithBrowserState',
  });
  
  return response;
}
```

## 最佳实践

1. **优先使用扩展模式**
   - 最简单，无需额外配置
   - 直接使用用户的登录状态

2. **提供明确的用户提示**
   - 告知用户需要先登录
   - 显示当前登录状态
   - 提供手动刷新选项

3. **安全考虑**
   - 只在用户明确授权时访问敏感页面
   - 不存储用户的 Cookie
   - 使用 HTTPS 传输数据

4. **错误处理**
   - 检测登录状态变化
   - 处理会话过期
   - 提供重新登录的引导

## 与现有系统集成

### 与 Lightpanda 结合
```typescript
// 优先级策略
const strategies = [
  { name: 'extension', check: () => isExtensionAvailable() },
  { name: 'lightpanda', check: () => lightpandaClient.isAvailable() },
  { name: 'jina', check: () => true },
];

// 按优先级尝试
for (const strategy of strategies) {
  if (await strategy.check()) {
    return await extractWithStrategy(strategy.name, url);
  }
}
```

### 用户界面集成
- 在提取面板添加"使用浏览器登录状态"选项
- 显示当前登录状态指示器
- 提供一键打开目标网站的功能
