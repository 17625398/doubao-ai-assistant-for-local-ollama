# 架构设计文档

本文档详细描述了豆包AI助手重构项目的整体架构设计，包括系统架构、模块设计、数据流和关键技术决策。

## 📑 目录

- [架构概述](#架构概述)
- [系统架构](#系统架构)
- [模块设计](#模块设计)
- [数据流设计](#数据流设计)
- [技术选型](#技术选型)
- [安全设计](#安全设计)
- [性能设计](#性能设计)
- [扩展性设计](#扩展性设计)

---

## 架构概述

### 设计目标

1. **模块化**: 高内聚、低耦合的模块设计
2. **可维护性**: 清晰的代码结构和文档
3. **可扩展性**: 易于添加新功能
4. **性能**: 优化的加载和运行性能
5. **类型安全**: 全 TypeScript 支持

### 架构原则

- **单一职责**: 每个模块只负责一个功能领域
- **依赖倒置**: 依赖于抽象而非具体实现
- **开闭原则**: 对扩展开放，对修改关闭
- **最小权限**: 只申请必要的权限

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户界面层                                    │
├─────────────────────────┬─────────────────────────┬─────────────────────┤
│      Chrome 扩展         │       Web 应用          │     桌面应用 (可选)   │
│   ┌─────────────────┐   │   ┌─────────────────┐   │   ┌─────────────┐   │
│   │   Side Panel    │   │   │   Next.js App   │   │   │  Electron   │   │
│   │   (侧边栏)       │   │   │   (Web 页面)    │   │   │   (桌面端)   │   │
│   └────────┬────────┘   │   └────────┬────────┘   │   └──────┬──────┘   │
│            │             │            │             │          │         │
│   ┌────────┴────────┐   │   ┌────────┴────────┐   │   ┌──────┴──────┐   │
│   │     Popup       │   │   │   Components    │   │   │   WebView   │   │
│   │   (弹出窗口)     │   │   │   (React 组件)   │   │   │  (嵌入页面)  │   │
│   └────────┬────────┘   │   └────────┬────────┘   │   └──────┬──────┘   │
│            │             │            │             │          │         │
│   ┌────────┴────────┐   │   └────────┬────────┘   │   └─────────────┘   │
│   │     Options     │   │            │             │                     │
│   │   (设置页面)     │   │            │             │                     │
│   └─────────────────┘   │            │             │                     │
├─────────────────────────┴────────────┴─────────────┴─────────────────────┤
│                           核心共享层 (@doubao/core)                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │     Types     │  │     Utils     │  │   Event Bus   │  │  Logger   │ │
│  │   (类型定义)   │  │   (工具函数)   │  │   (事件总线)   │  │  (日志)   │ │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └─────┬─────┘ │
│          │                  │                  │                │       │
│  ┌───────┴───────┐  ┌───────┴───────┐  ┌───────┴───────┐  ┌────┴────┐  │
│  │   Constants   │  │   Storage     │  │    API        │  │  Config │  │
│  │   (常量定义)   │  │   (存储封装)   │  │  (接口封装)    │  │ (配置)  │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                           浏览器 API 层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ chrome.tabs │  │chrome.storage│  │chrome.runtime│  │chrome.sidePanel │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                           外部服务层                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   AI Service    │  │  Storage Sync   │  │   Analytics (可选)      │  │
│  │   (AI 服务)      │  │  (数据同步)      │  │   (分析统计)            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 分层说明

| 层级 | 职责 | 包含模块 |
|------|------|----------|
| 用户界面层 | 提供用户交互界面 | Side Panel, Popup, Options, Web App |
| 核心共享层 | 提供共享功能和类型 | Types, Utils, Event Bus, Logger |
| 浏览器 API 层 | 封装浏览器原生 API | chrome.* APIs |
| 外部服务层 | 对接外部服务 | AI Service, Storage Sync |

---

## 模块设计

### 1. 核心模块 (@doubao/core)

#### 职责
- 定义全局类型接口
- 提供共享工具函数
- 实现跨模块通信机制
- 提供核心服务和功能

#### 模块结构

```
core/
├── src/
│   ├── types/                # 类型定义
│   │   ├── document.ts       # 文档相关类型
│   │   ├── plugin.ts         # 插件相关类型
│   │   └── index.ts          # 全局类型定义
│   ├── document-parsers/     # 文档解析器
│   │   ├── base-document-parser.ts
│   │   ├── pdf-document-parser.ts
│   │   ├── text-document-parser.ts
│   │   ├── word-document-parser.ts
│   │   ├── excel-document-parser.ts
│   │   ├── powerpoint-document-parser.ts
│   │   ├── image-document-parser.ts
│   │   ├── markdown-document-parser.ts
│   │   ├── document-parser-registry.ts
│   │   ├── document-parser-util.ts
│   │   └── index.ts
│   ├── services/             # 核心服务
│   │   ├── error-handler-service.ts    # 错误处理服务
│   │   ├── logger-service.ts           # 日志服务
│   │   ├── dependency-injection-service.ts # 依赖注入服务
│   │   ├── config-service.ts          # 配置管理服务
│   │   ├── plugin-manager-service.ts   # 插件管理服务
│   │   ├── rbac-service.ts            # RBAC 服务
│   │   └── jwt-service.ts             # JWT 服务
│   ├── utils/                # 工具函数
│   │   ├── logger.ts         # 日志系统
│   │   ├── event-bus.ts      # 事件总线
│   │   ├── cache-manager.ts  # 缓存管理
│   │   ├── plugin-system.ts  # 插件系统
│   │   ├── mem-palace/       # 内存管理系统
│   │   │   ├── types.ts      # 内存系统类型定义
│   │   │   ├── mem-palace-service.ts # 内存系统核心服务
│   │   │   └── index.ts      # 模块导出
│   │   └── common/           # 通用工具
│   ├── plugins/              # 插件
│   └── index.ts              # 模块入口
```

#### 关键设计

**类型系统**
```typescript
// 核心消息类型
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

// 使用 branded type 增强类型安全
type MessageId = string & { __brand: 'MessageId' };
type SessionId = string & { __brand: 'SessionId' };
```

**事件总线**
```typescript
// 发布-订阅模式实现
class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    // 订阅事件
  }

  emit<T>(event: string, payload: T): void {
    // 发布事件
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    // 取消订阅
  }
}
```

### 2. 扩展模块 (@doubao/extension)

#### 职责
- 实现 Chrome 扩展功能
- 管理浏览器上下文通信
- 提供浏览器原生能力封装

#### 模块结构

```
extension/
├── src/
│   ├── background/           # Service Worker
│   │   └── index.ts         # 后台脚本主逻辑
│   ├── content-script/       # 内容脚本
│   │   └── index.ts         # 页面注入逻辑
│   ├── side-panel/          # 侧边栏
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── styles.css
│   ├── popup/               # 弹出窗口
│   ├── options/             # 设置页面
│   └── preinject/           # 预注入脚本
├── public/
│   ├── manifest.json        # 扩展清单
│   ├── _locales/            # 国际化
│   └── icons/               # 图标资源
```

#### 关键设计

**消息路由**
```typescript
// 消息路由中心
class MessageRouter {
  private handlers: Map<string, MessageHandler> = new Map();

  register(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  async handle(request: MessagePayload): Promise<MessageResponse> {
    const handler = this.handlers.get(request.type);
    if (!handler) {
      return { code: -1, error: 'Unknown message type' };
    }
    return handler(request);
  }
}
```

**状态管理**
```typescript
// 扩展状态管理
class ExtensionState {
  private settings: Settings;
  private sessions: ChatSession[];

  async load(): Promise<void> {
    const data = await chrome.storage.local.get(['settings', 'sessions']);
    this.settings = data.settings || defaultSettings;
    this.sessions = data.sessions || [];
  }

  async save(): Promise<void> {
    await chrome.storage.local.set({
      settings: this.settings,
      sessions: this.sessions,
    });
  }
}
```

### 3. Web 模块 (@doubao/web)

#### 职责
- 提供 Web 版 AI 助手
- 实现响应式用户界面
- 管理前端状态

#### 模块结构

```
web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 首页
│   │   └── globals.css     # 全局样式
│   ├── components/          # React 组件
│   │   ├── ChatInput.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── hooks/               # 自定义 Hooks
│   ├── stores/              # 状态管理
│   └── utils/               # 工具函数
```

#### 关键设计

**组件设计**
```typescript
// 容器组件模式
// Container Component
function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const sendMessage = async (content: string) => {
    // 业务逻辑
  };

  return <ChatView messages={messages} onSend={sendMessage} />;
}

// Presentational Component
interface ChatViewProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
}

function ChatView({ messages, onSend }: ChatViewProps) {
  return (
    <div className="chat-container">
      <MessageList messages={messages} />
      <ChatInput onSend={onSend} />
    </div>
  );
}
```

**状态管理**
```typescript
// 使用 Zustand 进行状态管理
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  sendMessage: async (content) => {
    set({ isLoading: true });
    // 发送消息逻辑
    set({ isLoading: false });
  },
  clearMessages: () => set({ messages: [] }),
}));
```

---

## 数据流设计

### 扩展数据流

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User Action │────>│   Handler    │────>│   Service    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     UI       │<────│   State      │<────│   Storage    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Web 应用数据流

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Action     │────>│    Store     │────>│   Reducer    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Component   │<────│   Selector   │<────│    State     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 跨上下文通信

```
Content Script          Background          Side Panel
      │                     │                    │
      │── postMessage ─────>│                    │
      │                     │── runtime.send ───>│
      │                     │                    │
      │<────────────────────│<───────────────────│
      │    runtime.onMessage│   runtime.send     │
```

---

## 技术选型

### 前端框架

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| React | 18.2 | 组件化、生态丰富 |
| Next.js | 14.2 | SSR/SSG、App Router |
| TypeScript | 5.4 | 类型安全、IDE 支持 |

### 样式方案

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| Tailwind CSS | 3.4 | 原子化、开发效率高 |
| CSS Modules | - | 样式隔离 |

### 构建工具

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| Turborepo | 1.13 | Monorepo 管理 |
| Webpack | 5.90 | 扩展打包 |
| Next.js Build | 14.2 | Web 应用构建 |

### 状态管理

| 场景 | 方案 | 理由 |
|------|------|------|
| 扩展全局状态 | chrome.storage | 持久化、跨上下文 |
| Web 应用状态 | Zustand | 轻量、TypeScript 友好 |
| 组件本地状态 | useState/useReducer | 简单场景 |
| 配置管理 | ConfigService | 统一配置管理、多存储支持 |

### 依赖管理

| 场景 | 方案 | 理由 |
|------|------|------|
| 模块依赖 | DependencyInjectionService | 解耦、可测试性 |
| 服务依赖 | 依赖注入装饰器 | 代码简洁、可读性高 |

### 内存系统

| 技术 | 版本 | 选择理由 |
|------|------|----------|
| ChromaDB | 1.9.3 | 本地向量存储、语义搜索 |
| uuid | 9.0.1 | 生成唯一标识符 |

### 错误处理

| 场景 | 方案 | 理由 |
|------|------|------|
| 应用错误 | AppError | 类型安全、可跟踪 |
| 错误处理 | ErrorHandlerService | 统一处理、可扩展 |

### 日志系统

| 场景 | 方案 | 理由 |
|------|------|------|
| 日志记录 | LoggerService | 多级别、多输出 |
| 日志配置 | 可配置日志级别 | 灵活、可调整 |

### 开发工具

| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| TypeScript | 类型检查 |
| Chrome DevTools | 调试 |

---

## 安全设计

### 1. 内容安全策略 (CSP)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 2. 跨域通信安全

```typescript
// 验证消息来源
window.addEventListener('message', (event) => {
  // 验证来源
  if (event.origin !== 'https://trusted-domain.com') {
    return;
  }

  // 验证数据格式
  if (!isValidMessage(event.data)) {
    return;
  }

  // 处理消息
  handleMessage(event.data);
});
```

### 3. 数据存储安全

```typescript
// 敏感数据加密存储
async function secureStore(key: string, value: string): Promise<void> {
  const encrypted = await encrypt(value);
  await chrome.storage.local.set({ [key]: encrypted });
}

async function secureRetrieve(key: string): Promise<string> {
  const result = await chrome.storage.local.get(key);
  return await decrypt(result[key]);
}
```

### 4. 权限最小化

```json
{
  "permissions": [
    "storage",
    "activeTab"
  ],
  "optional_permissions": [
    "bookmarks",
    "history"
  ]
}
```

---

## 性能设计

### 1. 加载性能

**代码分割**
```typescript
// 路由级别分割
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 组件级别分割
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**资源预加载**
```html
<link rel="preload" href="/critical.css" as="style">
<link rel="preload" href="/font.woff2" as="font" crossorigin>
```

### 2. 运行时性能

**虚拟列表**
```typescript
function VirtualMessageList({ messages }) {
  return (
    <VirtualList
      items={messages}
      itemHeight={80}
      renderItem={(msg) => <MessageItem message={msg} />}
    />
  );
}
```

**防抖/节流**
```typescript
// 防抖搜索
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// 节流滚动
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);
```

### 3. 存储性能

**批量操作**
```typescript
// ✅ 推荐：批量读写
await chrome.storage.local.set({
  key1: value1,
  key2: value2,
  key3: value3,
});

// ❌ 避免：多次单独操作
await chrome.storage.local.set({ key1: value1 });
await chrome.storage.local.set({ key2: value2 });
await chrome.storage.local.set({ key3: value3 });
```

**数据压缩**
```typescript
// 压缩存储数据
async function compressStore(key: string, data: object): Promise<void> {
  const json = JSON.stringify(data);
  const compressed = await compress(json);
  await chrome.storage.local.set({ [key]: compressed });
}
```

---

## 扩展性设计

### 1. 插件系统

```typescript
// 插件接口
interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  icon?: string;
  enabled: boolean;
  status?: PluginStatus;
  
  initialize(): void | Promise<void>;
  destroy(): void | Promise<void>;
}

// 插件管理器服务
class PluginManagerService {
  private plugins: Map<string, Plugin> = new Map();
  private pluginManifests: Map<string, PluginManifest> = new Map();

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  async activatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      if (plugin.activate) {
        await plugin.activate();
      }
      plugin.status = PluginStatus.ACTIVE;
    }
  }

  async deactivatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      if (plugin.deactivate) {
        await plugin.deactivate();
      }
      plugin.status = PluginStatus.INACTIVE;
    }
  }
}
```

### 2. 依赖注入系统

```typescript
// 依赖注入容器
class DependencyInjectionContainer {
  private dependencies: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();

  register<T>(key: string, dependency: Dependency<T>, isSingleton: boolean = false): void {
    this.dependencies.set(key, dependency);
    if (isSingleton) {
      this.singletons.set(key, this.resolve<T>(key));
    }
  }

  resolve<T>(key: string): T {
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }

    const dependency = this.dependencies.get(key);
    if (typeof dependency === 'function') {
      return dependency();
    }

    return dependency;
  }
}

// 依赖注入装饰器
function Inject(key: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        const container = DependencyInjectionContainer.getInstance();
        return container.resolve(key);
      },
    });
  };
}
```

### 3. 主题系统

```typescript
// 主题配置
interface Theme {
  name: string;
  colors: {
    primary: string;
    background: string;
    text: string;
  };
}

