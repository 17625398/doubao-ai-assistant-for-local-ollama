/**
 * PicoClaw 集成测试脚本
 * 用于测试 PicoClaw 集成的功能和性能
 */

import { picoClawPerformanceTest } from './packages/core/src/utils/picoclaw-performance-test';
import { PicoClawExample } from './packages/core/src/services/chatclaw-picoclaw-example';

async function runTests() {
  console.log('=== PicoClaw 集成测试 ===\n');

  try {
    // 运行性能测试
    console.log('1. 运行性能测试...');
    const performanceResults = await picoClawPerformanceTest.runAllTests();
    console.log('\n');

    // 运行使用示例
    console.log('2. 运行使用示例...');
    await PicoClawExample.runAllExamples();
    console.log('\n');

    // 显示示例配置
    console.log('3. 示例配置:');
    const exampleConfig = PicoClawExample.getExampleConfig();
    console.log(JSON.stringify(exampleConfig, null, 2));
    console.log('\n');

    console.log('=== 测试完成 ===');
    console.log('所有测试已成功运行！');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
runTests();
