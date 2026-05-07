// 提示词模板库

import { logger } from './logger'
import { eventBus } from './event-bus'

/**
 * 提示词模板接口
 */
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  content: string
  variables: PromptVariable[]
  examples: PromptExample[]
  tags: string[]
  createdAt: number
  updatedAt: number
  version: number
  author: string
  rating: number
  usageCount: number
}

/**
 * 提示词变量接口
 */
export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'list'
  default?: unknown
  description: string
  required: boolean
  options?: string[]
}

/**
 * 提示词示例接口
 */
export interface PromptExample {
  id: string
  name: string
  input: Record<string, unknown>
  output: string
}

/**
 * 提示词版本接口
 */
export interface PromptVersion {
  id: string
  templateId: string
  content: string
  createdAt: number
  author: string
  description: string
}

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  TEMPLATES: 'prompt-templates',
  VERSIONS: 'prompt-versions',
} as const

/**
 * 提示词模板库
 */
export class PromptTemplateLibrary {
  private templates: Map<string, PromptTemplate>
  private versions: Map<string, PromptVersion[]>
  private readonly storageKey = STORAGE_KEYS.TEMPLATES
  private readonly versionStorageKey = STORAGE_KEYS.VERSIONS

  constructor() {
    this.templates = new Map()
    this.versions = new Map()
    this.loadFromStorage()
    this.initializeDefaultTemplates()
    logger.info('PromptTemplateLibrary initialized')
  }

  /**
   * 从存储加载模板
   */
  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedTemplates = localStorage.getItem(this.storageKey)
        if (storedTemplates) {
          const templates = JSON.parse(storedTemplates)
          templates.forEach((template: PromptTemplate) => {
            this.templates.set(template.id, template)
          })
        }

