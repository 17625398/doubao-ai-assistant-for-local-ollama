# 开发指南

本文档提供详细的开发指南，帮助开发者快速上手并贡献代码。

## 📑 目录

- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [测试指南](#测试指南)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

---

## 开发环境

### 系统要求

- **操作系统**: Windows 10/11, macOS 10.15+, 或 Linux
- **Node.js**: >= 18.0.0
- **包管理器**: pnpm >= 8.0.0 (强烈推荐)
- **浏览器**: Chrome >= 88 或 Edge >= 88
- **编辑器**: VS Code (推荐) + 推荐插件

### 推荐 VS Code 插件

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",        // ESLint
    "esbenp.prettier-vscode",        // Prettier
    "bradlc.vscode-tailwindcss",     // Tailwind CSS IntelliSense
    "ms-vscode.vscode-typescript-next", // TypeScript
    "formulahendry.auto-rename-tag", // Auto Rename Tag
    "christian-kohler.path-intellisense", // Path IntelliSense
    "streetsidesoftware.code-spell-checker" // 拼写检查
  ]
}
```

### 环境配置

```bash
# 1. 安装 Node.js (使用 nvm 推荐)
nvm install 18
nvm use 18

# 2. 安装 pnpm
npm install -g pnpm

# 3. 配置 pnpm
pnpm config set registry https://registry.npmmirror.com

# 4. 克隆项目
cd d:\Doubao\refactored

# 5. 安装依赖
pnpm install

# 6. 构建核心模块
pnpm --filter @doubao/core build
```

---

## 项目结构

### Monorepo 架构

```
refactored/
├── packages/
│   ├── @doubao/core/          # 核心模块
│   ├── @doubao/extension/     # Chrome 扩展
│   └── @doubao/web/           # Web 应用
├── docs/                       # 文档
├── package.json               # 根配置
└── turbo.json                 # 构建配置
```

### 包依赖关系

```
@doubao/web
└── depends on ──> @doubao/core

@doubao/extension
└── depends on ──> @doubao/core
```

### 文件命名规范

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `ChatInput.tsx` |
| 工具函数 | camelCase | `formatMessage.ts` |
| 常量 | SCREAMING_SNAKE_CASE | `DEFAULT_SETTINGS.ts` |
| 类型定义 | PascalCase + 后缀 | `MessageTypes.ts` |
| 样式文件 | kebab-case | `chat-input.module.css` |
| 测试文件 | 原文件名 + .test | `ChatInput.test.tsx` |

---

## 开发流程

### 1. 创建新功能

```bash
# 1. 从 main 分支创建功能分支
git checkout -b feature/my-feature

# 2. 开发代码
# ... coding ...

# 3. 运行类型检查
pnpm typecheck

# 4. 运行代码检查
pnpm lint

# 5. 构建测试
pnpm build

# 6. 提交代码
git add .
git commit -m "feat: add my feature"

# 7. 推送分支
git push origin feature/my-feature

# 8. 创建 Pull Request
```

### 2. 开发 Chrome 扩展

```bash
# 进入扩展目录
cd packages/extension

# 开发模式（热重载）
pnpm dev

# 在 Chrome 中加载扩展
# 1. 打开 chrome://extensions/
# 2. 开启开发者模式
# 3. 点击"加载已解压的扩展程序"
# 4. 选择 packages/extension/dist 目录
```

**开发扩展时的注意事项：**

1. **修改 manifest.json 后需要重新加载扩展**
2. **Background Script 修改后需要点击刷新按钮**
3. **Content Script 修改后需要刷新页面**
4. **Side Panel 修改后会自动热重载**

### 3. 开发 Web 应用

```bash
# 进入 Web 目录
cd packages/web

# 启动开发服务器
pnpm dev

# 打开 http://localhost:3000
```

#### Web 内容提取（网页阅读）

Web 端在发送消息时，会通过 `GET /api/read?url=...` 读取链接内容并注入到对话上下文。

该接口默认 `engine=auto`：优先尝试 Lightpanda（动态渲染/执行 JS），失败 fallback 到 Jina Reader（`r.jina.ai`）。

**启用 Lightpanda：**

- `LIGHTPANDA_BIN`：lightpanda 可执行文件路径或命令名（例如 `lightpanda` 或绝对路径）
- `LIGHTPANDA_TIMEOUT_MS`：可选，抓取超时（默认 15000）

**强制指定引擎：**

- `engine=lightpanda`：仅用 Lightpanda
- `engine=jina`：仅用 Jina Reader

### 4. 开发核心模块

```bash
# 进入核心模块目录
cd packages/core

