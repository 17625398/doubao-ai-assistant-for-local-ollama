---
name: "all-model-chat-integration"
description: "Integrates advanced features from All-Model-Chat project including web content extraction, URL context, deep search, and Canvas rendering. Invoke when user wants to enhance web content extraction or add AI chat assistant features like URL parsing, search integration, or interactive Canvas."
---

# All-Model-Chat 深度集成技能

## 技能概述

本技能整合了 [All-Model-Chat](https://github.com/yeahhe365/All-Model-Chat) 项目的核心功能，用于优化豆包AI助手的网页内容提取和交互体验。

## 核心功能模块

### 1. 网页内容提取增强

参考 All-Model-Chat 的 URL 上下文功能，实现：

- **智能URL内容抓取**
  - 自动识别输入中的URL链接
  - 异步抓取URL内容作为对话上下文
  - 支持多种网页类型的内容提取
  
- **内容预处理**
  - HTML到Markdown的智能转换
  - 去除广告、导航等无关内容
  - 保留文章主体结构和格式
  
- **Token优化**
  - 智能截断长文本
  - 保留关键信息（标题、摘要、正文）
  - 压缩率统计和可视化

### 2. 深度搜索集成

参考 All-Model-Chat 的深度搜索功能：

- **搜索任务规划**
  - 自动分析用户查询意图
  - 规划多步骤搜索任务
  - 聚合搜索结果
  
- **结果引用**
  - 为搜索结果添加引用标记
  - 支持点击查看来源
  - 生成带引用的回答

### 3. 智能Canvas渲染

参考 All-Model-Chat 的Canvas功能：

- **代码块自动识别**
  - 识别HTML/CSS/JS代码块
  - 自动渲染为交互式预览
  - 支持全屏查看
  
- **图表渲染**
  - ECharts图表支持
  - Mermaid流程图
  - Graphviz图形
  
- **自动生成模式**
  - 可配置触发模型
  - 自动检测需要可视化的内容

### 4. 文件处理增强

参考 All-Model-Chat 的文件处理：

- **音频转码压缩**
  - 客户端转码为16kHz MP3
  - 节省Token消耗
  
- **ZIP/文件夹解析**
  - 自动解析代码库结构
  - 生成文件树
  
- **多格式支持**
  - 图片、PDF、视频、音频、文本
  - 可配置上传方式（Files API / Base64）

## 使用场景

### 场景1：URL内容提取
```
用户输入包含URL的消息时，自动抓取URL内容并作为上下文发送给AI
```

### 场景2：深度搜索
```
用户询问需要实时信息的问题时，自动执行搜索并整合结果
```

### 场景3：Canvas预览
```
AI返回HTML/CSS/JS代码时，自动提供交互式预览按钮
```

### 场景4：代码库分析
```
用户上传ZIP文件时，自动解析结构并生成文件树
```

## 技术实现参考

### URL内容抓取
```typescript
// 使用现有的 /api/read 端点
const response = await fetch(`/api/read?url=${encodeURIComponent(url)}`);
const data = await response.json();
// 将内容添加到消息上下文
```

### Canvas渲染
```typescript
// 检测代码块类型
const isHTML = code.includes('<html') || code.includes('<!DOCTYPE');
const isECharts = code.includes('echarts.init');
const isMermaid = code.includes('graph') || code.includes('sequenceDiagram');

// 渲染到iframe或canvas元素
```

### 搜索集成
```typescript
// 规划搜索任务
const searchTasks = await planSearchTasks(userQuery);
const results = await executeSearches(searchTasks);
const answer = await generateAnswerWithCitations(results);
```

## 集成建议

1. **网页内容提取**：扩展现有的 WebContentExtractorPanel，添加URL自动检测
2. **Canvas渲染**：在 CodeBlock 组件中添加预览功能
3. **搜索集成**：添加新的搜索面板和API端点
4. **文件处理**：增强 DocumentUploader 组件，支持ZIP解析

## 最佳实践

- 始终尊重用户隐私，明确提示URL抓取行为
- 提供取消/跳过选项
- 显示内容压缩率和Token消耗
- 缓存已抓取的URL内容
- 处理抓取失败的情况 gracefully
