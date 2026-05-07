# 根据豆包原生程序重构项目 - PRD

## Overview
- **Summary**: 基于豆包原生程序逆向分析，重构现有 Web 应用以达到与原生程序功能对齐。重点解决功能差距、架构一致性和用户体验问题。
- **Purpose**: 使 refactored 项目具备与豆包原生程序相当的功能能力，包括聊天、文档解析、多模态支持、Web内容提取等核心功能。
- **Target Users**: 期望获得原生级体验的 Web 应用用户

## Goals
- 实现与原生程序一致的功能开关矩阵（feature flags）
- 完善 Web 内容提取服务架构
- 建立 PDF/OCR 策略层
- 强化后续问题生成的结构化契约
- 整合文本选择器（text-picker）事件总线
- 重构 UI 面板编排系统

## Non-Goals (Out of Scope)
- 完整复制原生程序的底层实现细节
- 实现非核心的边缘功能
- 修改第三方依赖库

## Background & Context
根据对豆包原生程序（版本 2.7.6）的逆向分析，发现以下关键特性：
- MV3 扩展架构（side panel + popup + content scripts）
- 丰富的运行时功能开关系统（modern.config.json）
- 支持 PDF 沉浸式阅读、深度搜索、图像编辑等高级功能
- 多引擎调度和智能回退机制

当前本地实现存在多个能力差距，需要系统性重构。

## Functional Requirements
- **FR-1**: 实现中心化功能开关服务，支持动态配置和环境变量覆盖
- **FR-2**: 完善 Web 内容提取服务，支持多引擎调度和回退追踪
- **FR-3**: 引入 PDF/OCR 处理策略层，支持文本优先/OCR优先/沉浸式阅读模式
- **FR-4**: 强化后续问题生成管道，添加严格的 schema 验证和遥测支持
- **FR-5**: 整合文本选择器事件总线，实现统一的动作到命令映射
- **FR-6**: 重构 UI 面板编排，提取面板路由和状态机

## Non-Functional Requirements
- **NFR-1**: 重构后的代码应具有良好的可测试性和可维护性
- **NFR-2**: 性能不应低于当前实现
- **NFR-3**: 保持与现有 API 的向后兼容性

## Constraints
- **Technical**: Next.js 16.x + TypeScript 环境，保持现有技术栈
- **Business**: 最小化对现有功能的影响
- **Dependencies**: 依赖于现有核心服务和工具库

## Assumptions
- 现有核心服务（Ollama、LinkMind）保持稳定
- 用户期望与原生程序相似的功能体验
- 重构不会影响现有数据存储格式

## Acceptance Criteria

### AC-1: 功能开关服务
- **Given**: 应用启动时
- **When**: 检查功能状态
- **Then**: 应能读取中心化配置并正确启用/禁用功能
- **Verification**: `programmatic`

### AC-2: Web 内容提取增强
- **Given**: 提取动态网页内容
- **When**: 主引擎失败
- **Then**: 应自动回退到备用引擎并记录追踪信息
- **Verification**: `programmatic`

### AC-3: PDF/OCR 策略配置
- **Given**: 用户上传 PDF 文件
- **When**: 选择不同处理模式
- **Then**: 应根据策略配置执行相应的解析路径
- **Verification**: `programmatic`

### AC-4: 后续问题验证
- **Given**: AI 生成后续问题
- **When**: 返回响应
- **Then**: 应验证响应格式符合预期 schema
- **Verification**: `programmatic`

### AC-5: 文本选择器集成
- **Given**: 用户选择网页文本
- **When**: 触发选择器操作
- **Then**: 应正确映射到应用命令
- **Verification**: `human-judgment`

### AC-6: 面板编排重构
- **Given**: 用户操作面板
- **When**: 切换面板状态
- **Then**: 应平滑切换且无状态混乱
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要支持动态功能开关热更新？
- [ ] 是否需要添加完整的端到端测试覆盖？