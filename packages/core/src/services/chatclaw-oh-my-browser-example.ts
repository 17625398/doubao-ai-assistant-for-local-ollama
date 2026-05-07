/**
 * Oh My Browser 插件使用示例
 * 展示如何在 OpenClaw 中使用 Oh My Browser 插件
 */
import { chatClawOhMyBrowserService } from './chatclaw-oh-my-browser-service';
import { logger } from '../utils/logger';

/**
 * Oh My Browser 插件使用示例
 */
export class OhMyBrowserExample {
  /**
   * 运行所有示例
   */
  static async runAllExamples(): Promise<void> {
    logger.info('=== Oh My Browser 插件使用示例 ===');

    await this.example1_InstallationCheck();
    await this.example2_Connection();
    await this.example3_Search();
    await this.example4_ReadWebpage();
    await this.example5_BrowserActions();
    await this.example6_ElementMapping();
    await this.example7_AccessibilitySnapshot();
    await this.example8_ErrorHandling();

    logger.info('=== 示例运行完成 ===');
  }

  /**
   * 示例 1: 检查安装状态
   */
  static async example1_InstallationCheck(): Promise<void> {
    logger.info('\n示例 1: 检查安装状态');

    try {
      const isInstalled = await chatClawOhMyBrowserService.checkInstallation();
      logger.info(`Oh My Browser 安装状态: ${isInstalled ? '已安装' : '未安装'}`);

      if (!isInstalled) {
        logger.info('请先安装 Oh My Browser CLI 和 Chrome 扩展');
        logger.info('安装命令: curl -fsSL https://api.omb.org.cn/install | bash');
        logger.info('然后安装 Chrome 扩展并登录');
      }
    } catch (error) {
      logger.error('检查安装状态失败:', error);
    }
  }

  /**
   * 示例 2: 连接和断开连接
   */
  static async example2_Connection(): Promise<void> {
    logger.info('\n示例 2: 连接和断开连接');

    try {
      // 连接到 Oh My Browser
      logger.info('连接到 Oh My Browser...');
      const connectResult = await chatClawOhMyBrowserService.connect();
      logger.info(`连接结果: ${connectResult ? '成功' : '失败'}`);

      if (connectResult) {
        // 获取连接状态
        const status = chatClawOhMyBrowserService.getStatus();
        logger.info(`当前状态: ${status}`);

        // 等待几秒钟
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 断开连接
        logger.info('断开连接...');
        const disconnectResult = chatClawOhMyBrowserService.disconnect();
        logger.info(`断开连接结果: ${disconnectResult ? '成功' : '失败'}`);
      }
    } catch (error) {
      logger.error('连接示例失败:', error);
    }
  }

  /**
   * 示例 3: 搜索网页
   */
  static async example3_Search(): Promise<void> {
    logger.info('\n示例 3: 搜索网页');

    try {
      // 先连接
      const connected = await chatClawOhMyBrowserService.connect();
      if (!connected) {
        logger.info('未连接到 Oh My Browser，跳过搜索示例');
        return;
      }

      // 执行搜索
      logger.info('搜索 "OpenClaw plugins"...');
      const searchResult = await chatClawOhMyBrowserService.search({
        query: 'OpenClaw plugins',
        max_results: 5,
        engine: 'google'
      });

      logger.info('搜索结果:');
      if (searchResult?.results) {
        searchResult.results.forEach((result: any, index: number) => {
          logger.info(`${index + 1}. ${result.title}`);
          logger.info(`   ${result.url}`);
        });
      } else {
        logger.info('无搜索结果');
      }

      // 断开连接
      chatClawOhMyBrowserService.disconnect();
    } catch (error) {
      logger.error('搜索示例失败:', error);
      chatClawOhMyBrowserService.disconnect();
    }
  }

  /**
   * 示例 4: 读取网页内容
   */
  static async example4_ReadWebpage(): Promise<void> {
    logger.info('\n示例 4: 读取网页内容');

    try {
      // 先连接
      const connected = await chatClawOhMyBrowserService.connect();
      if (!connected) {
        logger.info('未连接到 Oh My Browser，跳读取网页示例');
        return;
      }

      // 读取网页
      logger.info('读取 Oh My Browser 插件页面...');
      const readResult = await chatClawOhMyBrowserService.read({
        url: 'https://clawhub.ai/plugins/oh-my-browser',
        format: 'markdown'
      });

      logger.info('网页内容提取成功');
      logger.info(`内容长度: ${readResult?.content?.length || 0}`);
      if (readResult?.content) {
        // 打印前 500 个字符
        logger.info('内容预览:', readResult.content.substring(0, 500) + '...');
      }

      // 断开连接
      chatClawOhMyBrowserService.disconnect();
    } catch (error) {
      logger.error('读取网页示例失败:', error);
      chatClawOhMyBrowserService.disconnect();
    }
  }

