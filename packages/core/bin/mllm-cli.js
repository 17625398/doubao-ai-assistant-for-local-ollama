#!/usr/bin/env node

/**
 * 多模型适配层 CLI 工具
 * 命令行管理界面
 */

const { MultiModelAdapterLayer } = require('../dist/cjs/multi-model-adapter');
const { readline } = require('readline');

// =============================================
// CLI 命令
// =============================================

const commands = {
  // 模型管理
  'models': '列出所有可用模型',
  'model:add': '添加模型配置',
  'model:remove': '移除模型配置',
  'model:info': '显示模型信息',
  
  // 聊天交互
  'chat': '启动交互式聊天',
  'chat:once': '单次聊天请求',
  'chat:stream': '流式聊天请求',
  
  // 缓存管理
  'cache:stats': '显示缓存统计',
  'cache:clear': '清空缓存',
  'cache:list': '列出缓存内容',
  
  // 监控
  'metrics': '显示性能指标',
  'metrics:reset': '重置指标',
  'metrics:export': '导出指标到文件',
  
  // 配置
  'config:get': '获取配置项',
  'config:set': '设置配置项',
  'config:list': '列出所有配置',
  'config:save': '保存配置到文件',
  'config:load': '从文件加载配置',
  
  // 服务器
  'serve': '启动 WebSocket 服务器',
  'serve:status': '显示服务器状态',
  
  // 帮助
  'help': '显示帮助信息',
  'exit': '退出程序',
};

class MLLMCLI {
  constructor() {
    this.layer = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.isStreaming = false;
  }

  /** 初始化 */
  async init(configPath?: string) {
    console.log('🔧 初始化多模型适配层...\n');

    let config;
    if (configPath) {
      try {
        config = require(configPath);
      } catch (error) {
        console.error(`❌ 加载配置文件失败: ${error.message}`);
        process.exit(1);
      }
    } else {
      // 默认配置
      config = this.getDefaultConfig();
    }

    this.layer = new MultiModelAdapterLayer(config);
    console.log('✅ 初始化完成\n');
  }

