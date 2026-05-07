# OpenClaw 全面集成融合 - 产品需求文档

## 概述
- **摘要**：将 `https://github.com/openclaw/openclaw` 作为本项目的核心外部能力层进行全面集成，统一接入其 Gateway 控制面、Multi-channel Inbox、多 Agent 路由、WebChat/Control UI、Browser/Canvas/Nodes 工具、Voice 能力、Skills 机制与安全模型，并映射到本项目现有的 `@doubao/core`、`@doubao/web`、浏览器扩展及后续桌面端架构中。
- **目的**：让本项目不再只是“调用 OpenClaw 某几个接口”，而是形成一个围绕 OpenClaw 运行时的完整产品层，复用其成熟的通道、会话、工作区、技能与控制协议能力，同时保留本项目现有 UI、知识库、记忆、插件与浏览器交互优势。
- **目标用户**：希望在本地设备上运行个人 AI 助手的高级个人用户、自动化场景用户、跨渠道协作用户，以及需要将浏览器扩展/Web 应用与 OpenClaw 本地网关打通的开发者与运维人员。

## 目标
- 将 OpenClaw Gateway 作为本项目统一的本地控制平面接入，支持状态检测、配置管理、事件订阅、会话管理与命令执行。
- 将 OpenClaw 支持的多渠道能力接入本项目，覆盖 WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage、Feishu、WeChat、WebChat 等已由 OpenClaw 支持的主流渠道。
- 在本项目中实现与 OpenClaw 一致的多 Agent 路由模型，支持按渠道、账号、联系人、群组、工作区隔离 Agent。
- 集成 OpenClaw 的 Skills、Workspace 与 Onboarding 模型，使本项目可管理工作区技能、安装技能、浏览技能、执行工具并展示执行结果。
- 集成 OpenClaw Browser、Canvas、Nodes、Voice 等高级能力，在本项目 UI 中提供统一入口、状态展示与任务控制。
- 将本项目现有知识库、记忆、消息 UI、浏览器扩展能力与 OpenClaw 运行时深度融合，形成一致的交互体验与错误处理机制。
- 提供适用于 Windows、macOS、Linux 的部署说明，其中 Windows 以 WSL2 路径为优先推荐方案。

## 非目标（范围外）
- 不直接 Fork 或重写 OpenClaw 的核心运行时、协议层或官方 CLI 实现。
- 不要求在第一阶段完全复刻 OpenClaw 官方全部原生界面，而是优先在本项目内实现统一入口和核心可用路径。
- 不在本规格中定义新的通道协议标准，仅基于 OpenClaw 已支持和公开暴露的能力进行映射。
- 不承诺一次性交付所有移动端节点能力的完整 UI，而是先完成协议接入、状态可见与基础操作闭环。

## 背景与上下文
- OpenClaw 当前定位为运行在用户自有设备上的个人 AI 助手，核心是本地 Gateway 控制平面，而不是单一聊天界面。
- OpenClaw 已具备多渠道接入、Multi-agent Routing、Voice Wake/Talk Mode、Live Canvas、Browser Control、Nodes、Skills、WebChat、Control UI、Doctor/Onboard、Tailscale 暴露与本地安全策略等完整运行时能力。
- 本项目现有架构采用 Monorepo 分层设计，`@doubao/core` 负责共享类型、服务、事件总线、配置与核心能力，`@doubao/web` 与浏览器扩展负责用户交互。
- 当前仓库中已经存在若干 OpenClaw 相关服务桩与适配代码，例如 `chatclaw-integration-service.ts`、`chatclaw-gateway-service.ts`、`chatclaw-openclaw-service.ts`、`chatclaw-openclaw-skill-service.ts`，但这些实现仍停留在局部能力封装与占位阶段，缺少一份覆盖产品边界、模块职责、交付顺序与验收口径的顶层规格。
- 当前项目还已经围绕 `Oh My Browser` 做了与 OpenClaw 相关的错误处理增强，说明本项目已开始承接 OpenClaw 插件生态，但尚未形成完整集成闭环。