  /**
   * 示例 5: 浏览器操作
   */
  static async example5_BrowserActions(): Promise<void> {
    logger.info('\n示例 5: 浏览器操作');

    try {
      // 先连接
      const connected = await chatClawOhMyBrowserService.connect();
      if (!connected) {
        logger.info('未连接到 Oh My Browser，跳过浏览器操作示例');
        return;
      }

      // 先读取页面获取 tabId
      logger.info('打开示例页面...');
      const readResult = await chatClawOhMyBrowserService.read({
        url: 'https://example.com'
      });

      if (readResult?.tabId) {
        // 执行滚动操作
        logger.info('执行滚动操作...');
        const scrollResult = await chatClawOhMyBrowserService.action({
          action: 'scroll',
          tabId: readResult.tabId,
          value: '100px'
        });
        logger.info('滚动操作结果:', scrollResult);

        // 执行截图操作
        logger.info('执行截图操作...');
        const screenshotResult = await chatClawOhMyBrowserService.action({
          action: 'screenshot',
          tabId: readResult.tabId,
          annotate: true
        });
        logger.info('截图操作结果:', screenshotResult ? '成功' : '失败');
      }

      // 断开连接
      chatClawOhMyBrowserService.disconnect();
    } catch (error) {
      logger.error('浏览器操作示例失败:', error);
      chatClawOhMyBrowserService.disconnect();
    }
  }

  /**
   * 示例 6: 页面元素映射
   */
  static async example6_ElementMapping(): Promise<void> {
    logger.info('\n示例 6: 页面元素映射');

    try {
      // 先连接
      const connected = await chatClawOhMyBrowserService.connect();
      if (!connected) {
        logger.info('未连接到 Oh My Browser，跳过页面元素映射示例');
        return;
      }

      // 先读取页面获取 tabId
      logger.info('打开示例页面...');
      const readResult = await chatClawOhMyBrowserService.read({
        url: 'https://example.com'
      });

      if (readResult?.tabId) {
        // 查找页面元素
        logger.info('查找页面元素...');
        const mapResult = await chatClawOhMyBrowserService.map({
          tabId: readResult.tabId,
          types: ['a', 'button']
        });

        logger.info('页面元素发现结果:');
        if (mapResult?.elements) {
          mapResult.elements.forEach((element: any, index: number) => {
            logger.info(`${index + 1}. ${element.type}: ${element.label || element.text}`);
            logger.info(`   Selector: ${element.selector}`);
          });
        } else {
          logger.info('未找到元素');
        }
      }

      // 断开连接
      chatClawOhMyBrowserService.disconnect();
    } catch (error) {
      logger.error('页面元素映射示例失败:', error);
      chatClawOhMyBrowserService.disconnect();
    }
  }

  /**
   * 示例 7: 可访问性快照
   */
  static async example7_AccessibilitySnapshot(): Promise<void> {
    logger.info('\n示例 7: 可访问性快照');

    try {
      // 先连接
      const connected = await chatClawOhMyBrowserService.connect();
      if (!connected) {
        logger.info('未连接到 Oh My Browser，跳过可访问性快照示例');
        return;
      }

      // 先读取页面获取 tabId
      logger.info('打开示例页面...');
      const readResult = await chatClawOhMyBrowserService.read({
        url: 'https://example.com'
      });

      if (readResult?.tabId) {
        // 创建可访问性快照
        logger.info('创建可访问性快照...');
        const snapshotResult = await chatClawOhMyBrowserService.snapshot({
          tabId: readResult.tabId,
          format: 'markdown'
        });

        logger.info('可访问性快照创建成功');
        logger.info(`快照内容长度: ${snapshotResult?.content?.length || 0}`);
        if (snapshotResult?.content) {
          // 打印前 300 个字符
          logger.info('快照预览:', snapshotResult.content.substring(0, 300) + '...');
        }
      }

      // 断开连接
      chatClawOhMyBrowserService.disconnect();
    } catch (error) {
      logger.error('可访问性快照示例失败:', error);
      chatClawOhMyBrowserService.disconnect();
    }
  }

  /**
   * 示例 8: 错误处理
   */
  static async example8_ErrorHandling(): Promise<void> {
    logger.info('\n示例 8: 错误处理');

    try {
      // 测试未连接时的错误处理
      logger.info('测试未连接时的错误处理...');
      await chatClawOhMyBrowserService.search({ query: 'test' });
    } catch (error) {
      logger.info('预期的错误:', error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      // 测试无效参数的错误处理
      logger.info('测试无效参数的错误处理...');
      await chatClawOhMyBrowserService.read({ url: '' });
    } catch (error) {
      logger.info('预期的错误:', error instanceof Error ? error.message : 'Unknown error');
    }

    logger.info('错误处理示例完成');
  }

  /**
   * 示例配置
   */
  static getExampleConfig() {
    return {
      enabled: true,
      autoConnect: true,
      timeout: 30000,
      defaultSearchEngine: 'google',
      defaultFormat: 'markdown'
    };
  }
}

// 导出示例类
export const ohMyBrowserExample = new OhMyBrowserExample();
