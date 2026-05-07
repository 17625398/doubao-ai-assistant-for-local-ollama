---
name: "lightpanda-integration"
description: "Integrates Lightpanda headless browser for advanced web content extraction. Invoke when user wants to enhance web scraping capabilities, handle JavaScript-rendered pages, or improve content extraction accuracy beyond static HTML parsing."
---

# Lightpanda 浏览器集成技能

## 技能概述

本技能整合了 [Lightpanda](https://github.com/lightpanda-io/browser) 无头浏览器，用于优化豆包AI助手的网页内容提取功能。Lightpanda 是一个专为AI和自动化设计的轻量级浏览器，具有超低内存占用（比Chrome少16倍）和极速执行（比Chrome快9倍）的特点。

## 核心优势

### 1. 性能优势
- **超低内存占用**：16倍于Chrome的内存效率
- **极速执行**：9倍于Chrome的执行速度
- **即时启动**：无需等待浏览器启动时间
- **轻量级**：不是Chromium分支，使用Zig从头编写

### 2. 功能特性
- **JavaScript执行**：支持现代Web应用的动态内容
- **Web API支持**：XHR、Fetch API、DOM API
- **CDP兼容**：兼容Playwright、Puppeteer、chromedp
- **网络拦截**：支持请求/响应拦截和修改

### 3. 适用场景
- JavaScript渲染的单页应用（SPA）
- 需要登录态的页面
- 动态加载内容的页面
- 复杂的Web交互场景

## 集成方案

### 方案1: 本地二进制调用
```typescript
// 使用Lightpanda CLI直接抓取
const { spawn } = require('child_process');
const lightpanda = spawn('lightpanda', ['fetch', '--log-level', 'error', url]);
```

### 方案2: CDP服务器模式
```typescript
// 启动CDP服务器，通过Puppeteer连接
// 1. 启动服务器: lightpanda serve --host 127.0.0.1 --port 9222
// 2. 使用Puppeteer连接
const browser = await puppeteer.connect({
  browserWSEndpoint: "ws://127.0.0.1:9222",
});
```

### 方案3: Docker部署
```bash
# 使用Docker快速部署
docker run -d --name lightpanda -p 9222:9222 lightpanda/browser:nightly
```

## 使用场景

### 场景1: JavaScript渲染页面
```
当页面使用React/Vue/Angular等框架渲染时，
使用Lightpanda执行JavaScript后提取最终DOM内容
```

### 场景2: 需要交互的页面
```
对于需要滚动、点击等交互才能加载内容的页面，
使用Lightpanda模拟用户操作后提取内容
```

### 场景3: 登录态页面
```
对于需要Cookie或Session的页面，
使用Lightpanda设置请求头后访问
```

## 技术实现参考

### 基础抓取
```typescript
async function fetchWithLightpanda(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lightpanda = spawn('lightpanda', [
      'fetch',
      '--log-level', 'error',
      '--obey-robots',
      url
    ]);
    
    let output = '';
    lightpanda.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    lightpanda.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Lightpanda exited with code ${code}`));
      }
    });
  });
}
```

### CDP模式高级用法
```typescript
import puppeteer from 'puppeteer-core';

async function extractWithCDP(url: string) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: "ws://127.0.0.1:9222",
  });
  
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  
  // 设置请求头
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0...'
  });
  
  // 等待网络空闲
  await page.goto(url, { waitUntil: "networkidle0" });
  
  // 执行自定义脚本提取内容
  const content = await page.evaluate(() => {
    // 自定义提取逻辑
    return document.body.innerText;
  });
  
  await page.close();
  await context.close();
  await browser.disconnect();
  
  return content;
}
```

### 与现有系统集成
```typescript
// 扩展现有的 /api/read 端点
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || '';
  const engine = searchParams.get('engine') || 'auto'; // 'auto' | 'lightpanda' | 'jina'
  
  // 优先尝试Lightpanda
  if (engine === 'auto' || engine === 'lightpanda') {
    try {
      const content = await fetchWithLightpanda(url);
      return NextResponse.json({ success: true, engine: 'lightpanda', content });
    } catch (error) {
      if (engine === 'lightpanda') {
        return NextResponse.json({ success: false, error: String(error) });
      }
      // 降级到jina
    }
  }
  
  // 使用jina.ai作为后备
  const result = await fetchFromJina(url);
  return NextResponse.json(result);
}
```

## 最佳实践

1. **错误处理**：始终准备降级方案（如jina.ai）
2. **超时控制**：设置合理的超时时间（建议10-30秒）
3. **资源管理**：及时关闭浏览器连接
4. **缓存策略**：缓存已抓取的内容，避免重复请求
5. **Robots协议**：使用 `--obey-robots` 参数尊重网站规则

## 安装部署

### 本地安装
```bash
# Linux
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
chmod a+x ./lightpanda

# macOS
curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-macos && \
chmod a+x ./lightpanda
```

### Docker部署
```bash
docker run -d --name lightpanda -p 9222:9222 lightpanda/browser:nightly
```

### 环境变量
```bash
# 禁用遥测
export LIGHTPANDA_DISABLE_TELEMETRY=true
```
