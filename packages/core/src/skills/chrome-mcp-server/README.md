# Chrome MCP Server 技能文档

## 技能介绍

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

## 安装步骤

### 1. 安装 Chrome 浏览器

如果您还没有安装 Chrome 浏览器，请从官方网站下载并安装：[https://www.google.com/chrome/](https://www.google.com/chrome/)

### 2. 安装 Chrome MCP Server 扩展

1. 从 GitHub 下载最新的 Chrome 扩展：[https://github.com/hangwin/mcp-chrome/releases](https://github.com/hangwin/mcp-chrome/releases)
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 启用 "开发者模式"
4. 点击 "加载已解压的扩展程序"，选择您下载的扩展文件夹
5. 点击扩展图标，然后点击 "Connect" 按钮

### 3. 安装 mcp-chrome-bridge 全局包

使用 npm 或 pnpm 安装 mcp-chrome-bridge 全局包：

```bash
# 使用 npm
npm install -g mcp-chrome-bridge

# 使用 pnpm
pnpm config set enable-pre-post-scripts true
pnpm install -g mcp-chrome-bridge
```

## 配置方法

### 流式 HTTP 连接（推荐）

在 Doubao 的 MCP 配置中添加以下配置：

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

如果您的客户端只支持 STDIO 连接方式，请使用以下配置：

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

## 使用方法

### 在 Doubao 中使用 Chrome MCP Server 技能

1. 打开 Doubao 技能库
2. 搜索并添加 "Chrome MCP Server" 技能
3. 进入技能配置页面，设置连接参数
4. 测试连接，确保 Chrome MCP Server 正常运行
5. 开始使用 Chrome MCP Server 的工具

### 常用工具示例

#### 导航到网页并截图

```javascript
// 导航到 GitHub
await chrome_navigate({ url: "https://github.com" });

// 截取屏幕截图
const screenshot = await chrome_screenshot({ fullPage: true });
console.log("Screenshot taken:", screenshot);
```

#### 提取页面内容

```javascript
// 导航到 Wikipedia
await chrome_navigate({ url: "https://en.wikipedia.org/wiki/JavaScript" });

// 提取页面内容
const content = await extract_content({ selector: "#content" });
console.log("Extracted content:", content);
```

#### 语义搜索浏览器标签

```javascript
// 语义搜索与 "machine learning" 相关的标签
const results = await semantic_search({ query: "machine learning", limit: 5 });
console.log("Search results:", results);
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

## 故障排除

### 连接问题

1. 确保 Chrome MCP Server 扩展已正确安装并运行
2. 检查连接配置是否正确
3. 确保 mcp-chrome-bridge 已正确安装
4. 检查浏览器是否有足够的权限
5. 查看 Chrome 扩展控制台的错误信息

### 工具执行问题

1. 检查工具参数是否正确
2. 确保浏览器有足够的权限执行操作
3. 检查网络连接是否正常
4. 查看 Chrome 扩展控制台的错误信息

## 注意事项

- Chrome MCP Server 直接使用用户的浏览器，因此会访问用户的登录状态和个人数据
- 某些操作可能需要用户交互，如 CAPTCHA 验证
- 大量的浏览器操作可能会影响浏览器性能
- 请遵循 Chrome MCP Server 的开源许可证

## 技术架构

### 核心组件

1. **ChromeMCPClient** - 与 Chrome MCP Server 通信的客户端
2. **ChromeMCPTools** - 封装 Chrome MCP Server 工具的类
3. **ChromeMCPSkill** - 集成到 Doubao 技能系统的技能类
4. **ChromeMCPServerConfig** - 用户界面配置组件

### 通信方式

- **流式 HTTP 连接** - 推荐的连接方式，使用 HTTP 协议与 Chrome MCP Server 通信
- **STDIO 连接** - 备选连接方式，使用标准输入输出与 Chrome MCP Server 通信

## 版本历史

### v1.0.1
- 改进了技能库功能
- 实现了技能库窗口可移动功能
- 修复了配置窗口被技能库窗口遮挡的问题
- 调整了窗口层级关系，确保配置窗口显示在最前面
- 优化了用户界面交互体验

### v1.0.0
- 初始版本
- 实现了与 Chrome MCP Server 的通信接口
- 封装了 Chrome MCP Server 的工具
- 集成到 Doubao 技能系统
- 提供了用户界面配置

## 贡献

如果您发现任何问题或有任何建议，请在 GitHub 上提交 issue 或 pull request。

## 许可证

Chrome MCP Server 技能遵循 MIT 许可证。
