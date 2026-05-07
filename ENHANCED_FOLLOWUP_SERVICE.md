# 增强追问服务 (Enhanced Follow-up Service)

## 概述

增强追问服务为 AI 对话提供智能、多维度、上下文感知的追问能力，支持基于用户行为的自适应学习。

## 核心功能

### 1. 多维度追问分类

| 分类 | 说明 | 示例 |
|------|------|------|
| `understand` | 理解类 - 展开解释 | "详细解释一下"、"能举个例子吗" |
| `action` | 行动类 - 执行操作 | "帮我实际操作"、"生成代码" |
| `expand` | 扩展类 - 深入相关 | "还有哪些相关信息"、"最新进展" |
| `refine` | 优化类 - 改写精简 | "更简洁一点"、"改成专业语气" |
| `verify` | 验证类 - 确认核实 | "这个说法准确吗"、"依据是什么" |
| `explore` | 探索类 - 联想拓展 | "换个角度看"、"对未来意味着什么" |
| `analysis` | 分析类 - 深入分析 | "背后的原因"、"关键影响因素" |

### 2. 上下文感知

自动检测回复内容特征：
- **代码检测**：包含代码片段时推荐代码执行/测试
- **数据检测**：包含数值时推荐数据分析
- **链接检测**：包含 URL 时推荐网页读取
- **长回答**：自动推荐要点提炼

### 3. 实体识别

智能识别回复中的实体并生成相关追问：
- **人名**：推荐了解背景
- **组织**：推荐了解详情
- **技术名词**：推荐深入解释

### 4. 用户行为学习

记录用户追问选择，自动调整追问权重：
- 统计用户偏好的追问类型
- 根据历史记录优化推荐顺序
- 动态调整各类别权重

### 5. 场景化模板

支持多种场景的特定追问模板：

| 场景 | 说明 | 支持的追问类型 |
|------|------|---------------|
| `search` | 搜索场景 | 验证、扩展、行动 |
| `summary` | 摘要场景 | 优化、扩展、行动 |
| `analysis` | 分析场景 | 理解、验证、行动 |
| `writing` | 写作场景 | 优化、扩展、行动 |
| `task` | 任务场景 | 行动、扩展、优化 |
| `code` | 代码场景 | 行动、理解、验证 |
| `education` | 教育场景 | 理解、扩展、行动、验证 |
| `news` | 新闻场景 | 理解、扩展、验证、探索 |
| `tech` | 技术场景 | 理解、行动、扩展、验证 |
| `creative` | 创意场景 | 扩展、优化、行动、探索 |
| `health` | 健康场景 | 理解、扩展、验证、行动 |
| `finance` | 金融场景 | 理解、扩展、验证、行动 |
| `legal` | 法律场景 | 理解、扩展、验证、行动 |
| `travel` | 旅行场景 | 扩展、行动、理解、验证 |
| `cooking` | 烹饪场景 | 行动、扩展、理解、验证 |

## 快速开始

### 基础使用

```typescript
import {
  enhancedFollowUpService,
  FollowUpContext
} from '@ai-intelligent-analysis-platform/core';

// 创建追问上下文
const context: FollowUpContext = {
  conversationId: 'conv-123',
  userIntent: 'search',
  assistantResponse: '搜索结果包含...',
  keyEntities: ['ChatGPT', 'OpenAI'],
  keyTopics: ['AI发展', '技术趋势'],
  hasCode: false,
  hasLinks: true,
  hasNumbers: true
};

// 生成追问建议
const suggestions = enhancedFollowUpService.generateFollowUps(context);
console.log(suggestions);
```

### 在对话编排中集成

```typescript
import { dialogOrchestratorService, DialogOrchestratorContext } from '@ai-intelligent-analysis-platform/core';

const context: DialogOrchestratorContext = {
  userInput: '分析一下 AI 的发展趋势',
  assistantOutput: 'AI 发展趋势分析...',
  intent: 'analysis',
  conversationId: 'conv-123',
  extraContext: {
    keyEntities: ['ChatGPT', 'Claude', 'Gemini'],
    keyTopics: ['大语言模型', 'AGI'],
    hasCode: false,
    hasNumbers: true
  }
};

const response = dialogOrchestratorService.buildStructuredResponse(context);
console.log(response.suggestedFollowUps);
```

