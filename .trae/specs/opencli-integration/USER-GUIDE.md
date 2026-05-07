# OpenCLI 使用指南

## 🚀 快速开始

### 第一步：安装 OpenCLI CLI

```bash
# 使用 npm 安装
npm install -g @jackwener/opencli

# 或使用 yarn
yarn global add @jackwener/opencli

# 验证安装
opencli --version  # 应显示 1.6.1 或更高版本
```

### 第二步：启动 OpenCLI 守护进程

```bash
# 启动守护进程（默认端口 19825）
opencli daemon start

# 查看状态
opencli daemon status

# 停止守护进程
opencli daemon stop
```

### 第三步：加载扩展程序

1. **打开扩展管理页面**
   - Chrome 地址栏输入：`chrome://extensions/`
   - 或菜单：更多工具 → 扩展程序

2. **启用开发者模式**
   - 右上角切换开关打开"开发者模式"

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择目录：`d:/Doubao/refactored/packages/extension`
   - 确认加载

4. **固定扩展图标**
   - 点击拼图图标 🧩
   - 找到"Doubao AI Assistant"
   - 点击图钉图标固定到工具栏

### 第四步：开始使用

1. **打开侧边栏**
   - 点击扩展图标
   - 或使用快捷键（如果设置了）

2. **打开 OpenCLI 面板**
   - 点击 "OpenCLI" 按钮
   - 查看守护进程状态（应显示"OpenCLI 已就绪"）

3. **执行第一个命令**
   - 选择命令：点击"获取元素"
   - 输入选择器：`h1` 或 `#title`
   - 点击"执行操作"
   - 查看返回结果

---

## 📖 功能详解

### 1. 基本命令操作

#### 导航命令
```
操作：打开网页
选择器：URL 地址
示例：https://www.example.com
```

#### 点击命令
```
操作：点击元素
选择器：CSS 选择器
示例：#login-btn, .submit, button[type='submit']
```

#### 输入命令
```
操作：输入文本
选择器：输入框选择器
值：要输入的文本
示例：
  选择器：#username
  值：test@example.com
```

#### 获取内容
```
操作：获取元素
选择器：元素选择器
示例：
  - h1 (获取标题)
  - .content (获取内容区)
  - article p (获取所有段落)
```

### 2. 快速命令

**提取登录状态**
- 点击"提取登录状态"按钮
- 自动提取当前页面的：
  - Cookies
  - LocalStorage
  - SessionStorage
  - 认证令牌

**提取页面内容**
- 点击"提取页面内容"按钮
- 自动提取文章主要内容
- 支持多种内容格式

**提取所有链接**
- 点击"提取所有链接"按钮
- 获取页面所有链接及其文本

### 3. 批量执行

**使用队列批量添加命令**

```typescript
// 在控制台或通过消息发送
await chrome.runtime.sendMessage({
  type: 'OPENCLI_QUEUE_ADD',
  data: {
    command: 'click',
    args: { selector: '#button1' },
    priority: 1, // NORMAL
  },
});

await chrome.runtime.sendMessage({
  type: 'OPENCLI_QUEUE_ADD',
  data: {
    command: 'click',
    args: { selector: '#button2' },
    priority: 2, // HIGH
  },
});

// 开始执行
await chrome.runtime.sendMessage({
  type: 'OPENCLI_QUEUE_START',
});
```

### 4. 脚本录制

**开始录制**
```typescript
await chrome.runtime.sendMessage({
  type: 'OPENCLI_RECORDER_START',
  data: { scriptName: '我的自动化脚本' },
});
```

**执行操作**
- 在网页上进行点击、输入等操作
- 所有操作会被自动录制

**停止录制**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'OPENCLI_RECORDER_STOP',
});
console.log('录制的脚本:', response.script);
```

**回放脚本**
```typescript
await chrome.runtime.sendMessage({
  type: 'OPENCLI_RECORDER_PLAYBACK',
  data: {
    script: response.script,
    options: {
      speed: 1.0,      // 原速
      stopOnError: true,
    },
  },
});
```

### 5. 历史查询

**查询最近历史**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'OPENCLI_HISTORY_QUERY',
  data: { limit: 20 },
});
console.log('最近 20 条历史:', response.history);
```

