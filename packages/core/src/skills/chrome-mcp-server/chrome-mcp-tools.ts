import { ChromeMCPClient } from './chrome-mcp-client';

/**
 * Chrome MCP Server 工具封装
 * 提供对 Chrome MCP Server 工具的封装，方便在 Doubao 中使用
 */
export class ChromeMCPTools {
  private client: ChromeMCPClient;

  /**
   * 构造函数
   * @param client Chrome MCP Server 客户端
   */
  constructor(client: ChromeMCPClient) {
    this.client = client;
  }

  /**
   * 获取浏览器窗口和标签
   * @returns 浏览器窗口和标签列表
   */
  async getWindowsAndTabs(): Promise<any> {
    return this.client.executeTool('get_windows_and_tabs', {});
  }

  /**
   * 导航到 URL
   * @param url 目标 URL
   * @param options 选项
   * @returns 导航结果
   */
  async navigate(url: string, options?: {
    waitForLoad?: boolean;
    timeout?: number;
  }): Promise<any> {
    return this.client.executeTool('chrome_navigate', {
      url,
      ...options
    });
  }

  /**
   * 截取屏幕截图
   * @param options 选项
   * @returns 屏幕截图数据
   */
  async screenshot(options?: {
    fullPage?: boolean;
    selector?: string;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
  }): Promise<any> {
    return this.client.executeTool('chrome_screenshot', options || {});
  }

  /**
   * 模拟点击操作
   * @param selector 元素选择器
   * @param options 选项
   * @returns 点击结果
   */
  async click(selector: string, options?: {
    delay?: number;
    button?: 'left' | 'middle' | 'right';
  }): Promise<any> {
    return this.client.executeTool('chrome_click', {
      selector,
      ...options
    });
  }

  /**
   * 模拟键盘输入
   * @param text 输入文本
   * @param options 选项
   * @returns 输入结果
   */
  async type(text: string, options?: {
    delay?: number;
  }): Promise<any> {
    return this.client.executeTool('chrome_type', {
      text,
      ...options
    });
  }

  /**
   * 模拟页面滚动
   * @param options 选项
   * @returns 滚动结果
   */
  async scroll(options?: {
    direction?: 'up' | 'down' | 'left' | 'right';
    distance?: number;
    duration?: number;
  }): Promise<any> {
    return this.client.executeTool('chrome_scroll', options || {});
  }

  /**
   * 提取页面内容
   * @param options 选项
   * @returns 提取的内容
   */
  async extractContent(options?: {
    selector?: string;
    format?: 'text' | 'html';
  }): Promise<any> {
    return this.client.executeTool('extract_content', options || {});
  }

  /**
   * 语义搜索浏览器标签内容
   * @param query 搜索查询
   * @param options 选项
   * @returns 搜索结果
   */
  async semanticSearch(query: string, options?: {
    limit?: number;
    threshold?: number;
  }): Promise<any> {
    return this.client.executeTool('semantic_search', {
      query,
      ...options
    });
  }

  /**
   * 分析页面结构和内容
   * @param options 选项
   * @returns 分析结果
   */
  async analyzePage(options?: {
    depth?: number;
  }): Promise<any> {
    return this.client.executeTool('analyze_page', options || {});
  }

  /**
   * 获取页面元数据
   * @returns 页面元数据
   */
  async getPageMetadata(): Promise<any> {
    return this.client.executeTool('get_page_metadata', {});
  }

  /**
   * 获取书签列表
   * @param options 选项
   * @returns 书签列表
   */
  async getBookmarks(options?: {
    folder?: string;
  }): Promise<any> {
    return this.client.executeTool('get_bookmarks', options || {});
  }

  /**
   * 添加书签
   * @param url 书签 URL
   * @param title 书签标题
   * @param options 选项
   * @returns 添加结果
   */
  async addBookmark(url: string, title: string, options?: {
    folder?: string;
  }): Promise<any> {
    return this.client.executeTool('add_bookmark', {
      url,
      title,
      ...options
    });
  }

  /**
   * 获取浏览历史
   * @param options 选项
   * @returns 浏览历史
   */
  async getBrowsingHistory(options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    return this.client.executeTool('get_browsing_history', options || {});
  }

  /**
   * 监控网络请求
   * @param options 选项
   * @returns 监控结果
   */
  async monitorNetwork(options?: {
    patterns?: string[];
    duration?: number;
  }): Promise<any> {
    return this.client.executeTool('monitor_network', options || {});
  }

  /**
   * 拦截网络请求
   * @param options 选项
   * @returns 拦截结果
   */
  async interceptRequest(options?: {
    urlPattern?: string;
    method?: string;
  }): Promise<any> {
    return this.client.executeTool('intercept_request', options || {});
  }

  /**
   * 获取网络响应
   * @param options 选项
   * @returns 网络响应
   */
  async getNetworkResponses(options?: {
    limit?: number;
  }): Promise<any> {
    return this.client.executeTool('get_network_responses', options || {});
  }

  /**
   * 执行 JavaScript 脚本
   * @param script 脚本内容
   * @returns 脚本执行结果
   */
  async executeScript(script: string): Promise<any> {
    return this.client.executeTool('execute_script', {
      script
    });
  }

  /**
   * 获取 cookies
   * @param options 选项
   * @returns cookies 列表
   */
  async getCookies(options?: {
    url?: string;
    name?: string;
  }): Promise<any> {
    return this.client.executeTool('get_cookies', options || {});
  }

  /**
   * 设置 cookie
   * @param name cookie 名称
   * @param value cookie 值
   * @param options 选项
   * @returns 设置结果
   */
  async setCookie(name: string, value: string, options?: {
    url?: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
  }): Promise<any> {
    return this.client.executeTool('set_cookie', {
      name,
      value,
      ...options
    });
  }

  /**
   * 清除 cookies
   * @param options 选项
   * @returns 清除结果
   */
  async clearCookies(options?: {
    url?: string;
    name?: string;
  }): Promise<any> {
    return this.client.executeTool('clear_cookies', options || {});
  }

  /**
   * 获取工具列表
   * @returns 工具列表
   */
  async getTools(): Promise<any[]> {
    return this.client.getTools();
  }
}

/**
 * 创建 Chrome MCP Server 工具实例
 * @param client Chrome MCP Server 客户端
 * @returns Chrome MCP Server 工具实例
 */
export function createChromeMCPTools(client: ChromeMCPClient): ChromeMCPTools {
  return new ChromeMCPTools(client);
}
