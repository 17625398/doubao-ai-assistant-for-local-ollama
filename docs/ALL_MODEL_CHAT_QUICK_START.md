# All-Model-Chat 快速启用指南

## 当前状态

All-Model-Chat 功能已完全集成到项目中，**TypeScript 检查通过（0 错误）**，但需要在页面中显式引入组件才能使用。

## 两种使用方式

### 方式一：使用 AllModelChat 组件（推荐）

AllModelChat 组件是一个完整的多模态聊天界面，包含所有 All-Model-Chat 功能。

**步骤**：

1. **在 page.tsx 中导入组件**

```tsx
// 在文件顶部添加
import { AllModelChat } from '@/components/AllModelChat';
import { CanvasPreview } from '@/components/CanvasPreview';
```

2. **添加状态管理**

```tsx
export default function Home() {
  // 添加 All-Model-Chat 面板状态
  const [allModelChatOpen, setAllModelChatOpen] = useState(false);
  const [canvasPreviewOpen, setCanvasPreviewOpen] = useState(false);
  
  // ... 其他代码
}
```

3. **在 JSX 中添加组件**

```tsx
return (
  <div>
    {/* 现有内容 */}
    
    {/* All-Model-Chat 面板 */}
    {allModelChatOpen && (
      <div className="fixed inset-0 z-50 bg-black/50">
        <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <AllModelChat
            onSendMessage={async (message) => {
              // 处理消息发送
              console.log('发送消息:', message);
            }}
            onUploadFile={async (file) => {
              // 处理文件上传
              console.log('上传文件:', file.name);
            }}
          />
          <button 
            onClick={() => setAllModelChatOpen(false)}
            className="absolute top-4 right-4"
          >
            关闭
          </button>
        </div>
      </div>
    )}
    
    {/* 打开按钮 */}
    <button 
      onClick={() => setAllModelChatOpen(true)}
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
    >
      打开 All-Model-Chat
    </button>
  </div>
);
```

---

### 方式二：使用 Service API（灵活集成）

如果你只想使用 All-Model-Chat 的某个功能（如语音、搜索等），可以直接使用 Service API。

**示例 1：在现有聊天中添加语音输入**

```tsx
import { VoiceService, getVoiceService } from '@ai-intelligent-analysis-platform/core';

export default function ChatInput() {
  const [isRecording, setIsRecording] = useState(false);
  const voiceService = getVoiceService();
  
  const startVoiceInput = () => {
    if (!VoiceService.isRecognitionSupported()) {
      alert('您的浏览器不支持语音识别');
      return;
    }
    
    setIsRecording(true);
    voiceService.startRecognition(
      (result) => {
        // 将识别结果填入输入框
        setInputText(result.transcript);
        if (result.isFinal) {
          setIsRecording(false);
        }
      },
      (error) => {
        console.error('语音识别错误:', error);
        setIsRecording(false);
      }
    );
  };
  
  return (
    <div>
      <input value={inputText} onChange={e => setInputText(e.target.value)} />
      <button onClick={startVoiceInput}>
        {isRecording ? '🎙️ 录音中...' : '🎤 语音输入'}
      </button>
    </div>
  );
}
```

**示例 2：添加实时搜索功能**

```tsx
import { WebSearchService, getWebSearchService } from '@ai-intelligent-analysis-platform/core';

export default function SearchButton() {
  const handleSearch = async () => {
    const searchService = getWebSearchService();
    const results = await searchService.search('最新的 AI 技术', { numResults: 5 });
    
    // 处理搜索结果
    console.log(results);
  };
  
  return <button onClick={handleSearch}>🔍 搜索</button>;
}
```

**示例 3：添加 Python 代码执行**

