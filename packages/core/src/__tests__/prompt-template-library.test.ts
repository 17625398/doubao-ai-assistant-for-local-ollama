import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { promptTemplateLibrary, PromptCategory, PromptSubcategory, PromptTemplate } from '../utils/prompt-template-library';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

// Mock indexedDB
vi.stubGlobal('indexedDB', {
  open: vi.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          getAll: vi.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: []
          })),
          clear: vi.fn(() => ({
            onsuccess: null,
            onerror: null
          })),
          put: vi.fn()
        })),
        oncomplete: null,
        onerror: null
      }))
    }
  }))
});

// 测试前清理
async function cleanup() {
  await promptTemplateLibrary.clearTemplates();
  await promptTemplateLibrary.resetToDefault();
}

describe('PromptTemplateLibrary', () => {
  beforeAll(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('分类体系', () => {
    it('获取所有分类', async () => {
      const categories = promptTemplateLibrary.getCategories();
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain(PromptCategory.DEVELOPMENT);
      expect(categories).toContain(PromptCategory.WRITING);
      expect(categories).toContain(PromptCategory.TRANSLATION);
    });

    it('获取所有子分类', async () => {
      const subcategories = await promptTemplateLibrary.getSubcategories();
      expect(subcategories).toBeInstanceOf(Array);
      expect(subcategories.length).toBeGreaterThan(0);
    });

    it('按分类获取子分类', async () => {
      const developmentSubcategories = await promptTemplateLibrary.getSubcategoriesByCategory(PromptCategory.DEVELOPMENT);
      expect(developmentSubcategories).toBeInstanceOf(Array);
      expect(developmentSubcategories.length).toBeGreaterThan(0);
      expect(developmentSubcategories).toContain(PromptSubcategory.DEVELOPMENT_CODE_REVIEW);
    });
  });

  describe('模板管理', () => {
    it('获取所有模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('按分类获取模板', async () => {
      const developmentTemplates = await promptTemplateLibrary.getByCategory(PromptCategory.DEVELOPMENT);
      expect(developmentTemplates).toBeInstanceOf(Array);
      expect(developmentTemplates.length).toBeGreaterThan(0);
      developmentTemplates.forEach(template => {
        expect(template.category).toBe(PromptCategory.DEVELOPMENT);
      });
    });

    it('按子分类获取模板', async () => {
      const codeReviewTemplates = await promptTemplateLibrary.getBySubcategory(PromptSubcategory.DEVELOPMENT_CODE_REVIEW);
      expect(codeReviewTemplates).toBeInstanceOf(Array);
      expect(codeReviewTemplates.length).toBeGreaterThan(0);
      codeReviewTemplates.forEach(template => {
        expect(template.subcategory).toBe(PromptSubcategory.DEVELOPMENT_CODE_REVIEW);
      });
    });

    it('添加模板', async () => {
      const newTemplate = await promptTemplateLibrary.add({
        title: '测试模板',
        content: '测试内容',
        category: PromptCategory.CUSTOM,
        description: '测试描述',
        examples: ['测试示例'],
        tags: ['测试', '示例'],
        recommendedModel: 'gpt-3.5-turbo',
        estimatedTokens: 100,
        useCase: '测试用例'
      });

      expect(newTemplate).toBeDefined();
      expect(newTemplate.id).toBeDefined();
      expect(newTemplate.title).toBe('测试模板');

      const templates = await promptTemplateLibrary.getAll();
      expect(templates.length).toBeGreaterThan(8); // 默认8个模板
    });

    it('更新模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const templateToUpdate = templates[0];

      const updatedTemplate = await promptTemplateLibrary.update(templateToUpdate.id, {
        title: '更新后的标题'
      });

      expect(updatedTemplate.title).toBe('更新后的标题');
      expect(updatedTemplate.updatedAt).toBeGreaterThan(templateToUpdate.updatedAt);
    });

    it('删除模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const initialCount = templates.length;
      const templateToDelete = templates[0];

      await promptTemplateLibrary.delete(templateToDelete.id);
      const updatedTemplates = await promptTemplateLibrary.getAll();

      expect(updatedTemplates.length).toBe(initialCount - 1);
      expect(updatedTemplates.find(t => t.id === templateToDelete.id)).toBeUndefined();
    });
  });

  describe('检索功能', () => {
    it('搜索模板', async () => {
      const results = await promptTemplateLibrary.search('代码');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      results.forEach(template => {
        expect(
          template.title.includes('代码') ||
          template.content.includes('代码') ||
          template.description.includes('代码') ||
          template.tags.some(tag => tag.includes('代码'))
        ).toBe(true);
      });
    });

    it('多标签搜索', async () => {
      const results = await promptTemplateLibrary.searchByTags(['代码审查', '安全性']);
      expect(results).toBeInstanceOf(Array);
      results.forEach(template => {
        expect(template.tags).toContain('代码审查');
        expect(template.tags).toContain('安全性');
      });
    });

    it('高级搜索', async () => {
      const results = await promptTemplateLibrary.advancedSearch({
        category: PromptCategory.DEVELOPMENT,
        tags: ['代码审查']
      });
      expect(results).toBeInstanceOf(Array);
      results.forEach(template => {
        expect(template.category).toBe(PromptCategory.DEVELOPMENT);
        expect(template.tags).toContain('代码审查');
      });
    });

    it('排序模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const sortedByTitle = promptTemplateLibrary.sortTemplates(templates, 'title', 'asc');
      expect(sortedByTitle).toBeInstanceOf(Array);
      expect(sortedByTitle.length).toBe(templates.length);
      
      // 验证排序
      for (let i = 1; i < sortedByTitle.length; i++) {
        expect(sortedByTitle[i].title.toLowerCase() >= sortedByTitle[i - 1].title.toLowerCase()).toBe(true);
      }
    });
  });

  describe('存储机制', () => {
    it('导出模板', async () => {
      const exported = await promptTemplateLibrary.exportTemplates();
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('导入模板', async () => {
      const exported = await promptTemplateLibrary.exportTemplates();
      const initialCount = (await promptTemplateLibrary.getAll()).length;
      
      await promptTemplateLibrary.importTemplates(exported);
      const updatedCount = (await promptTemplateLibrary.getAll()).length;
      
      expect(updatedCount).toBe(initialCount * 2);
    });

    it('清空模板', async () => {
      await promptTemplateLibrary.clearTemplates();
      const templates = await promptTemplateLibrary.getAll();
      expect(templates.length).toBe(0);
    });

    it('重置为默认模板', async () => {
      await promptTemplateLibrary.clearTemplates();
      await promptTemplateLibrary.resetToDefault();
      const templates = await promptTemplateLibrary.getAll();
      expect(templates.length).toBe(8); // 默认8个模板
    });
  });

  describe('用户体验功能', () => {
    it('更新模板评分', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const template = templates[0];
      
      const updatedTemplate = await promptTemplateLibrary.rateTemplate(template.id, 5);
      expect(updatedTemplate.rating).toBe(5);
    });

    it('切换收藏状态', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const template = templates[0];
      
      const updatedTemplate = await promptTemplateLibrary.toggleFavorite(template.id);
      expect(updatedTemplate.isFavorite).toBe(true);
      
      const updatedAgain = await promptTemplateLibrary.toggleFavorite(template.id);
      expect(updatedAgain.isFavorite).toBe(false);
    });

    it('获取收藏的模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const template = templates[0];
      
      await promptTemplateLibrary.toggleFavorite(template.id);
      const favorites = await promptTemplateLibrary.getFavorites();
      
      expect(favorites).toBeInstanceOf(Array);
      expect(favorites.length).toBe(1);
      expect(favorites[0].id).toBe(template.id);
    });

    it('记录模板使用', async () => {
      const templates = await promptTemplateLibrary.getAll();
      const template = templates[0];
      const initialUsageCount = template.usageCount || 0;
      
      const updatedTemplate = await promptTemplateLibrary.recordUsage(template.id);
      expect(updatedTemplate.usageCount).toBe(initialUsageCount + 1);
      expect(updatedTemplate.lastUsedAt).toBeDefined();
    });

    it('获取最近使用的模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      // 记录使用
      for (let i = 0; i < 3; i++) {
        await promptTemplateLibrary.recordUsage(templates[i].id);
        // 等待一段时间，确保时间戳不同
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const recentlyUsed = await promptTemplateLibrary.getRecentlyUsed(2);
      expect(recentlyUsed).toBeInstanceOf(Array);
      expect(recentlyUsed.length).toBe(2);
    });

    it('获取最常用的模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      // 增加使用次数
      for (let i = 0; i < 5; i++) {
        await promptTemplateLibrary.recordUsage(templates[0].id);
      }
      
      const mostUsed = await promptTemplateLibrary.getMostUsed(1);
      expect(mostUsed).toBeInstanceOf(Array);
      expect(mostUsed.length).toBe(1);
      expect(mostUsed[0].id).toBe(templates[0].id);
    });

    it('获取评分最高的模板', async () => {
      const templates = await promptTemplateLibrary.getAll();
      // 设置高评分
      await promptTemplateLibrary.rateTemplate(templates[0].id, 5);
      
      const highestRated = await promptTemplateLibrary.getHighestRated(1);
      expect(highestRated).toBeInstanceOf(Array);
      expect(highestRated.length).toBe(1);
      expect(highestRated[0].id).toBe(templates[0].id);
    });

    it('获取推荐模板', async () => {
      const recommended = await promptTemplateLibrary.getRecommended(3);
      expect(recommended).toBeInstanceOf(Array);
      expect(recommended.length).toBe(3);
    });

    it('预览模板', () => {
      const template = {
        id: 'test_template',
        title: '测试模板',
        content: '请分析以下内容：\n\n',
        category: PromptCategory.ANALYSIS,
        description: '测试描述',
        examples: ['测试示例'],
        tags: ['测试'],
        recommendedModel: 'gpt-3.5-turbo',
        estimatedTokens: 100,
        useCase: '测试用例',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const preview = promptTemplateLibrary.previewTemplate(template, '这是测试内容');
      expect(preview).toBe('请分析以下内容：\n\n这是测试内容');
    });

    it('获取模板统计信息', async () => {
      const stats = await promptTemplateLibrary.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(stats.averageRating).toBeDefined();
      expect(stats.totalUsage).toBeDefined();
      expect(stats.favoritesCount).toBeDefined();
    });
  });
});
