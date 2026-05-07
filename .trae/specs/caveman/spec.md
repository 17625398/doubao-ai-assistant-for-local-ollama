# Caveman 功能集成 - 产品需求文档

## Overview
- **Summary**: 为 AI 分析平台集成 Caveman 功能，通过使用简短、直接的语言风格，减少 LLM 输出的 token 使用量，同时保持技术准确性。
- **Purpose**: 提高 AI 响应速度，降低 API 调用成本，改善用户体验，使 AI 回复更加简洁明了。
- **Target Users**: 所有使用 AI 分析平台的用户，特别是那些关注 API 调用成本和响应速度的用户。

## Goals
- 实现 Caveman 模式，使 AI 回复更加简洁明了
- 提供不同强度的 Caveman 模式（Lite、Full、Ultra）
- 实现文言文模式，提供更高效的 token 压缩
- 添加 caveman-commit 功能，生成简洁的提交信息
- 添加 caveman-review 功能，生成单行代码审查
- 添加 caveman-compress 功能，压缩输入文件以减少 token 使用
- 确保 Caveman 模式下保持技术准确性

## Non-Goals (Out of Scope)
- 不修改底层 LLM 模型
- 不影响其他功能的正常运行
- 不改变平台的核心架构

## Background & Context
- Caveman 是一个开源项目，通过使用简短、直接的语言风格，减少 LLM 输出的 token 使用量，同时保持技术准确性。
- 原始项目支持 Claude Code、Codex、Gemini CLI、Cursor、Windsurf、Cline 和 Copilot 等多种 AI 工具。
- 我们的 AI 分析平台需要集成类似的功能，以提高响应速度和降低成本。

## Functional Requirements
- **FR-1**: 实现 Caveman 模式切换功能，支持 Lite、Full、Ultra 三种强度
- **FR-2**: 实现文言文模式，支持 Lite、Full、Ultra 三种强度
- **FR-3**: 实现 caveman-commit 功能，生成简洁的提交信息
- **FR-4**: 实现 caveman-review 功能，生成单行代码审查
- **FR-5**: 实现 caveman-compress 功能，压缩输入文件以减少 token 使用
- **FR-6**: 实现 Caveman 模式的启用和禁用功能
- **FR-7**: 确保 Caveman 模式下保持技术准确性

## Non-Functional Requirements
- **NFR-1**: Caveman 模式应减少至少 50% 的输出 token 使用量
- **NFR-2**: Caveman 模式不应影响技术准确性
- **NFR-3**: 切换 Caveman 模式应立即生效
- **NFR-4**: 界面应简洁明了，易于使用
- **NFR-5**: 应支持所有现有的 AI 模型

## Constraints
- **Technical**: 应与现有的 AI 分析平台架构兼容
- **Business**: 应在不增加 API 调用成本的情况下实现
- **Dependencies**: 依赖现有的 AI 分析平台基础设施

## Assumptions
- 用户希望减少 token 使用量以降低成本
- 用户希望 AI 回复更加简洁明了
- 用户希望保持技术准确性

## Acceptance Criteria

### AC-1: Caveman 模式切换
- **Given**: 用户在界面上选择 Caveman 模式
- **When**: 用户发送查询
- **Then**: AI 回复应使用简洁、直接的语言风格
- **Verification**: `human-judgment`

### AC-2: 不同强度的 Caveman 模式
- **Given**: 用户选择不同强度的 Caveman 模式
- **When**: 用户发送查询
- **Then**: AI 回复应根据所选强度调整语言风格
- **Verification**: `human-judgment`

### AC-3: 文言文模式
- **Given**: 用户选择文言文模式
- **When**: 用户发送查询
- **Then**: AI 回复应使用文言文风格
- **Verification**: `human-judgment`

### AC-4: caveman-commit 功能
- **Given**: 用户使用 caveman-commit 功能
- **When**: 用户提供提交信息
- **Then**: 系统应生成简洁的提交信息
- **Verification**: `human-judgment`

### AC-5: caveman-review 功能
- **Given**: 用户使用 caveman-review 功能
- **When**: 用户提供代码
- **Then**: 系统应生成单行代码审查
- **Verification**: `human-judgment`

### AC-6: caveman-compress 功能
- **Given**: 用户使用 caveman-compress 功能
- **When**: 用户提供文件
- **Then**: 系统应压缩文件以减少 token 使用
- **Verification**: `programmatic`

### AC-7: 技术准确性
- **Given**: 用户使用 Caveman 模式
- **When**: 用户发送技术查询
- **Then**: AI 回复应保持技术准确性
- **Verification**: `human-judgment`

## Open Questions
- [ ] 如何确保 Caveman 模式在所有 AI 模型上都能正常工作？
- [ ] 如何平衡简洁性和技术准确性？
- [ ] 如何处理特殊情况，如代码示例和格式化文本？