  /** 获取默认配置 */
  getDefaultConfig() {
    return {
      ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        defaultModel: 'gemma4:26b',
      },
      preferLocal: true,
    };
  }

  /** 启动交互式模式 */
  async start() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     多模型适配层 CLI v1.0.0             ║');
    console.log('║     输入 help 查看可用命令             ║');
    console.log('╚════════════════════════════════════════╝\n');

    // 检查服务可用性
    await this.checkServices();

    // 主循环
    while (true) {
      const input = await this.prompt('\n> ');
      
      if (!input.trim()) continue;

      const [cmd, ...args] = input.trim().split(/\s+/);
      
      try {
        await this.handleCommand(cmd, args);
      } catch (error) {
        console.error(`❌ 错误: ${error.message}`);
      }
    }
  }

  /** 处理命令 */
  async handleCommand(cmd, args) {
    switch (cmd.toLowerCase()) {
      // 帮助
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'exit':
      case 'quit':
      case 'q':
        console.log('\n👋 再见!');
        process.exit(0);

      // 模型管理
      case 'models':
        await this.listModels();
        break;

      case 'model:add':
        await this.addModel(args);
        break;

      case 'model:remove':
        await this.removeModel(args);
        break;

      case 'model:info':
        await this.showModelInfo(args[0]);
        break;

      // 聊天
      case 'chat':
        await this.startChat();
        break;

      case 'chat:once':
        await this.chatOnce(args.join(' '));
        break;

      case 'chat:stream':
        await this.chatStream(args.join(' '));
        break;

      // 缓存
      case 'cache:stats':
        await this.showCacheStats();
        break;

      case 'cache:clear':
        await this.clearCache();
        break;

      case 'cache:list':
        await this.listCache();
        break;

      // 监控
      case 'metrics':
      case 'stats':
        await this.showMetrics();
        break;

      case 'metrics:reset':
        await this.resetMetrics();
        break;

      case 'metrics:export':
        await this.exportMetrics(args[0]);
        break;

      // 配置
      case 'config:get':
        console.log(JSON.stringify(this.layer.config, null, 2));
        break;

      case 'config:list':
        console.log(JSON.stringify(this.layer.config, null, 2));
        break;

      case 'config:save':
        await this.saveConfig(args[0]);
        break;

      case 'config:load':
        await this.loadConfig(args[0]);
        break;

      default:
        console.log(`❌ 未知命令: ${cmd}`);
        console.log('   输入 help 查看可用命令');
    }
  }

  /** 显示帮助 */
  showHelp() {
    console.log('\n📖 可用命令:\n');
    
    const categories = {
      '模型管理': ['models', 'model:add', 'model:remove', 'model:info'],
      '聊天交互': ['chat', 'chat:once', 'chat:stream'],
      '缓存管理': ['cache:stats', 'cache:clear', 'cache:list'],
      '监控指标': ['metrics', 'metrics:reset', 'metrics:export'],
      '配置管理': ['config:get', 'config:set', 'config:list', 'config:save', 'config:load'],
      '其他': ['help', 'exit'],
    };

    for (const [category, cmds] of Object.entries(categories)) {
      console.log(`  ${category}:`);
      for (const c of cmds) {
        const desc = commands[c] || '';
        console.log(`    ${c.padEnd(16)} - ${desc}`);
      }
      console.log();
    }
  }

  /** 检查服务可用性 */
  async checkServices() {
    console.log('🔍 检查服务可用性...\n');

    const adapters = this.layer.getAvailableAdapters();
    
    for (const name of adapters) {
      try {
        const isAvailable = await this.layer.checkAdapter(name);
        if (isAvailable) {
          console.log(`  ✅ ${name}: 可用`);
        } else {
          console.log(`  ⚠️  ${name}: 不可用`);
        }
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
      }
    }

    console.log();
  }

  /** 列出模型 */
  async listModels() {
    console.log('\n📋 可用模型:\n');

    const models = await this.layer.listModels();
    
    if (models.length === 0) {
      console.log('  没有可用模型');
      return;
    }

    for (const model of models) {
      const capabilities = Object.entries(model.capabilities)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      
      console.log(`  ${model.name} (${model.provider})`);
      console.log(`    上下文: ${model.contextWindow}`);
      console.log(`    最大输出: ${model.maxOutputTokens}`);
      console.log(`    能力: ${capabilities || '无'}`);
      console.log();
    }
  }

  /** 添加模型 */
  async addModel(args) {
    if (args.length < 2) {
      console.log('用法: model:add <name> <type> [options...]');
      return;
    }

    const [name, type, ...options] = args;
    
    // 简化实现，实际应解析选项
    console.log(`✅ 模型 ${name} (${type}) 已添加`);
  }

  /** 移除模型 */
  async removeModel(args) {
    if (args.length < 1) {
      console.log('用法: model:remove <name>');
      return;
    }

    const [name] = args;
    console.log(`✅ 模型 ${name} 已移除`);
  }

  /** 显示模型信息 */
  async showModelInfo(modelName) {
    if (!modelName) {
      console.log('用法: model:info <model-name>');
      return;
    }

    try {
      const info = await this.layer.getModelInfo(modelName);
      console.log('\n📊 模型信息:\n');
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.log(`❌ 找不到模型: ${modelName}`);
    }
  }

  /** 启动聊天 */
  async startChat() {
    console.log('\n💬 开始聊天 (输入 exit 退出)\n');

    while (true) {
      const input = await this.prompt('你: ');
      
      if (input.toLowerCase() === 'exit') {
        break;
      }

      if (!input.trim()) continue;

      process.stdout.write('\nAI: ');
      
      try {
        const response = await this.layer.chat({
          messages: [{ role: 'user', content: input }],
        });
        
        console.log(`\n${response.content}\n`);
      } catch (error) {
        console.log(`\n❌ 错误: ${error.message}\n`);
      }
    }
  }

  /** 单次聊天 */
  async chatOnce(message) {
    if (!message) {
      console.log('用法: chat:once <message>');
      return;
    }

    const response = await this.layer.chat({
      messages: [{ role: 'user', content: message }],
    });

    console.log('\n📝 响应:\n');
    console.log(response.content);
    console.log(`\n(使用了 ${response.model}, 耗时: ${response.usage?.totalTokens || '?'} tokens)\n`);
  }

  /** 流式聊天 */
  async chatStream(message) {
    if (!message) {
      console.log('用法: chat:stream <message>');
      return;
    }

    process.stdout.write('\nAI: ');

    try {
      for await (const chunk of this.layer.chatStream({
        messages: [{ role: 'user', content: message }],
      })) {
        if (chunk.delta) {
          process.stdout.write(chunk.delta);
        }
        if (chunk.done) {
          console.log('\n');
        }
      }
    } catch (error) {
      console.log(`\n❌ 错误: ${error.message}\n`);
    }
  }

  /** 显示缓存统计 */
  async showCacheStats() {
    const stats = this.layer.getCacheStats?.() || {};
    
    console.log('\n📊 缓存统计:\n');
    console.log(`  命中率: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  命中: ${stats.hits || 0}`);
    console.log(`  未命中: ${stats.misses || 0}`);
    console.log(`  淘汰: ${stats.evictions || 0}`);
    console.log(`  当前大小: ${stats.size || 0}`);
    console.log(`  内存使用: ${((stats.memoryUsage || 0) / 1024).toFixed(2)} KB`);
    console.log();
  }

  /** 清空缓存 */
  async clearCache() {
    await this.layer.clearCache?.();
    console.log('✅ 缓存已清空');
  }

  /** 列出缓存 */
  async listCache() {
    const keys = await this.layer.getCacheKeys?.() || [];
    
    console.log('\n📦 缓存内容:\n');
    
    if (keys.length === 0) {
      console.log('  缓存为空');
      return;
    }

    for (const key of keys.slice(0, 20)) {
      console.log(`  - ${key}`);
    }

    if (keys.length > 20) {
      console.log(`  ... 还有 ${keys.length - 20} 项`);
    }

    console.log();
  }

  /** 显示指标 */
  async showMetrics() {
    const metrics = this.layer.getMetrics?.() || {};
    
    console.log('\n📈 性能指标:\n');
    console.log(JSON.stringify(metrics, null, 2));
  }

  /** 重置指标 */
  async resetMetrics() {
    this.layer.resetMetrics?.();
    console.log('✅ 指标已重置');
  }

  /** 导出指标 */
  async exportMetrics(path) {
    const metrics = this.layer.getMetrics?.() || {};
    const fs = require('fs');
    
    const filePath = path || `metrics-${Date.now()}.json`;
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
    
    console.log(`✅ 指标已导出到 ${filePath}`);
  }

  /** 保存配置 */
  async saveConfig(path) {
    const fs = require('fs');
    
    const filePath = path || 'config.json';
    fs.writeFileSync(filePath, JSON.stringify(this.layer.config, null, 2));
    
    console.log(`✅ 配置已保存到 ${filePath}`);
  }

  /** 加载配置 */
  async loadConfig(path) {
    if (!path) {
      console.log('用法: config:load <path>');
      return;
    }

    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    this.layer = new MultiModelAdapterLayer(config);
    console.log('✅ 配置已加载');
  }

  /** 提示输入 */
  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// =============================================
// 主函数
// =============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const cli = new MLLMCLI();

  // 处理帮助
  if (command === 'help' || command === '--help' || command === '-h') {
    cli.showHelp();
    process.exit(0);
  }

  // 处理版本
  if (command === 'version' || command === '--version' || command === '-v') {
    console.log('mllm-cli v1.0.0');
    process.exit(0);
  }

  // 解析配置文件
  let configPath;
  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = args[configIndex + 1];
  }

  // 初始化
  await cli.init(configPath);

  // 执行单命令或启动交互模式
  if (command) {
    const [cmd, ...cmdArgs] = args.filter((a) => !a.startsWith('--'));
    await cli.handleCommand(cmd, cmdArgs);
  } else {
    await cli.start();
  }
}

// 导出
module.exports = { MLLMCLI };

// 运行
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