# 开发模式（监听文件变化）
pnpm dev

# 修改类型定义后需要重新构建
pnpm build
```

---

## 代码规范

### TypeScript 规范

#### 类型定义

```typescript
// ✅ 推荐：显式定义类型
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User {
  // ...
}

// ❌ 避免：使用 any
defunction getUser(id: any): any {
  // ...
}
```

#### 接口命名

```typescript
// 组件 Props
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

// 数据模型
interface ChatMessage {
  id: string;
  content: string;
}

// API 响应
interface GetUserResponse {
  user: User;
  success: boolean;
}
```

#### 函数定义

```typescript
// ✅ 推荐：使用箭头函数 + 显式返回类型
const formatMessage = (msg: ChatMessage): string => {
  return `[${msg.role}] ${msg.content}`;
};

// ✅ 推荐：异步函数
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ❌ 避免：隐式返回类型
function formatMessage(msg) {
  return msg.content;
}
```

### React 规范

#### 组件定义

```typescript
// ✅ 推荐：函数式组件 + Props 接口
interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

export function ChatInput({ onSend, placeholder = '输入消息...' }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  return (
    <div className="chat-input">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <button onClick={handleSubmit}>发送</button>
    </div>
  );
}
```

#### Hooks 使用

```typescript
// ✅ 推荐：自定义 Hook
function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    // 加载历史消息
    loadMessages();
  }, []);

  return { messages, addMessage };
}

// 使用
const { messages, addMessage } = useChat();
```

#### 条件渲染

```typescript
// ✅ 推荐：提前返回
function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  );
}

// ❌ 避免：嵌套三元表达式
return (
  <div>
    {loading ? (
      <Spinner />
    ) : error ? (
      <Error />
    ) : messages.length > 0 ? (
      <List />
    ) : (
      <Empty />
    )}
  </div>
);
```

### CSS/Tailwind 规范

#### 类名顺序

```tsx
// ✅ 推荐：按功能分组排序
<div
  className="
    /* 布局 */
    flex items-center justify-between
    /* 尺寸 */
    w-full h-12 px-4
    /* 外观 */
    bg-white border border-gray-200 rounded-lg
    /* 交互 */
    hover:bg-gray-50 cursor-pointer
    /* 状态 */
    disabled:opacity-50
  "
>
```

#### 自定义类

```css
/* ✅ 推荐：使用 @apply 复用样式 */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg
           hover:bg-blue-600 transition-colors;
  }
}
```

---

## 调试技巧

### Chrome 扩展调试

#### 1. Background Script (Service Worker)

```typescript
// 在代码中添加日志
logger.info('Background script started');
logger.debug('Received message:', payload);
logger.error('Operation failed:', error);
```

调试步骤：
1. 打开 `chrome://extensions/`
2. 找到扩展，点击"Service Worker"链接
3. 在 DevTools 中查看 Console
4. 在 Sources 面板设置断点

#### 2. Content Script

```typescript
// content-script/index.ts
console.log('[Doubao] Content script loaded');

// 监听页面消息
window.addEventListener('message', (event) => {
  console.log('[Doubao] Received message from page:', event.data);
});
```

调试步骤：
1. 打开目标网页
2. 按 F12 打开 DevTools
3. 查看 Console 面板
4. 在 Sources 面板找到 Content Script

#### 3. Side Panel

```typescript
// side-panel/index.ts
logger.setPrefix('[Doubao SidePanel]');
logger.info('Side panel initialized');
```

调试步骤：
1. 打开侧边栏
2. 右键侧边栏内容 -> 检查
3. 独立的 DevTools 窗口会打开

#### 4. 消息通信调试

```typescript
// 添加通信日志
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Message Received]', {
    type: request.type,
    from: sender.url,
    data: request.data,
  });

  // ... 处理逻辑

  console.log('[Message Response]', response);
  sendResponse(response);
});
```

### Web 应用调试

#### React DevTools

