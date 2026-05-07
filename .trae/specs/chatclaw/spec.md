# ChatClaw - 产品需求文档

## Overview
- **Summary**: ChatClaw 是一款开源的本地知识库、OpenClaw 图形化桌面管家应用，无需编程，一键部署至本地电脑。可连接多种通讯应用，内置技能市场、知识库、记忆功能等。
- **Purpose**: 提供个人 AI 智能体，支持多渠道通讯、知识库管理、技能市场等功能，让用户通过简单指令即可让 AI 执行任务。
- **Target Users**: 个人用户、企业用户，需要 AI 助手帮助处理日常任务、管理知识库、进行远程控制的用户。

## Goals
- 构建本地知识库管理系统，支持多种文档格式的上传、解析和向量存储
- 实现多 Agent 模式，满足不同场景使用需求
- 集成 5000+ 技能库，支持 AI 自主执行任务
- 支持记忆功能，实现上下文对话和个性化服务
- 提供多渠道通讯集成（微信、钉钉、企业微信、QQ、飞书、WhatsApp 等）
- 实现定时任务功能，支持自动化运行
- 提供划词即时问答和智能侧边栏功能
- 支持一问多答和一键启动功能
- 提供服务器模式部署选项

## Non-Goals (Out of Scope)
- 不需要实现完整的 OpenClaw 功能集
- 不需要支持所有可能的通讯应用，仅支持主流应用
- 不需要开发移动端应用，仅桌面端和服务器模式
- 不需要实现复杂的权限管理系统

## Background & Context
- ChatClaw 是基于 Go 语言开发的应用，提供沙箱安全、资源占用少、运行快的特点
- 支持 Windows 和 macOS 平台，安装包仅 30MB，安装时间约 1 分钟
- 内置 Skill Market、Knowledge Base、Memory、MCP、Scheduled Tasks 等核心功能

## Functional Requirements
- **FR-1**: 本地知识库管理，支持 TXT、PDF、Word、Excel、CSV、HTML、Markdown 等格式的文档上传、解析和向量存储
- **FR-2**: 多 Agent 模式，支持创建多个独立 AI Agent，每个拥有专属角色、记忆和技能
- **FR-3**: 技能市场，提供 5000+ 开箱即用的 AI 技能，覆盖效率办公、开发工具、多媒体创作、智能家居等场景
- **FR-4**: 记忆功能，实现上下文对话，提供个性化服务
- **FR-5**: 多渠道通讯集成，支持微信、钉钉、企业微信、QQ、飞书、WhatsApp 等主流通讯应用
- **FR-6**: 定时任务功能，支持设定监控频率，自动执行任务并推送结果
- **FR-7**: 划词即时问答功能，选中屏幕文字自动复制到悬浮快问框
- **FR-8**: 智能侧边栏，可贴靠在其他应用窗口旁，快速切换不同配置的 AI 助手
- **FR-9**: 一问多答功能，同时咨询多个 AI 专家，并排查看回复
- **FR-10**: 一键启动功能，通过桌面悬浮球唤醒或打开主应用窗口
- **FR-11**: 服务器模式部署，支持通过浏览器访问，无需桌面 GUI

## Non-Functional Requirements
- **NFR-1**: 性能要求，应用启动时间快，响应迅速，资源占用低
- **NFR-2**: 安全性，采用沙箱安全机制，保护用户数据和系统安全
- **NFR-3**: 可扩展性，支持自定义模型和技能扩展
- **NFR-4**: 易用性，界面友好，操作简单，无需编程知识
- **NFR-5**: 可靠性，系统稳定运行，错误处理机制完善

## Constraints
- **Technical**: 基于 Go 语言开发，支持 Windows 和 macOS 平台
- **Business**: 开源项目，免费使用
- **Dependencies**: 需要集成 Ollama、Google Gemini、OpenAI 等 AI 模型

## Assumptions
- 用户具备基本的电脑操作知识
- 目标平台已安装必要的运行环境
- 网络连接正常，能够访问外部 AI 模型服务

## Acceptance Criteria

### AC-1: 本地知识库管理
- **Given**: 用户上传 TXT、PDF、Word、Excel、CSV、HTML、Markdown 格式的文档
- **When**: 系统自动解析、分割并转换为向量嵌入
- **Then**: 文档被存储到私有知识库中，可供 AI 模型检索和利用
- **Verification**: `programmatic`
- **Notes**: 支持按文件夹和知识库文档进行分类整理

### AC-2: 多 Agent 模式
- **Given**: 用户创建多个独立 AI Agent
- **When**: 为每个 Agent 配置不同的角色、记忆和技能
- **Then**: 用户可以在界面中自由切换 Agent，适应不同任务场景
- **Verification**: `human-judgment`

### AC-3: 技能市场
- **Given**: 用户访问技能市场
- **When**: 浏览和安装所需的技能
- **Then**: AI 能够使用已安装的技能执行相应任务
- **Verification**: `programmatic`

### AC-4: 记忆功能
- **Given**: 用户与 AI 进行多轮对话
- **When**: 系统记录对话历史和用户偏好
- **Then**: AI 能够基于历史对话提供上下文相关的回答和个性化服务
- **Verification**: `human-judgment`

### AC-5: 多渠道通讯集成
- **Given**: 用户配置通讯应用连接
- **When**: AI 处理任务完成后
- **Then**: 结果自动发送到指定的通讯渠道
- **Verification**: `programmatic`

### AC-6: 定时任务
- **Given**: 用户设定监控频率和任务内容
- **When**: 到达设定时间
- **Then**: 系统自动执行任务并推送结果
- **Verification**: `programmatic`

### AC-7: 划词即时问答
- **Given**: 用户选中屏幕上的文字
- **When**: 点击悬浮快问框发送
- **Then**: AI 立即返回相关回答
- **Verification**: `human-judgment`

### AC-8: 智能侧边栏
- **Given**: 用户打开智能侧边栏
- **When**: 切换不同配置的 AI 助手
- **Then**: 侧边栏显示对应助手的回答，并支持一键发送到对话
- **Verification**: `human-judgment`

### AC-9: 一问多答
- **Given**: 用户提出问题
- **When**: 系统同时向多个 AI 专家发送问题
- **Then**: 界面并排显示多个 AI 的回复，方便比较
- **Verification**: `human-judgment`

### AC-10: 一键启动
- **Given**: 用户点击桌面悬浮球
- **When**: 系统唤醒或打开主应用窗口
- **Then**: 用户可以立即开始使用 ChatClaw
- **Verification**: `human-judgment`

### AC-11: 服务器模式部署
- **Given**: 用户以服务器模式运行 ChatClaw
- **When**: 通过浏览器访问指定地址
- **Then**: 可以在浏览器中使用 ChatClaw 的全部功能
- **Verification**: `programmatic`

## Open Questions
- [ ] 具体支持哪些版本的 Windows 和 macOS？
- [ ] 知识库的存储容量限制是多少？
- [ ] 技能市场的具体技能分类和数量？
- [ ] 多渠道通讯集成的具体实现方式和限制？
- [ ] 服务器模式的性能和并发处理能力？