## 集成原则
- **本地优先**：默认以本地 Gateway 为主路径，优先支持用户在自有环境中完成安装、鉴权、启动、恢复与调试。
- **运行时复用**：优先复用 OpenClaw CLI、Gateway、配置文件、工作区、技能目录与事件模型，不重复发明同类机制。
- **UI 统一**：在本项目 Web/扩展 UI 中提供统一入口与状态视图，避免用户在多个工具间频繁切换。
- **渐进增强**：先打通网关、会话、渠道、技能、浏览器控制，再逐步补齐 Canvas、Nodes、Voice、远程访问等高级能力。
- **安全默认开启**：遵循 OpenClaw 的 DM pairing、allowlist、非主会话沙箱、权限最小化与本地认证策略。
- **兼容现有能力**：保留本项目已有知识库、记忆、聊天 UI、文档解析和浏览器扩展优势，并把它们接入 OpenClaw 会话模型中。

## 架构映射
- **`@doubao/core`**：作为 OpenClaw 适配层，负责 Gateway 客户端、配置模型、事件桥接、Agent 路由、渠道映射、技能注册、错误处理、状态轮询与知识库/记忆互通。
- **`@doubao/web`**：作为 OpenClaw 控制台与助手工作台，负责展示 Gateway 状态、渠道配置、Agent 工作区、技能市场、会话调试、浏览器工具和消息流。
- **浏览器扩展**：作为本项目与 OpenClaw Browser、页面上下文、快捷操作、划词问答、发送到 Agent、网页理解之间的桥梁。
- **本地服务层**：负责调用 `openclaw` CLI、管理 Gateway 启停、执行 `doctor`/`onboard`/`channels login`/`pairing approve` 等命令，并在必要时代理 WebSocket/HTTP 请求。
- **知识库与记忆系统**：负责将本项目已有的文档解析、记忆检索与 OpenClaw 会话上下文、workspace prompt、skills 工具执行结果进行联动。

