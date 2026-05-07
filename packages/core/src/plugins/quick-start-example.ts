/**
 * 插件系统快速开始示例
 * 
 * 这个文件展示了如何在你的项目中使用插件系统
 */

import { 
  pluginManager, 
  codeAssistantPlugin,
  ChatPlugin,
  PluginContext,
  SkillDefinition,
  SkillContext,
  SkillResult
} from './index';

// ============================================
// 示例 1: 使用内置的代码助手插件
// ============================================

async function example1_useBuiltInPlugin() {
  // 注册代码助手插件
  await pluginManager.register(codeAssistantPlugin);
  
  // 查看所有技能
  const skills = pluginManager.getAllSkills();
  console.log('已注册的技能:', skills.map(s => s.name));
  
  // 检测输入中的技能
  const input = '请解释这段代码: function hello() { return "world"; }';
  const detectedSkills = pluginManager.detectSkills(input);
  console.log('检测到的技能:', detectedSkills.map(s => s.name));
  
  // 执行技能
  if (detectedSkills.length > 0) {
    const skill = detectedSkills[0];
    const result = await pluginManager.executeSkill(skill.id, input, {
      messages: []
    });
    console.log('技能执行结果:', result);
  }
  
  // 查看插件统计
  const stats = pluginManager.getStats();
  console.log('插件统计:', stats);
}


// ============================================
// 示例 2: 创建自定义插件
// ============================================

class SimplePlugin implements ChatPlugin {
  id = 'simple-plugin';
  name = '简单插件';
  version = '1.0.0';
  description = '一个简单的示例插件';
  
  async initialize(context: PluginContext): Promise<void> {
    console.log('简单插件已初始化');
  }
  
  async destroy(): Promise<void> {
    console.log('简单插件已销毁');
  }
  
  // 预处理消息
  async preprocessMessage(message: any): Promise<any> {
    console.log('预处理消息:', message.content);
    return message;
  }
  
  // 后处理响应
  async postprocessResponse(response: any): Promise<any> {
    console.log('后处理响应:', response.content);
    return response;
  }
}

async function example2_createCustomPlugin() {
  const plugin = new SimplePlugin();
  await pluginManager.register(plugin);
  console.log('自定义插件已注册');
}


// ============================================
// 示例 3: 创建带技能的插件
// ============================================

class WeatherPlugin implements ChatPlugin {
  id = 'weather-plugin';
  name = '天气查询';
  version = '1.0.0';
  
  skills: SkillDefinition[] = [
    {
      id: 'query-weather',
      name: '查询天气',
      description: '查询指定城市的天气',
      icon: '🌤️',
      category: 'custom',
      trigger: {
        keywords: ['天气', 'weather', '气温']
      },
      handler: this.handleQueryWeather,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    }
  ];
  
  private async handleQueryWeather(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    // 提取城市名称 (简化示例)
    const city = input.replace(/天气|weather|气温/g, '').trim() || '北京';
    
    return {
      prompt: `请查询${city}今天的天气情况`,
      systemPrompt: '你是一个天气查询助手。由于你没有真实的天气API,请根据常识提供一个合理的天气描述。',
      metadata: {
        skill: 'query-weather',
        city: city
      }
    };
  }
}

async function example3_pluginWithSkills() {
  const weatherPlugin = new WeatherPlugin();
  await pluginManager.register(weatherPlugin);
  
  // 测试技能检测
  const input = '北京今天天气怎么样?';
  const detected = pluginManager.detectSkills(input);
  console.log('检测到的技能:', detected.map(s => s.name));
  
  // 执行技能
  if (detected.length > 0) {
    const result = await pluginManager.executeSkill(
      detected[0].id,
      input,
      { messages: [] }
    );
    console.log('执行结果:', result);
  }
}


// ============================================
// 示例 4: 插件管理
// ============================================

async function example4_pluginManagement() {
  // 查看所有插件
  console.log('所有插件:', pluginManager.getAllPlugins());
  
  // 禁用插件
  await pluginManager.togglePlugin('simple-plugin', false);
  console.log('插件已禁用');
  
  // 启用插件
  await pluginManager.togglePlugin('simple-plugin', true);
  console.log('插件已启用');
  
  // 注销插件
  await pluginManager.unregister('simple-plugin');
  console.log('插件已注销');
}


// ============================================
// 示例 5: 在 React 组件中使用 (伪代码)
// ============================================

/*
这是一个如何在 React 组件中使用插件系统的示例:

import { useEffect, useState } from 'react';
import { pluginManager, codeAssistantPlugin } from '@doubao/core';

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    const init = async () => {
      await pluginManager.register(codeAssistantPlugin);
      pluginManager.setContext({ ... });
    };
    init();
    return () => { pluginManager.destroyAll(); };
  }, []);
  
  // ... 其余代码参考 README.md
}
*/


// ============================================
// 运行示例
// ============================================

async function runAllExamples() {
  console.log('=== 插件系统示例 ===\n');
  
  try {
    console.log('示例 1: 使用内置插件');
    await example1_useBuiltInPlugin();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('示例 2: 创建自定义插件');
    await example2_createCustomPlugin();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('示例 3: 创建带技能的插件');
    await example3_pluginWithSkills();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('示例 4: 插件管理');
    await example4_pluginManagement();
    console.log('\n' + '='.repeat(50) + '\n');
    
    console.log('所有示例执行完成!');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 导出示例函数
export {
  example1_useBuiltInPlugin,
  example2_createCustomPlugin,
  example3_pluginWithSkills,
  example4_pluginManagement,
  runAllExamples
};

// 如果在 Node.js 环境,可以直接运行
if (typeof process !== 'undefined' && process.argv[1]?.includes('quick-start-example')) {
  runAllExamples();
}
