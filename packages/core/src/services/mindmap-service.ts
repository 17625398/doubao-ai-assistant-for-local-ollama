/**
 * 可视化思维导图生成服务
 * 集成Mermaid.js用于图形渲染，生成文档的三级思维导图
 */

import { logger } from '../utils/logger';
import { OutlineNode } from './structured-outline-service';

/**
 * 思维导图节点
 */
export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  children?: MindMapNode[];
  description?: string;
}

/**
 * 思维导图配置
 */
export interface MindMapConfig {
  maxDepth?: number;
  includeDescriptions?: boolean;
  direction?: 'TB' | 'BT' | 'LR' | 'RL'; // 方向：从上到下，从下到上，从左到右，从右到左
  theme?: 'default' | 'forest' | 'neutral' | 'dark';
  nodeShape?: string;
}

/**
 * 思维导图结果
 */
export interface MindMapResult {
  nodes: MindMapNode;
  mermaidCode: string;
  success: boolean;
  error?: string;
}

export class MindMapService {
  private defaultConfig: MindMapConfig = {
    maxDepth: 3,
    includeDescriptions: true,
    direction: 'TB',
    theme: 'default',
    nodeShape: 'rectangle'
  };

  constructor() {
    logger.info('MindMapService initialized');
  }

  /**
   * 从大纲生成思维导图
   * @param outline 大纲节点数组
   * @param config 思维导图配置
   * @returns 思维导图结果
   */
  generateFromOutline(
    outline: OutlineNode[],
    config?: MindMapConfig
  ): MindMapResult {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      
      // 将大纲转换为思维导图节点
      const root = this.convertOutlineToMindMap(outline, mergedConfig);
      
      // 生成Mermaid代码
      const mermaidCode = this.generateMermaidCode(root, mergedConfig);

      logger.info('Generated mind map from outline');

      return {
        nodes: root,
        mermaidCode,
        success: true
      };
    } catch (error) {
      logger.error('Failed to generate mind map from outline:', error);
      return {
        nodes: { id: 'root', label: '', level: 0 },
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 从文本生成思维导图
   * @param text 文档文本
   * @param config 思维导图配置
   * @returns 思维导图结果
   */
  generateFromText(
    text: string,
    config?: MindMapConfig
  ): MindMapResult {
    try {
      // 首先从文本中提取标题和关键内容
      const outline = this.extractOutlineFromText(text);
      return this.generateFromOutline(outline, config);
    } catch (error) {
      logger.error('Failed to generate mind map from text:', error);
      return {
        nodes: { id: 'root', label: '', level: 0 },
        mermaidCode: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 将大纲转换为思维导图节点
   * @param outline 大纲节点
   * @param config 配置
   * @returns 思维导图根节点
   */
  private convertOutlineToMindMap(
    outline: OutlineNode[],
    config: MindMapConfig
  ): MindMapNode {
    // 创建根节点
    const root: MindMapNode = {
      id: 'root',
      label: '思维导图',
      level: 0,
      children: []
    };

    // 递归转换大纲节点
    const traverse = (outlineNodes: OutlineNode[], parent: MindMapNode, currentLevel: number) => {
      if (currentLevel > (config.maxDepth || 3)) return;

      for (const node of outlineNodes) {
        const mindMapNode: MindMapNode = {
          id: node.id,
          label: this.sanitizeLabel(node.title),
          level: currentLevel,
          children: []
        };

        if (config.includeDescriptions && node.content) {
          mindMapNode.description = this.truncateText(node.content, 200);
        }

        if (parent.children) {
          parent.children.push(mindMapNode);
        }

        if (node.children && node.children.length > 0) {
          traverse(node.children, mindMapNode, currentLevel + 1);
        }
      }
    };

    traverse(outline, root, 1);
    return root;
  }

  /**
   * 从文本中提取简单大纲
   * @param text 文本
   * @returns 大纲节点数组
   */
  private extractOutlineFromText(text: string): OutlineNode[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const outline: OutlineNode[] = [];
    let nodeId = 0;

    // 查找标题和段落
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Markdown标题
      const markdownMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (markdownMatch) {
        outline.push({
          id: `node-${nodeId++}`,
          level: markdownMatch[1].length,
          title: markdownMatch[2].trim(),
          children: []
        });
      }
      // 空行后非空行作为潜在标题
      else if (i > 0 && lines[i - 1].trim() === '' && line.length > 0 && line.length < 100) {
        outline.push({
          id: `node-${nodeId++}`,
          level: 2,
          title: line,
          children: []
        });
      }
    }

    return outline;
  }

  /**
   * 生成Mermaid思维导图代码
   * @param root 根节点
   * @param config 配置
   * @returns Mermaid代码
   */
  private generateMermaidCode(root: MindMapNode, config: MindMapConfig): string {
    let code = `mindmap
  root((**${root.label}**))
`;

    // 主题设置
    if (config.theme && config.theme !== 'default') {
      code = `%%{init: {'theme': '${config.theme}'}}%%\n${code}`;
    }

    // 方向设置
    if (config.direction && config.direction !== 'TB') {
      code = code.replace('mindmap', `mindmap\n  direction ${config.direction}`);
    }

    // 递归生成节点
    const generateNodes = (node: MindMapNode, indent: string = '  ') => {
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const nodeShape = this.getNodeShape(config.nodeShape || 'rectangle', child.level);
          const label = child.description 
            ? `${child.label}\n${child.description}` 
            : child.label;
          
          code += `${indent}${nodeShape}(${label})\n`;
          
          if (child.children && child.children.length > 0) {
            generateNodes(child, indent + '  ');
          }
        }
      }
    };

    generateNodes(root);
    return code;
  }

  /**
   * 获取节点形状
   * @param shape 形状类型
   * @param level 层级
   * @returns Mermaid节点形状
   */
  private getNodeShape(shape: string, level: number): string {
    switch (level) {
      case 1:
        return '['; // 矩形
      case 2:
        return '('; // 圆角矩形
      case 3:
        return ')'; // 椭圆形
      default:
        return '[';
    }
  }

  /**
   * 清理标签文本，移除特殊字符
   * @param label 标签
   * @returns 清理后的标签
   */
  private sanitizeLabel(label: string): string {
    return label
      .replace(/[()\[\]]/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * 截断文本
   * @param text 文本
   * @param maxLength 最大长度
   * @returns 截断后的文本
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 将思维导图转换为JSON格式
   * @param root 根节点
   * @returns JSON字符串
   */
  mindMapToJson(root: MindMapNode): string {
    return JSON.stringify(root, null, 2);
  }
}

/**
 * 全局思维导图服务实例
 */
export const mindMapService = new MindMapService();

export default MindMapService;