## 功能需求
- **FR-1：Gateway 生命周期管理**：系统必须支持检测、启动、停止、重启 OpenClaw Gateway，并显示 `host`、`port`、连接状态、认证模式、版本、运行时诊断信息。
- **FR-2：Gateway 健康检查与诊断**：系统必须支持运行 Gateway 健康检查、`doctor` 诊断、错误分类、日志查看与恢复指引，覆盖 CLI 缺失、网关未启动、浏览器插件未连接、通道未授权、配置非法等场景。
- **FR-3：OpenClaw 配置管理**：系统必须支持读取、编辑、校验 OpenClaw 配置，包括模型、默认 Agent、workspace、channels、browser、sandbox、auth、tailscale、voice、nodes 等配置项。
- **FR-4：Onboarding 引导**：系统必须为首次用户提供 OpenClaw 安装、运行时检测、CLI 可用性校验、`onboard` 引导、渠道登录、模型配置、工作区初始化与常见问题提示。
- **FR-5：多渠道管理**：系统必须展示 OpenClaw 支持的全部或已安装渠道，支持启用/禁用、认证登录、连接测试、allowlist 配置、DM policy、群组策略与回执状态展示。
- **FR-6：消息收发与会话映射**：系统必须将 OpenClaw 渠道消息映射到本项目统一消息模型，支持入站消息、出站回复、线程上下文、群组会话隔离与 reply-back。
- **FR-7：多 Agent 路由**：系统必须支持按渠道、群组、联系人、账号、工作区绑定不同 Agent，并支持查看当前路由规则、切换默认 Agent、隔离会话上下文。
- **FR-8：会话管理**：系统必须支持展示和管理 OpenClaw 会话，包括主会话、群组会话、跨会话通信、上下文压缩、重置、历史查看、会话转发与状态调试。
- **FR-9：知识库融合**：系统必须支持将本项目知识库能力接入 OpenClaw 会话流程，包括上传文档、检索文档、引用文档、把知识库结果注入 Agent 上下文，以及把 OpenClaw 对话沉淀到本项目记忆系统。
- **FR-10：记忆系统融合**：系统必须支持把 OpenClaw 渠道消息、会话摘要、技能执行结果、用户偏好写入本项目记忆模块，并支持按 Agent、渠道、会话维度检索。
- **FR-11：技能与工作区管理**：系统必须支持展示 OpenClaw workspace 目录、技能列表、技能来源（bundled/managed/workspace）、技能安装/启停、技能说明查看、工具调用与执行结果展示。
- **FR-12：ClawHub/技能发现**：若用户启用对应能力，系统应支持检索可安装技能、展示安装前提示、权限范围与安装结果。
- **FR-13：Browser Control 集成**：系统必须提供对 OpenClaw Browser 工具的入口，支持浏览器状态检测、启动受管浏览器、页面快照、操作回放、文件上传与失败提示，并与本项目浏览器扩展能力联动。
- **FR-14：Oh My Browser 融合**：系统必须支持在本项目中配置、安装和使用 `oh-my-browser` 等 OpenClaw 插件，并提供明确的授权缺失、CLI 缺失、浏览器桥接失败等错误提示。
- **FR-15：Canvas 集成**：系统应支持展示和控制 OpenClaw Live Canvas，包括推送内容、重置画布、查看渲染结果和记录 Agent 对画布的操作。
- **FR-16：Nodes 与设备能力**：系统应支持接入 macOS、iOS、Android 节点状态，展示节点能力、权限状态与可执行动作，并支持触发 `node.invoke` 类操作。
- **FR-17：Voice 能力入口**：系统应支持展示 Voice Wake、Talk Mode、TTS/STT 可用状态，并在平台允许的范围内提供开启、关闭与调试入口。
- **FR-18：WebChat/Control UI 融合**：系统应将 OpenClaw WebChat/Control UI 作为可嵌入或可跳转的能力模块接入，并与本项目会话、设置、调试页保持导航一致性。
- **FR-19：命令与自动化能力**：系统应支持触发 OpenClaw 的 `agent`、`message send`、`pairing approve`、`channels login`、`doctor`、`update` 等关键 CLI 动作，并对执行结果进行结构化展示。
- **FR-20：事件总线集成**：系统必须将 OpenClaw Gateway 的事件流接入本项目事件总线，便于 UI 订阅状态变化、消息回执、连接中断、技能执行状态与系统告警。
- **FR-21：日志与调试工具**：系统必须提供 OpenClaw 相关日志视图，支持按模块筛选日志、查看最近事件、复制诊断信息与导出问题报告。
- **FR-22：权限与安全控制**：系统必须支持 DM pairing、allowlist、非主会话沙箱策略、认证令牌、Tailscale/远程暴露风险提示与敏感工具提示。
- **FR-23：部署模式支持**：系统必须支持本地直连模式、远程 Gateway 模式、Tailscale/SSH 隧道接入模式，并对每种模式显示限制与安全提示。
- **FR-24：跨平台兼容策略**：系统必须明确 Windows、macOS、Linux 的差异化引导，其中 Windows 环境优先推荐 WSL2，并对不支持的本地能力给出降级说明。
- **FR-25：现有 UI 融合**：系统必须将 OpenClaw 相关入口整合到本项目现有聊天页、工具面板、设置页、技能页与侧边栏中，避免割裂的独立体验。
- **FR-26：错误体验一致化**：系统必须统一 OpenClaw 集成错误的提示文案、恢复动作、重试入口与状态提醒，确保 Web、扩展与核心服务层反馈一致。

