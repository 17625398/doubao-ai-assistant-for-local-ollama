# Web 代码规范 - 产品需求文档

## Overview
- **Summary**: 为 D:\Doubao\refactored\packages\web 目录制定统一的代码规范和最佳实践指南，确保代码质量、可维护性和团队协作效率。
- **Purpose**: 建立统一的编码标准，减少代码风格差异，提高代码可读性和可维护性，降低团队协作成本。
- **Target Users**: 所有参与该项目开发的团队成员、代码审查人员、新入职开发者。

## Goals
- 建立清晰的项目结构和文件组织规范
- 定义统一的编码风格和命名约定
- 制定类型安全和错误处理的最佳实践
- 提供可执行的代码质量检查工具链
- 创建易于理解和遵循的规范文档

## Non-Goals (Out of Scope)
- 不涉及后端服务代码规范（由 core 包单独定义）
- 不涉及 CI/CD 流程配置（已有独立配置）
- 不改变现有业务逻辑或功能实现

## Background & Context
项目基于 Next.js 16 + React 18 + TypeScript 技术栈，采用 App Router 模式。当前已配置：
- ESLint + TypeScript ESLint 用于代码检查
- Prettier 用于代码格式化
- TailwindCSS 3 用于样式管理
- 自定义路径别名配置

## Functional Requirements
- **FR-1**: 代码结构清晰，模块职责明确
- **FR-2**: 遵循统一的命名规范和代码风格
- **FR-3**: 具备完善的类型定义和类型安全
- **FR-4**: 错误处理机制完善，日志记录规范
- **FR-5**: 代码审查有明确的检查标准

## Non-Functional Requirements
- **NFR-1**: 代码检查工具可集成到 CI/CD 流程
- **NFR-2**: 规范文档易于查阅和理解
- **NFR-3**: 规范具有灵活性，可根据团队反馈迭代更新

## Constraints
- **Technical**: Next.js 16、React 18、TypeScript 5.x
- **Dependencies**: 项目依赖的第三方库版本固定

## Assumptions
- 团队成员熟悉 TypeScript 和 React 开发
- 开发者已安装必要的开发工具（ESLint、Prettier 插件）

## Acceptance Criteria

### AC-1: 项目结构规范
- **Given**: 开发者创建新组件或模块
- **When**: 按照规范组织文件
- **Then**: 文件放置在正确的目录，结构清晰可追溯
- **Verification**: `human-judgment`

### AC-2: 代码风格一致性
- **Given**: 任意开发者编写代码
- **When**: 运行 `npm run lint` 和 `npm run format`
- **Then**: 代码通过所有检查，无错误或警告
- **Verification**: `programmatic`

### AC-3: 类型安全检查
- **Given**: 开发者提交代码变更
- **When**: 运行 `npm run typecheck`
- **Then**: 无类型错误
- **Verification**: `programmatic`

### AC-4: API 路由规范
- **Given**: 创建或修改 API 路由
- **When**: 实现请求处理逻辑
- **Then**: 正确使用 `await params` 处理动态路由参数
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要为不同类型的组件（UI、业务、工具）制定更细粒度的规范？
- [ ] 是否需要添加代码审查检查清单模板？
