// 提示词管理器

const STORAGE_KEY = 'doubao:prompts';

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 内置示例提示词
const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'default_1',
    title: '代码审查',
    content: '请审查以下代码，指出潜在的问题、安全漏洞和改进建议：\n\n',
    category: '开发',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'default_2',
    title: '文章总结',
    content: '请用简洁的语言总结以下文章的核心观点，不超过200字：\n\n',
    category: '写作',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'default_3',
    title: '翻译为中文',
    content: '请将以下内容翻译为中文，保持原文语气和格式：\n\n',
    category: '翻译',
    createdAt: 0,
    updatedAt: 0,
  },
];

export class PromptManager {
  private static instance: PromptManager;
  private memoryPrompts: Prompt[] | null = null;

  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  private load(): Prompt[] {
    if (typeof localStorage === 'undefined') {
      if (this.memoryPrompts) return this.memoryPrompts;
      return DEFAULT_PROMPTS.map(p => ({ ...p }));
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PROMPTS;
      const parsed = JSON.parse(raw) as Prompt[];
      return parsed.length > 0 ? parsed : DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  }

  private save(prompts: Prompt[]): void {
    if (typeof localStorage === 'undefined') {
      this.memoryPrompts = prompts;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch {
      // ignore
    }
  }

  getAll(): Prompt[] {
    return this.load();
  }

  getByCategory(category: string): Prompt[] {
    return this.load().filter(p => p.category === category);
  }

  search(keyword: string): Prompt[] {
    const kw = keyword.toLowerCase();
    return this.load().filter(
      p => p.title.toLowerCase().includes(kw) || p.content.toLowerCase().includes(kw)
    );
  }

  add(data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Prompt {
    const now = Date.now();
    const prompt: Prompt = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const all = this.load();
    all.push(prompt);
    this.save(all);
    return prompt;
  }

  update(id: string, data: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Prompt {
    const all = this.load();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Prompt ${id} not found`);
    const updated = { ...all[idx], ...data, updatedAt: Date.now() };
    all[idx] = updated;
    this.save(all);
    return updated;
  }

  delete(id: string): void {
    const all = this.load().filter(p => p.id !== id);
    this.save(all);
  }

  getCategories(): string[] {
    const cats = new Set(this.load().map(p => p.category));
    return Array.from(cats).sort();
  }
}

export const promptManager = PromptManager.getInstance();