## 非功能需求
- **NFR-1：稳定性**：OpenClaw 集成模块在 Gateway 未启动、CLI 未安装、通道未登录或插件失效时，必须优雅降级，不导致本项目主界面崩溃。
- **NFR-2：可观测性**：关键集成动作必须有可追踪日志与状态事件，包括启动、连接、鉴权、消息路由、技能执行、浏览器操作与节点调用。
- **NFR-3：性能**：本地状态查询与常用页面打开必须保持轻量，避免因过度轮询 Gateway 或日志流阻塞而影响聊天与扩展交互。
- **NFR-4：安全性**：默认遵循最小权限原则，敏感动作必须给出可见风险提示，不得默认开放公开 DM、远程暴露或高危工具权限。
- **NFR-5：可维护性**：OpenClaw 适配层需与本项目业务 UI 解耦，使用清晰的服务接口、类型定义与事件模型，便于后续跟进 OpenClaw 上游变化。
- **NFR-6：可扩展性**：未来新增渠道、节点、技能类型或 Gateway 能力时，应主要通过配置与模块扩展完成，而不是重写主流程。
- **NFR-7：兼容性**：应兼容 OpenClaw 的稳定发布通道，并对 beta/dev 通道保持尽力兼容与风险提示。
- **NFR-8：易用性**：首次接入流程必须可理解，错误提示必须可执行，核心功能应通过图形界面完成，不强制用户手工编辑所有配置文件。

## 约束
- **技术**：OpenClaw 运行时依赖 Node.js 22.16+，推荐 Node.js 24；部分平台能力依赖本地系统权限、浏览器、外部渠道 SDK 或额外组件。
- **平台**：Windows 场景下 OpenClaw 官方优先建议 WSL2，本项目需正视该约束并在规格中提供明确引导。
- **依赖**：通道接入依赖各平台凭证、Bot Token、二维码登录、官方插件或第三方客户端；节点能力依赖 macOS/iOS/Android 设备。
- **安全**：远程暴露、Tailscale Funnel、公开 DM、系统命令执行、浏览器控制与节点调用都属于高风险能力，必须有显式保护。
- **产品边界**：本项目需以“融合 OpenClaw”为目标，但不能与 OpenClaw 上游的实际能力说明相矛盾。

## 假设
- 用户可以在本地环境安装和运行 `openclaw` CLI，并接受本项目以其为核心运行时。
- 用户愿意为不同渠道提供必要凭据，并理解个人 AI 助手运行在本地环境的安全责任。
- 本项目可以访问 OpenClaw 的本地 Gateway、配置文件、CLI 输出与日志信息。
- 本项目现有知识库、记忆、聊天 UI 与扩展模块可继续演进，不需要因接入 OpenClaw 而整体推翻。
- OpenClaw 上游对 Gateway、CLI、技能与渠道模型保持相对稳定，至少在稳定通道内可被持续适配。

## 分阶段交付建议
- **阶段一：基础运行时接入**：完成 CLI 检测、Gateway 启停、健康检查、配置读取、日志诊断、错误分类与基础聊天调用。
- **阶段二：渠道与 Agent 融合**：完成多渠道展示、登录引导、消息路由、会话映射、Agent 绑定、知识库/记忆注入。
- **阶段三：技能与浏览器能力融合**：完成 workspace、skills、ClawHub、Browser Control、Oh My Browser 插件安装与调试入口。
- **阶段四：高级运行时融合**：完成 Canvas、Nodes、Voice、WebChat/Control UI、远程 Gateway 模式与安全策略细化。
- **阶段五：产品统一与优化**：完成导航整合、状态中心、跨端一致交互、日志中心、测试补齐与文档沉淀。

## 验收标准

### AC-1：Gateway 接入
- **Given**：用户已经安装 `openclaw` CLI
- **When**：用户在本项目中执行 OpenClaw 初始化或连接检测
- **Then**：系统能够检测 Gateway 是否运行，并展示启动、停止、重启或修复建议
- **验证**：`programmatic`

### AC-2：首次引导
- **Given**：用户首次使用 OpenClaw 集成能力
- **When**：用户打开本项目中的 OpenClaw 设置或引导页
- **Then**：系统能够提示安装条件、Node 版本、WSL2 建议、`onboard` 引导和后续渠道配置步骤
- **验证**：`human-judgment`