**查询失败的命令**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'OPENCLI_HISTORY_QUERY',
  data: {
    success: false,
    limit: 50,
  },
});
```

**按时间范围查询**
```typescript
const oneHourAgo = Date.now() - 3600000;

const response = await chrome.runtime.sendMessage({
  type: 'OPENCLI_HISTORY_QUERY',
  data: {
    startTime: oneHourAgo,
    endTime: Date.now(),
  },
});
```

**获取统计信息**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'OPENCLI_HISTORY_STATS',
});
console.log('统计信息:', response.stats);
```

### 6. 性能监控

**查看性能报告**
```typescript
const report = performanceMonitor.generateReport();
console.log(report);
```

**查看慢命令**
```typescript
const slowCommands = performanceMonitor.getSlowCommands(5000, 10);
console.log('慢命令 Top 10:', slowCommands);
```

**获取实时统计**
```typescript
const stats = performanceMonitor.getStats();
console.log('性能统计:', stats);
```

---

## 🎯 常见使用场景

### 场景 1：自动化测试

```typescript
// 1. 打开测试页面
await openCLIBridge.navigate('https://example.com/login');

// 2. 填写表单
await openCLIBridge.type('#username', 'testuser');
await openCLIBridge.type('#password', 'password123');

// 3. 提交
await openCLIBridge.click('#submit-btn');

// 4. 验证
const title = await openCLIBridge.getTitle();
console.log('页面标题:', title);
```

### 场景 2：数据采集

```typescript
// 1. 打开目标页面
await openCLIBridge.navigate('https://example.com/products');

// 2. 等待加载
await openCLIBridge.waitForElement('.product-list');

// 3. 提取数据
const products = await openCLIBridge.evaluate(`
  Array.from(document.querySelectorAll('.product-item')).map(item => ({
    name: item.querySelector('.name')?.textContent,
    price: item.querySelector('.price')?.textContent,
  }))
`);

console.log('产品列表:', products);
```

### 场景 3：批量操作

```typescript
// 添加多个命令到队列
const commands = [
  { command: 'navigate', args: { url: 'https://example.com' } },
  { command: 'click', args: { selector: '#item1' } },
  { command: 'click', args: { selector: '#item2' } },
  { command: 'click', args: { selector: '#item3' } },
  { command: 'screenshot', args: {} },
];

// 批量执行
const results = await openCLIBridge.batchExecute(commands);
console.log('执行结果:', results);
```

### 场景 4：工作流自动化

```typescript
// 录制工作流
openCLIRecorderEnhanced.startRecording('每日报告生成');

// ... 执行一系列操作 ...

// 保存脚本
const script = openCLIRecorderEnhanced.stopRecording();
await openCLIRecorderEnhanced.saveScript(script);

// 以后可以回放
await openCLIRecorderEnhanced.playback(script);
```

---

## ⚙️ 高级配置

### 调整连接池配置

```typescript
// 高并发场景
connectionPool.updateConfig({
  maxConnections: 10,
  maxIdleTime: 120000,
  retryCount: 5,
});

// 低资源场景
connectionPool.updateConfig({
  maxConnections: 2,
  maxIdleTime: 30000,
});
```

### 调整缓存配置

```typescript
// 大缓存（读多写少）
commandCache.updateConfig({
  maxSize: 500,
  defaultExpiry: 600000,
});

// 小缓存（写多读少）
commandCache.updateConfig({
  maxSize: 50,
  defaultExpiry: 60000,
});
```

### 禁用缓存（特定命令）

```typescript
// 不缓存写操作
await openCLIBridge.execute('click', { selector: '#btn' }, {
  useCache: false,
});

await openCLIBridge.execute('type', { 
  selector: '#input', 
  value: 'text' 
}, {
  useCache: false,
});
```

