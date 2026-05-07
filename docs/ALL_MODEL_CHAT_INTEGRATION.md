# All-Model-Chat 功能集成说明

## 概述

本项目深度集成了 [All-Model-Chat](https://github.com/yeahhe365/All-Model-Chat) 的功能，提供了企业级的 AI 聊天体验。以下是功能在项目中的具体体现位置和使用方式。

## 功能映射表

| All-Model-Chat 功能 | 项目中的体现位置 | 使用方式 | 状态 |
|---------------------|------------------|----------|------|
| **多模态聊天** | `packages/web/src/components/AllModelChat/index.tsx` | 组件调用 | ✅ 已实现 |
| **Gemini API 集成** | `packages/core/src/services/gemini-service.ts` | Service API | ✅ 已实现 |
| **实时联网搜索** | `packages/core/src/services/web-search-service.ts` | Service API | ✅ 已实现 |
| **Python 代码执行** | `packages/core/src/services/python-execution-service.ts` | Service API | ✅ 已实现 |
| **语音交互 (STT/TTS)** | `packages/core/src/services/voice-service.ts` | Service API | ✅ 已实现 |
| **长文档分析** | `packages/core/src/services/document-analysis-service.ts` | Service API | ✅ 已实现 |
| **Canvas 预览** | `packages/web/src/components/CanvasPreview/index.tsx` | 组件调用 | ✅ 已实现 |
| **音频可视化** | `packages/web/src/components/AudioVisualizer/index.tsx` | 组件调用 | ✅ 已实现 |
| **文档分析 UI** | `packages/web/src/components/DocumentAnalyzer/index.tsx` | 组件调用 | ✅ 已实现 |

## 详细使用说明

### 1. 多模态聊天 (AllModelChat 组件)

**文件位置**: `packages/web/src/components/AllModelChat/index.tsx`

**功能说明**:
- 支持文本、图片、音频、视频等多种输入方式
- 集成 Gemini 2.0 系列模型
- 流式响应显示
- 消息历史管理

**如何使用**:

```tsx
// 在页面中引入使用
import { AllModelChat } from '@/components/AllModelChat';

export default function ChatPage() {
  return (
    <AllModelChat
      onSendMessage={async (message) => {
        // 处理消息发送逻辑
      }}
      onUploadFile={async (file) => {
        // 处理文件上传逻辑
      }}
    />
  );
}
```

**当前状态**: 组件已实现，但需要在页面中引入使用

---

### 2. Gemini API 服务

**文件位置**: `packages/core/src/services/gemini-service.ts`

**功能说明**:
- 封装 Google Gemini API
- 支持多模型切换（Flash/Pro/Flash Thinking）
- 流式响应
- 图片生成
- 语音合成

**如何使用**:

```typescript
import { GeminiService, getGeminiService } from '@ai-intelligent-analysis-platform/core';

// 方式1：使用默认实例
const gemini = getGeminiService();

// 方式2：创建新实例
const gemini = new GeminiService({
  apiKey: 'your-api-key',
  model: 'gemini-2.0-flash-exp'
});

// 发送流式消息
await gemini.sendMessageStream(
  [{ role: 'user', content: '你好' }],
  {
    onData: (chunk) => console.log(chunk),
    onComplete: () => console.log('完成'),
    onError: (error) => console.error(error)
  }
);

// 发送图片消息
const imageFile = await fetch('/image.png').then(r => r.blob());
await gemini.sendMessageWithImage('描述这张图片', imageFile);

// 生成图片
const imageData = await gemini.generateImage('一只可爱的猫咪');
```

**当前状态**: ✅ 已完全实现并导出

---

### 3. 实时联网搜索

**文件位置**: `packages/core/src/services/web-search-service.ts`

**功能说明**:
- 基于 Google Custom Search API
- 实时获取最新信息
- 搜索结果引用

**如何使用**:

```typescript
import { WebSearchService, getWebSearchService } from '@ai-intelligent-analysis-platform/core';

const searchService = getWebSearchService();

// 执行搜索
const results = await searchService.search('最新的 AI 技术趋势', {
  numResults: 5,
  safeSearch: 'moderate'
});

results.forEach(result => {
  console.log(result.title, result.link, result.snippet);
});
```

**配置要求**:
在 `.env.local` 中添加：
```bash
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
NEXT_PUBLIC_GOOGLE_CX=your_search_engine_id
```

**当前状态**: ✅ 已完全实现并导出

---

### 4. Python 代码执行

**文件位置**: `packages/core/src/services/python-execution-service.ts`

**功能说明**:
- 浏览器端执行 Python 代码
- 基于 Pyodide
- 支持 numpy、pandas 等库
- 图表生成

**如何使用**:

```typescript
import { PythonExecutionService, getPythonExecutionService } from '@ai-intelligent-analysis-platform/core';

const pythonService = getPythonExecutionService();

// 初始化
await pythonService.initialize();

// 执行代码
const result = await pythonService.executeCode(`
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.title('Sine Wave')
plt.show()
`);

console.log('输出:', result.output);
console.log('图表:', result.plots);
```

**当前状态**: ✅ 已完全实现并导出

---

### 5. 语音交互

**文件位置**: `packages/core/src/services/voice-service.ts`

**功能说明**:
- 语音识别 (STT)
- 语音合成 (TTS)
- 基于 Web Speech API

**如何使用**:

```typescript
import { VoiceService, getVoiceService } from '@ai-intelligent-analysis-platform/core';

const voiceService = getVoiceService();

// 检查支持
if (VoiceService.isRecognitionSupported()) {
  // 开始语音识别
  voiceService.startRecognition(
    (result) => {
      console.log('识别结果:', result.transcript);
    },
    (error) => console.error('识别错误:', error)
  );
  
  // 停止识别
  voiceService.stopRecognition();
}

// 语音合成
if (VoiceService.isSynthesisSupported()) {
  await voiceService.speak('你好，这是语音合成测试', {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });
}
```

**当前状态**: ✅ 已完全实现并导出

---

### 6. 长文档分析

**文件位置**: `packages/core/src/services/document-analysis-service.ts`

**功能说明**:
- 文档内容提取
- 智能分块
- 摘要生成
- 关键词提取

**如何使用**:

```typescript
import { DocumentAnalysisService, getDocumentAnalysisService } from '@ai-intelligent-analysis-platform/core';

const analyzer = getDocumentAnalysisService();

// 分析文档
const file = document.getElementById('file-input').files[0];
const analysis = await analyzer.analyzeDocument(file, {
  extractSummary: true,
  extractKeywords: true,
  extractEntities: true,
  maxChunkSize: 5000
});

console.log('摘要:', analysis.summary);
console.log('关键词:', analysis.keywords);
console.log('实体:', analysis.entities);
```

**当前状态**: ✅ 已完全实现并导出

---

### 7. Canvas 预览组件

**文件位置**: `packages/web/src/components/CanvasPreview/index.tsx`

**功能说明**:
- 代码执行结果预览
- 支持 ECharts 图表
- 支持 Mermaid 流程图
- 支持 Graphviz 图形

**如何使用**:

```tsx
import { CanvasPreview } from '@/components/CanvasPreview';

export default function PreviewPage() {
  return (
    <CanvasPreview
      code={`
        import matplotlib.pyplot as plt
        plt.plot([1, 2, 3], [1, 4, 9])
        plt.show()
      `}
      language="python"
      onExecute={async (code) => {
        // 执行代码并返回结果
        return { output: '执行结果', plots: [] };
      }}
    />
  );
}
```

**当前状态**: ✅ 已实现，需要在页面中引入

---

### 8. 音频可视化组件

**文件位置**: `packages/web/src/components/AudioVisualizer/index.tsx`

**功能说明**:
- 音频波形可视化
- 实时频谱显示
- 支持播放控制

**如何使用**:

```tsx
import { AudioVisualizer } from '@/components/AudioVisualizer';

export default function AudioPage() {
  return (
    <AudioVisualizer
      audioUrl="/audio/example.mp3"
      autoPlay={false}
    />
  );
}
```

**当前状态**: ✅ 已实现，需要在页面中引入

---

### 9. 文档分析组件

**文件位置**: `packages/web/src/components/DocumentAnalyzer/index.tsx`

**功能说明**:
- 文档上传界面
- 分析进度显示
- 结果展示

**如何使用**:

```tsx
import { DocumentAnalyzer } from '@/components/DocumentAnalyzer';

export default function DocumentPage() {
  return (
    <DocumentAnalyzer
      onAnalyze={async (file) => {
        // 分析文档
      }}
    />
  );
}
```

**当前状态**: ✅ 已实现，需要在页面中引入

---

## 在项目中启用 All-Model-Chat 功能

### 步骤 1: 配置环境变量

创建 `.env.local` 文件：

```bash
# 必需
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# 可选（用于实时搜索）
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CX=your_search_engine_id
```

### 步骤 2: 在页面中引入组件

编辑 `packages/web/src/app/page.tsx`，添加 AllModelChat 组件：

```tsx
// 在文件顶部添加导入
import { AllModelChat } from '@/components/AllModelChat';

// 在组件中添加状态
const [allModelChatOpen, setAllModelChatOpen] = useState(false);

// 在 JSX 中添加组件
{allModelChatOpen && (
  <AllModelChat
    onClose={() => setAllModelChatOpen(false)}
    onSendMessage={handleSendMessage}
  />
)}

// 添加打开按钮
<button onClick={() => setAllModelChatOpen(true)}>
  打开 All-Model-Chat
</button>
```

### 步骤 3: 使用 Service API

在任何组件中都可以直接使用 Service API：

```tsx
import { getGeminiService, getVoiceService } from '@ai-intelligent-analysis-platform/core';

export default function MyComponent() {
  const handleChat = async () => {
    const gemini = getGeminiService();
    const voice = getVoiceService();
    
    // 使用服务...
  };
  
  return <button onClick={handleChat}>开始聊天</button>;
}
```

---

## 文件结构

```
packages/
├── core/src/services/           # All-Model-Chat 核心服务
│   ├── gemini-service.ts        # Gemini API 服务
│   ├── web-search-service.ts    # 联网搜索服务
│   ├── python-execution-service.ts  # Python 执行服务
│   ├── voice-service.ts         # 语音服务
│   └── document-analysis-service.ts # 文档分析服务
│
├── web/src/components/          # All-Model-Chat UI 组件
│   ├── AllModelChat/            # 多模态聊天组件
│   │   ├── index.tsx
│   │   └── styles.ts
│   ├── CanvasPreview/           # Canvas 预览组件
│   ├── AudioVisualizer/         # 音频可视化组件
│   └── DocumentAnalyzer/        # 文档分析组件
│
└── web/src/app/api/             # API 路由
    ├── search/route.ts          # 搜索 API
    └── python/
        └── execute/route.ts     # Python 执行 API
```

---

## 注意事项

1. **TypeScript 检查**: 所有 All-Model-Chat 相关代码已通过 TypeScript 检查（0 错误）
2. **浏览器兼容性**: 语音功能需要 Chrome 或 Edge 浏览器
3. **网络要求**: Python 执行需要访问 Pyodide CDN
4. **API 配额**: Gemini API 和 Google Search API 有使用配额限制

---

## 相关文档

- [All-Model-Chat 使用指南](./ALL_MODEL_CHAT_GUIDE.md)
- [项目 README](../README.md)
- [Gemini API 文档](https://ai.google.dev/docs)
