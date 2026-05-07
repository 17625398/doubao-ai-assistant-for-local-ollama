# OpenCLI 技能使用示例

## 基本使用

### 导入技能

```typescript
import { opencli } from '@core/utils/opencli-skill';
```

### 检查可用性

```typescript
if (opencli.isReady()) {
  console.log('OpenCLI 已就绪');
} else {
  console.log('OpenCLI 未就绪，请检查安装和配置');
}
```

## 浏览器操作示例

### 1. 打开网页

```typescript
// 打开网页
const result = await opencli.open('https://www.example.com');
if (result.success) {
  console.log('页面已打开');
} else {
  console.error('打开失败:', result.error);
}
```

### 2. 获取页面状态

```typescript
const state = await opencli.getState();
if (state) {
  console.log('当前 URL:', state.url);
  console.log('页面标题:', state.title);
}
```

### 3. 点击元素

```typescript
// 使用 CSS 选择器点击元素
const result = await opencli.click('#login-button');
if (result.success) {
  console.log('点击成功');
}
```

### 4. 输入文本

```typescript
// 在输入框中输入文本
await opencli.type('#username-input', 'myusername');
await opencli.type('#password-input', 'mypassword');
```

### 5. 获取元素内容

```typescript
// 获取元素文本内容
const result = await opencli.get('.article-title');
if (result.success) {
  console.log('标题内容:', result.output);
}
```

### 6. 执行 JavaScript

```typescript
// 在页面上下文中执行 JavaScript
const result = await opencli.eval(`
  document.querySelector('.article-content').innerText
`);
if (result.success) {
  console.log('文章内容:', result.output);
}
```

### 7. 截图

```typescript
// 截取当前页面
const result = await opencli.screenshot('D:/screenshots/page.png');
if (result.success) {
  console.log('截图已保存');
}
```

### 8. 滚动页面

```typescript
// 向下滚动
await opencli.scroll('down', 500);

// 向上滚动
await opencli.scroll('up', 300);
```

### 9. 等待元素

```typescript
// 等待元素出现（最多等待 10 秒）
await opencli.wait('.dynamic-content', 10000);
```

### 10. 组合操作示例

```typescript
// 完整的操作流程示例
async function extractArticleContent(url: string) {
  // 1. 打开页面
  await opencli.open(url);
  
  // 2. 等待内容加载
  await opencli.wait('.article-content', 10000);
  
  // 3. 获取标题
  const titleResult = await opencli.get('.article-title');
  
  // 4. 获取正文
  const contentResult = await opencli.eval(`
    document.querySelector('.article-content').innerText
  `);
  
  // 5. 截图
  await opencli.screenshot(`D:/articles/${Date.now()}.png`);
  
  return {
    title: titleResult.output,
    content: contentResult.output,
  };
}
```

## 高级用法

### 使用 operate 命令直接执行

```typescript
const result = await opencli.execute({
  name: 'operate',
  subcommand: 'click',
  args: ['#submit-button'],
  timeout: 5000,
});
```

### 执行复杂的 JavaScript

```typescript
const result = await opencli.eval(`
  (function() {
    const data = {
      title: document.title,
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText,
        href: a.href
      }))
    };
    return JSON.stringify(data);
  })()
`);

if (result.success) {
  const data = JSON.parse(result.output);
  console.log('页面链接:', data.links);
}
```

### 错误处理

```typescript
try {
  const result = await opencli.click('#nonexistent-element');
  if (!result.success) {
    console.error('操作失败:', result.error);
    // 重试或降级处理
  }
} catch (error) {
  console.error('异常:', error);
}
```

## 与 WebContentExtractor 协同使用

```typescript
import { opencli } from '@core/utils/opencli-skill';
import { WebContentExtractor } from '@core/utils/web-content-extractor';

async function smartExtract(url: string) {
  // 1. 使用 OpenCLI 打开需要登录的页面
  await opencli.open(url);
  await opencli.wait('.content-loaded', 10000);
  
  // 2. 使用 WebContentExtractor 提取内容
  const extractor = new WebContentExtractor();
  const content = await extractor.extractFromCurrentPage({
    maxChars: 100000,
    includeImages: true,
  });
  
  // 3. 关闭页面
  await opencli.close();
  
  return content;
}
```

## 注意事项

1. **浏览器扩展**: 确保已安装并启用 OpenCLI 浏览器扩展
2. **Daemon 服务**: 确保 OpenCLI daemon 正在运行
3. **选择器**: 使用准确的 CSS 选择器定位元素
4. **超时**: 为操作设置合理的超时时间
5. **错误处理**: 始终检查操作结果的 success 字段
6. **资源清理**: 使用完毕后调用 close() 关闭页面

## 常见问题

### Q: 如何知道元素的选择器？
A: 在 Chrome DevTools 中右键元素 -> Copy -> Copy selector

### Q: 操作执行太慢怎么办？
A: 调整 timeout 参数，或使用 wait() 等待特定条件

### Q: 如何处理弹窗？
A: 使用 eval() 执行 JavaScript 处理弹窗

### Q: 如何提取结构化数据？
A: 使用 eval() 执行自定义 JavaScript 返回 JSON 数据
