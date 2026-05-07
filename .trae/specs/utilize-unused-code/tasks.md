# 整合未使用代码项目 - 实现计划

## [ ] Task 1: 整合聊天输入框组件 (ChatInput)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 使用 `components/chat/input/ChatInput.tsx` 替换当前的 ChatInputBox
  - 整合工具栏、快捷命令菜单、文件上传等功能
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement`: 输入框功能完整，交互流畅

## [ ] Task 2: 整合消息列表组件 (MessageList)
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 使用 `components/chat/message-list/MessageList.tsx` 替换当前的消息列表
  - 整合滚动导航、文本选择、欢迎界面等功能
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement`: 消息列表显示正常，支持滚动和选择

## [ ] Task 3: 整合设置面板组件 (Settings)
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 使用 `components/settings/SettingsDrawer.tsx` 替换当前的设置模态框
  - 整合模型选择、API 配置、外观设置等功能
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement`: 设置面板功能完整，布局合理

## [ ] Task 4: 整合豆包首页组件 (DoubaoHome)
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 使用 `doubao-home/components/DoubaoHomePage.tsx` 创建新的首页
  - 整合功能面板、技能卡片、本地能力中心等
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement`: 首页展示完整，功能入口清晰

## [ ] Task 5: 整合侧边栏组件 (Sidebar)
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 使用 `components/sidebar/HistorySidebar.tsx` 替换当前的侧边栏
  - 整合会话管理、分组功能等
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement`: 侧边栏功能完整，交互流畅

## [ ] Task 6: 整合消息组件 (Message)
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 使用 `components/message/Message.tsx` 替换当前的消息组件
  - 整合代码块、图表、工具结果等展示
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement`: 消息展示丰富，支持多种内容类型

## [ ] Task 7: 整合语音聊天面板 (VoiceChatPanel)
- **Priority**: P2
- **Depends On**: None
- **Description**: 
  - 添加语音聊天面板组件
  - 支持语音输入和输出
- **Acceptance Criteria Addressed**: 扩展功能
- **Test Requirements**:
  - `human-judgement`: 语音聊天功能正常

## [ ] Task 8: 整合代码审查面板 (CodeReviewPanel)
- **Priority**: P2
- **Depends On**: None
- **Description**: 
  - 添加代码审查面板组件
  - 支持代码分析和建议
- **Acceptance Criteria Addressed**: 扩展功能
- **Test Requirements**:
  - `human-judgement`: 代码审查功能正常
