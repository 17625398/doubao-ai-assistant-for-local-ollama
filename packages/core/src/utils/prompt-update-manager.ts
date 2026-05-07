// 提示词更新管理器

import { promptTemplateLibrary, PromptTemplate, PromptVersion } from './prompt-template-library';
import { logger } from './logger';
import { eventBus } from './event-bus';

// 条件导入 Node.js 特定模块（使用 eval 避免打包器在浏览器目标下解析内置模块）
let execSync: any;
let fs: any;
let path: any;
const safeRequire = (id: string) => {
  try {
    // eslint-disable-next-line no-eval
    const req = (0, eval)('require');
    return typeof req === 'function' ? req(id) : null;
  } catch {
    return null;
  }
};
execSync = safeRequire('child_process')?.execSync ?? null;
fs = safeRequire('fs') ?? null;
path = safeRequire('path') ?? null;

/**
 * 代码变更检测器
 */
export class CodeChangeDetector {
  private projectRoot: string;
  private lastCommit: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.lastCommit = this.getCurrentCommit();
  }

  /**
   * 获取当前提交哈希
   */
  private getCurrentCommit(): string {
    try {
      if (execSync) {
        const result = execSync('git rev-parse HEAD', { cwd: this.projectRoot, encoding: 'utf8' });
        return result.trim();
      }
    } catch (error) {
      logger.warn('Failed to get current commit:', error);
    }
    return '';
  }

  /**
   * 检查代码是否有变更
   */
  hasChanges(): boolean {
    try {
      if (execSync) {
        const currentCommit = this.getCurrentCommit();
        const hasChanges = currentCommit !== this.lastCommit;
        if (hasChanges) {
          this.lastCommit = currentCommit;
        }
        return hasChanges;
      }
    } catch (error) {
      logger.warn('Failed to check for changes:', error);
    }
    return false;
  }

  /**
   * 获取变更的文件列表
   */
  getChangedFiles(): string[] {
    try {
      if (execSync) {
        const result = execSync('git diff --name-only', { cwd: this.projectRoot, encoding: 'utf8' });
        return result.trim().split('\n').filter((file: string) => file.trim());
      }
    } catch (error) {
      logger.warn('Failed to get changed files:', error);
    }
    return [];
  }

  /**
   * 分析变更文件
   */
  analyzeChanges(): { files: string[]; summary: string } {
    const changedFiles = this.getChangedFiles();
    const summary = `Detected ${changedFiles.length} changed files`;
    return { files: changedFiles, summary };
  }
}

/**
 * 提示词提取器
 */
export class PromptExtractor {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * 从文件中提取提示词
   */
  extractFromFile(filePath: string): string[] {
    try {
      if (fs) {
        const fullPath = path.join(this.projectRoot, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          return this.extractPrompts(content);
        }
      }
    } catch (error) {
      logger.warn('Failed to extract prompts from file:', error);
    }
    return [];
  }

