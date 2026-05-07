#!/usr/bin/env node

/**
 * 性能测试运行脚本
 * 运行所有性能测试并生成报告
 *
 * 用法:
 *   node scripts/performance-test.js [options]
 *
 * 选项:
 *   --core-only      仅运行 core 包性能测试
 *   --web-only       仅运行 web 包性能测试
 *   --bench-only     仅运行 benchmark 测试
 *   --test-only      仅运行普通性能测试
 *   --reporter       指定报告格式 (default, json, verbose)
 *   --output         指定输出文件路径
 *   --help           显示帮助信息
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    coreOnly: false,
    webOnly: false,
    benchOnly: false,
    testOnly: false,
    reporter: 'default',
    output: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--core-only':
        options.coreOnly = true;
        break;
      case '--web-only':
        options.webOnly = true;
        break;
      case '--bench-only':
        options.benchOnly = true;
        break;
      case '--test-only':
        options.testOnly = true;
        break;
      case '--reporter':
        options.reporter = args[++i] || 'default';
        break;
      case '--output':
        options.output = args[++i] || null;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.warn(colorize(`未知选项: ${arg}`, 'yellow'));
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${colorize('性能测试运行脚本', 'bright')}

${colorize('用法:', 'bright')}
  node scripts/performance-test.js [options]

${colorize('选项:', 'bright')}
  --core-only      仅运行 core 包性能测试
  --web-only       仅运行 web 包性能测试
  --bench-only     仅运行 benchmark 测试
  --test-only      仅运行普通性能测试
  --reporter       指定报告格式 (default, json, verbose)
  --output         指定输出文件路径
  --help, -h       显示帮助信息

${colorize('示例:', 'bright')}
  node scripts/performance-test.js
  node scripts/performance-test.js --core-only --bench-only
  node scripts/performance-test.js --reporter json --output report.json
`);
}

// 运行命令并捕获输出
function runCommand(command, cwd, label) {
  console.log(colorize(`\n▶ ${label}`, 'cyan'));
  console.log(colorize(`  运行: ${command}`, 'dim'));

  const startTime = Date.now();
  let output = '';
  let success = false;

  try {
    output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000, // 5分钟超时
    });
    success = true;
  } catch (error) {
    output = error.stdout || '';
    output += error.stderr || '';
    success = false;
  }

  const elapsed = Date.now() - startTime;

  return {
    success,
    output,
    elapsed,
    label,
  };
}

// 提取性能指标
function extractMetrics(output) {
  const metrics = {
    parseTime: [],
    memoryDelta: [],
    cacheTime: [],
    uiTime: [],
    errors: [],
  };

  const lines = output.split('\n');

  for (const line of lines) {
    // 解析时间指标
    const parseMatch = line.match(/parse.*?(\d+(?:\.\d+)?)\s*ms/i);
    if (parseMatch) {
      metrics.parseTime.push(parseFloat(parseMatch[1]));
    }

    // 内存指标
    const memoryMatch = line.match(/delta=(\d+(?:\.\d+)?)\s*MB/i);
    if (memoryMatch) {
      metrics.memoryDelta.push(parseFloat(memoryMatch[1]));
    }

    // 缓存操作时间
    const cacheMatch = line.match(/avg=(\d+(?:\.\d+)?)\s*ms/i);
    if (cacheMatch) {
      metrics.cacheTime.push(parseFloat(cacheMatch[1]));
    }

    // UI 响应时间
    const uiMatch = line.match(/(\d+(?:\.\d+)?)ms/i);
    if (uiMatch && line.includes('DOM') || line.includes('Event') || line.includes('State')) {
      metrics.uiTime.push(parseFloat(uiMatch[1]));
    }

    // 错误信息
    if (line.includes('FAIL') || line.includes('Error') || line.includes('exceeds')) {
      metrics.errors.push(line.trim());
    }
  }

  return metrics;
}

// 生成报告
function generateReport(results, reporter) {
  const allMetrics = results.map(r => ({
    ...r,
    metrics: extractMetrics(r.output),
  }));

  if (reporter === 'json') {
    return JSON.stringify(allMetrics.map(r => ({
      label: r.label,
      success: r.success,
      elapsed: r.elapsed,
      metrics: r.metrics,
    })), null, 2);
  }

  if (reporter === 'verbose') {
    let report = '\n' + colorize('='.repeat(60), 'bright') + '\n';
    report += colorize('性能测试详细报告', 'bright') + '\n';
    report += colorize('='.repeat(60), 'bright') + '\n';

    for (const result of allMetrics) {
      report += `\n${colorize(result.label, 'bright')} `;
      report += result.success
        ? colorize('[通过]', 'green')
        : colorize('[失败]', 'red');
      report += ` (${result.elapsed}ms)\n`;

      if (result.metrics.parseTime.length > 0) {
        report += `  文档解析时间: ${result.metrics.parseTime.map(t => `${t}ms`).join(', ')}\n`;
      }
      if (result.metrics.memoryDelta.length > 0) {
        report += `  内存增量: ${result.metrics.memoryDelta.map(m => `${m}MB`).join(', ')}\n`;
      }
      if (result.metrics.cacheTime.length > 0) {
        report += `  缓存操作时间: ${result.metrics.cacheTime.map(t => `${t}ms`).join(', ')}\n`;
      }
      if (result.metrics.uiTime.length > 0) {
        report += `  UI 响应时间: ${result.metrics.uiTime.map(t => `${t}ms`).join(', ')}\n`;
      }
      if (result.metrics.errors.length > 0) {
        report += `  ${colorize('错误:', 'red')}\n`;
        result.metrics.errors.forEach(e => {
          report += `    - ${e}\n`;
        });
      }
    }

    return report;
  }

  // 默认报告格式
  let report = '\n' + colorize('性能测试报告', 'bright') + '\n';
  report += colorize('-'.repeat(60), 'dim') + '\n';

  const totalTests = allMetrics.length;
  const passedTests = allMetrics.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  report += `总测试数: ${totalTests}\n`;
  report += `${colorize('通过:', 'green')} ${passedTests}\n`;
  report += `${colorize('失败:', 'red')} ${failedTests}\n`;
  report += colorize('-'.repeat(60), 'dim') + '\n';

  // 验收标准检查
  const acceptanceCriteria = {
    '10MB 文档解析时间 < 30秒': true,
    'UI 操作响应时间 < 100ms': true,
    '内存占用不超过 1GB': true,
  };

  // 检查解析时间
  const allParseTimes = allMetrics.flatMap(r => r.metrics.parseTime);
  if (allParseTimes.length > 0) {
    const maxParseTime = Math.max(...allParseTimes);
    acceptanceCriteria['10MB 文档解析时间 < 30秒'] = maxParseTime < 30000;
    report += `最大文档解析时间: ${maxParseTime}ms ${maxParseTime < 30000 ? colorize('✓', 'green') : colorize('✗', 'red')}\n`;
  }

  // 检查 UI 响应时间
  const allUiTimes = allMetrics.flatMap(r => r.metrics.uiTime);
  if (allUiTimes.length > 0) {
    const maxUiTime = Math.max(...allUiTimes);
    acceptanceCriteria['UI 操作响应时间 < 100ms'] = maxUiTime < 100;
    report += `最大 UI 响应时间: ${maxUiTime.toFixed(4)}ms ${maxUiTime < 100 ? colorize('✓', 'green') : colorize('✗', 'red')}\n`;
  }

  // 检查内存使用
  const allMemoryDeltas = allMetrics.flatMap(r => r.metrics.memoryDelta);
  if (allMemoryDeltas.length > 0) {
    const maxMemory = Math.max(...allMemoryDeltas);
    acceptanceCriteria['内存占用不超过 1GB'] = maxMemory < 1024;
    report += `最大内存增量: ${maxMemory.toFixed(2)}MB ${maxMemory < 1024 ? colorize('✓', 'green') : colorize('✗', 'red')}\n`;
  }

  report += colorize('-'.repeat(60), 'dim') + '\n';
  report += colorize('验收标准:', 'bright') + '\n';
  for (const [criteria, passed] of Object.entries(acceptanceCriteria)) {
    report += `  ${passed ? colorize('✓', 'green') : colorize('✗', 'red')} ${criteria}\n`;
  }

  return report;
}

// 主函数
function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const rootDir = path.resolve(__dirname, '..');
  const coreDir = path.join(rootDir, 'packages', 'core');
  const webDir = path.join(rootDir, 'packages', 'web');

  console.log(colorize('\n🚀 开始运行性能测试...', 'bright'));

  const results = [];

  // Core 包性能测试
  if (!options.webOnly) {
    if (!options.testOnly) {
      // Benchmark 测试
      const benchResult = runCommand(
        'npx vitest run --bench src/__tests__/performance/document-processing.bench.ts',
        coreDir,
        'Core - 文档处理 Benchmark'
      );
      results.push(benchResult);
    }

    if (!options.benchOnly) {
      // 内存测试
      const memoryResult = runCommand(
        'npx vitest run src/__tests__/performance/memory-usage.test.ts',
        coreDir,
        'Core - 内存使用测试'
      );
      results.push(memoryResult);

      // 缓存性能测试
      const cacheResult = runCommand(
        'npx vitest run src/__tests__/performance/cache-performance.test.ts',
        coreDir,
        'Core - 缓存性能测试'
      );
      results.push(cacheResult);
    }
  }

  // Web 包性能测试
  if (!options.coreOnly) {
    if (!options.benchOnly) {
      const uiResult = runCommand(
        'npx vitest run src/__tests__/performance/ui-response-time.test.ts',
        webDir,
        'Web - UI 响应时间测试'
      );
      results.push(uiResult);
    }
  }

  // 生成报告
  const report = generateReport(results, options.reporter);
  console.log(report);

  // 保存报告到文件
  if (options.output) {
    const outputPath = path.resolve(rootDir, options.output);
    fs.writeFileSync(outputPath, report, 'utf-8');
    console.log(colorize(`\n报告已保存到: ${outputPath}`, 'green'));
  }

  // 退出码
  const hasFailures = results.some(r => !r.success);
  if (hasFailures) {
    console.log(colorize('\n❌ 部分测试失败', 'red'));
    process.exit(1);
  } else {
    console.log(colorize('\n✅ 所有测试通过', 'green'));
    process.exit(0);
  }
}

main();
