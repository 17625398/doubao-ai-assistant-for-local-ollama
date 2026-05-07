# 插件系统使用指南

## 📖 概述

Doubao Refactored 项目的插件系统提供了强大的扩展能力,允许开发者通过插件形式为 AI 对话添加新功能。

---

## 🚀 快速开始

### 1. 基本使用

```typescript
import { pluginManager, ChatPlugin, PluginContext } from '@doubao/core';

// 创建自定义插件
class MyPlugin implements ChatPlugin {
  id = 'my-plugin';
  name = '我的插件';
  version = '1.0.0';
  
  async initialize(context: PluginContext): Promise<void> {
    console.log('插件已初始化');
  }
  
  async destroy(): Promise<void> {
    console.log('插件已销毁');
  }
}

// 注册插件
const myPlugin = new MyPlugin();
await pluginManager.register(myPlugin);
```

### 2. 使用内置插件

```typescript
import { pluginManager, codeAssistantPlugin } from '@doubao/core';

// 注册代码助手插件
await pluginManager.register(codeAssistantPlugin);

// 查看所有已注册的技能
const skills = pluginManager.getAllSkills();
console.log(skills);

// 执行技能
const result = await pluginManager.executeSkill(
  'code-explain',
  '请解释这段代码',
  { messages: [] }
);
```

---

## 🔧 插件开发

### 插件接口说明

```typescript
interface ChatPlugin {
  // 基本信息
  id: string;                    // 插件唯一标识
  name: string;                  // 插件名称
  version: string;               // 版本号
  
  // 生命周期
  initialize?(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
  
  // UI 扩展 (在 web 包中使用)
  renderFooter?(props: ChatFooterProps): React.ReactNode;
  renderMessage?(message: ChatMessage): React.ReactNode;
  renderInput?(props: ChatInputProps): React.ReactNode;
  renderToolbar?(): React.ReactNode;
  
  // 消息处理
  preprocessMessage?(message: ChatMessage): Promise<ChatMessage>;
  postprocessResponse?(response: ChatResponse): Promise<ChatResponse>;
  
  // 技能
  skills?: SkillDefinition[];
}
```

### 创建技能

```typescript
import { SkillDefinition, SkillContext, SkillResult } from '@doubao/core';

const mySkill: SkillDefinition = {
  id: 'my-skill',
  name: '我的技能',
  description: '技能描述',
  icon: '🎯',
  category: 'custom',
  
  // 触发条件
  trigger: {
    keywords: ['关键词1', '关键词2'],
    patterns: [/正则表达式/]
  },
  
  // 处理函数
  handler: async (input: string, context: SkillContext): Promise<SkillResult> => {
    return {
      prompt: `处理后的提示词: ${input}`,
      systemPrompt: '系统提示',
      metadata: { custom: 'data' }
    };
  },
  
  // UI 配置
  ui: {
    showInToolbar: true,    // 在工具栏显示
    showInMenu: true        // 在菜单显示
  }
};
```

### 完整示例: 翻译插件

```typescript
import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult } from '@doubao/core';

export class TranslatorPlugin implements ChatPlugin {
  id = 'translator';
  name = '智能翻译';
  version = '1.0.0';
  description = '提供多语言翻译服务';
  
  skills: SkillDefinition[] = [
    {
      id: 'translate-to-en',
      name: '翻译成英文',
      description: '将文本翻译成英文',
      icon: '🇺🇸',
      category: 'translation',
      trigger: {
        keywords: ['翻译成英文', 'translate to english']
      },
      handler: this.handleTranslateToEnglish,
      ui: { showInToolbar: true, showInMenu: true }
    },
    {
      id: 'translate-to-zh',
      name: '翻译成中文',
      description: '将文本翻译成中文',
      icon: '🇨🇳',
      category: 'translation',
      trigger: {
        keywords: ['翻译成中文', 'translate to chinese']
      },
      handler: this.handleTranslateToChinese,
      ui: { showInToolbar: true, showInMenu: true }
    }
  ];
  
  private async handleTranslateToEnglish(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    // 提取需要翻译的文本
    const text = this.extractText(input);
    
    return {
      prompt: `请将以下文本翻译成英文:\n\n${text}`,
      systemPrompt: '你是一个专业的翻译助手,擅长中英文互译。请保持原文的意思和语气。',
      metadata: {
        skill: 'translate-to-en',
        sourceLanguage: 'zh',
        targetLanguage: 'en'
      }
    };
  }
  
  private async handleTranslateToChinese(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractText(input);
    
    return {
      prompt: `请将以下文本翻译成中文:\n\n${text}`,
      systemPrompt: '你是一个专业的翻译助手,擅长中英文互译。请保持原文的意思和语气。',
      metadata: {
        skill: 'translate-to-zh',
        sourceLanguage: 'en',
        targetLanguage: 'zh'
      }
    };
  }
  
  private extractText(input: string): string {
    // 简单提取,实际可以更智能
    return input.replace(/翻译[成到]?(英文|中文)/g, '').trim();
  }
}
```

---

## 📱 在 Web 应用中使用

### 1. 注册插件

