# All-Model-Chat 使用指南

## 快速开始

### 1. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 必需：Gemini API Key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# 可选：Google 搜索（用于实时联网搜索）
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CX=your_search_engine_id

# 可选：Pyodide CDN（用于 Python 代码执行）
NEXT_PUBLIC_PYODIDE_CDN_URL=https://cdn.jsdelivr.net/pyodide/v0.25.0/full/
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用 All-Model-Chat 功能。

## 功能使用示例

### 多模态聊天

```typescript
import { GeminiService } from '@ai-intelligent-analysis-platform/core';

const gemini = new GeminiService({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
  model: 'gemini-2.0-flash-exp'
});

// 发送文本消息
await gemini.sendMessageStream(
  [{ role: 'user', content: '你好，请介绍一下自己' }],
  {
    onData: (chunk) => console.log(chunk),
    onComplete: () => console.log('完成'),
    onError: (error) => console.error(error)
  }
);

// 发送图片
const imageFile = await fetch('/example.png').then(r => r.blob());
await gemini.sendMessageWithImage('描述这张图片', imageFile);

// 生成图片
const imageData = await gemini.generateImage('一只可爱的猫咪');
```

### Python 代码执行

```typescript
import { PythonExecutionService } from '@ai-intelligent-analysis-platform/core';

const python = PythonExecutionService.getInstance();
await python.initialize();

// 执行代码
const result = await python.executeCode(`
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2)
plt.title('Sine Wave', fontsize=16)
plt.xlabel('X', fontsize=12)
plt.ylabel('Y', fontsize=12)
plt.grid(True, alpha=0.3)
plt.show()
`);

console.log('输出:', result.output);
console.log('图表:', result.plots);
```

### 实时联网搜索

```typescript
import { WebSearchService } from '@ai-intelligent-analysis-platform/core';

const search = WebSearchService.getInstance();

const results = await search.search('最新的 AI 技术趋势', {
  numResults: 5,
  safeSearch: 'moderate'
});

results.forEach(result => {
  console.log(`标题: ${result.title}`);
  console.log(`链接: ${result.link}`);
  console.log(`摘要: ${result.snippet}`);
});
```

### 语音交互

```typescript
import { VoiceService } from '@ai-intelligent-analysis-platform/core';

const voice = VoiceService.getInstance();

// 检查支持
if (VoiceService.isRecognitionSupported()) {
  // 开始语音识别
  voice.startRecognition(
    (result) => {
      console.log('识别结果:', result.transcript);
      console.log('置信度:', result.confidence);
    },
    (error) => console.error('识别错误:', error)
  );
}

// 语音合成
if (VoiceService.isSynthesisSupported()) {
  await voice.speak('你好，这是语音合成测试', {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  });
}
```

### 长文档分析

```typescript
import { DocumentAnalysisService } from '@ai-intelligent-analysis-platform/core';

const analyzer = DocumentAnalysisService.getInstance();

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

## 组件使用

### AllModelChat 组件

```tsx
import { AllModelChat } from '@/components/AllModelChat';

export default function ChatPage() {
  return (
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
  );
}
```

### CanvasPreview 组件

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
        // 执行代码
        return { output: '执行结果', plots: [] };
      }}
    />
  );
}
```

## 模型选择建议

| 场景 | 推荐模型 | 说明 |
|------|----------|------|
| 日常对话 | Gemini 2.0 Flash | 响应快，成本低 |
| 代码生成 | Gemini 2.0 Pro | 能力强，理解深 |
| 复杂分析 | Gemini 2.0 Pro | 推理能力强 |
| 教学演示 | Gemini 2.0 Flash Thinking | 思维链可视化 |
| 实时搜索 | Gemini 2.0 Flash | 响应快，适合实时场景 |

## 故障排除

### 常见问题

1. **API Key 无效**
   - 检查 `.env.local` 文件是否正确配置
   - 确认 API Key 有访问 Gemini API 的权限

2. **Python 执行失败**
   - 检查网络连接，确保可以访问 Pyodide CDN
   - 部分 Python 模块可能不支持

3. **语音识别失败**
   - 确保浏览器支持 Web Speech API
   - 检查麦克风权限是否已授权

4. **搜索功能不可用**
   - 确认已配置 Google API Key 和 Search Engine ID
   - 检查 API 配额是否已用完

## 更多信息

- [Gemini API 文档](https://ai.google.dev/docs)
- [Pyodide 文档](https://pyodide.org/)
- [项目 README](../README.md)
