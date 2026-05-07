# 豆包本地项目逆向分析与优化 - 产品需求文档

## 概述
- **Summary**: 基于对豆包官方原生程序（`d:\Doubao\app`）的深度逆向分析结果（`doubao.md`），优化本地重构项目（`d:\Doubao\refactored`），特别是在文档解析、AI 集成、语音交互和网页内容提取方面，打造更高效、更智能的本地 AI 助手。
- **Purpose**: 通过借鉴官方原生程序的架构设计和功能模块，识别改进空间，提升重构项目的文档处理能力、AI 智能化水平和用户体验。
- **Target Users**: 开发者、AI 研究人员、需要本地文档处理和 AI 辅助能力的终端用户。

## 目标
- 深入分析豆包官方原生程序的架构和实现原理（已完成，见 `doubao.md`）
- 优化本地项目的文档解析能力，支持更多格式和更复杂的场景
- 提升 AI 集成的智能化水平，实现文档问答、摘要生成和向量化检索
- 改进用户界面和交互体验，支持语音输入和实时反馈
- 确保项目的可维护性和扩展性

## 非目标（范围外）
- 完全重写现有功能
- 改变项目的核心业务逻辑
- 引入不相关的第三方依赖
- 破坏现有的功能兼容性

## 背景与上下文
- **官方原生程序结构**：
  - 位于 `d:\Doubao\app`，是一个基于 Chromium 的 Windows 桌面客户端
  - 包含 `Doubao.exe` / `Doubao.dll`（核心宿主）、`local_webcontents\extensions\ai-views`（AI 浏览器扩展）、`aha_doctor`（诊断工具）
  - 功能模块：聊天、搜索、深度搜索、PDF/DOCX 阅读、写作、翻译、编程、图片、视频、语音、PPT、音乐
  - 技术栈：React 18、Modern.js/EdenX、styled-components、Manifest V3 扩展

- **重构项目结构**：
  - 位于 `d:\Doubao\refactored`
  - `packages/core/`：核心功能和服务（文档解析、AI 服务、RAG、缓存等）
  - `packages/extension/`：浏览器扩展（background、content-script、side-panel）
  - `packages/web/`：Web 应用（Next.js、文档处理页面、聊天界面）
  - 已有功能：多模型适配（Ollama、OpenAI、LinkMind）、文档解析（PDF/Word/Excel/PPT）、网页内容提取、语音对话

- **当前限制**：
  - 文档解析能力有限（PDF 仅转图片，缺乏文本提取；Word 不支持 .doc；PPT 仅提取文本）
  - AI 文档问答使用模拟回复，未接入真实模型
  - 语音交互依赖浏览器 API，缺乏原生 ASR/TTS 能力
  - 缓存和性能优化不足
  - 缺乏与官方程序对标的侧边栏技能插件体系

## 功能需求

### FR-1: 增强文档解析能力
- 支持 PDF、Word（.doc/.docx）、Excel、PowerPoint、Markdown、EPUB 等常见文档格式
- 提供文档内容提取和结构化分析（文本、表格、图像、页眉页脚）
- 支持大文档的分块处理和内存管理
- 实现文档类型自动检测和格式转换
- 支持扫描文档的 OCR 功能（集成 Tesseract.js）
- **优化点**：PDF 解析需支持文本层提取（而非仅转图片）；Word 需支持 .doc 格式；PPT 需提取表格和图表

### FR-2: 优化 AI 集成
- 支持本地模型（Ollama）和云端模型（OpenAI、LinkMind）的无缝切换
- 实现文档向量化和语义检索（基于 RAGService 和 EmbeddingService）
- 开发智能文档问答功能，支持引用原文（基于 DocumentChatService）
- 提供文档摘要和关键信息提取（基于 DocumentSummaryService）
- 支持多语言文档处理
- **优化点**：接入真实模型 API 替代模拟回复；优化提示词模板；支持多模型并发调用

### FR-3: 改进用户界面
- 响应式设计，支持多设备（桌面、平板、手机）
- 直观的文档上传和处理界面（拖放、批量上传）
- 实时进度显示和结果预览
- 支持文档处理历史和结果管理
- **优化点**：参考官方程序的侧边栏设计，实现技能插件化 UI；添加语音输入按钮和实时波形显示