---

## 🔧 故障排查

### 问题 1：守护进程未运行

**症状**: 状态显示"OpenCLI 未就绪"

**解决方案**:
```bash
# 检查是否安装
opencli --version

# 启动守护进程
opencli daemon start

# 检查端口
netstat -ano | findstr 19825
```

### 问题 2：命令执行失败

**症状**: 执行命令返回错误

**解决方案**:
1. 检查选择器是否正确
2. 确保页面已完全加载
3. 查看性能监控日志
4. 尝试手动执行相同操作

### 问题 3：扩展无法加载

**症状**: 加载扩展时报错

**解决方案**:
1. 重新构建：`npm run build`
2. 清除缓存：删除 `packages/extension/dist`
3. 重新加载扩展
4. 查看控制台错误信息

### 问题 4：性能下降

**症状**: 响应变慢，超时

**解决方案**:
```typescript
// 查看性能报告
const report = performanceMonitor.generateReport();
console.log(report);

// 清理连接池
connectionPool.cleanup();

// 清理缓存
commandCache.clear();

// 重启守护进程
opencli daemon restart
```

---

## 📚 CSS 选择器参考

### 基础选择器

```css
/* ID 选择器 */
#login-btn

/* 类选择器 */
.submit-btn
.btn.primary

/* 标签选择器 */
button
input
a

/* 属性选择器 */
input[type='text']
a[href^='https']
[data-testid='submit']

/* 后代选择器 */
.form .btn-group button
div.container p.text

/* 子元素选择器 */
ul > li
table > tr > td

/* 伪类选择器 */
button:hover
input:focus
li:first-child
li:last-child
li:nth-child(2)
```

### 复杂选择器

```css
/* 组合选择器 */
#form input[name='email']:focus

/* 包含文本 */
button:contains('提交')

/* 多个选择器 */
#submit, .btn-submit, button[type='submit']
```

---

## 💡 最佳实践

### 1. 选择器编写

✅ **推荐**
```css
/* 使用稳定的 ID */
#login-form

/* 使用语义化类名 */
.btn-submit

/* 使用数据属性 */
[data-testid='submit-btn']
```

❌ **不推荐**
```css
/* 使用动态生成的类名 */
.css-1a2b3c4d

/* 使用绝对路径 */
div > div:nth-child(2) > button

/* 使用易变的选择器 */
button[style='color: red;']
```

### 2. 错误处理

✅ **推荐**
```typescript
try {
  const result = await openCLIBridge.click('#btn');
  if (!result.success) {
    console.error('点击失败:', result.error);
  }
} catch (error) {
  console.error('异常:', error);
}
```

❌ **不推荐**
```typescript
// 不处理错误
await openCLIBridge.click('#btn');
```

### 3. 性能优化

✅ **推荐**
```typescript
// 使用缓存
const result = await openCLIBridge.execute('get', { 
  selector: '#title' 
}, { useCache: true });

// 批量操作
const results = await openCLIBridge.batchExecute(commands);

// 合理等待
await openCLIBridge.waitForElement('#content', 5000);
```

❌ **不推荐**
```typescript
// 频繁查询
for (let i = 0; i < 100; i++) {
  await openCLIBridge.get('#title');
}

// 固定等待时间
await openCLIBridge.wait(10000);
```

---

## 📞 获取帮助

### 文档资源

- [完整实现总结](./FINAL-SUMMARY.md)
- [Phase 3 性能优化](./PHASE3-IMPLEMENTATION.md)
- [Phase 2 功能增强](./PHASE2-IMPLEMENTATION.md)
- [Phase 1 基础集成](./BRIDGE-IMPLEMENTATION.md)
- [实施路线图](./IMPLEMENTATION-ROADMAP.md)

### 外部资源

- [OpenCLI GitHub](https://github.com/jackwener/opencli)
- [OpenCLI NPM](https://www.npmjs.com/package/@jackwener/opencli)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [CSS 选择器指南](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Selectors)

---

**最后更新**: 2026-04-03  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
