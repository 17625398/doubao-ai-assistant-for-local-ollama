# 组件目录合并 - 产品需求文档

## Overview
- **Summary**: 将 `chat` 和 `doubao-home` 两个组件目录合并，消除重复文件，统一组件管理，防止调用混淆
- **Purpose**: 解决两个目录中存在相同文件名（如 `ChatInputBox.tsx`）导致的导入混淆问题，统一聊天相关组件的组织结构
- **Target Users**: 开发人员，便于组件管理和维护

## Goals
- 将 `doubao-home` 目录下的组件迁移到 `chat/home/` 子目录
- 处理重复文件 `ChatInputBox.tsx`，保留一个统一版本
- 更新所有相关导入路径
- 确保合并后项目能正常构建和运行

## Non-Goals (Out of Scope)
- 修改组件内部实现逻辑
- 添加新功能
- 删除未使用的组件

## Background & Context
当前项目存在两个相似的组件目录：
- `components/chat/` - 通用聊天组件
- `components/doubao-home/` - 豆包首页专用组件

两个目录都包含 `ChatInputBox.tsx`，容易导致导入混淆。合并后将统一管理所有聊天相关组件。

## Functional Requirements
- **FR-1**: 创建 `chat/home/` 目录，迁移 `doubao-home` 下的所有组件
- **FR-2**: 处理重复文件 `ChatInputBox.tsx`，保留 chat 目录版本作为主版本
- **FR-3**: 更新所有使用 `doubao-home` 组件的导入路径
- **FR-4**: 更新 `doubao-home/ChatInputBox.tsx` 的引用到 `chat/ChatInputBox.tsx`

## Non-Functional Requirements
- **NFR-1**: 合并后项目必须能正常构建
- **NFR-2**: 合并后所有页面功能正常运行

## Constraints
- **Technical**: 需要更新多个文件的导入路径
- **Dependencies**: 确保所有导入更新正确

## Assumptions
- `chat/ChatInputBox.tsx` 是通用版本，可以替代 `doubao-home/ChatInputBox.tsx`
- 所有使用 `doubao-home` 组件的文件都可以通过 grep 找到

## Acceptance Criteria

### AC-1: 目录结构合并完成
- **Given**: 原始目录结构存在
- **When**: 执行合并操作后
- **Then**: `chat/home/` 目录包含所有 `doubao-home` 下的组件
- **Verification**: `programmatic`

### AC-2: 重复文件处理完成
- **Given**: 两个目录都有 `ChatInputBox.tsx`
- **When**: 合并完成后
- **Then**: 只保留一个 `ChatInputBox.tsx`，所有引用更新到该文件
- **Verification**: `programmatic`

### AC-3: 项目构建成功
- **Given**: 合并操作完成
- **When**: 运行构建命令
- **Then**: 构建成功，无错误
- **Verification**: `programmatic`

### AC-4: 删除原 doubao-home 目录
- **Given**: 所有组件已迁移
- **When**: 删除操作完成后
- **Then**: `doubao-home` 目录不再存在
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留 `doubao-home/ChatInputBox.tsx` 的特殊逻辑？