```typescript
// packages/web/src/app/page.tsx

import { useEffect } from 'react';
import { pluginManager, codeAssistantPlugin } from '@doubao/core';

export default function Home() {
  useEffect(() => {
    // 初始化插件系统
    const initPlugins = async () => {
      await pluginManager.register(codeAssistantPlugin);
      // 注册更多插件...
    };
    
    initPlugins();
    
    // 清理
    return () => {
      pluginManager.destroyAll();
    };
  }, []);
  
  return <ChatComponent />;
}
```

### 2. 渲染插件 UI

```typescript
import { pluginManager } from '@doubao/core';

function ChatFooter() {
  // 获取所有插件的底部组件
  const footerComponents = pluginManager.renderFooters({
    onSkillActivate: handleSkillActivate,
    onAttachment: handleAttachment,
    disabled: isSending
  });
  
  return (
    <div className="chat-footer">
      {footerComponents.map((component, index) => (
        <React.Fragment key={index}>{component}</React.Fragment>
      ))}
    </div>
  );
}

function ChatToolbar() {
  const toolbars = pluginManager.renderToolbars();
  
  return (
    <div className="chat-toolbar">
      {toolbars.map((toolbar, index) => (
        <React.Fragment key={index}>{toolbar}</React.Fragment>
      ))}
    </div>
  );
}
```

### 3. 技能集成

```typescript
import { pluginManager, SkillContext } from '@doubao/core';

function ChatInput() {
  const [input, setInput] = useState('');
  
  const handleSend = async () => {
    // 检测适用的技能
    const detectedSkills = pluginManager.detectSkills(input);
    
    if (detectedSkills.length > 0) {
      // 询问用户使用哪个技能
      const skill = detectedSkills[0];
      const context: SkillContext = {
        messages: currentMessages,
        selectedText: selectedText
      };
      
      const result = await pluginManager.executeSkill(skill.id, input, context);
      
      // 使用技能生成的提示词发送消息
      await sendMessage(result.prompt, result.systemPrompt);
    } else {
      // 正常发送消息
      await sendMessage(input);
    }
  };
  
  return <Input value={input} onChange={setInput} onSend={handleSend} />;
}
```

---

## 🎯 高级功能

### 消息预处理

```typescript
class DataMaskPlugin implements ChatPlugin {
  id = 'data-mask';
  name = '数据脱敏';
  version = '1.0.0';
  
  async preprocessMessage(message: ChatMessage): Promise<ChatMessage> {
    // 脱敏处理: 邮箱、手机号等
    const masked = message.content
      .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]')
      .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]');
    
    return {
      ...message,
      content: masked,
      metadata: {
        ...message.metadata,
        masked: true
      }
    };
  }
}
```

### 响应后处理

```typescript
class CodeHighlightPlugin implements ChatPlugin {
  id = 'code-highlight';
  name = '代码高亮';
  version = '1.0.0';
  
  async postprocessResponse(response: ChatResponse): Promise<ChatResponse> {
    // 为代码块添加语言标记
    const highlighted = response.content.replace(
      /```(\n[\s\S]*?```)/g,
      (match, code) => {
        if (!match.startsWith('```javascript') && 
            !match.startsWith('```python')) {
          return '```javascript' + code;
        }
        return match;
      }
    );
    
    return {
      ...response,
      content: highlighted
    };
  }
}
```

---

## 📊 插件管理

### 查看插件状态

```typescript
const stats = pluginManager.getStats();
console.log(stats);
// {
//   total: 5,        // 总插件数
//   enabled: 4,      // 已启用
//   disabled: 1,     // 已禁用
//   totalSkills: 12  // 总技能数
// }
```

### 启用/禁用插件

```typescript
// 禁用插件
await pluginManager.togglePlugin('code-assistant', false);

// 启用插件
await pluginManager.togglePlugin('code-assistant', true);
```

### 动态注册/注销

```typescript
// 注册
await pluginManager.register(myPlugin);

// 注销
await pluginManager.unregister('my-plugin');
```

---

## 🔍 调试技巧

### 开启调试模式

```typescript
import { PluginManager } from '@doubao/core';

const debugPluginManager = new PluginManager({
  debug: true,              // 开启调试日志
  autoInitialize: true      // 自动初始化插件
});
```

### 查看插件信息

```typescript
// 获取特定插件
const plugin = pluginManager.getPlugin('code-assistant');
console.log(plugin);

// 获取所有插件
const allPlugins = pluginManager.getAllPlugins();
console.log(allPlugins);

// 获取特定类别的技能
const codingSkills = pluginManager.getSkillsByCategory('coding');
console.log(codingSkills);
```

---

## ⚠️ 注意事项

1. **插件ID唯一性**: 每个插件必须有唯一的 ID
2. **错误处理**: 插件方法中的错误不会影响其他插件
3. **性能考虑**: 避免在 `preprocessMessage` 中执行耗时操作
4. **类型安全**: 使用 TypeScript 获得完整的类型提示
5. **生命周期**: 确保在 `destroy` 中清理资源

---

## 📚 更多资源

- [插件类型定义](./types.ts)
- [插件管理器实现](./plugin-manager.ts)
- [代码助手示例](./builtin/code-assistant-plugin.ts)
- [完整分析文档](../../../../docs/DOUBAO_AI_CHAT_MODEL_ANALYSIS.md)

---

**版本**: 1.0  
**更新日期**: 2026-04-16
