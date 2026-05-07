import { v4 as uuidv4 } from 'uuid';
import { safeLocalStorage } from './storage-helper';

// 词汇表术语接口
export interface GlossaryTerm {
  id: string; // 唯一标识符
  term: string; // 术语
  description: string; // 描述
  synonyms: string[]; // 同义词列表
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 词汇表管理接口
export interface GlossaryManager {
  // 创建术语
  create(term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>): Promise<GlossaryTerm>;
  
  // 更新术语
  update(id: string, term: Partial<GlossaryTerm>): Promise<GlossaryTerm>;
  
  // 删除术语
  delete(id: string): Promise<void>;
  
  // 获取术语
  get(id: string): Promise<GlossaryTerm>;
  
  // 获取所有术语
  getAll(): Promise<GlossaryTerm[]>;
  
  // 匹配术语
  match(input: string): Promise<GlossaryTerm[]>;
}

// 词汇表管理器实现
export class GlossaryManagerImpl implements GlossaryManager {
  private terms: Map<string, GlossaryTerm> = new Map();
  private storageKey = 'glossary-manager-terms';

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // 初始化范例数据
  private initializeSampleData(): void {
    const initializedKey = 'glossary-manager-initialized';
    const isInitialized = safeLocalStorage.getItem(initializedKey);
    
    if (!isInitialized) {
      const now = new Date();
      const sampleTerms = [
        {
          id: uuidv4(),
          term: 'AI智能分析',
          description: '利用人工智能技术对数据进行自动分析和洞察的过程，包括机器学习、自然语言处理等技术。',
          synonyms: ['智能分析', 'AI分析', '人工智能分析'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '上下文工程',
          description: '通过精心设计的提示、规则和模板来引导AI模型生成高质量响应的实践和方法。',
          synonyms: ['提示工程', 'prompt engineering', '上下文管理'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '多轮对话',
          description: 'AI系统与用户之间进行多轮交互的对话模式，系统能够记住和引用之前的对话内容。',
          synonyms: ['连续对话', '会话管理', '对话上下文'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '预批准响应',
          description: '预先定义和审核的标准回复模板，用于快速响应常见问题或特定场景。',
          synonyms: ['标准回复', '模板回复', '预设响应'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '行为规则',
          description: '定义AI系统在特定条件下应该如何响应的规则集合，包括触发条件和执行动作。',
          synonyms: ['响应规则', '行为准则', '智能规则'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '工具集成',
          description: '将外部工具和功能集成到AI系统中，扩展AI的能力范围，如数据查询、文件处理等。',
          synonyms: ['功能扩展', '插件系统', '工具调用'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '领域词汇',
          description: '特定行业或领域中使用的专业术语和词汇表，帮助AI更准确地理解和使用专业语言。',
          synonyms: ['专业术语', '行业词汇', '术语库'],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          term: '组合模式',
          description: '定义多个规则如何共同作用的模式，包括流体模式（灵活组合）和严格模式（精确匹配）。',
          synonyms: ['规则组合', '集成模式', '执行策略'],
          createdAt: now,
          updatedAt: now
        }
      ];

      sampleTerms.forEach(term => {
        this.terms.set(term.id, term);
      });

      this.saveToStorage();
      safeLocalStorage.setItem(initializedKey, 'true');
    }
  }

  // 从存储加载术语
  private loadFromStorage(): void {
    try {
      const stored = safeLocalStorage.getItem(this.storageKey);
      if (stored) {
        const terms = JSON.parse(stored);
        terms.forEach((term: GlossaryTerm) => {
          // 转换日期字符串为Date对象
          term.createdAt = new Date(term.createdAt);
          term.updatedAt = new Date(term.updatedAt);
          this.terms.set(term.id, term);
        });
      }
    } catch (error) {
      console.error('Failed to load glossary terms from storage:', error);
    }
  }

  // 保存术语到存储
  private saveToStorage(): void {
    try {
      const terms = Array.from(this.terms.values());
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(terms));
    } catch (error) {
      console.error('Failed to save glossary terms to storage:', error);
    }
  }

  // 创建术语
  async create(term: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>): Promise<GlossaryTerm> {
    const now = new Date();
    const newTerm: GlossaryTerm = {
      ...term,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    this.terms.set(newTerm.id, newTerm);
    this.saveToStorage();
    return newTerm;
  }

  // 更新术语
  async update(id: string, term: Partial<GlossaryTerm>): Promise<GlossaryTerm> {
    const existing = this.terms.get(id);
    if (!existing) {
      throw new Error(`Glossary term with id ${id} not found`);
    }

    const updated: GlossaryTerm = {
      ...existing,
      ...term,
      updatedAt: new Date()
    };

    this.terms.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // 删除术语
  async delete(id: string): Promise<void> {
    if (!this.terms.has(id)) {
      throw new Error(`Glossary term with id ${id} not found`);
    }

    this.terms.delete(id);
    this.saveToStorage();
  }

  // 获取术语
  async get(id: string): Promise<GlossaryTerm> {
    const term = this.terms.get(id);
    if (!term) {
      throw new Error(`Glossary term with id ${id} not found`);
    }
    return term;
  }

  // 获取所有术语
  async getAll(): Promise<GlossaryTerm[]> {
    return Array.from(this.terms.values());
  }

  // 匹配术语
  async match(input: string): Promise<GlossaryTerm[]> {
    const matched: GlossaryTerm[] = [];
    const lowerInput = input.toLowerCase();

    for (const term of this.terms.values()) {
      if (this.evaluateMatch(term, lowerInput)) {
        matched.push(term);
      }
    }

    return matched;
  }

  // 评估术语匹配
  private evaluateMatch(term: GlossaryTerm, lowerInput: string): boolean {
    try {
      // 检查术语本身
      if (lowerInput.includes(term.term.toLowerCase())) {
        return true;
      }

      // 检查同义词
      if (term.synonyms) {
        return term.synonyms.some(synonym => {
          return lowerInput.includes(synonym.toLowerCase());
        });
      }

      return false;
    } catch (error) {
      console.error('Error evaluating glossary term match:', error);
      return false;
    }
  }
}

// 创建单例实例
let glossaryManagerInstance: GlossaryManagerImpl | null = null;

export function getGlossaryManager(): GlossaryManager {
  if (!glossaryManagerInstance) {
    glossaryManagerInstance = new GlossaryManagerImpl();
  }
  return glossaryManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const glossaryManager = getGlossaryManager();