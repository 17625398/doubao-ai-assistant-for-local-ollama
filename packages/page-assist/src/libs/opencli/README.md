# OpenCLI 通信机制实现

## 概述

本模块实现了 Page Assist 与 OpenCLI 之间的通信机制，包括：

1. **客户端实现**：与 OpenCLI 守护进程的 HTTP 通信
2. **错误处理**：全面的错误类型和处理机制
3. **服务层**：统一的服务接口，提供便捷的操作方法
4. **桥接实现**：与浏览器扩展的 WebSocket 通信

## 架构

### 模块结构

- `client.ts` - OpenCLI 客户端，负责与守护进程的 HTTP 通信
- `errors.ts` - 错误处理模块，定义了各种错误类型和处理函数
- `service.ts` - 服务层，提供统一的接口和便捷方法
- `bridge.ts` - 桥接实现，与浏览器扩展的 WebSocket 通信
- `index.ts` - 模块导出
- `test.ts` - 测试脚本

### 核心流程

1. **初始化**：创建 OpenCLIService 实例，自动检查连接状态
2. **命令执行**：通过 sendCommand 方法发送命令到 OpenCLI 守护进程
3. **错误处理**：捕获和解析错误，提供友好的错误信息
4. **状态管理**：维护连接状态，自动重连和重试

## 使用方法

### 基本使用

```typescript
import { getOpenCLIService, checkOpenCLIStatus } from './libs/opencli';

// 检查 OpenCLI 状态
const status = await checkOpenCLIStatus();
console.log('OpenCLI status:', status);

// 使用服务执行命令
const service = getOpenCLIService({ autoInitialize: true });

// 导航到 URL
const navigateResult = await service.navigate('https://example.com', 'test-workspace');
console.log('Navigate result:', navigateResult);

// 执行 JavaScript 代码
const execResult = await service.exec('document.title', 'test-workspace');
console.log('Exec result:', execResult);

// 截图
const screenshot = await service.screenshot({ format: 'png', fullPage: true, workspace: 'test-workspace' });
console.log('Screenshot base64 length:', screenshot.length);

// 诊断状态
const diagnostic = await service.diagnose();
console.log('Diagnostic:', diagnostic);
```

### 错误处理

```typescript
import { getOpenCLIService, formatOpenCLIError } from './libs/opencli';

const service = getOpenCLIService();

try {
  const result = await service.executeCommand('navigate', { url: 'https://example.com' });
  console.log('Success:', result);
} catch (error) {
  const errorMessage = formatOpenCLIError(error);
  console.error('Error:', errorMessage);
}
```

## 功能特性

1. **自动重连**：网络错误时自动重试
2. **连接管理**：自动检查连接状态
3. **错误分类**：详细的错误类型和处理
4. **类型安全**：完整的 TypeScript 类型定义
5. **便捷方法**：提供常用操作的便捷方法

## 错误类型

- `OpenCLIError` - 基础错误类
- `OpenCLIDaemonError` - 守护进程错误
- `OpenCLIExtensionError` - 浏览器扩展错误
- `OpenCLINetworkError` - 网络错误
- `OpenCLITimeoutError` - 超时错误
- `OpenCLIActionError` - 操作错误

## 配置选项

```typescript
const service = getOpenCLIService({
  maxRetries: 4,      // 最大重试次数
  retryDelay: 500,     // 重试延迟（毫秒）
  timeout: 30000,      // 超时时间（毫秒）
  autoInitialize: true // 自动初始化
});
```

## 测试

运行测试脚本：

```bash
# 在浏览器控制台中运行
window.testOpenCLI.testConnection();
window.testOpenCLI.testService();

# 在 Node.js 环境中运行
node src/libs/opencli/test.ts
```

## 注意事项

1. **依赖**：需要 OpenCLI 守护进程和浏览器扩展
2. **权限**：需要浏览器扩展权限，特别是 `debugger` 权限用于 CDP 操作
3. **安全性**：避免执行未验证的 JavaScript 代码
4. **性能**：对于大量操作，建议使用批量处理