1. 安装浏览器扩展 [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
2. 打开 http://localhost:3000
3. 按 F12 -> 选择 Components 或 Profiler 面板

#### 网络请求调试

```typescript
// 添加请求日志
async function sendMessage(content: string) {
  console.log('[API Request]', { content });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    const data = await response.json();
    console.log('[API Response]', data);

    return data;
  } catch (error) {
    console.error('[API Error]', error);
    throw error;
  }
}
```

### 常见问题调试

#### 问题：扩展无法加载

排查步骤：
1. 检查 `manifest.json` 语法是否正确
2. 确认 `dist` 目录包含所有必要文件
3. 查看 Chrome 扩展页面的错误提示
4. 检查 Chrome 版本是否支持 Manifest V3

#### 问题：消息通信失败

排查步骤：
1. 检查 `manifest.json` permissions 是否完整
2. 确认消息类型是否匹配
3. 检查发送/接收上下文是否正确
4. 查看 Console 中的错误信息

#### 问题：样式不生效

排查步骤：
1. 检查 CSS 文件是否正确引入
2. 确认 Tailwind 配置是否正确
3. 检查类名是否拼写正确
4. 使用 DevTools 检查元素样式

---

## 测试指南

### 单元测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @doubao/core test

# 运行测试并生成覆盖率报告
pnpm test --coverage
```

#### 测试示例

```typescript
// ChatInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('should render input field', () => {
    render(<ChatInput onSend={jest.fn()} />);
    expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument();
  });

  it('should call onSend when submit', () => {
    const onSend = jest.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('输入消息...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('发送'));

    expect(onSend).toHaveBeenCalledWith('Hello');
  });
});
```

### E2E 测试

```bash
# 使用 Playwright 进行 E2E 测试
pnpm test:e2e

# 运行特定测试
pnpm test:e2e -- chat.spec.ts
```

### 扩展测试

```bash
# 使用 web-ext 进行扩展测试
pnpm --filter @doubao/extension test:extension
```

---

## 性能优化

### Chrome 扩展优化

#### 1. 减少资源占用

```typescript
// ✅ 推荐：按需加载
chrome.tabs.onActivated.addListener(() => {
  // 只在需要时执行
  loadRequiredData();
});

// ❌ 避免：启动时加载所有数据
loadAllData(); // 不要这样做
```

#### 2. 优化存储操作

```typescript
// ✅ 推荐：批量读写
const data = await chrome.storage.local.get(['key1', 'key2', 'key3']);

// ❌ 避免：多次单独读写
const data1 = await chrome.storage.local.get('key1');
const data2 = await chrome.storage.local.get('key2');
const data3 = await chrome.storage.local.get('key3');
```

#### 3. 使用事件委托

```typescript
// ✅ 推荐：事件委托
document.addEventListener('click', (e) => {
  if (e.target.matches('.btn-send')) {
    handleSend();
  }
});

// ❌ 避免：多个事件监听器
document.querySelectorAll('.btn-send').forEach((btn) => {
  btn.addEventListener('click', handleSend);
});
```

### Web 应用优化

#### 1. 组件懒加载

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

#### 2. 虚拟列表

```typescript
import { VirtualList } from 'react-virtual';

function MessageList({ messages }) {
  return (
    <VirtualList
      items={messages}
      renderItem={(msg) => <MessageItem message={msg} />}
      itemHeight={80}
    />
  );
}
```

#### 3. 缓存优化

```typescript
// 使用 React Query 进行数据缓存
import { useQuery } from '@tanstack/react-query';

function useMessages() {
  return useQuery({
    queryKey: ['messages'],
    queryFn: fetchMessages,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}
```

---

## 常见问题

### Q: 如何添加新的 Chrome API 权限？

**A:**
1. 在 `manifest.json` 中添加权限：
```json
{
  "permissions": ["newPermission"]
}
```
2. 在类型定义中添加声明：
```typescript
// types/chrome.d.ts
declare namespace chrome {
  namespace newPermission {
    function doSomething(): void;
  }
}
```
3. 重新加载扩展

### Q: 如何调试消息通信？

**A:** 使用日志装饰器：
```typescript
function logMessage(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`[Message] ${key}:`, args);
    return original.apply(this, args);
  };
}

class MessageHandler {
  @logMessage
  handleMessage(request: any) {
    // ...
  }
}
```

### Q: 如何处理跨域请求？

**A:** 在 `manifest.json` 中声明：
```json
{
  "host_permissions": [
    "https://api.example.com/*"
  ]
}
```

### Q: 如何更新扩展图标？

**A:** 
1. 替换 `public/icons/` 目录下的图标文件
2. 确保尺寸符合要求：16x16, 32x32, 48x48, 128x128
3. 重新构建并加载扩展

### Q: 如何添加新的语言支持？

**A:**
1. 创建语言目录：`public/_locales/{locale}/`
2. 添加 `messages.json` 文件
3. 在代码中使用 `chrome.i18n.getMessage('key')`

---

## 参考资源

- [Chrome Extension 开发文档](https://developer.chrome.com/docs/extensions/)
- [React 官方文档](https://react.dev/)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Monorepo 工具比较](https://monorepo.tools/)

---

## 更新日志

### v1.0.0 (2024-03-31)

- 初始版本发布
- 建立开发规范
- 完善调试指南
