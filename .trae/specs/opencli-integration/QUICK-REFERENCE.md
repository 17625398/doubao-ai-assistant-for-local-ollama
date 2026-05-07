# OpenCLI 集成 - 快速参考指南

## 🚀 快速开始

### 1. 检查安装

```bash
# 检查 OpenCLI 版本
opencli --version  # 应显示 1.6.1

# 检查 daemon 是否运行
Test-NetConnection -ComputerName localhost -Port 19825
```

### 2. 使用 OpenCLI 功能

#### 方式 1: 扩展程序 UI

1. 打开扩展程序侧边栏
2. 点击 "OpenCLI" 按钮
3. 选择操作类型 (打开/点击/输入等)
4. 输入 selector 和 value
5. 点击执行

#### 方式 2: 代码调用

```typescript
import { OpenCLISkill } from '@core/utils/opencli-skill';

const skill = OpenCLISkill.getInstance();

// 打开网页
await skill.open('https://example.com');

// 点击元素
await skill.click('button.submit');

// 输入文本
await skill.type('input#username', 'test');

// 获取内容
const content = await skill.get('div.content');

// 执行脚本
const result = await skill.eval('document.title');
```

### 3. 录制脚本

```typescript
import { opencliRecorder } from '@core/utils/opencli-recorder';

// 开始录制
recorder.start('我的脚本');

// ... 执行浏览器操作 ...

// 停止录制并保存
const script = recorder.stop();

// 导出脚本
const json = recorder.exportScript(script.id);
console.log(json);
```

### 4. 会话管理

```typescript
import { opencliSessionManager } from '@core/utils/opencli-session-manager';

// 创建会话
const session = opencliSessionManager.createSession('工作会话');

// 保存当前状态
await opencliSessionManager.saveCurrentState();

// 加载会话
await opencliSessionManager.loadSession(session.id);

// 查看安全审计
const audit = opencliSessionManager.exportSecurityAudit();
console.log(audit.securityLevel); // 'high'
```

---

## 📖 常用命令

### 浏览器控制

| 方法 | 描述 | 示例 |
|------|------|------|
| `open(url)` | 打开网页 | `skill.open('https://google.com')` |
| `click(selector)` | 点击元素 | `skill.click('button#submit')` |
| `type(selector, text)` | 输入文本 | `skill.type('input', 'hello')` |
| `get(selector)` | 获取内容 | `skill.get('h1')` |
| `scroll(direction, amount)` | 滚动 | `skill.scroll('down', 100)` |
| `wait(condition)` | 等待 | `skill.wait('2s')` |
| `eval(script)` | 执行 JS | `skill.eval('document.title')` |
| `screenshot(path)` | 截图 | `skill.screenshot('./screen.png')` |

### 页面复杂度

```typescript
import { opencliConnector } from '@core/utils/opencli-connector';

const complexity = opencliConnector.evaluatePageComplexity();
console.log(complexity.score);        // 0-100
console.log(complexity.isComplex);    // true/false
console.log(complexity.factors);      // 影响因素
```

### 可视化反馈

```typescript
import { opencliVisualizer } from '@core/utils/opencli-visualizer';

// 高亮元素
visualizer.highlightBySelector('button.test');

// 显示消息
visualizer.showToast('操作成功', 'success');

// 更新状态
visualizer.updateStatus('处理中...', 'busy');

// 显示操作反馈
visualizer.showOperationFeedback({
  type: 'click',
  status: 'success',
  target: 'button',
  message: '点击成功'
});
```

---

## 🔧 故障排查

### 问题 1: 显示"OpenCLI 未就绪"

**检查步骤**:
```bash
# 1. 检查安装
opencli --version

# 2. 检查端口
Test-NetConnection -ComputerName localhost -Port 19825

# 3. 重启 daemon
taskkill /F /IM opencli.exe
opencli daemon start
```

**解决方案**: 参考 [OPENCLI-STATUS-FIX.md](./OPENCLI-STATUS-FIX.md)

### 问题 2: 操作失败

**检查步骤**:
1. 检查 selector 是否正确
2. 确认页面已完全加载
3. 查看浏览器控制台错误
4. 检查 OpenCLI 日志

**示例**:
```typescript
// 添加错误处理
try {
  await skill.click('button');
} catch (error) {
  console.error('点击失败:', error);
  visualizer.showToast('操作失败', 'error');
}
```

### 问题 3: 会话无法保存

**检查步骤**:
1. 确认页面已加载
2. 检查浏览器权限
3. 查看控制台错误

**解决方案**:
```typescript
// 确保在页面加载后保存
await skill.wait('2s');
await opencliSessionManager.saveCurrentState();
```

---

## 📊 性能优化

### 1. 智能路由