        const storedVersions = localStorage.getItem(this.versionStorageKey)
        if (storedVersions) {
          const versions = JSON.parse(storedVersions)
          versions.forEach((version: PromptVersion) => {
            if (!this.versions.has(version.templateId)) {
              this.versions.set(version.templateId, [])
            }
            this.versions.get(version.templateId)?.push(version)
          })
        }
      }
    } catch (error) {
      logger.error('Failed to load prompt templates from storage:', error);
    }
  }

  /**
   * 保存模板到存储
   */
  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const templates = Array.from(this.templates.values());
        localStorage.setItem(this.storageKey, JSON.stringify(templates));

        const versions: PromptVersion[] = [];
        this.versions.forEach((templateVersions) => {
          versions.push(...templateVersions);
        });
        localStorage.setItem(this.versionStorageKey, JSON.stringify(versions));
      }
    } catch (error) {
      logger.error('Failed to save prompt templates to storage:', error);
    }
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: 'summary',
        name: '文本摘要',
        description: '对给定文本生成简洁的摘要',
        category: '写作',
        content: '请对以下文本生成一个简洁的摘要，长度不超过200字：\n\n{{text}}',
        variables: [
          {
            name: 'text',
            type: 'string',
            description: '需要摘要的文本',
            required: true
          }
        ],
        examples: [
          {
            id: 'summary-1',
            name: '新闻摘要',
            input: {
              text: '北京时间10月1日，庆祝中华人民共和国成立75周年大会在北京天安门广场隆重举行。中共中央总书记、国家主席、中央军委主席习近平发表重要讲话并检阅受阅部队。大会开始前，习近平等党和国家领导人与各界代表一起观看了盛大的阅兵式和群众游行。这次大会是全面建设社会主义现代化国家、向第二个百年奋斗目标进军新征程上的一次重要盛会，充分展示了新中国成立75年来特别是新时代以来取得的历史性成就。'
            },
            output: '10月1日，庆祝中华人民共和国成立75周年大会在北京天安门广场隆重举行。习近平发表重要讲话并检阅受阅部队。大会展示了新中国成立75年来特别是新时代以来取得的历史性成就，是全面建设社会主义现代化国家、向第二个百年奋斗目标进军新征程上的重要盛会。'
          }
        ],
        tags: ['摘要', '文本处理', '写作'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        author: '系统',
        rating: 5,
        usageCount: 0
      },
      {
        id: 'translate',
        name: '文本翻译',
        description: '将文本翻译成指定语言',
        category: '翻译',
        content: '请将以下文本翻译成{{targetLanguage}}：\n\n{{text}}',
        variables: [
          {
            name: 'text',
            type: 'string',
            description: '需要翻译的文本',
            required: true
          },
          {
            name: 'targetLanguage',
            type: 'string',
            description: '目标语言',
            required: true,
            default: '英语',
            options: ['英语', '中文', '日语', '韩语', '法语', '德语', '西班牙语', '俄语']
          }
        ],
        examples: [
          {
            id: 'translate-1',
            name: '中译英',
            input: {
              text: '我爱中国',
              targetLanguage: '英语'
            },
            output: 'I love China'
          }
        ],
        tags: ['翻译', '语言'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        author: '系统',
        rating: 5,
        usageCount: 0
      },
      {
        id: 'code-review',
        name: '代码审查',
        description: '审查代码并提供改进建议',
        category: '开发',
        content: '请审查以下代码并提供改进建议：\n\n```{{language}}\n{{code}}\n```',
        variables: [
          {
            name: 'code',
            type: 'string',
            description: '需要审查的代码',
            required: true
          },
          {
            name: 'language',
            type: 'string',
            description: '代码语言',
            required: true,
            default: 'javascript',
            options: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust']
          }
        ],
        examples: [
          {
            id: 'code-review-1',
            name: 'JavaScript 代码审查',
            input: {
              code: 'function add(a, b) {\n  return a + b;\n}',
              language: 'javascript'
            },
            output: '代码功能正确，但可以添加类型注解和错误处理：\n\n```javascript\nfunction add(a: number, b: number): number {\n  if (typeof a !== \'number\' || typeof b !== \'number\') {\n    throw new Error(\'Both arguments must be numbers\');\n  }\n  return a + b;\n}\n```\n\n这样可以提高代码的可读性和健壮性。'
          }
        ],
        tags: ['代码审查', '编程', '开发'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        author: '系统',
        rating: 5,
        usageCount: 0
      },
      {
        id: 'data-analysis',
        name: '数据分析',
        description: '分析给定的数据并提供见解',
        category: '分析',
        content: '请分析以下数据并提供见解：\n\n{{data}}\n\n分析要求：\n1. 数据的基本统计信息\n2. 数据中的趋势和模式\n3. 数据中的异常值\n4. 基于数据的建议',
        variables: [
          {
            name: 'data',
            type: 'string',
            description: '需要分析的数据',
            required: true
          }
        ],
        examples: [
          {
            id: 'data-analysis-1',
            name: '销售数据分析',
            input: {
              data: '月份,销售额,客户数\n1月,10000,50\n2月,12000,60\n3月,8000,40\n4月,15000,75\n5月,9000,45\n6月,11000,55'
            },
            output: '### 数据分析结果\n\n**1. 基本统计信息**\n- 总销售额：65000\n- 平均月销售额：10833.33\n- 最高销售额：15000（4月）\n- 最低销售额：8000（3月）\n- 总客户数：325\n- 平均月客户数：54.17\n\n**2. 趋势和模式**\n- 销售额整体呈现波动上升趋势\n- 4月销售额最高，可能与季度末促销有关\n- 3月销售额最低，可能受季节性因素影响\n- 客户数与销售额基本正相关\n\n**3. 异常值**\n- 4月销售额显著高于其他月份，可能是异常值\n- 3月销售额显著低于其他月份，可能是异常值\n\n**4. 建议**\n- 分析4月销售增长的原因，复制成功经验\n- 分析3月销售下降的原因，采取措施避免类似情况\n- 加强客户关系管理，提高客户留存率\n- 考虑在销售低谷期（如3月）推出促销活动'
          }
        ],
        tags: ['数据分析', '统计', '趋势分析'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        author: '系统',
        rating: 5,
        usageCount: 0
      },
      {
        id: 'research-analysis',
        name: '研究分析',
        description: '分析研究文献并提供综述',
        category: '研究',
        content: '请分析以下研究文献并提供综述：\n\n{{literature}}\n\n分析要求：\n1. 文献的核心观点\n2. 研究方法和结果\n3. 研究的局限性\n4. 未来研究方向建议',
        variables: [
          {
            name: 'literature',
            type: 'string',
            description: '需要分析的研究文献',
            required: true
          }
        ],
        examples: [
          {
            id: 'research-analysis-1',
            name: 'AI伦理研究分析',
            input: {
              literature: '标题：人工智能伦理的挑战与应对策略\n作者：张三，李四\n摘要：本文探讨了人工智能发展带来的伦理挑战，包括隐私保护、算法偏见、就业影响等问题。研究采用文献综述和案例分析的方法，分析了当前AI伦理面临的主要挑战，并提出了相应的应对策略，包括建立伦理准则、加强监管、提高透明度等。研究发现，AI伦理问题需要多学科合作解决，需要技术、法律、伦理等多个领域的共同努力。'
            },
            output: '### 研究文献分析\n\n**1. 核心观点**\n- 人工智能发展带来了多方面的伦理挑战，包括隐私保护、算法偏见、就业影响等\n- AI伦理问题需要多学科合作解决，涉及技术、法律、伦理等多个领域\n- 建立伦理准则、加强监管、提高透明度是应对AI伦理挑战的重要策略\n\n**2. 研究方法和结果**\n- 研究采用文献综述和案例分析的方法\n- 分析了当前AI伦理面临的主要挑战\n- 提出了相应的应对策略\n- 强调了多学科合作的重要性\n\n**3. 研究局限性**\n- 研究主要基于文献综述和案例分析，缺乏实证研究\n- 对不同国家和文化背景下的AI伦理差异关注不足\n- 未深入探讨AI伦理问题的具体实施路径\n\n**4. 未来研究方向建议**\n- 开展跨文化的AI伦理比较研究\n- 进行AI伦理问题的实证研究，收集实际数据\n- 探索AI伦理准则的具体实施机制\n- 研究AI伦理教育的有效方法\n- 分析AI伦理与法律法规的协同作用'
          }
        ],
        tags: ['研究分析', '文献综述', '学术写作'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        author: '系统',
        rating: 5,
        usageCount: 0
      }
    ];

    defaultTemplates.forEach((template) => {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, template);
      }
    });

    this.saveToStorage();
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根据ID获取模板
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 根据类别获取模板
   */
  getTemplatesByCategory(category: string): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  /**
   * 根据标签获取模板
   */
  getTemplatesByTag(tag: string): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.tags.includes(tag));
  }

  /**
   * 搜索模板
   */
  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values()).filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 创建模板
   */
  createTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'usageCount' | 'rating'>): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      usageCount: 0,
      rating: 0
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.saveToStorage();
    eventBus.emit('prompt-template:created', newTemplate);
    return newTemplate;
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<PromptTemplate>): PromptTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) return undefined;

    const updatedTemplate: PromptTemplate = {
      ...template,
      ...updates,
      updatedAt: Date.now(),
      version: template.version + 1
    };

    this.templates.set(id, updatedTemplate);
    this.saveToStorage();
    eventBus.emit('prompt-template:updated', updatedTemplate);
    return updatedTemplate;
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const removed = this.templates.delete(id);
    if (removed) {
      this.versions.delete(id);
      this.saveToStorage();
      eventBus.emit('prompt-template:deleted', id);
    }
    return removed;
  }

  /**
   * 增加模板使用次数
   */
  incrementUsageCount(id: string): void {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount++;
      this.saveToStorage();
    }
  }

  /**
   * 给模板评分
   */
  rateTemplate(id: string, rating: number): void {
    const template = this.templates.get(id);
    if (template) {
      template.rating = rating;
      this.saveToStorage();
      eventBus.emit('prompt-template:rated', { id, rating });
    }
  }

  /**
   * 生成提示词
   */
  generatePrompt(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // 验证必填变量
    const missingVariables = template.variables
      .filter(variable => variable.required)
      .filter(variable => !(variable.name in variables));

    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.map(v => v.name).join(', ')}`);
    }

    // 替换变量
    let prompt = template.content;
    template.variables.forEach(variable => {
      const value = variables[variable.name] || variable.default || '';
      prompt = prompt.replace(new RegExp(`\{\{${variable.name}\}\}`, 'g'), String(value));
    });

    // 增加使用次数
    this.incrementUsageCount(templateId);

    return prompt;
  }

  /**
   * 创建模板版本
   */
  createVersion(templateId: string, content: string, author: string, description: string): PromptVersion {
    const version: PromptVersion = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      content,
      createdAt: Date.now(),
      author,
      description
    };

    if (!this.versions.has(templateId)) {
      this.versions.set(templateId, []);
    }
    this.versions.get(templateId)?.push(version);
    this.saveToStorage();
    eventBus.emit('prompt-version:created', version);
    return version;
  }

  /**
   * 获取模板的所有版本
   */
  getVersions(templateId: string): PromptVersion[] {
    return this.versions.get(templateId) || [];
  }

  /**
   * 获取模板的最新版本
   */
  getLatestVersion(templateId: string): PromptVersion | undefined {
    const versions = this.versions.get(templateId);
    if (!versions || versions.length === 0) return undefined;
    return versions.sort((a, b) => b.createdAt - a.createdAt)[0];
  }

  /**
   * 导出模板
   */
  exportTemplate(id: string): string {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }
    return JSON.stringify(template, null, 2);
  }

  /**
   * 导入模板
   */
  importTemplate(templateJson: string): PromptTemplate {
    try {
      const template = JSON.parse(templateJson) as PromptTemplate;
      const newTemplate: PromptTemplate = {
        ...template,
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0
      };
      this.templates.set(newTemplate.id, newTemplate);
      this.saveToStorage();
      eventBus.emit('prompt-template:imported', newTemplate);
      return newTemplate;
    } catch (error) {
      throw new Error('Invalid template JSON');
    }
  }

  /**
   * 批量导入模板
   */
  importTemplates(templatesJson: string): PromptTemplate[] {
    try {
      const templates = JSON.parse(templatesJson) as PromptTemplate[];
      const importedTemplates: PromptTemplate[] = [];
      templates.forEach(template => {
        const newTemplate: PromptTemplate = {
          ...template,
          id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0
        };
        this.templates.set(newTemplate.id, newTemplate);
        importedTemplates.push(newTemplate);
      });
      this.saveToStorage();
      eventBus.emit('prompt-template:batch-imported', importedTemplates);
      return importedTemplates;
    } catch (error) {
      throw new Error('Invalid templates JSON');
    }
  }

  /**
   * 导出所有模板
   */
  exportAllTemplates(): string {
    const templates = Array.from(this.templates.values());
    return JSON.stringify(templates, null, 2);
  }

  /**
   * 清空所有模板
   */
  clearAllTemplates(): void {
    this.templates.clear();
    this.versions.clear();
    this.saveToStorage();
    eventBus.emit('prompt-template:cleared', {});
  }
}

/**
 * 全局提示词模板库实例
 */
export const promptTemplateLibrary = new PromptTemplateLibrary();

export default PromptTemplateLibrary;