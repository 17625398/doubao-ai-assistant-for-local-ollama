# Chrome MCP Server 技能

## 技能名称
Chrome MCP Server

## 技能描述
Chrome MCP Server 是一个基于 Chrome 扩展的 Model Context Protocol (MCP) 服务器，允许 AI 助手控制浏览器，实现复杂的浏览器自动化、内容分析和语义搜索等功能。

## 功能特点
- 直接使用用户的日常 Chrome 浏览器，利用现有的登录状态和配置
- 提供 20+ 工具，包括截图、网络监控、交互式操作、书签管理、浏览历史等
- 支持流式 HTTP 连接和 STDIO 连接
- 内置向量数据库，用于智能浏览器标签内容发现
- 智能内容分析，包括 AI 驱动的文本提取和相似度匹配

## 安装要求
1. 安装 Chrome 浏览器
2. 下载并安装 Chrome MCP Server 扩展
3. 安装 mcp-chrome-bridge 全局包

## 连接配置

### 流式 HTTP 连接（推荐）
```json
{
  "mcpServers": {
    "chrome-mcp-server": {
      "type": "streamableHttp",
      "url": "http://127.0.0.1:12306/mcp"
    }
  }
}
```

### STDIO 连接（备选）
```json
{
  "mcpServers": {
    "chrome-mcp-stdio": {
      "command": "npx",
      "args": [
        "node",
        "/path/to/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js"
      ]
    }
  }
}
```

## 可用工具

### 浏览器管理（6 工具）
- get_windows_and_tabs - 列出所有浏览器窗口和标签
- chrome_navigate - 导航到 URL 并控制视口
- chrome_screenshot - 截取当前页面的屏幕截图
- chrome_click - 模拟点击操作
- chrome_type - 模拟键盘输入
- chrome_scroll - 模拟页面滚动

### 内容分析（4 工具）
- extract_content - 提取页面内容
- semantic_search - 语义搜索浏览器标签内容
- analyze_page - 分析页面结构和内容
- get_page_metadata - 获取页面元数据

### 书签和历史（3 工具）
- get_bookmarks - 获取书签列表
- add_bookmark - 添加书签
- get_browsing_history - 获取浏览历史

### 网络监控（3 工具）
- monitor_network - 监控网络请求
- intercept_request - 拦截网络请求
- get_network_responses - 获取网络响应

### 其他工具（4+ 工具）
- execute_script - 执行 JavaScript 脚本
- get_cookies - 获取 cookies
- set_cookie - 设置 cookie
- clear_cookies - 清除 cookies

## 使用示例

### 导航到网页并截图
```javascript
// 导航到 GitHub
await chrome_navigate({ url: "https://github.com" });

// 截取屏幕截图
const screenshot = await chrome_screenshot({ fullPage: true });
console.log("Screenshot taken:", screenshot);
```

### 提取页面内容
```javascript
// 导航到 Wikipedia
await chrome_navigate({ url: "https://en.wikipedia.org/wiki/JavaScript" });

// 提取页面内容
const content = await extract_content({ selector: "#content" });
console.log("Extracted content:", content);
```

### 语义搜索浏览器标签
```javascript
// 语义搜索与 "machine learning" 相关的标签
const results = await semantic_search({ query: "machine learning", limit: 5 });
console.log("Search results:", results);
```

## 错误处理
- 连接错误：检查 Chrome MCP Server 扩展是否已安装并运行
- 工具执行错误：检查参数是否正确，以及浏览器是否有足够的权限
- 网络错误：检查网络连接是否正常

## 注意事项
- Chrome MCP Server 直接使用用户的浏览器，因此会访问用户的登录状态和个人数据
- 某些操作可能需要用户交互，如 CAPTCHA 验证
- 大量的浏览器操作可能会影响浏览器性能

## 故障排除
1. 确保 Chrome MCP Server 扩展已正确安装并运行
2. 检查连接配置是否正确
3. 确保 mcp-chrome-bridge 已正确安装
4. 检查浏览器是否有足够的权限
5. 查看 Chrome 扩展控制台的错误信息
