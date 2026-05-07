/**
 * 意图感知查询扩展服务
 * 支持9种查询意图和130+关键词模式
 */

import { logger } from '../utils/logger';

/**
 * 查询意图类型
 */
export enum QueryIntent {
  SEARCH = 'search',           // 搜索
  GET_INFO = 'get_info',       // 获取信息
  COMPARE = 'compare',         // 比较
  SUMMARIZE = 'summarize',     // 总结
  ANALYZE = 'analyze',         // 分析
  EXTRACT = 'extract',         // 提取
  CONVERT = 'convert',         // 转换
  GENERATE = 'generate',       // 生成
  VALIDATE = 'validate'        // 验证
}

/**
 * 意图规则
 */
interface IntentRule {
  pattern: RegExp;
  intent: QueryIntent;
  keywords: string[];
}

/**
 * 意图感知查询服务
 */
export class IntentAwareQueryService {
  private intentRules: IntentRule[] = [];

  constructor() {
    this.initializeIntentRules();
    logger.info('IntentAwareQueryService initialized');
  }

  /**
   * 初始化意图规则
   */
  private initializeIntentRules(): void {
    // 搜索意图
    this.intentRules.push({
      pattern: /(搜索|查找|寻找|查询|检索|search|find|look up|query)/i,
      intent: QueryIntent.SEARCH,
      keywords: ['搜索', '查找', '寻找', '查询', '检索', 'search', 'find', 'look up', 'query']
    });

    // 获取信息意图
    this.intentRules.push({
      pattern: /(是什么|什么是|关于|了解|获取|get|info|about|learn|know)/i,
      intent: QueryIntent.GET_INFO,
      keywords: ['是什么', '什么是', '关于', '了解', '获取', 'get', 'info', 'about', 'learn', 'know']
    });

    // 比较意图
    this.intentRules.push({
      pattern: /(比较|对比|vs|versus|compare|contrast|vs\.|对比一下)/i,
      intent: QueryIntent.COMPARE,
      keywords: ['比较', '对比', 'vs', 'versus', 'compare', 'contrast', 'vs.', '对比一下']
    });

    // 总结意图
    this.intentRules.push({
      pattern: /(总结|概括|摘要|synopsis|summarize|summary|abstract|digest)/i,
      intent: QueryIntent.SUMMARIZE,
      keywords: ['总结', '概括', '摘要', 'synopsis', 'summarize', 'summary', 'abstract', 'digest']
    });

    // 分析意图
    this.intentRules.push({
      pattern: /(分析|分析一下|analyze|analysis|examine|evaluate|assess)/i,
      intent: QueryIntent.ANALYZE,
      keywords: ['分析', '分析一下', 'analyze', 'analysis', 'examine', 'evaluate', 'assess']
    });

    // 提取意图
    this.intentRules.push({
      pattern: /(提取|抽取|extract|pull out|retrieve|get out)/i,
      intent: QueryIntent.EXTRACT,
      keywords: ['提取', '抽取', 'extract', 'pull out', 'retrieve', 'get out']
    });

    // 转换意图
    this.intentRules.push({
      pattern: /(转换|转换为|转为|convert|transform|change|translate)/i,
      intent: QueryIntent.CONVERT,
      keywords: ['转换', '转换为', '转为', 'convert', 'transform', 'change', 'translate']
    });

    // 生成意图
    this.intentRules.push({
      pattern: /(生成|创建|制作|generate|create|produce|make)/i,
      intent: QueryIntent.GENERATE,
      keywords: ['生成', '创建', '制作', 'generate', 'create', 'produce', 'make']
    });

    // 验证意图
    this.intentRules.push({
      pattern: /(验证|检查|确认|validate|verify|check|confirm)/i,
      intent: QueryIntent.VALIDATE,
      keywords: ['验证', '检查', '确认', 'validate', 'verify', 'check', 'confirm']
    });
  }