// 主题管理器
class ThemeManager {
  private themes: Map<string, Theme> = new Map();
  private currentTheme: Theme;

  register(theme: Theme): void {
    this.themes.set(theme.name, theme);
  }

  apply(themeName: string): void {
    const theme = this.themes.get(themeName);
    if (theme) {
      this.currentTheme = theme;
      this.injectStyles(theme);
    }
  }
}
```

### 3. AI 模型扩展

```typescript
// AI 模型接口
interface AIModel {
  name: string;
  sendMessage: (content: string, context?: ChatMessage[]) => Promise<string>;
  streamMessage: (content: string, callback: (chunk: string) => void) => Promise<void>;
}

// 模型工厂
class ModelFactory {
  private models: Map<string, new () => AIModel> = new Map();

  register(name: string, ModelClass: new () => AIModel): void {
    this.models.set(name, ModelClass);
  }

  create(name: string): AIModel {
    const ModelClass = this.models.get(name);
    if (!ModelClass) {
      throw new Error(`Model ${name} not found`);
    }
    return new ModelClass();
  }
}
```

---

## 部署架构

### 开发环境

```
Developer Machine
├── VS Code
├── Node.js 18+
├── Chrome Dev
└── Local Server (localhost:3000)
```

### 生产环境

```
Production
├── CDN (Static Assets)
├── Vercel (Web App)
├── Chrome Web Store (Extension)
└── AI Service API
```

---

## 监控与日志

### 日志级别

```typescript
enum LogLevel {
  DEBUG = 0,   // 调试信息
  INFO = 1,    // 一般信息
  WARN = 2,    // 警告
  ERROR = 3,   // 错误
}
```

### 性能监控

```typescript
// 性能指标收集
class PerformanceMonitor {
  track(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
  }