```tsx
import { PythonExecutionService, getPythonExecutionService } from '@ai-intelligent-analysis-platform/core';

export default function CodeExecutor() {
  const [code, setCode] = useState('print("Hello World")');
  const [output, setOutput] = useState('');
  
  const executeCode = async () => {
    const pythonService = getPythonExecutionService();
    await pythonService.initialize();
    
    const result = await pythonService.executeCode(code);
    setOutput(result.output);
  };
  
  return (
    <div>
      <textarea value={code} onChange={e => setCode(e.target.value)} />
      <button onClick={executeCode}>▶️ 执行</button>
      <pre>{output}</pre>
    </div>
  );
}
```

---

## 功能入口建议

### 方案 1：侧边栏添加入口（推荐）

在 `ChatSidebar.tsx` 中添加 All-Model-Chat 入口：

```tsx
// 在侧边栏的菜单中添加
<div className="sidebar-menu">
  {/* 现有菜单项 */}
  
  {/* All-Model-Chat 入口 */}
  <button 
    onClick={() => onOpenAllModelChat?.()}
    className="sidebar-item"
  >
    <span>🤖</span>
    <span>All-Model-Chat</span>
  </button>
</div>
```

### 方案 2：顶部导航栏添加

在 `Header.tsx` 中添加：

```tsx
<header>
  {/* 现有内容 */}
  
  <button 
    onClick={() => setAllModelChatOpen(true)}
    className="header-btn"
  >
    🤖 All-Model-Chat
  </button>
</header>
```

### 方案 3：浮动按钮

在页面右下角添加浮动按钮：

```tsx
<button 
  onClick={() => setAllModelChatOpen(true)}
  className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600"
>
  🤖
</button>
```

---

## 配置检查清单

在启用 All-Model-Chat 之前，请确保：

- [ ] 已创建 `.env.local` 文件
- [ ] 已配置 `NEXT_PUBLIC_GEMINI_API_KEY`
- [ ] （可选）已配置 Google Search API
- [ ] 已安装依赖 `npm install`
- [ ] TypeScript 检查通过 `npm run type-check`

---

## 完整示例代码

以下是一个完整的 page.tsx 修改示例：

```tsx
'use client'

import { useState } from 'react';
import { AllModelChat } from '@/components/AllModelChat';
import { GeminiService, getGeminiService } from '@ai-intelligent-analysis-platform/core';

export default function Home() {
  const [allModelChatOpen, setAllModelChatOpen] = useState(false);
  
  const handleSendMessage = async (message: any) => {
    const gemini = getGeminiService();
    
    // 根据消息类型处理
    if (message.type === 'text') {
      await gemini.sendMessageStream(
        [{ role: 'user', content: message.content }],
        {
          onData: (chunk) => {
            // 更新 UI 显示流式响应
            console.log(chunk);
          },
          onComplete: () => console.log('完成'),
          onError: (error) => console.error(error)
        }
      );
    }
  };
  
  return (
    <div className="min-h-screen">
      {/* 页面主内容 */}
      <main>
        <h1>欢迎使用 AI 助手</h1>
        {/* 其他内容 */}
      </main>
      
      {/* All-Model-Chat 面板 */}
      {allModelChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-4xl h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">All-Model-Chat</h2>
              <button 
                onClick={() => setAllModelChatOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="h-[calc(80vh-4rem)]">
              <AllModelChat
                onSendMessage={handleSendMessage}
                onUploadFile={async (file) => {
                  console.log('上传文件:', file.name);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* 打开按钮 */}
      <button 
        onClick={() => setAllModelChatOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg transition-colors"
      >
        🤖 打开 All-Model-Chat
      </button>
    </div>
  );
}
```

---

## 下一步

1. 选择适合的使用方式（组件或 Service API）
2. 配置环境变量
3. 在页面中添加功能入口
4. 测试各项功能

如需更多帮助，请参考：
- [All-Model-Chat 集成说明](./ALL_MODEL_CHAT_INTEGRATION.md)
- [All-Model-Chat 使用指南](./ALL_MODEL_CHAT_GUIDE.md)