### AC-3：多渠道配置
- **Given**：用户已连接至少一个 OpenClaw 渠道
- **When**：用户在渠道管理界面查看或修改渠道配置
- **Then**：系统能够显示渠道状态、认证方式、allowlist/DM policy 配置与最近连接状态
- **验证**：`programmatic`

### AC-4：消息路由
- **Given**：某个已启用的 OpenClaw 渠道收到一条用户消息
- **When**：消息进入本项目统一消息流
- **Then**：系统能够将其映射到对应会话与 Agent，并在 UI 中显示消息、上下文和回复结果
- **验证**：`programmatic`

### AC-5：多 Agent 绑定
- **Given**：用户创建了多个 Agent
- **When**：用户为不同渠道或联系人绑定不同 Agent
- **Then**：后续消息会按照绑定规则进入对应 Agent 的独立上下文
- **验证**：`programmatic`

### AC-6：知识库融合
- **Given**：本项目知识库中已有文档
- **When**：OpenClaw 会话触发相关问答
- **Then**：系统能够将检索结果注入回答流程，并在需要时展示引用来源
- **验证**：`programmatic`

### AC-7：技能管理
- **Given**：用户已启用 OpenClaw workspace 和 skills 能力
- **When**：用户查看技能列表、安装技能或执行技能工具
- **Then**：系统能够展示技能来源、参数、执行结果与失败原因
- **验证**：`programmatic`

### AC-8：Browser Control 与 Oh My Browser
- **Given**：用户已安装相关浏览器能力与插件
- **When**：用户在本项目中触发浏览器控制或 Oh My Browser 功能
- **Then**：系统能够执行动作，或在授权缺失、CLI 缺失、浏览器桥接失败时提供明确修复提示
- **验证**：`programmatic`

### AC-9：事件与日志
- **Given**：OpenClaw Gateway 正在运行
- **When**：用户查看状态中心或调试页
- **Then**：系统能够展示最近事件、日志摘要、错误分类与建议操作
- **验证**：`human-judgment`

### AC-10：安全默认值
- **Given**：用户未显式放开高风险设置
- **When**：系统接收未知 DM、远程暴露请求或高风险工具调用
- **Then**：系统默认保持受限策略，并在 UI 中提示需要额外确认或配置
- **验证**：`programmatic`

### AC-11：远程模式
- **Given**：用户使用远程 Gateway 或 Tailscale/SSH 隧道
- **When**：在本项目中配置远程连接
- **Then**：系统能够连接并展示限制条件、认证状态与安全提示
- **验证**：`human-judgment`

### AC-12：跨平台体验
- **Given**：用户分别在 Windows、macOS 或 Linux 环境使用本项目
- **When**：打开 OpenClaw 集成设置页
- **Then**：系统能够针对平台差异展示正确的安装建议、能力可用性与降级说明
- **验证**：`human-judgment`

## 开放问题
- [ ] 本项目是否要把 OpenClaw `Control UI/WebChat` 作为内嵌页面优先方案，还是以外链/新窗口跳转为默认方案？
- [ ] 对 Windows 用户，是否强制以 WSL2 作为唯一受支持安装路径，还是提供实验性的原生路径提示？
- [ ] 本项目知识库与 OpenClaw workspace/skills 的数据边界如何定义，是否需要统一成单一工作区目录？
- [ ] 本项目现有记忆系统与 OpenClaw session summary/context compaction 的权责如何拆分？
- [ ] OpenClaw 上游 beta/dev 通道的兼容性策略是否需要单独配置开关？
- [ ] 对 Canvas、Nodes、Voice 等高级能力，首批版本是否需要完整 UI，还是先提供状态检查与调试入口？
- [ ] 远程 Gateway 场景下，哪些能力允许执行，哪些能力必须强制降级或二次确认？
