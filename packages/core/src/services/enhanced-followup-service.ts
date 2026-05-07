/**
 * 增强追问服务 (Enhanced Follow-up Service)
 * 为 AI 对话提供智能、多维度、上下文感知的追问能力
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

// ============================================
// 类型定义
// ============================================

export interface FollowUpContext {
  conversationId?: string;
  messageId?: string;
  userIntent?: string;
  assistantResponse?: string;
  keyEntities?: string[];        // 识别的实体（人名、机构、技术名词等）
  keyTopics?: string[];          // 关键话题
  detectedQuestions?: string[];  // 检测到的问题
  sentiment?: 'positive' | 'neutral' | 'negative';
  complexity?: 'simple' | 'moderate' | 'complex';
  hasLinks?: boolean;            // 是否包含链接
  hasCode?: boolean;            // 是否包含代码
  hasNumbers?: boolean;         // 是否包含数据
}

export interface FollowUpOption {
  id: string;
  label: string;                // 显示标签
  prompt: string;                // 实际发送给 AI 的 prompt
  category: FollowUpCategory;    // 分类
  priority: number;              // 优先级 (1-10, 越高越优先)
  reasoning?: string;            // 为什么推荐这个追问
  contextRelevance?: number;     // 上下文相关性 (0-1)
}

export type FollowUpCategory =
  | 'understand'      // 理解类：展开、解释
  | 'action'         // 行动类：执行、操作
  | 'expand'         // 扩展类：深入、相关
  | 'refine'         // 优化类：改写、精简
  | 'verify'         // 验证类：确认、核实
  | 'explore'        // 探索类：联想、拓展
  | 'analysis';      // 分析类：深入分析

export interface FollowUpConfig {
  maxSuggestions: number;        // 最大建议数
  enableContextual: boolean;      // 启用上下文感知
  enableLearning: boolean;       // 启用学习
  enableDiversity: boolean;      // 启用多样性
  categoryWeights: Partial<Record<FollowUpCategory, number>>;
}

// ============================================
// 追问模板库
// ============================================

const FOLLOW_UP_TEMPLATES: Record<FollowUpCategory, string[]> = {
  understand: [
    '详细解释一下这个',
    '能展开说说吗',
    '这个是怎么工作的',
    '具体是什么意思',
    '举个例子说明',
    '背后的原理是什么',
    '能更通俗地解释吗'
  ],
  action: [
    '帮我实际操作一下',
    '生成可以直接用的代码',
    '写出具体步骤',
    '创建一个示例',
    '执行这个方案',
    '输出可操作的清单',
    '给出具体的时间表'
  ],
  expand: [
    '还有哪些相关信息',
    '和这个相关的还有什么',
    '最新进展是什么',
    '有哪些替代方案',
    '有哪些优缺点',
    '还有什么需要注意的',
    '扩展讲讲这个话题'
  ],
  refine: [
    '能不能更简洁一点',
    '改成更专业的表达',
    '优化一下这个方案',
    '有没有更好的写法',
    '精简成要点',
    '改成适合汇报的格式',
    '整理成结构化的版本'
  ],
  verify: [
    '这个说法准确吗',
    '有什么依据吗',
    '数据来源是什么',
    '有哪些局限性',
    '风险点在哪里',
    '怎么验证这个结论',
    '有什么不确定性'
  ],
  explore: [
    '如果换个角度怎么看',
    '从另一个领域类比呢',
    '这对未来意味着什么',
    '和历史有什么联系',
    '有哪些有趣的发现',
    '有什么意想不到的结论',
    '这引发了什么新问题'
  ],
  analysis: [
    '深入分析背后的原因',
    '按逻辑链条展开',
    '找出关键影响因素',
    '从多个维度分析',
    '对比不同方案的优劣',
    '评估可行性和风险',
    '预测可能的结果'
  ]
};

// 意图特定的追问策略
const INTENT_STRATEGIES: Record<string, Partial<Record<FollowUpCategory, string[]>>> = {
  search: {
    understand: [
      '这些结果的置信度如何',
      '为什么这些排在前面',
      '搜索结果的质量怎么样'
    ],
    expand: [
      '搜索更多相关内容',
      '找找最新的研究进展',
      '对比不同来源的说法'
    ],
    verify: [
      '验证这些信息的准确性',
      '查找更权威的来源',
      '确认数据的时效性'
    ],
    action: [
      '整理成摘要报告',
      '生成对比表格',
      '提炼关键结论'
    ]
  },
  summary: {
    refine: [
      '再压缩成一句话',
      '改成电梯演讲风格',
      '提炼核心要点'
    ],
    expand: [
      '补充更多细节',
      '加入背景信息',
      '扩展到更多方面'
    ],
    action: [
      '生成可以直接用的版本',
      '改成适合 PPT 的格式',
      '输出待办清单'
    ]
  },
  analysis: {
    understand: [
      '根因分析详细讲讲',
      '为什么会这样',
      '背后的逻辑是什么'
    ],
    verify: [
      '这些分析有什么依据',
      '有什么反例吗',
      '结论的置信度多高'
    ],
    action: [
      '给出具体的解决方案',
      '按优先级排序',
      '制定行动计划'
    ]
  },
  writing: {
    refine: [
      '语气更正式一点',
      '改成口语化表达',
      '让文字更生动'
    ],
    expand: [
      '补充更多细节',
      '加一些例子',
      '扩展到更多方面'
    ],
    action: [
      '生成最终版本',
      '直接可以发送的版本',
      '添加格式和排版'
    ]
  },
  task: {
    action: [
      '今天就能执行的步骤',
      '生成待办清单',
      '设置提醒'
    ],
    expand: [
      '识别潜在风险',
      '列出依赖关系',
      '估算所需资源'
    ],
    refine: [
      '简化成最核心的',
      '优先级的依据是什么',
      '时间线合理吗'
    ]
  },
  code: {
    action: [
      '给出完整可运行的代码',
      '写出测试用例',
      '标注注意事项'
    ],
    understand: [
      '代码的执行流程',
      '核心算法原理',
      '为什么要这样设计'
    ],
    verify: [
      '有什么潜在 bug',
      '性能如何',
      '边界情况处理'
    ]
  },

  // 教育学习场景
  education: {
    understand: [
      '用简单的方式解释这个概念',
      '举一个生活中的例子',
      '这个知识点的重点是什么',
      '和其他相关概念有什么区别'
    ],
    expand: [
      '推荐一些学习资源',
      '这个领域还有哪些基础概念',
      '实际应用中如何体现',
      '有哪些常见的理解误区'
    ],
    action: [
      '出一道练习题',
      '创建一个学习计划',
      '生成记忆卡片',
      '整理知识图谱'
    ],
    verify: [
      '如何检验是否真正理解',
      '这个观点有争议吗',
      '学术界的主流观点是什么'
    ]
  },

  // 新闻资讯场景
  news: {
    understand: [
      '这件事的来龙去脉是什么',
      '关键人物有哪些',
      '事件的时间线是怎样的',
      '各方观点是什么'
    ],
    expand: [
      '这件事有什么深远影响',
      '类似的历史事件有哪些',
      '专家怎么解读',
      '普通人的反应如何'
    ],
    verify: [
      '消息来源可靠吗',
      '有什么被隐瞒的信息',
      '有哪些不同的声音',
      '后续发展如何跟踪'
    ],
    explore: [
      '从国际视角怎么看',
      '对行业有什么影响',
      '对普通人生活有何影响',
      '这件事揭示了什么趋势'
    ]
  },

  // 技术咨询场景
  tech: {
    understand: [
      '技术原理是什么',
      '适用场景有哪些',
      '和其他方案对比如何',
      '有什么优缺点'
    ],
    action: [
      '给出一个完整的实现方案',
      '推荐最佳实践',
      '生成配置示例',
      '写出部署步骤'
    ],
    expand: [
      '最新版本有哪些特性',
      '社区生态如何',
      '有哪些替代选项',
      '发展趋势是什么'
    ],
    verify: [
      '有什么已知的坑',
      '性能基准测试数据',
      '安全方面有什么考虑',
      '兼容性如何'
    ]
  },

  // 创意写作场景
  creative: {
    expand: [
      '添加更多细节描写',
      '设计更多角色',
      '扩展世界观设定',
      '加入冲突和转折'
    ],
    refine: [
      '让语言更生动',
      '加强情感表达',
      '优化叙事节奏',
      '统一写作风格'
    ],
    action: [
      '生成完整版本',
      '写出大纲结构',
      '创建角色设定表',
      '生成不同风格的版本'
    ],
    explore: [
      '换个故事类型会怎样',
      '从另一个视角写',
      '加入新的主题元素',
      '探索故事的多种可能'
    ]
  },

  // 健康医疗场景
  health: {
    understand: [
      '这个症状是什么原因',
      '需要注意什么',
      '如何判断严重程度',
      '和哪些疾病需要区分'
    ],
    expand: [
      '有哪些治疗方法',
      '生活上需要注意什么',
      '如何预防',
      '康复周期多长'
    ],
    verify: [
      '这些建议有科学依据吗',
      '需要做什么检查',
      '什么时候必须就医',
      '有哪些误区需要避免'
    ],
    action: [
      '制定一个健康管理计划',
      '整理用药注意事项',
      '生成就医清单',
      '设计康复方案'
    ]
  },

  // 金融投资场景
  finance: {
    understand: [
      '投资逻辑是什么',
      '风险点在哪里',
      '收益预期如何',
      '适合什么样的投资者'
    ],
    expand: [
      '宏观环境影响如何',
      '行业前景怎样',
      '竞争对手对比',
      '历史表现数据'
    ],
    verify: [
      '数据来源可靠吗',
      '有哪些潜在风险',
      '分析师观点如何',
      '有什么被忽视的因素'
    ],
    action: [
      '制定投资计划',
      '进行资产配置',
      '设置止损策略',
      '跟踪监控方案'
    ]
  },

  // 法律咨询场景
  legal: {
    understand: [
      '法律依据是什么',
      '适用法律条款',
      '法律后果如何',
      '举证责任怎么分配'
    ],
    expand: [
      '类似案例判例',
      '司法实践中的差异',
      '相关法规解释',
      '专业人士观点'
    ],
    verify: [
      '这个解读准确吗',
      '有什么争议点',
      '时效性如何',
      '地域差异存在吗'
    ],
    action: [
      '起草法律文书',
      '整理证据清单',
      '制定应诉策略',
      '推荐专业律师'
    ]
  },

  // 旅行规划场景
  travel: {
    expand: [
      '推荐更多景点',
      '当地特色美食',
      '文化体验活动',
      '实用的旅行贴士'
    ],
    action: [
      '生成详细行程表',
      '制作预算清单',
      '准备行李清单',
      '预订建议和时间'
    ],
    understand: [
      '最佳出行季节',
      '交通怎么安排',
      '签证怎么办理',
      '当地习俗禁忌'
    ],
    verify: [
      '信息时效性如何',
      '网友真实评价',
      '安全隐患提醒',
      '性价比分析'
    ]
  },

  // 美食烹饪场景
  cooking: {
    action: [
      '给出详细步骤',
      '推荐替代食材',
      '调整份量配方',
      '准备食材清单'
    ],
    expand: [
      '搭配什么饮品',
      '其他相关菜谱',
      '摆盘建议',
      '营养信息'
    ],
    understand: [
      '烹饪技巧要点',
      '火候控制方法',
      '食材处理技巧',
      '调味原则'
    ],
    verify: [
      '这个做法正宗吗',
      '有什么注意点',
      '常见失败原因',
      '如何改进'
    ]
  }
};

// ============================================
// 增强追问服务
// ============================================

export class EnhancedFollowUpService {
  private static instance: EnhancedFollowUpService;
  private config: FollowUpConfig;
  private history: Map<string, FollowUpHistoryRecord> = new Map();
  private userPreferences: Map<string, FollowUpPreference> = new Map();

  private constructor() {
    this.config = {
      maxSuggestions: 4,
      enableContextual: true,
      enableLearning: true,
      enableDiversity: true,
      categoryWeights: {
        understand: 1.0,
        expand: 1.0,
        action: 1.2,
        verify: 0.9,
        refine: 0.8,
        explore: 0.7
      }
    };

    logger.info('[EnhancedFollowUpService] Initialized');
  }

  static getInstance(): EnhancedFollowUpService {
    if (!EnhancedFollowUpService.instance) {
      EnhancedFollowUpService.instance = new EnhancedFollowUpService();
    }
    return EnhancedFollowUpService.instance;
  }

  // ============================================
  // 公开方法
  // ============================================

  /**
   * 生成追问建议
   */
  generateFollowUps(context: FollowUpContext): FollowUpOption[] {
    const suggestions: FollowUpOption[] = [];

    // 1. 基于上下文内容生成
    if (this.config.enableContextual && context.assistantResponse) {
      suggestions.push(...this.generateContextualFollowUps(context));
    }

    // 2. 基于用户意图生成
    if (context.userIntent) {
      suggestions.push(...this.generateIntentBasedFollowUps(context));
    }

    // 3. 添加通用追问
    suggestions.push(...this.generateGeneralFollowUps(context));

    // 4. 基于实体和话题生成
    if (context.keyEntities?.length || context.keyTopics?.length) {
      suggestions.push(...this.generateEntityBasedFollowUps(context));
    }

    // 5. 去重和排序
    const deduplicated = this.deduplicateAndSort(suggestions);

    // 6. 应用多样性
    if (this.config.enableDiversity) {
      return this.ensureDiversity(deduplicated).slice(0, this.config.maxSuggestions);
    }

    return deduplicated.slice(0, this.config.maxSuggestions);
  }

  /**
   * 记录追问选择
   */
  recordSelection(conversationId: string, followUpId: string, prompt: string): void {
    if (!this.config.enableLearning) return;

    const entry: FollowUpHistoryEntry = {
      timestamp: Date.now(),
      followUpId,
      prompt,
      selected: true
    };

    // 更新历史
    const history = this.history.get(conversationId) || { entries: [] };
    history.entries.push(entry);
    history.entries = history.entries.slice(-50); // 保留最近 50 条
    this.history.set(conversationId, history);

    // 推断偏好
    this.inferPreferences(conversationId);

    eventBus.emit('followup:selected', { conversationId, followUpId, prompt });
    logger.debug(`[EnhancedFollowUpService] Recorded selection: ${followUpId}`);
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences(userId: string): FollowUpPreference | undefined {
    return this.userPreferences.get(userId);
  }

  /**
   * 更新配置
   */
  updateConfig(partial: Partial<FollowUpConfig>): void {
    this.config = { ...this.config, ...partial };
    logger.info('[EnhancedFollowUpService] Config updated');
  }

  // ============================================
  // 私有方法 - 上下文感知追问
  // ============================================

  private generateContextualFollowUps(context: FollowUpContext): FollowUpOption[] {
    const suggestions: FollowUpOption[] = [];
    const response = context.assistantResponse || '';

    // 检测是否包含代码
    if (context.hasCode || /```[\s\S]*?```/.test(response)) {
      suggestions.push({
        id: 'ctx-code-run',
        label: '执行并验证代码',
        prompt: '帮我执行这段代码并验证结果',
        category: 'action',
        priority: 8,
        reasoning: '检测到代码内容'
      });
    }

    // 检测是否包含数据
    if (context.hasNumbers || /\d+/.test(response)) {
      suggestions.push({
        id: 'ctx-data-analysis',
        label: '分析这些数据',
        prompt: '对这些数据进行深入分析',
        category: 'analysis',
        priority: 7,
        reasoning: '检测到数值数据'
      });
    }

    // 检测是否包含链接
    if (context.hasLinks || /https?:\/\//.test(response)) {
      suggestions.push({
        id: 'ctx-link-read',
        label: '读取链接内容',
        prompt: '帮我访问并总结这些链接的内容',
        category: 'expand',
        priority: 6,
        reasoning: '检测到外部链接'
      });
    }

    // 检测长回答
    if (response.length > 500) {
      suggestions.push({
        id: 'ctx-summary',
        label: '总结关键要点',
        prompt: '把刚才的内容总结成几个关键要点',
        category: 'refine',
        priority: 7,
        reasoning: '回答较长，可提炼要点'
      });
    }

    // 检测多要点
    const bulletPoints = response.match(/^[\s]*[-*•]\s/gm);
    if (bulletPoints && bulletPoints.length > 3) {
      suggestions.push({
        id: 'ctx-expand-point',
        label: '展开其中一个要点',
        prompt: '请详细展开其中一个要点',
        category: 'understand',
        priority: 6,
        reasoning: '检测到多个要点'
      });
    }

    return suggestions;
  }

  // ============================================
  // 私有方法 - 意图驱动追问
  // ============================================

  private generateIntentBasedFollowUps(context: FollowUpContext): FollowUpOption[] {
    const suggestions: FollowUpOption[] = [];
    const intent = context.userIntent || 'general';
    const response = context.assistantResponse || '';
    const normalizedIntent = intent.toLowerCase().replace(/\s+/g, '_');

    // 匹配意图策略
    const strategy = INTENT_STRATEGIES[normalizedIntent];

    if (strategy) {
      for (const [category, templates] of Object.entries(strategy)) {
        if (templates && Array.isArray(templates)) {
          templates.slice(0, 2).forEach((template, idx) => {
            suggestions.push({
              id: `intent-${category}-${idx}`,
              label: this.truncateLabel(template),
              prompt: template,
              category: category as FollowUpCategory,
              priority: (this.config.categoryWeights[category as FollowUpCategory] || 1) * 10,
              reasoning: `基于 ${intent} 意图`
            });
          });
        }
      }
    }

    // 针对代码检测的额外追问
    if (/(代码|代码片段|函数|方法)/.test(response)) {
      suggestions.push(...this.getCodeSpecificFollowUps());
    }

    // 针对技术术语的追问
    const techTerms = response.match(/\b(API|SDK|架构|协议|算法|模型)\b/g);
    if (techTerms && techTerms.length > 0) {
      suggestions.push({
        id: 'intent-tech-detail',
        label: '技术细节展开',
        prompt: '详细解释这些技术概念',
        category: 'understand',
        priority: 7,
        reasoning: '检测到技术术语'
      });
    }

    return suggestions;
  }

  private getCodeSpecificFollowUps(): FollowUpOption[] {
    return [
      {
        id: 'code-run',
        label: '运行并验证',
        prompt: '帮我运行这段代码，看看有没有问题',
        category: 'action',
        priority: 9,
        reasoning: '代码相关操作'
      },
      {
        id: 'code-explain',
        label: '详细解释代码',
        prompt: '逐行解释这段代码的作用',
        category: 'understand',
        priority: 8,
        reasoning: '代码逻辑理解'
      },
      {
        id: 'code-test',
        label: '生成测试用例',
        prompt: '为这段代码生成测试用例',
        category: 'action',
        priority: 7,
        reasoning: '代码质量保障'
      }
    ];
  }

  // ============================================
  // 私有方法 - 通用追问
  // ============================================

  private generateGeneralFollowUps(context: FollowUpContext): FollowUpOption[] {
    const suggestions: FollowUpOption[] = [];
    const { keyEntities, keyTopics } = context;

    // 基于识别的实体生成
    if (keyEntities && keyEntities.length > 0) {
      const entity = keyEntities[0];
      suggestions.push({
        id: 'entity-expand',
        label: `关于 "${this.truncateLabel(entity)}" 的更多信息`,
        prompt: `关于 ${entity}，还有什么我应该知道的？`,
        category: 'expand',
        priority: 8,
        reasoning: '基于识别的实体'
      });
    }

    // 基于话题生成
    if (keyTopics && keyTopics.length > 0) {
      const topic = keyTopics[0];
      suggestions.push({
        id: 'topic-explore',
        label: `探索 "${this.truncateLabel(topic)}" 相关话题`,
        prompt: `给我讲讲 ${topic} 的更多内容`,
        category: 'explore',
        priority: 7,
        reasoning: '基于关键话题'
      });
    }

    // 通用理解类追问
    const understandTemplates = FOLLOW_UP_TEMPLATES.understand.slice(0, 2);
    understandTemplates.forEach((template, idx) => {
      suggestions.push({
        id: `general-understand-${idx}`,
        label: this.truncateLabel(template),
        prompt: template,
        category: 'understand',
        priority: 5 + idx,
        reasoning: '通用理解需求'
      });
    });

    // 通用行动类追问
    const actionTemplates = FOLLOW_UP_TEMPLATES.action.slice(0, 1);
    actionTemplates.forEach((template, idx) => {
      suggestions.push({
        id: `general-action-${idx}`,
        label: this.truncateLabel(template),
        prompt: template,
        category: 'action',
        priority: 6,
        reasoning: '通用行动需求'
      });
    });

    return suggestions;
  }

  // ============================================
  // 私有方法 - 实体/话题驱动追问
  // ============================================

  private generateEntityBasedFollowUps(context: FollowUpContext): FollowUpOption[] {
    const suggestions: FollowUpOption[] = [];
    const { keyEntities = [], keyTopics = [], assistantResponse = '' } = context;

    // 实体深度探索
    keyEntities.slice(0, 2).forEach((entity, idx) => {
      suggestions.push({
        id: `entity-deep-${idx}`,
        label: `深入了解 ${this.truncateLabel(entity)}`,
        prompt: `请深入介绍一下 ${entity}，包括其特点、历史、最新发展等`,
        category: 'expand',
        priority: 8 - idx,
        reasoning: '实体深度探索'
      });
    });

    // 话题关联探索
    keyTopics.slice(0, 2).forEach((topic, idx) => {
      suggestions.push({
        id: `topic-related-${idx}`,
        label: `${this.truncateLabel(topic)} 相关话题`,
        prompt: `除了 ${topic}，还有哪些与之相关的重要话题？`,
        category: 'explore',
        priority: 7 - idx,
        reasoning: '话题关联探索'
      });
    });

    // 检测到的人名
    const personNames = assistantResponse.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g);
    if (personNames && personNames.length > 0) {
      suggestions.push({
        id: 'person-background',
        label: `了解 ${personNames[0]}`,
        prompt: `给我介绍一下 ${personNames[0]} 的背景和成就`,
        category: 'expand',
        priority: 7,
        reasoning: '检测到人物'
      });
    }

    // 检测到的组织
    const organizations = assistantResponse.match(/[A-Z][a-z]+ (公司|集团|组织|机构|大学)/g);
    if (organizations && organizations.length > 0) {
      suggestions.push({
        id: 'org-info',
        label: `${organizations[0]} 详情`,
        prompt: `详细介绍 ${organizations[0]}`,
        category: 'expand',
        priority: 6,
        reasoning: '检测到组织'
      });
    }

    return suggestions;
  }

  // ============================================
  // 私有方法 - 去重和排序
  // ============================================

  private deduplicateAndSort(suggestions: FollowUpOption[]): FollowUpOption[] {
    // 按优先级和相关性排序
    const sorted = suggestions.sort((a, b) => {
      const scoreA = (a.priority * 0.6) + ((a.contextRelevance || 0.5) * 0.4) * 10;
      const scoreB = (b.priority * 0.6) + ((b.contextRelevance || 0.5) * 0.4) * 10;
      return scoreB - scoreA;
    });

    // 语义去重（相似prompt只保留一个）
    const seen = new Set<string>();
    return sorted.filter(suggestion => {
      const normalized = suggestion.prompt.toLowerCase().trim();
      // 简单去重：如果prompt前30个字符相同，认为是重复
      const key = normalized.slice(0, 30);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // ============================================
  // 私有方法 - 多样性保证
  // ============================================

  private ensureDiversity(suggestions: FollowUpOption[]): FollowUpOption[] {
    const byCategory = new Map<FollowUpCategory, FollowUpOption[]>();

    // 按类别分组
    for (const suggestion of suggestions) {
      const existing = byCategory.get(suggestion.category) || [];
      existing.push(suggestion);
      byCategory.set(suggestion.category, existing);
    }

    // 从每个类别中选取最佳建议
    const diverse: FollowUpOption[] = [];
    const categories = Array.from(byCategory.keys());

    for (const category of categories) {
      const categorySuggestions = byCategory.get(category) || [];
      if (categorySuggestions.length > 0) {
        diverse.push(categorySuggestions[0]);
      }
    }

    // 如果还不够，添加剩余的高优先级建议
    const selectedIds = new Set(diverse.map(d => d.id));
    for (const suggestion of suggestions) {
      if (!selectedIds.has(suggestion.id) && diverse.length < this.config.maxSuggestions * 1.5) {
        diverse.push(suggestion);
        selectedIds.add(suggestion.id);
      }
    }

    return diverse;
  }

  // ============================================
  // 私有方法 - 学习用户偏好
  // ============================================

  private inferPreferences(conversationId: string): void {
    const history = this.history.get(conversationId);
    if (!history || history.entries.length < 3) return;

    const recentEntries = history.entries.slice(-10);
    const categoryCount: Record<string, number> = {};

    for (const entry of recentEntries) {
      // 从 prompt 推断类别
      for (const [category, templates] of Object.entries(FOLLOW_UP_TEMPLATES)) {
        for (const template of templates) {
          if (entry.prompt.includes(template.slice(0, 10))) {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
            break;
          }
        }
      }
    }

    // 更新权重
    const total = Object.values(categoryCount).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const [category, count] of Object.entries(categoryCount)) {
        this.config.categoryWeights[category as FollowUpCategory] =
          1 + (count / total) * 0.5;
      }
    }
  }

  // ============================================
  // 工具方法
  // ============================================

  private truncateLabel(text: string, maxLength: number = 18): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
  }
}

// ============================================
// 历史记录类型
// ============================================

interface FollowUpHistoryEntry {
  timestamp: number;
  followUpId: string;
  prompt: string;
  selected: boolean;
}

interface FollowUpHistoryRecord {
  entries: FollowUpHistoryEntry[];
}

interface FollowUpPreference {
  preferredCategories: FollowUpCategory[];
  frequentEntities: string[];
  lastUpdated: number;
}

// ============================================
// 导出单例
// ============================================

export const enhancedFollowUpService = EnhancedFollowUpService.getInstance();

export default EnhancedFollowUpService;
