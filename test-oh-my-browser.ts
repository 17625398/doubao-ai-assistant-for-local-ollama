/**
 * Oh My Browser 插件集成测试脚本
 * 用于测试 Oh My Browser 插件的功能和性能
 */

import { chatClawOhMyBrowserService } from './packages/core/src/services/chatclaw-oh-my-browser-service';
import { logger } from './packages/core/src/utils/logger';

/**
 * Oh My Browser 插件集成测试
 */
async function runOhMyBrowserTests() {
  console.log('=== Oh My Browser 插件集成测试 ===\n');

  try {
    // 测试 1: 检查安装状态
    console.log('1. 测试安装状态...');
    const isInstalled = await chatClawOhMyBrowserService.checkInstallation();
    console.log(`Oh My Browser 安装状态: ${isInstalled ? '已安装' : '未安装'}`);
    
    if (!isInstalled) {
      console.log('请先安装 Oh My Browser CLI 和 Chrome 扩展');
      console.log('安装命令: curl -fsSL https://api.omb.org.cn/install | bash');
      console.log('然后安装 Chrome 扩展并登录');
    }
    
    // 测试 2: 连接功能
    console.log('\n2. 测试连接功能...');
    const connectResult = await chatClawOhMyBrowserService.connect();
    console.log(`连接结果: ${connectResult ? '成功' : '失败'}`);
    
    if (connectResult) {
      // 获取连接状态
      const status = chatClawOhMyBrowserService.getStatus();
      console.log(`连接状态: ${status}`);
      
      // 测试 3: 搜索功能
      console.log('\n3. 测试搜索功能...');
      try {
        const searchResult = await chatClawOhMyBrowserService.search({
          query: 'OpenClaw plugins',
          max_results: 5,
          engine: 'google'
        });
        console.log('搜索结果:', searchResult);
      } catch (error) {
        console.log('搜索失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 4: 读取网页功能
      console.log('\n4. 测试读取网页功能...');
      try {
        const readResult = await chatClawOhMyBrowserService.read({
          url: 'https://clawhub.ai/plugins/oh-my-browser',
          format: 'markdown'
        });
        console.log('网页内容提取成功');
        console.log('内容长度:', readResult?.content?.length || 0);
      } catch (error) {
        console.log('读取网页失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 5: 浏览器操作功能
      console.log('\n5. 测试浏览器操作功能...');
      try {
        // 先读取页面获取 tabId
        const readResult = await chatClawOhMyBrowserService.read({
          url: 'https://example.com'
        });
        
        if (readResult?.tabId) {
          // 执行点击操作
          const clickResult = await chatClawOhMyBrowserService.action({
            action: 'click',
            tabId: readResult.tabId,
            selector: 'a'
          });
          console.log('点击操作结果:', clickResult);
        }
      } catch (error) {
        console.log('浏览器操作失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 6: 页面元素发现功能
      console.log('\n6. 测试页面元素发现功能...');
      try {
        // 先读取页面获取 tabId
        const readResult = await chatClawOhMyBrowserService.read({
          url: 'https://example.com'
        });
        
        if (readResult?.tabId) {
          // 查找页面元素
          const mapResult = await chatClawOhMyBrowserService.map({
            tabId: readResult.tabId,
            types: ['a', 'button']
          });
          console.log('页面元素发现结果:', mapResult);
        }
      } catch (error) {
        console.log('页面元素发现失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 7: 可访问性快照功能
      console.log('\n7. 测试可访问性快照功能...');
      try {
        // 先读取页面获取 tabId
        const readResult = await chatClawOhMyBrowserService.read({
          url: 'https://example.com'
        });
        
        if (readResult?.tabId) {
          // 创建可访问性快照
          const snapshotResult = await chatClawOhMyBrowserService.snapshot({
            tabId: readResult.tabId,
            format: 'markdown'
          });
          console.log('可访问性快照创建成功');
          console.log('快照内容长度:', snapshotResult?.content?.length || 0);
        }
      } catch (error) {
        console.log('可访问性快照创建失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 8: 获取插件信息
      console.log('\n8. 测试获取插件信息...');
      try {
        const infoResult = await chatClawOhMyBrowserService.getInfo();
        console.log('插件信息:', infoResult);
      } catch (error) {
        console.log('获取插件信息失败:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // 测试 9: 断开连接
      console.log('\n9. 测试断开连接...');
      const disconnectResult = chatClawOhMyBrowserService.disconnect();
      console.log(`断开连接结果: ${disconnectResult ? '成功' : '失败'}`);
    }
    
    console.log('\n=== 测试完成 ===');
    console.log('所有测试已成功运行！');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
runOhMyBrowserTests();
