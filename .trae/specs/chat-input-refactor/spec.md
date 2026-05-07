# ChatInputBox 重构项目 - 产品需求文档

## Overview
- **Summary**: 参照 `d:\Doubao\all-model-chat-source` 目录中的聊天输入框组件，重构当前项目的聊天输入框，实现更完整的功能和更好的用户体验。
- **Purpose**: 提供一个功能完整、交互友好的聊天输入框，支持文件上传、语音输入、快捷命令等功能。
- **Target Users**: 所有使用豆包 AI 助手的用户

## Goals
- 实现完整的聊天输入框组件，包含文本输入、文件上传、图片上传功能
- 支持语音输入和快捷命令（Slash Command）
- 实现拖拽上传和粘贴支持
- 提供响应式设计，适配移动端和桌面端
- 支持深色/浅色主题切换

## Non-Goals (Out of Scope)
- 不实现 Live API 实时会话功能
- 不实现 TTS（文本转语音）功能
- 不实现图片生成模型相关功能
- 不实现代码执行功能

## Background & Context
源项目 `all-model-chat-source` 包含一个完整的聊天输入框实现，具有以下特点：
- 模块化设计，分离关注点
- 完整的状态管理和 hooks
- 丰富的功能支持

当前项目的输入框功能较为基础，需要进行扩展和重构。

## Functional Requirements
- **FR-1**: 文本输入区域，支持多行输入和自动调整高度
- **FR-2**: 工具栏，支持文件上传、图片上传、URL 输入
- **FR-3**: 操作按钮区域，包含发送、语音输入、搜索等功能
- **FR-4**: 快捷命令菜单（Slash Command）
- **FR-5**: 拖拽上传支持
- **FR-6**: 粘贴处理，支持文本和图片粘贴
- **FR-7**: 响应式设计，适配不同屏幕尺寸

## Non-Functional Requirements
- **NFR-1**: 输入框高度自动调整，最大高度限制
- **NFR-2**: 键盘快捷键支持（Enter 发送，Ctrl+Enter 换行）
- **NFR-3**: 深色/浅色主题支持
- **NFR-4**: 流畅的动画效果

## Constraints
- **Technical**: Next.js 16.x, React 18+, TypeScript, Tailwind CSS 3
- **Dependencies**: lucide-react 图标库

## Assumptions
- 用户已了解基本的聊天交互模式
- 后端 API 已准备好接收文件和消息

## Acceptance Criteria

### AC-1: 文本输入区域
- **Given**: 用户在聊天界面
- **When**: 用户输入文本
- **Then**: 文本显示在输入框中，输入框高度自动调整
- **Verification**: `human-judgment`

### AC-2: 文件上传
- **Given**: 用户点击文件上传按钮
- **When**: 用户选择文件
- **Then**: 文件被添加到上传列表，显示文件名和大小
- **Verification**: `human-judgment`

### AC-3: 图片上传
- **Given**: 用户点击图片上传按钮
- **When**: 用户选择图片文件
- **Then**: 图片预览显示在输入框上方
- **Verification**: `human-judgment`

### AC-4: 快捷命令菜单
- **Given**: 用户输入 "/"
- **When**: 用户输入命令名称
- **Then**: 显示匹配的命令列表，可选择执行
- **Verification**: `human-judgment`

### AC-5: 拖拽上传
- **Given**: 用户拖拽文件到输入区域
- **When**: 文件被释放
- **Then**: 文件被添加到上传列表
- **Verification**: `human-judgment`

### AC-6: 发送消息
- **Given**: 用户输入消息并点击发送按钮
- **When**: 点击发送或按 Enter 键
- **Then**: 消息发送到服务器，输入框清空
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要支持语音输入功能？
- [ ] 是否需要支持 Google 搜索集成？