### 记录用户选择

```typescript
// 当用户点击某个追问时
enhancedFollowUpService.recordSelection(
  'conv-123',
  'expand-related',
  '还有其他相关的吗'
);
```

### 自定义配置

```typescript
import { enhancedFollowUpService } from '@ai-intelligent-analysis-platform/core';

// 更新配置
enhancedFollowUpService.updateConfig({
  maxSuggestions: 6,           // 最大建议数
  enableContextual: true,      // 启用上下文感知
  enableLearning: true,        // 启用学习
  enableDiversity: true,       // 启用多样性
  categoryWeights: {
    action: 1.5,               // 提高行动类权重
    verify: 1.2,               // 提高验证类权重
    explore: 0.8               // 降低探索类权重
  }
});
```

## API 参考

### EnhancedFollowUpService

#### `generateFollowUps(context: FollowUpContext): FollowUpOption[]`

生成追问建议列表。

**参数：**
- `context.conversationId` - 对话 ID
- `context.userIntent` - 用户意图
- `context.assistantResponse` - AI 回复
- `context.keyEntities` - 识别的实体列表
- `context.keyTopics` - 关键话题列表
- `context.hasCode` - 是否包含代码
- `context.hasLinks` - 是否包含链接
- `context.hasNumbers` - 是否包含数字

**返回：**
```typescript
interface FollowUpOption {
  id: string;                  // 唯一标识
  label: string;               // 显示标签（最多18字符）
  prompt: string;              // 实际 prompt
  category: FollowUpCategory;   // 分类
  priority: number;            // 优先级 1-10
  reasoning?: string;           // 推荐理由
  contextRelevance?: number;    // 上下文相关性 0-1
}
```

#### `recordSelection(conversationId, followUpId, prompt)`

记录用户追问选择，用于学习优化。

#### `getUserPreferences(userId)`

获取用户追问偏好。

#### `updateConfig(partial)`

更新服务配置。

### DialogOrchestratorService

#### `buildStructuredResponse(context)`

构建结构化响应，包含增强追问建议。

**扩展参数：**
- `context.extraContext` - 额外上下文信息

## 模板自定义

### 修改追问模板

```typescript
// 直接修改 FOLLOW_UP_TEMPLATES
FOLLOW_UP_TEMPLATES.action.push('生成测试用例');

// 添加新的意图策略
INTENT_STRATEGIES.code = {
  understand: ['代码执行流程'],
  action: ['运行并验证'],
  verify: ['检查潜在 bug']
};
```

### 扩展类别

```typescript
export type FollowUpCategory =
  | 'understand'
  | 'action'
  | 'expand'
  | 'refine'
  | 'verify'
  | 'explore'
  | 'analysis'
  | 'your_category';  // 添加自定义类别
```

## 最佳实践

### 1. 提供丰富的上下文

```typescript
const context: FollowUpContext = {
  // 尽可能多地提供信息
  keyEntities: extractEntities(assistantResponse),
  keyTopics: extractTopics(assistantResponse),
  detectedQuestions: extractQuestions(assistantResponse),
  sentiment: detectSentiment(assistantResponse),
  complexity: assessComplexity(assistantResponse)
};
```

### 2. 合理设置建议数量

```typescript
updateConfig({
  maxSuggestions: 4  // 建议 3-6 个
});
```

### 3. 启用多样性

确保追问建议覆盖不同类别：

```typescript
updateConfig({
  enableDiversity: true  // 保证建议多样性
});
```

### 4. 记录用户反馈

持续优化推荐效果：

```typescript
// 用户选择追问时
onFollowUpSelected(followUpId, prompt) {
  enhancedFollowUpService.recordSelection(
    conversationId,
    followUpId,
    prompt
  );
}
```

## 与原有系统集成

原有的 `DialogOrchestratorService` 已集成增强追问：

```typescript
// 原有用法保持不变，内部自动使用增强服务
const response = dialogOrchestratorService.buildStructuredResponse(context);

// 新增可选参数
const enhancedContext = {
  ...context,
  extraContext: {
    keyEntities: ['实体1', '实体2'],
    keyTopics: ['话题1', '话题2'],
    // ...
  }
};

const enhancedResponse = dialogOrchestratorService.buildStructuredResponse(enhancedContext);
```