```typescript
// 自动选择最佳策略
const result = await opencliConnector.smartExtract({
  url: 'https://example.com',
  strategy: 'auto'  // 自动选择
});
```

### 2. 缓存机制

```typescript
// 使用会话缓存
const session = opencliSessionManager.createSession('缓存会话');
await opencliSessionManager.saveCurrentState();

// 下次直接使用
await opencliSessionManager.loadSession(session.id);
```

### 3. 批量操作

```typescript
// 录制多个操作
recorder.start('批量操作');
await skill.open('https://example.com');
await skill.click('button');
await skill.type('input', 'test');
const script = recorder.stop();

// 一次性回放
await recorder.playback(script, {
  delayBetweenActions: 500
});
```

---

## 🔒 安全最佳实践

### 1. 会话加密

```typescript
// 默认启用加密
const manager = OpenCLISessionManager.getInstance({
  encryptSensitiveData: true  // 默认值
});
```

### 2. 会话过期

```typescript
// 设置过期时间 (天)
const manager = OpenCLISessionManager.getInstance({
  sessionExpiryDays: 30
});

// 定期清理
manager.cleanupExpiredSessions();
```

### 3. 安全审计

```typescript
// 导出审计报告
const audit = manager.exportSecurityAudit();
console.log(audit.securityLevel);
console.log(audit.encryptedCount);
console.log(audit.expiredCount);
```

---

## 📚 示例代码

### 示例 1: 自动登录

```typescript
import { OpenCLISkill } from '@core/utils/opencli-skill';
import { opencliSessionManager } from '@core/utils/opencli-session-manager';

async function autoLogin(url: string, username: string, password: string) {
  const skill = OpenCLISkill.getInstance();
  
  // 打开登录页面
  await skill.open(url);
  await skill.wait('2s');
  
  // 输入凭据
  await skill.type('input#username', username);
  await skill.type('input#password', password);
  
  // 点击登录
  await skill.click('button[type="submit"]');
  await skill.wait('3s');
  
  // 保存会话
  const session = opencliSessionManager.createSession('登录会话');
  await opencliSessionManager.saveCurrentState();
  
  return session;
}
```

### 示例 2: 数据提取

```typescript
import { opencliConnector } from '@core/utils/opencli-connector';

async function extractData(url: string) {
  // 智能提取 (自动选择策略)
  const result = await opencliConnector.smartExtract({
    url,
    strategy: 'auto'
  });
  
  console.log(result.content);
  console.log(result.metadata);
  
  return result;
}
```

### 示例 3: 脚本录制和回放

```typescript
import { opencliRecorder } from '@core/utils/opencli-recorder';

async function recordAndPlayback() {
  // 录制
  recorder.start('工作流');
  // ... 执行操作 ...
  const script = recorder.stop();
  
  // 导出保存
  const json = recorder.exportScript(script.id);
  localStorage.setItem('my-script', json);
  
  // 加载回放
  const saved = localStorage.getItem('my-script');
  const loadedScript = JSON.parse(saved);
  const result = await recorder.playback(loadedScript);
  
  console.log(`回放完成，执行了 ${result.executedActions} 个操作`);
}
```

---

## 🎯 快速命令参考

### 扩展程序 UI 按钮

| 按钮 | 功能 | 参数 |
|------|------|------|
| 🔗 打开 | 打开网页 | URL |
| 👆 点击 | 点击元素 | Selector |
| ⌨️ 输入 | 输入文本 | Selector + Text |
| 📄 获取 | 获取内容 | Selector |
| 📷 截图 | 页面截图 | 路径 (可选) |
| ⬇️ 滚动 | 滚动页面 | 方向 + 距离 |
| ⏳ 等待 | 等待条件 | 时间/条件 |
| 🔍 评估 | 执行 JS | JavaScript 代码 |

### 快速命令

| 命令 | 功能 |
|------|------|
| 获取标题 | 获取页面标题 |
| 获取 URL | 获取当前 URL |
| 获取所有链接 | 获取页面所有链接 |

---

## 📞 获取帮助

### 文档

- [安装指南](./INSTALL.md)
- [使用指南](./USAGE.md)
- [测试报告](./TEST-REPORT.md)
- [完成总结](./COMPLETION-SUMMARY.md)
- [验收清单](./ACCEPTANCE-CHECKLIST.md)

### 测试

```bash
# 运行所有测试
cd packages/core
npm test

# 构建项目
cd ../..
npm run build --filter=@doubao/core
```

### 调试

```typescript
// 启用详细日志
import { logger } from '@core/utils/logger';
logger.setLevel('debug');

// 查看 OpenCLI 日志
// 在终端运行：opencli --verbose
```

---

**最后更新**: 2026-04-03  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
