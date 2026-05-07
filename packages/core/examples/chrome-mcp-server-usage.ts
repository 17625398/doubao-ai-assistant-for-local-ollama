// Chrome MCP Server 使用示例
import { createChromeMCPSkill, createChromeMCPClient } from '@ai-intelligent-analysis-platform/core';

/**
 * Chrome MCP Server 使用示例
 * 展示如何控制浏览器、导航网页、截取屏幕截图等功能
 */
async function chromeMCPServerExample() {
  console.log('=== Chrome MCP Server 使用示例 ===');

  // 创建 Chrome MCP Server 技能实例
  // 这里使用 HTTP 连接方式
  const chromeMCPSkill = createChromeMCPSkill({
    type: 'http',
    url: 'http://127.0.0.1:12306/mcp'
  });

  // 或者使用 STDIO 连接方式
  // const chromeMCPSkill = createChromeMCPSkill({
  //   type: 'stdio',
  //   command: 'npx',
  //   args: ['node', '/path/to/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js']
  // });

  try {
    // 初始化技能
    await chromeMCPSkill.initialize();
    console.log('Chrome MCP Server 技能初始化成功');

    // 检查技能是否可用
    const isAvailable = await chromeMCPSkill.isAvailable();
    console.log('Chrome MCP Server 技能是否可用:', isAvailable);

    if (!isAvailable) {
      console.error('Chrome MCP Server 技能不可用，请确保 Chrome 扩展已安装并运行');
      return;
    }

    // 获取工具实例
    const tools = chromeMCPSkill.getTools();

    // 1. 获取浏览器窗口和标签
    console.log('\n1. 获取浏览器窗口和标签');
    const windowsAndTabs = await tools.getWindowsAndTabs();
    console.log('浏览器窗口和标签:', windowsAndTabs);

    // 2. 导航到 GitHub
    console.log('\n2. 导航到 GitHub');
    await tools.navigate('https://github.com');
    console.log('导航到 GitHub 成功');

    // 3. 截取屏幕截图
    console.log('\n3. 截取屏幕截图');
    const screenshot = await tools.screenshot({ fullPage: true });
    console.log('截取屏幕截图成功，图片数据长度:', screenshot.length);

    // 4. 提取页面内容
    console.log('\n4. 提取页面内容');
    const content = await tools.extractContent({ selector: 'main' });
    console.log('提取页面内容成功，内容长度:', content.length);

    // 5. 分析页面
    console.log('\n5. 分析页面');
    const pageAnalysis = await tools.analyzePage({ depth: 2 });
    console.log('页面分析结果:', pageAnalysis);

    // 6. 获取页面元数据
    console.log('\n6. 获取页面元数据');
    const metadata = await tools.getPageMetadata();
    console.log('页面元数据:', metadata);

    // 7. 导航到 Wikipedia
    console.log('\n7. 导航到 Wikipedia');
    await tools.navigate('https://en.wikipedia.org/wiki/JavaScript');
    console.log('导航到 Wikipedia 成功');

    // 8. 提取 Wikipedia 页面内容
    console.log('\n8. 提取 Wikipedia 页面内容');
    const wikiContent = await tools.extractContent({ selector: '#content' });
    console.log('提取 Wikipedia 内容成功，内容长度:', wikiContent.length);

    // 9. 模拟滚动
    console.log('\n9. 模拟滚动');
    await tools.scroll({ direction: 'down', distance: 500, duration: 1000 });
    console.log('滚动成功');

    // 10. 获取书签
    console.log('\n10. 获取书签');
    const bookmarks = await tools.getBookmarks();
    console.log('书签数量:', bookmarks.length);

    // 11. 获取浏览历史
    console.log('\n11. 获取浏览历史');
    const history = await tools.getBrowsingHistory({ limit: 10 });
    console.log('浏览历史:', history);

    // 12. 执行 JavaScript 脚本
    console.log('\n12. 执行 JavaScript 脚本');
    const scriptResult = await tools.executeScript('return document.title');
    console.log('脚本执行结果:', scriptResult);

    // 13. 语义搜索浏览器标签
    console.log('\n13. 语义搜索浏览器标签');
    const searchResults = await tools.semanticSearch('JavaScript', { limit: 5 });
    console.log('语义搜索结果:', searchResults);

  } catch (error) {
    console.error('Chrome MCP Server 操作失败:', error);
  } finally {
    // 销毁技能
    chromeMCPSkill.destroy();
    console.log('\nChrome MCP Server 技能已销毁');
  }

  console.log('\n=== Chrome MCP Server 使用示例完成 ===');
}

/**
 * 浏览器自动化示例
 * 展示如何使用 Chrome MCP Server 进行浏览器自动化
 */
async function browserAutomationExample() {
  console.log('\n=== 浏览器自动化示例 ===');

  const chromeMCPClient = createChromeMCPClient({
    type: 'http',
    url: 'http://127.0.0.1:12306/mcp'
  });

  try {
    // 连接到 Chrome MCP Server
    await chromeMCPClient.connect();
    console.log('连接到 Chrome MCP Server 成功');

    // 1. 导航到 Google
    console.log('\n1. 导航到 Google');
    await chromeMCPClient.executeTool('chrome_navigate', {
      url: 'https://www.google.com'
    });
    console.log('导航到 Google 成功');

    // 2. 模拟输入搜索词
    console.log('\n2. 模拟输入搜索词');
    await chromeMCPClient.executeTool('chrome_type', {
      text: 'JavaScript tutorial',
      options: { delay: 100 }
    });
    console.log('输入搜索词成功');

    // 3. 模拟点击搜索按钮
    console.log('\n3. 模拟点击搜索按钮');
    await chromeMCPClient.executeTool('chrome_click', {
      selector: 'input[type="submit"]'
    });
    console.log('点击搜索按钮成功');

    // 4. 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 截取搜索结果页面
    console.log('\n5. 截取搜索结果页面');
    const screenshot = await chromeMCPClient.executeTool('chrome_screenshot', {
      fullPage: true
    });
    console.log('截取搜索结果页面成功');

    // 6. 提取搜索结果
    console.log('\n6. 提取搜索结果');
    const searchResults = await chromeMCPClient.executeTool('extract_content', {
      selector: '.g'
    });
    console.log('提取搜索结果成功，结果数量:', searchResults.length);

  } catch (error) {
    console.error('浏览器自动化失败:', error);
  } finally {
    // 断开连接
    chromeMCPClient.disconnect();
    console.log('\n已断开与 Chrome MCP Server 的连接');
  }

  console.log('\n=== 浏览器自动化示例完成 ===');
}

// 运行示例
chromeMCPServerExample().catch(console.error);

// 运行浏览器自动化示例
browserAutomationExample().catch(console.error);
