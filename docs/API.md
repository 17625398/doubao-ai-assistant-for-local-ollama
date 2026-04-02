# API 接口文档

本文档详细描述了豆包AI助手重构项目的所有 API 接口，包括 Chrome Extension API 和 Web 应用 API。

## 📑 目录

- [Chrome Extension API](#chrome-extension-api)
  - [消息通信](#消息通信)
  - [Storage API](#storage-api)
  - [权限说明](#权限说明)
- [Web 应用 API](#web-应用-api)
  - [HTTP 接口](#http-接口)
  - [组件接口](#组件接口)
  - [Hooks](#hooks)
- [类型定义](#类型定义)

---

## Chrome Extension API

### 消息通信

扩展内部使用 `chrome.runtime.sendMessage` 进行跨上下文通信。

#### 消息格式

```typescript
interface MessagePayload {
  type: string;      // 消息类型
  data?: unknown;    // 消息数据
  url?: string;      // URL 参数（用于关闭页面等）
}

interface MessageResponse {
  code: number;      // 0 表示成功，负数表示错误
  data?: unknown;    // 响应数据
  error?: string;    // 错误信息
}
```

#### 消息类型列表

| 消息类型 | 发送方向 | 描述 | 参数 | 返回值 |
|----------|----------|------|------|--------|
| `capture` | CS/SP → BG | 截图 | - | `{ code, data: dataUrl }` |
| `closePage` | CS → BG | 关闭指定页面 | `{ url }` | `{ code }` |
| `closeAllPage` | CS → BG | 关闭所有匹配页面 | `{ url }` | `{ code }` |
| `readPage` | SP → CS | 读取当前网页正文（通过 `chrome.tabs.sendMessage` 发送给内容脚本） | `{ maxChars?: number, extractLinkUrl?: boolean, extractImageUrl?: boolean, maxUrls?: number }` | `{ code, data, url, title }` |
| `getSettings` | SP → BG | 获取设置 | - | `{ code, data: settings }` |
| `setSettings` | SP → BG | 保存设置 | `{ settings }` | `{ code }` |
| `getSessions` | SP → BG | 获取会话列表 | - | `{ code, data: sessions }` |
| `saveSession` | SP → BG | 保存会话 | `{ session }` | `{ code }` |

#### 使用示例

**截图功能**
```typescript
// Side Panel 发送截图请求
chrome.runtime.sendMessage(
  { type: 'capture' },
  (response: MessageResponse) => {
    if (response.code === 0) {
      console.log('截图成功:', response.data);
    } else {
      console.error('截图失败:', response.error);
    }
  }
);
```

**获取设置**
```typescript
// 获取用户设置
chrome.runtime.sendMessage(
  { type: 'getSettings' },
  (response) => {
    if (response.code === 0) {
      const settings = response.data;
      console.log('主题:', settings.theme);
      console.log('语言:', settings.language);
    }
  }
);
```

**保存设置**
```typescript
// 更新设置
const newSettings = {
  theme: 'dark',
  language: 'zh-CN',
  autoOpen: true,
};

chrome.runtime.sendMessage(
  { type: 'setSettings', data: newSettings },
  (response) => {
    if (response.code === 0) {
      console.log('设置已保存');
    }
  }
);
```

**读取网页正文**
```typescript
// Side Panel 通过 tabs.sendMessage 调用内容脚本
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (tab?.id) {
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'readPage',
    maxChars: 120_000,
    extractLinkUrl: true,
    extractImageUrl: false,
    maxUrls: 200,
  });
  if (response.code === 0) {
    console.log('标题:', response.title);
    console.log('链接:', response.url);
    console.log('正文:', response.data);
  }
}
```

### Storage API

扩展使用 `chrome.storage.local` 进行数据持久化存储。

#### 临时键说明

| 键 | 写入方 | 读取方 | 描述 |
|----|--------|--------|------|
| `selectedText` | BG | SP | 右键菜单（`contexts: ['selection']`）点击后写入；侧边栏启动时读取并预填输入框，然后删除该键 |
| `pendingScreenshot` | Popup | SP | Popup 的“截图提问”写入；侧边栏读取后可用于追加到会话/作为图片附件入模（使用完建议删除） |

#### Storage Schema

```typescript
interface StorageSchema {
  // 用户设置
  settings: {
    theme: 'light' | 'dark' | 'auto';  // 主题
    language: string;                   // 语言
    autoOpen: boolean;                  // 启动时自动打开
    contextMenu: boolean;               // 启用右键菜单
    model: string;                      // AI 模型
    temperature: number;                // 创造性 (0-2)
    streamResponse: boolean;            // 流式响应
    maxContext: number;                 // 最大上下文轮数
  };

  // 会话列表
  sessions: ChatSession[];

  // 当前会话
  currentSession: ChatSession;

  // 临时数据
  selectedText: string;        // 右键选中的文本
  pendingScreenshot: string;   // 待处理的截图
}
```

#### 存储操作

**读取数据**
```typescript
// 读取设置
const result = await chrome.storage.local.get('settings');
const settings = result.settings;

// 读取多个键
const result = await chrome.storage.local.get(['settings', 'sessions']);
const { settings, sessions } = result;
```

**写入数据**
```typescript
// 保存设置
await chrome.storage.local.set({
  settings: {
    theme: 'dark',
    language: 'zh-CN',
  },
});

// 保存会话
await chrome.storage.local.set({
  sessions: [...sessions, newSession],
});
```

**删除数据**
```typescript
// 删除单个键
await chrome.storage.local.remove('selectedText');

// 删除多个键
await chrome.storage.local.remove(['selectedText', 'pendingScreenshot']);

// 清空所有数据
await chrome.storage.local.clear();
```

**监听变化**
```typescript
chrome.storage.local.onChanged.addListener((changes) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`键 ${key} 从`, oldValue, '变为', newValue);
  }
});
```

### 权限说明

扩展在 `manifest.json` 中声明了以下权限：

| 权限 | 用途 |
|------|------|
| `storage` | 本地数据存储 |
| `cookies` | 读取/设置 Cookie |
| `tabs` | 操作浏览器标签页 |
| `webRequest` | 监听网络请求 |
| `sidePanel` | 使用侧边栏 API |
| `scripting` | 注入脚本 |
| `contextMenus` | 创建右键菜单 |
| `declarativeNetRequest` | 修改网络请求 |
| `webNavigation` | 监听页面导航 |
| `bookmarks` | 访问书签 |

---

## Web 应用 API

### HTTP 接口

#### GET /api/read

提取指定网页的可读内容，用于对话前置的“网页阅读/网页总结/网页内容入模”。

**Query 参数：**

- `url`：必填，目标网页 URL（仅支持 http/https）
- `engine`：可选，`auto | lightpanda | jina`，默认 `auto`
  - `auto`：优先尝试 Lightpanda（若已配置），失败 fallback 到 Jina Reader
  - `lightpanda`：仅使用 Lightpanda（执行 JS 渲染后提取）
  - `jina`：仅使用 Jina Reader（`r.jina.ai`）

**返回：**

```typescript
type ReadResponse =
  | { success: true; engine: 'lightpanda' | 'jina'; content: string }
  | { success: false; engine?: 'lightpanda' | 'jina'; error: string };
```

**说明：**

- 返回内容会做长度截断（最多 120000 字符），避免一次注入过长上下文
- Lightpanda 依赖运行环境提供 `LIGHTPANDA_BIN`（命令名或绝对路径）；可将其设置为 `disabled` 以强制只走 Jina
- Lightpanda 超时可通过 `LIGHTPANDA_TIMEOUT_MS` 配置（默认 15000ms）

### 组件接口

#### ChatInput

聊天输入框组件。

```typescript
interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
}

// 使用示例
<ChatInput
  onSend={(message, files) => {
    console.log('发送消息:', message);
    console.log('附件:', files);
  }}
  disabled={isLoading}
/>
```

**功能特性：**
- 多行文本输入（自动调整高度）
- 文件拖拽上传
- 附件预览和删除
- 回车发送（Shift+Enter 换行）
- 发送侧自动处理粘贴链接：提取网页正文并追加到对话上下文（通过 `/api/read`）
- 发送侧支持图片附件多模态：图片会以 base64 形式随消息发送给模型（Ollama `messages[].images`）

#### MessageList

消息列表组件。

```typescript
interface MessageListProps {
  messages: ChatMessage[];
}

// 使用示例
<MessageList messages={messages} />
```

#### MessageItem

单条消息组件。

```typescript
interface MessageItemProps {
  message: ChatMessage;
  isLast: boolean;
}

// 使用示例
<MessageItem message={message} isLast={index === messages.length - 1} />
```

**功能特性：**
- 区分用户/助手消息样式
- 附件预览（图片/文件）
- 复制消息内容
- 时间戳显示

#### Sidebar

侧边栏组件。

```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

// 使用示例
<Sidebar
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
  onNewChat={createNewChat}
/>
```

#### Header

页面头部组件。

```typescript
interface HeaderProps {
  onMenuClick: () => void;
  onNewChat: () => void;
}

// 使用示例
<Header
  onMenuClick={() => setSidebarOpen(!sidebarOpen)}
  onNewChat={createNewChat}
/>
```

### Hooks

#### useChat

管理聊天状态的自定义 Hook。

```typescript
function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    // 实现逻辑
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}

// 使用示例
const { messages, isLoading, sendMessage } = useChat();
```

#### useOllamaChat

对话主流程使用的 Hook，支持流式输出、停止生成、重试，以及多模态图片输入（Ollama）。

```typescript
type SendExtra = { images?: string[] };

function useOllamaChat() {
  const sendMessage: (content: string, extra?: SendExtra) => Promise<void>;
  const stopGeneration: () => void;
  const regenerateMessage: (messageId: string) => Promise<void>;
}
```

#### useStorage

封装 Chrome Storage 的 Hook。

```typescript
function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    chrome.storage.local.get(key, (result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
    });
  }, [key]);

  const updateValue = async (newValue: T) => {
    setValue(newValue);
    await chrome.storage.local.set({ [key]: newValue });
  };

  return [value, updateValue] as const;
}

// 使用示例
const [settings, setSettings] = useStorage('settings', defaultSettings);
```

---

## 类型定义

### 核心类型

#### ChatMessage

聊天消息类型。

```typescript
interface ChatMessage {
  /** 消息唯一标识 */
  id: string;

  /** 发送者角色 */
  role: 'user' | 'assistant' | 'system';

  /** 消息内容 */
  content: string;

  /** 发送时间戳 */
  timestamp: number;

  /** 附件列表 */
  attachments?: Attachment[];
}
```

#### Attachment

附件类型。

```typescript
interface Attachment {
  /** 附件类型 */
  type: 'image' | 'file' | 'audio';

  /** 附件 URL */
  url: string;

  /** 附件名称 */
  name: string;

  /** 附件大小（字节） */
  size?: number;
}
```

#### ChatSession

聊天会话类型。

```typescript
interface ChatSession {
  /** 会话唯一标识 */
  id: string;

  /** 会话标题 */
  title: string;

  /** 消息列表 */
  messages: ChatMessage[];

  /** 创建时间 */
  createdAt: number;

  /** 更新时间 */
  updatedAt: number;
}
```

#### RouteConfig

路由配置类型。

```typescript
interface RouteConfig {
  /** URL 路径 */
  urlPath: string;

  /** 入口名称 */
  entryName: string;

  /** 入口文件路径 */
  entryPath: string;

  /** 是否为 SPA */
  isSPA: boolean;

  /** 是否流式渲染 */
  isStream: boolean;

  /** 是否 SSR */
  isSSR: boolean;

  /** 是否 RSC */
  isRSC: boolean;

  /** 重定向地址 */
  redirect?: string;

  /** 响应头 */
  responseHeader?: Record<string, string>;

  /** 额外配置 */
  extra?: Record<string, unknown>;
}
```

### 扩展类型

#### ExtensionConfig

扩展配置类型。

```typescript
interface ExtensionConfig {
  /** 版本号 */
  version: string;

  /** 扩展名称 */
  name: string;

  /** 扩展描述 */
  description: string;

  /** 权限列表 */
  permissions: string[];

  /** 主机权限 */
  hostPermissions: string[];
}
```

#### ContentScriptMessage

Content Script 消息类型。

```typescript
interface ScreenshotRequest {
  func: 'screenshop';
  method: string;
}

interface ClosePageRequest {
  func: 'closePage' | 'closeAllPage';
  url: string;
}

type ContentScriptMessage = ScreenshotRequest | ClosePageRequest;
```

---

## 错误处理

### 错误码定义

| 错误码 | 含义 | 说明 |
|--------|------|------|
| 0 | 成功 | 操作成功完成 |
| -1 | 未知错误 | 未分类的错误 |
| -2 | 权限不足 | 缺少必要权限 |
| -3 | 参数错误 | 传入参数无效 |
| -4 | 网络错误 | 网络请求失败 |
| -5 | 超时 | 操作超时 |

### 错误处理示例

```typescript
chrome.runtime.sendMessage(
  { type: 'capture' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('通信错误:', chrome.runtime.lastError.message);
      return;
    }

    if (response.code !== 0) {
      console.error('操作失败:', response.error);
      // 根据错误码处理
      switch (response.code) {
        case -2:
          alert('请授予截图权限');
          break;
        case -5:
          alert('操作超时，请重试');
          break;
        default:
          alert('操作失败: ' + response.error);
      }
      return;
    }

    // 处理成功响应
    console.log('成功:', response.data);
  }
);
```

---

## 最佳实践

### 1. 消息通信

- 始终检查 `chrome.runtime.lastError`
- 使用类型定义确保消息格式正确
- 为异步操作设置超时处理

### 2. 存储使用

- 避免存储大量数据（> 5MB）
- 敏感信息需要加密存储
- 使用 `onChanged` 监听数据变化

### 3. 错误处理

- 统一错误码规范
- 提供用户友好的错误提示
- 记录详细错误日志

### 4. 性能优化

- 批量读写存储数据
- 使用防抖/节流处理频繁操作
- 及时清理无用数据

---

## 更新日志

### v1.0.0 (2024-03-31)

- 初始版本发布
- 实现基础消息通信 API
- 完成 Storage API 封装
- 定义完整类型系统
