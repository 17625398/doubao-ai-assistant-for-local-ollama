// 提示词更新管理器测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptUpdateManager, promptUpdateManager, PromptFeedback } from '../utils/prompt-update-manager';
import { promptTemplateLibrary } from '../utils/prompt-template-library';
import { execSync } from 'child_process';
import * as fs from 'fs';

// 模拟 child_process.execSync
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

// 模拟 fs
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn()
}));

describe('PromptUpdateManager', () => {
  let updateManager: PromptUpdateManager;

  beforeEach(() => {
    updateManager = new PromptUpdateManager();
    // 清空模拟调用
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // 重置提示词模板库
    await promptTemplateLibrary.resetToDefault();
  });

  describe('checkAndUpdatePrompts', () => {
    it('should return no updates when no changes detected', async () => {
      // 模拟 git 命令输出（无变更）
      (execSync as any).mockReturnValueOnce('same-hash')
        .mockReturnValueOnce('same-hash');

      const result = await updateManager.checkAndUpdatePrompts();
      expect(result.updated).toBe(false);
      expect(result.updatedTemplates).toHaveLength(0);
      expect(result.message).toContain('No relevant changes detected');
    });

    it('should return no updates when no prompts extracted', async () => {
      // 模拟 git 命令输出（有变更但无提示词）
      (execSync as any).mockReturnValueOnce('initial-hash')
        .mockReturnValueOnce('new-hash')
        .mockReturnValueOnce('src/utils/test.ts');

      // 模拟文件内容（无提示词）
      (fs.readFileSync as any).mockReturnValue('const test = "hello world";');

      const result = await updateManager.checkAndUpdatePrompts();
      expect(result.updated).toBe(false);
      expect(result.updatedTemplates).toHaveLength(0);
      // 可能返回 "No relevant changes detected" 或 "No prompts extracted from changes"
      expect(result.message).toMatch(/No (relevant changes detected|prompts extracted from changes)/);
    });
  });

  describe('feedback handling', () => {
    it('should collect user feedback', () => {
      const templateId = 'test-template';
      const feedback: PromptFeedback = {
        rating: 4,
        comments: '非常好的提示词模板',
        timestamp: Date.now()
      };

      updateManager.addFeedback(templateId, feedback);
      // 验证反馈是否被存储（通过处理反馈来间接验证）
      const results = updateManager.processFeedback();
      expect(results).resolves.toHaveLength(0); // 少于3条反馈，不处理
    });
  });

  describe('import/export', () => {
    it('should export templates to file', async () => {
      const filePath = 'test-templates.json';
      await updateManager.exportTemplatesToFile(filePath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, expect.any(String));
    });

    it('should import templates from file', async () => {
      const testTemplates = JSON.stringify([{
        title: '导入测试模板',
        content: '测试导入功能',
        category: '开发',
        description: '测试导入',
        examples: ['测试内容'],
        tags: ['测试'],
        recommendedModel: 'gpt-4',
        estimatedTokens: 500,
        useCase: '测试'
      }]);

      (fs.readFileSync as any).mockReturnValue(testTemplates);
      const importedTemplates = await updateManager.importTemplatesFromFile('test-templates.json');
      expect(importedTemplates).toHaveLength(1);
      expect(importedTemplates[0].title).toBe('导入测试模板');
    });
  });

  describe('update history', () => {
    it('should get update history', async () => {
      // 获取默认模板
      const templates = await promptTemplateLibrary.getAll();
      const testTemplate = templates[0];

      // 更新模板
      await promptTemplateLibrary.update(testTemplate.id, {
        content: '更新后的内容'
      }, {
        changeReason: '测试更新',
        createdBy: 'test-user'
      });

      const history = await updateManager.getUpdateHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });
});
