/**
 * 结构化大纲生成服务
 * 生成文档的层次化大纲，提取关键论点和章节结构
 */

import { logger } from '../utils/logger';

/**
 * 大纲节点
 */
export interface OutlineNode {
  id: string;
  level: number;
  title: string;
  content?: string;
  children?: OutlineNode[];
  startLine?: number;
  endLine?: number;
}

/**
 * 大纲生成配置
 */
export interface OutlineConfig {
  maxDepth?: number;
  includeContent?: boolean;
  extractKeyPoints?: boolean;
  detectHeadings?: boolean;
  language?: string;
}

/**
 * 大纲生成结果
 */
export interface OutlineResult {
  outline: OutlineNode[];
  totalNodes: number;
  maxDepth: number;
  keyPoints?: string[];
  success: boolean;
  error?: string;
}

export class StructuredOutlineService {
  private defaultConfig: OutlineConfig = {
    maxDepth: 6,
    includeContent: true,
    extractKeyPoints: true,
    detectHeadings: true,
    language: 'auto'
  };

  constructor() {
    logger.info('StructuredOutlineService initialized');
  }

  /**
   * 生成文档大纲
   * @param text 文档文本
   * @param config 大纲配置
   * @returns 大纲结果
   */
  generateOutline(text: string, config?: OutlineConfig): OutlineResult {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const lines = text.split('\n');
      const outline: OutlineNode[] = [];
      const keyPoints: string[] = [];
      const nodeStack: OutlineNode[] = [];
      let currentLevel = 0;
      let nodeId = 0;

      // 处理每一行
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 检测标题
        const headingInfo = this.detectHeading(line, mergedConfig);
        if (headingInfo) {
          // 处理标题
          const node: OutlineNode = {
            id: `node-${nodeId++}`,
            level: headingInfo.level,
            title: headingInfo.title,
            children: [],
            startLine: i,
            endLine: i
          };

          // 管理节点栈
          while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= headingInfo.level) {
            nodeStack.pop();
          }

          if (nodeStack.length === 0) {
            outline.push(node);
          } else {
            const parent = nodeStack[nodeStack.length - 1];
            if (parent.children) {
              parent.children.push(node);
            }
          }

          nodeStack.push(node);
          currentLevel = headingInfo.level;
        } else if (nodeStack.length > 0 && mergedConfig.includeContent) {
          // 处理内容
          const currentNode = nodeStack[nodeStack.length - 1];
          if (currentNode.content) {
            currentNode.content += '\n' + line;
          } else {
            currentNode.content = line;
          }
          currentNode.endLine = i;
        }

        // 提取关键句
        if (mergedConfig.extractKeyPoints && this.isKeySentence(line)) {
          keyPoints.push(line);
        }
      }

      // 计算最大深度
      const maxDepth = this.calculateMaxDepth(outline);
      const totalNodes = this.countNodes(outline);

      logger.info(`Generated outline with ${totalNodes} nodes, max depth: ${maxDepth}`);

      return {
        outline,
        totalNodes,
        maxDepth,
        keyPoints: keyPoints.slice(0, 20), // 限制关键点数量
        success: true
      };
    } catch (error) {
      logger.error('Failed to generate outline:', error);
      return {
        outline: [],
        totalNodes: 0,
        maxDepth: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 检测标题
   * @param line 文本行
   * @param config 配置
   * @returns 标题信息
   */
  private detectHeading(line: string, config: OutlineConfig): { level: number; title: string } | null {
    if (!config.detectHeadings) return null;

    // Markdown标题 (#, ##, ###, 等)
    const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdownMatch) {
      return {
        level: markdownMatch[1].length,
        title: markdownMatch[2].trim()
      };
    }

    // 带编号的标题 (1., 2., 1.1., 等)
    const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/);
    if (numberedMatch) {
      const level = numberedMatch[1].split('.').filter(x => x).length;
      return {
        level: Math.min(level, config.maxDepth || 6),
        title: numberedMatch[2].trim()
      };
    }

    // 中文标题 (一、, 二、, 1.1, 等)
    const chineseMatch = line.match(/^([一二三四五六七八九十]+|[０-９]+|\d+)[、．\.]\s+(.+)$/);
    if (chineseMatch) {
      return {
        level: 1,
        title: chineseMatch[2].trim()
      };
    }

    // 全大写标题（较短的行）
    if (line.length <= 80 && line === line.toUpperCase() && line.length > 3) {
      return {
        level: 2,
        title: line
      };
    }

    return null;
  }

  /**
   * 判断是否为关键句
   * @param sentence 句子
   * @returns 是否为关键句
   */
  private isKeySentence(sentence: string): boolean {
    const keyIndicators = [
      '重要', '关键', '核心', '主要', '首先', '其次', '最后',
      '总之', '因此', '所以', '结论', '结果', '发现', '表明',
      'important', 'key', 'core', 'main', 'first', 'second', 'finally',
      'in conclusion', 'therefore', 'thus', 'result', 'find', 'show'
    ];

    return keyIndicators.some(indicator => 
      sentence.toLowerCase().includes(indicator.toLowerCase())
    ) && sentence.length > 20 && sentence.length < 500;
  }

  /**
   * 计算大纲的最大深度
   * @param outline 大纲
   * @returns 最大深度
   */
  private calculateMaxDepth(outline: OutlineNode[]): number {
    let maxDepth = 0;

    const traverse = (nodes: OutlineNode[], currentDepth: number) => {
      for (const node of nodes) {
        maxDepth = Math.max(maxDepth, currentDepth);
        if (node.children && node.children.length > 0) {
          traverse(node.children, currentDepth + 1);
        }
      }
    };

    traverse(outline, 1);
    return maxDepth;
  }

  /**
   * 计算节点总数
   * @param outline 大纲
   * @returns 节点总数
   */
  private countNodes(outline: OutlineNode[]): number {
    let count = 0;

    const traverse = (nodes: OutlineNode[]) => {
      for (const node of nodes) {
        count++;
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(outline);
    return count;
  }

  /**
   * 将大纲转换为文本格式
   * @param outline 大纲
   * @returns 文本格式的大纲
   */
  outlineToText(outline: OutlineNode[]): string {
    let result = '';

    const traverse = (nodes: OutlineNode[], indent: number = 0) => {
      for (const node of nodes) {
        const prefix = '  '.repeat(indent);
        result += `${prefix}${'#'.repeat(node.level)} ${node.title}\n`;
        if (node.content) {
          result += `${prefix}${node.content}\n`;
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, indent + 1);
        }
      }
    };

    traverse(outline);
    return result;
  }

  /**
   * 将大纲转换为JSON格式
   * @param outline 大纲
   * @returns JSON格式的大纲
   */
  outlineToJson(outline: OutlineNode[]): string {
    return JSON.stringify(outline, null, 2);
  }

  /**
   * 扁平化大纲
   * @param outline 大纲
   * @returns 扁平化的节点列表
   */
  flattenOutline(outline: OutlineNode[]): OutlineNode[] {
    const result: OutlineNode[] = [];

    const traverse = (nodes: OutlineNode[]) => {
      for (const node of nodes) {
        result.push({ ...node, children: undefined });
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(outline);
    return result;
  }
}

/**
 * 全局结构化大纲服务实例
 */
export const structuredOutlineService = new StructuredOutlineService();

export default StructuredOutlineService;
