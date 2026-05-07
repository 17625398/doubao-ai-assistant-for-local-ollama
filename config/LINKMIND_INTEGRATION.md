# LinkMind Server Integration

LinkMind Server 是一个企业级多模态 AI 中间件，为 refactored 项目提供以下能力：

## 功能特性

- **多模型适配**：支持 Ollama、Doubao、Coze 等多种 LLM 后端
- **文档处理**：OCR 识别、文档解析、表格提取
- **向量存储**：Chroma、Elasticsearch 集成
- **RAG 支持**：检索增强生成
- **多模态**：图像理解、语音合成
- **MCP 协议**：Model Context Protocol 支持

## 快速启动

### 方式一：使用 npm dev 命令（推荐）

```bash
cd d:\Doubao\refactored
npm run dev
```

这会自动启动 LinkMind Server（端口 8080）和 Next.js 开发服务器（端口 3000）。

### 方式二：分别启动

**1. 启动 LinkMind Server**

```bash
java -Dlinkmind.config=config/lagi.yml -jar d:\Doubao\linkmind-server\LinkMind.jar
```

**2. 启动 Next.js**

```bash
npm run dev
```

## 配置文件

- 主配置：`config/lagi.yml`
- 支持环境变量覆盖

## API 端点

通过 Next.js API 代理访问：

| 端点 | 说明 |
|------|------|
| `/api/linkmind/chat` | 聊天补全 |
| `/api/linkmind/models` | 模型列表 |
| `/api/linkmind/embeddings` | 向量嵌入 |
| `/api/linkmind/multimodal/vision` | 图像理解 |
| `/api/linkmind/multimodal/tts` | 语音合成 |
| `/api/linkmind/multimodal/asr` | 语音识别 |

## 服务状态检查

访问 `http://localhost:8080/health` 检查 LinkMind Server 状态。

## 打包产物

JAR 文件位置：`d:\Doubao\linkmind-server\lagi-web\target\LinkMind.jar`
WAR 文件位置：`d:\Doubao\linkmind-server\lagi-web\target\ROOT.war`

## 故障排除

### 端口占用

```bash
# 检查端口占用
netstat -ano | findstr :8080

# 终止进程
taskkill /PID <PID> /F
```

### 查看日志

LinkMind Server 日志在启动时输出到控制台。

### 重启服务

1. 停止现有服务（Ctrl+C）
2. 重新打包：`cd d:\Doubao\linkmind-server && mvn package`
3. 重新启动