  /**
   * 从文本中提取提示词
   */
  private extractPrompts(content: string): string[] {
    const prompts: string[] = [];
    
    // 提取注释中的提示词
    const commentRegex = /\/\*\*[\s\S]*?\*\//g;
    const comments = content.match(commentRegex) || [];
    comments.forEach(comment => {
      // 提取 @prompt 标记的提示词
      const promptRegex = /@prompt\s+(.*?)(?=\*\/|@)/g;
      const matches = comment.match(promptRegex) || [];
      matches.forEach(match => {
        const prompt = match.replace(/@prompt\s+/, '').trim();
        if (prompt) {
          prompts.push(prompt);
        }
      });
    });

    // 提取字符串字面量中的提示词
    const stringRegex = /['"`](.*?prompt.*?)['"`]/gi;
    const stringMatches = content.match(stringRegex) || [];
    stringMatches.forEach(match => {
      const prompt = match.replace(/['"`]/g, '').trim();
      if (prompt && prompt.includes('prompt')) {
        prompts.push(prompt);
      }
    });

    return prompts;
  }

  /**
   * 批量提取提示词
   */
  extractFromFiles(files: string[]): Map<string, string[]> {
    const results = new Map<string, string[]>();
    files.forEach(file => {
      const prompts = this.extractFromFile(file);
      if (prompts.length > 0) {
        results.set(file, prompts);
      }
    });
    return results;
  }
}

/**
 * 提示词更新管理器
 */
export class PromptUpdateManager {
  private codeDetector: CodeChangeDetector;
  private promptExtractor: PromptExtractor;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.codeDetector = new CodeChangeDetector(projectRoot);
    this.promptExtractor = new PromptExtractor(projectRoot);
    logger.info('PromptUpdateManager initialized');
  }

  /**
   * 检查并更新提示词
   */
  async checkAndUpdatePrompts(): Promise<{ updated: number; added: number; changes: string[] }> {
    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined') {
      logger.info('Running in browser environment, skipping prompt update');
      return { updated: 0, added: 0, changes: [] };
    }

    if (!this.codeDetector.hasChanges()) {
      logger.info('No code changes detected');
      return { updated: 0, added: 0, changes: [] };
    }

    const changes = this.codeDetector.analyzeChanges();
    const prompts = this.promptExtractor.extractFromFiles(changes.files);
    const updateResults = await this.updateTemplates(prompts);

    logger.info(`Updated ${updateResults.updated} templates, added ${updateResults.added} new templates`);
    return updateResults;
  }

  /**
   * 更新提示词模板
   */
  private async updateTemplates(prompts: Map<string, string[]>): Promise<{ updated: number; added: number; changes: string[] }> {
    let updated = 0;
    let added = 0;
    const changes: string[] = [];

    for (const [file, filePrompts] of prompts.entries()) {
      for (const prompt of filePrompts) {
        const templateId = this.generateTemplateId(prompt);
        const existingTemplate = promptTemplateLibrary.getTemplate(templateId);

        if (existingTemplate) {
          // 更新现有模板
          const updatedTemplate = promptTemplateLibrary.updateTemplate(templateId, {
            content: prompt,
            updatedAt: Date.now()
          });
          if (updatedTemplate) {
            updated++;
            changes.push(`Updated template ${updatedTemplate.name}`);
          }
        } else {
          // 创建新模板
          const newTemplate = promptTemplateLibrary.createTemplate({
            name: this.generateTemplateName(prompt),
            description: `Auto-generated from ${file}`,
            category: 'Auto-generated',
            content: prompt,
            variables: [],
            examples: [],
            tags: ['auto-generated'],
            author: 'System'
          });
          added++;
          changes.push(`Added new template ${newTemplate.name}`);
        }
      }
    }

    return { updated, added, changes };
  }

  /**
   * 生成模板ID
   */
  private generateTemplateId(prompt: string): string {
    const hash = this.generateHash(prompt);
    return `auto-${hash}`;
  }

  /**
   * 生成模板名称
   */
  private generateTemplateName(prompt: string): string {
    const firstLine = prompt.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  }

  /**
   * 生成哈希值
   */
  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 手动触发提示词更新
   */
  async triggerUpdate(): Promise<{ updated: number; added: number; changes: string[] }> {
    return this.checkAndUpdatePrompts();
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): PromptTemplate[] {
    return promptTemplateLibrary.getAllTemplates();
  }

  /**
   * 导出所有模板
   */
  exportTemplates(): string {
    return promptTemplateLibrary.exportAllTemplates();
  }

  /**
   * 导入模板
   */
  importTemplates(templatesJson: string): PromptTemplate[] {
    return promptTemplateLibrary.importTemplates(templatesJson);
  }

  /**
   * 清空所有模板
   */
  clearTemplates(): void {
    promptTemplateLibrary.clearAllTemplates();
  }
}

/**
 * 全局提示词更新管理器实例
 */
export const promptUpdateManager = new PromptUpdateManager();

export default PromptUpdateManager;