### FR-4: 增强扩展性
- 模块化设计，支持插件系统（参考官方 `*-plugin.js` 体系）
- 提供 API 接口，支持外部集成
- 支持自定义模型和处理流程
- 实现解析器插件机制，支持新文档格式
- 提供配置管理系统（基于 AIConfigManager）

### FR-5: 提升性能
- 优化文档处理速度和内存使用
- 实现并行处理和缓存机制（基于 CacheManager）
- 减少网络资源消耗
- 支持增量解析和断点续传
- 优化大文档处理的内存管理

### FR-6: 语音交互增强
- 支持语音输入和实时语音识别
- 支持语音合成（TTS）朗读回复
- 实现语音唤醒和结束检测
- **优化点**：集成 Web Speech API 作为 fallback；探索集成原生语音 DLL 能力

### FR-7: 网页内容提取增强
- 支持智能网页内容提取（基于 WebContentExtractor 和 EnhancedWebContentExtractor）
- 支持动态内容加载等待（SPA 页面）
- 提取结构化数据（JSON-LD、Microdata、RDFa）
- 支持媒体内容提取（图片、视频、音频）

## 非功能需求
- **NFR-1**: 性能
  - 文档解析速度：小于 30 秒（10MB 文档）
  - 响应时间：UI 操作响应时间小于 100ms
  - 内存占用：处理大型文档时不超过 1GB

- **NFR-2**: 可靠性
  - 文档解析成功率：≥95%
  - 系统稳定性：连续运行 24 小时无崩溃
  - 错误处理：提供友好的错误提示和恢复机制

- **NFR-3**: 安全性
  - 本地处理敏感文档，不向第三方发送数据
  - 支持文档加密和访问控制
  - 安全的模型加载和执行

- **NFR-4**: 可扩展性
  - 支持插件系统，可自定义处理流程
  - 模块化设计，易于添加新功能
  - 支持多语言和多平台

## 约束
- **技术**：
  - 基于现有 TypeScript/Next.js 技术栈
  - 兼容 Chrome 扩展 Manifest V3
  - 支持 Node.js 18+

- **业务**：
  - 保持与现有功能的兼容性
  - 优先考虑本地处理能力
  - 遵循开源协议和法律法规

- **依赖**：
  - 文档解析库（pdfjs-dist、mammoth、xlsx、jszip）
  - AI 模型集成（Ollama API、OpenAI API、LinkMind API）
  - 前端框架和状态管理

## 假设
- 目标用户具备基本的技术知识
- 本地环境具备足够的计算资源
- 网络连接可用（用于模型下载和更新）
- 用户需要处理的文档大小通常在 100MB 以内

## 验收标准

### AC-1: 文档解析功能
- **Given**: 用户上传 PDF 文档
- **When**: 系统开始解析文档
- **Then**: 系统应正确提取文档内容，包括文本、图像和表格
- **Verification**: `programmatic`
- **Notes**: 支持加密 PDF 和大型文档

### AC-2: AI 文档问答
- **Given**: 文档已解析完成
- **When**: 用户提出关于文档内容的问题
- **Then**: 系统应基于文档内容生成准确的回答
- **Verification**: `human-judgment`
- **Notes**: 回答应引用文档中的相关段落

### AC-3: 性能测试
- **Given**: 上传 10MB PDF 文档
- **When**: 系统处理文档
- **Then**: 处理时间应小于 30 秒
- **Verification**: `programmatic`

### AC-4: 用户界面
- **Given**: 用户访问应用界面
- **When**: 用户上传文档并查看结果
- **Then**: 界面应响应迅速，操作流畅
- **Verification**: `human-judgment`

### AC-5: 扩展性
- **Given**: 开发者添加新的文档格式支持
- **When**: 系统加载新插件
- **Then**: 系统应正确识别并处理新格式
- **Verification**: `programmatic`

### AC-6: 语音交互
- **Given**: 用户点击语音输入按钮
- **When**: 用户说出问题
- **Then**: 系统应正确识别语音并生成回答
- **Verification**: `human-judgment`

## 未解决的问题
- [ ] 如何平衡本地处理能力和性能需求
- [ ] 大型文档的内存管理策略
- [ ] 不同文档格式的统一处理接口
- [ ] 本地模型和云端模型的无缝切换
- [ ] 文档解析结果的存储和缓存策略