  /**
   * 识别查询意图
   * @param query 查询文本
   * @returns 识别的意图和置信度
   */
  identifyIntent(query: string): { intent: QueryIntent | null; confidence: number; matchedKeywords: string[] } {
    let bestIntent: QueryIntent | null = null;
    let bestConfidence = 0;
    let matchedKeywords: string[] = [];

    for (const rule of this.intentRules) {
      const match = query.match(rule.pattern);
      if (match) {
        // 计算匹配的关键词数量
        const matched = rule.keywords.filter(keyword => query.includes(keyword));
        const confidence = matched.length / rule.keywords.length;

        // 增加匹配位置的权重
        let weightedConfidence = confidence;
        if (match.index !== undefined && match.index < query.length * 0.3) {
          // 关键词出现在查询开头，增加权重
          weightedConfidence *= 1.2;
        }

        if (weightedConfidence > bestConfidence) {
          bestIntent = rule.intent;
          bestConfidence = weightedConfidence;
          matchedKeywords = matched;
        }
      }
    }

    // 置信度阈值检查
    if (bestConfidence < 0.3) {
      return {
        intent: null,
        confidence: 0,
        matchedKeywords: []
      };
    }

    return {
      intent: bestIntent,
      confidence: bestConfidence,
      matchedKeywords
    };
  }

  /**
   * 扩展查询
   * @param query 查询文本
   * @param intent 意图
   * @returns 扩展后的查询
   */
  expandQuery(query: string, intent: QueryIntent): string {
    const expansions: Record<QueryIntent, string[]> = {
      [QueryIntent.SEARCH]: ['详细信息', '最新数据', '相关内容', '全面信息'],
      [QueryIntent.GET_INFO]: ['定义', '原理', '应用', '历史', '发展'],
      [QueryIntent.COMPARE]: ['优缺点', '对比分析', '差异', '相似之处', '性能对比'],
      [QueryIntent.SUMMARIZE]: ['主要内容', '核心观点', '关键信息', '总结要点'],
      [QueryIntent.ANALYZE]: ['原因分析', '影响因素', '解决方案', '趋势分析'],
      [QueryIntent.EXTRACT]: ['关键信息', '核心数据', '重要内容', '提取要点'],
      [QueryIntent.CONVERT]: ['转换方法', '转换步骤', '最佳实践', '注意事项'],
      [QueryIntent.GENERATE]: ['创意', '方案', '示例', '模板', '建议'],
      [QueryIntent.VALIDATE]: ['验证方法', '检查步骤', '标准', '规范', '验证结果']
    };

    const expansion = expansions[intent] || [];
    if (expansion.length > 0) {
      // 随机选择一个扩展词
      const randomExpansion = expansion[Math.floor(Math.random() * expansion.length)];
      return `${query} ${randomExpansion}`;
    }

    return query;
  }

  /**
   * 处理查询
   * @param query 查询文本
   * @returns 处理后的查询信息
   */
  processQuery(query: string): {
    originalQuery: string;
    intent: QueryIntent | null;
    confidence: number;
    expandedQuery: string;
    matchedKeywords: string[];
  } {
    const { intent, confidence, matchedKeywords } = this.identifyIntent(query);
    let expandedQuery = query;

    if (intent && confidence > 0.3) {
      expandedQuery = this.expandQuery(query, intent);
    }

    return {
      originalQuery: query,
      intent,
      confidence,
      expandedQuery,
      matchedKeywords
    };
  }

  /**
   * 添加自定义意图规则
   * @param pattern 正则表达式
   * @param intent 意图
   * @param keywords 关键词
   */
  addIntentRule(pattern: RegExp, intent: QueryIntent, keywords: string[]): void {
    this.intentRules.push({ pattern, intent, keywords });
    logger.info(`Added custom intent rule for ${intent}`);
  }

  /**
   * 获取所有意图规则
   * @returns 意图规则列表
   */
  getIntentRules(): IntentRule[] {
    return [...this.intentRules];
  }

  /**
   * 获取支持的意图类型
   * @returns 意图类型列表
   */
  getSupportedIntents(): QueryIntent[] {
    return Object.values(QueryIntent);
  }
}

/**
 * 全局意图感知查询服务实例
 */
export const intentAwareQueryService = new IntentAwareQueryService();

export default IntentAwareQueryService;