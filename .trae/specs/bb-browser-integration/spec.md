# bb-browser 深度集成规格文档

## 为什么

参考 bb-browser 的核心思想 "Your browser is the API"，解决当前网页内容提取无法访问需要登录状态页面的问题。通过利用用户已登录的浏览器会话，可以：
- 绕过登录墙，直接访问需要认证的内容
- 获取个性化的数据（如推荐内容、私有数据）
- 避免复杂的认证流程和反爬机制
- 支持企业内网系统和 SSO 认证

## 变更内容

- **新增** 浏览器扩展内容脚本增强，支持登录状态检测
- **新增** `extractWithBrowserState` 消息类型
- **新增** 登录状态检测和报告功能
- **增强** `/api/read` 端点，支持 `useBrowserState` 参数
- **新增** 浏览器扩展与 Web 应用的消息传递机制
- **新增** 登录状态可视化指示器
- **新增** 一键打开目标网站功能

## 影响范围

- 受影响的组件：WebContentExtractorPanel、浏览器扩展内容脚本
- 受影响的 API：`/api/read`（增强）
- 新增模块：`packages/extension/src/content-script/login-state-extractor.ts`
- 新增组件：LoginStateIndicator、BrowserStateExtractor

## 新增需求

### 需求1: 登录状态检测

系统应能够检测当前页面的登录状态。

#### 场景1.1: 检测登录状态
- **当** 内容脚本在页面中执行
- **然后** 检测以下登录标志：
  - 是否存在登出按钮
  - 是否存在用户头像
  - 是否存在用户名显示
  - 是否存在密码输入框（反向指标）
- **并且** 返回登录状态报告

#### 场景1.2: 登录状态报告
- **当** 检测到登录状态
- **然后** 返回结构化数据：
  ```json
  {
    "isLoggedIn": true,
    "indicators": {
      "hasLogoutButton": true,
      "hasUserAvatar": true,
      "hasUsername": true,
      "noLoginForm": true
    },
    "username": "显示的用户名",
    "userId": "用户ID（如果有）"
  }
  ```

### 需求2: 使用浏览器状态提取内容

系统应支持通过浏览器扩展在已登录页面中提取内容。

#### 场景2.1: 扩展模式提取
- **当** 用户选择"使用浏览器登录状态"选项
- **并且** 点击提取按钮
- **然后** Web 应用向浏览器扩展发送消息
- **并且** 扩展查找匹配的标签页
- **并且** 在标签页中执行内容提取
- **并且** 返回包含登录状态的内容

#### 场景2.2: 标签页匹配
- **当** 需要提取指定 URL 的内容
- **然后** 查询所有标签页
- **并且** 匹配 URL 模式（支持通配符）
- **如果** 找到多个匹配标签页
- **然后** 选择最近活跃的标签页
- **如果** 未找到匹配标签页
- **然后** 提示用户先打开并登录该网站

#### 场景2.3: 内容提取执行
- **当** 找到已登录的标签页
- **然后** 向内容脚本发送提取请求
- **并且** 内容脚本执行：
  - 提取页面文本内容
  - 提取表单数据
  - 提取 iframe 内容（如果可访问）
  - 获取当前 Cookie
  - 检测登录状态
- **并且** 返回完整结果

### 需求3: 消息传递机制

建立 Web 应用与浏览器扩展之间的双向通信。

#### 场景3.1: Web 应用到扩展
- **当** Web 应用需要提取内容
- **然后** 使用 `chrome.runtime.sendMessage` 发送请求
- **并且** 包含以下信息：
  - 目标 URL
  - 提取选项（是否包含 Cookie、是否提取表单等）
  - 超时时间

#### 场景3.2: 扩展到 Web 应用
- **当** 内容脚本完成提取
- **然后** 通过消息传递返回结果
- **并且** 包含：
  - 提取的内容
  - 页面标题和 URL
  - 登录状态信息
  - Cookie（可选）
  - 错误信息（如果有）

#### 场景3.3: 错误处理
- **当** 消息传递失败
- **然后** 返回友好的错误提示
- **并且** 提供解决方案：
  - 扩展未安装：提示安装扩展
  - 标签页未找到：提示打开网站
  - 未登录：提示先登录
  - 权限不足：提示授予权限

### 需求4: 用户界面增强

在 Web 应用中添加登录状态相关的 UI 组件。

#### 场景4.1: 登录状态指示器
- **当** 打开网页内容提取面板
- **并且** 输入目标 URL
- **然后** 检测是否有已登录的标签页
- **并且** 显示状态指示器：
  - 🟢 已登录：显示用户名和登录状态
  - 🟡 未检测：需要手动检测
  - 🔴 未登录：提示先登录

#### 场景4.2: 一键打开网站
- **当** 用户输入目标 URL
- **并且** 未找到已登录的标签页
- **然后** 显示"打开网站"按钮
- **当** 用户点击按钮
- **然后** 在新标签页打开目标 URL
- **并且** 提示用户登录

#### 场景4.3: 提取选项
- **当** 显示提取面板
- **然后** 提供以下选项：
  - [x] 使用浏览器登录状态
  - [ ] 包含 Cookie 信息
  - [ ] 提取表单数据
  - [ ] 提取 iframe 内容

## 修改需求

### 需求5: 增强引擎管理器

**修改内容**：在引擎管理器中添加浏览器扩展作为最高优先级引擎

- 优先级更新：extension > lightpanda > jina > direct > readability
- 添加 `extractWithExtension` 方法
- 支持 `useBrowserState` 选项

## 技术要求

### 浏览器扩展
- 使用 Manifest V3 格式
- 支持 `activeTab` 权限
- 支持 `tabs` 权限（用于查询标签页）
- 支持 `host_permissions`（匹配目标网站）

### 消息传递
- 使用 Chrome Extension Message Passing API
- 支持异步通信
- 超时控制：默认 30 秒
- 错误重试：最多 3 次

### 安全要求
- Cookie 信息只在用户明确同意时返回
- 不存储敏感信息
- 使用 HTTPS 传输数据
- 支持 CORS 策略

## 性能要求

- 标签页查询时间 < 500ms
- 内容提取时间 < 5 秒
- 消息传递延迟 < 100ms
- 支持并发请求：最多 3 个

## API 设计

### 新增参数
```typescript
interface ExtractOptions {
  url: string;
  engine?: 'auto' | 'extension' | 'lightpanda' | 'jina' | 'direct';
  useBrowserState?: boolean;  // 新增
  includeCookies?: boolean;   // 新增
  extractForms?: boolean;     // 新增
  extractIframes?: boolean;   // 新增
}
```

### 新增响应字段
```typescript
interface ExtractResult {
  success: boolean;
  content: string;
  title?: string;
  url: string;
  engine: string;
  loginState?: {              // 新增
    isLoggedIn: boolean;
    username?: string;
    indicators: object;
  };
  cookies?: string;           // 新增（可选）
  metadata?: {
    // ... 原有字段
    extractedAt: string;      // 新增
    loginStateDetected: boolean;  // 新增
  };
}
```