  measureLCP(): void {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      console.log('LCP:', entries[entries.length - 1]);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
}
```

---

## 更新日志

### v1.0.0 (2024-03-31)

- 初始架构设计
- 完成核心模块设计
- 完成扩展模块设计
- 完成 Web 模块设计
- 定义数据流和通信机制

### v1.1.0 (2024-04-15)

- 集成 MemPalace 内存系统
- 实现对话内容的自动存储
- 实现语义搜索功能
- 添加内存管理界面

## MemPalace 内存系统

### 架构设计

MemPalace 是一个本地优先的内存管理系统，用于存储和检索AI对话历史。它基于分层架构设计，使用ChromaDB作为向量存储引擎，提供语义搜索能力。

#### 核心组件

1. **MemPalaceService**: 核心服务，管理内存的存储、检索和管理
2. **ChromaDB**: 本地向量存储，用于语义搜索
3. **分层存储结构**: Wings → Halls → Rooms → Memories

#### 数据流

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 对话输入/输出    │────>│  MemPalaceService │────>│  ChromaDB 存储   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 内存管理界面    │<────│  语义搜索      │<────│  向量索引      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 功能特性

1. **自动存储**: 对话内容自动存储到内存系统
2. **语义搜索**: 基于向量嵌入的语义搜索
3. **分层管理**: Wings、Halls、Rooms 三级结构
4. **本地存储**: 无需外部API，保护隐私
5. **性能优化**: 批量操作和缓存机制

### 使用方式

```typescript
// 初始化内存服务
const memPalaceService = getMemPalaceService();

// 存储对话内容
await memPalaceService.addMemory('conversations', 'general', 'default', {
  content: 'User: Hello\nAssistant: Hi! How can I help you?',
  metadata: {
    timestamp: Date.now(),
    model: 'llama3',
    role: 'conversation'
  }
});

// 搜索相关记忆
const results = await memPalaceService.searchMemories('How to use AI');
```

### 性能优化

1. **批量操作**: 支持批量添加内存，减少数据库操作
2. **缓存机制**: 缓存常用数据，提高访问速度
3. **索引优化**: 优化向量索引，提高搜索性能
4. **异步操作**: 使用异步操作，避免阻塞主线程

### 集成点

1. **对话流程**: 在发送和接收消息时自动存储
2. **内存管理界面**: 提供可视化管理工具
3. **API接口**: 提供完整的内存管理API
