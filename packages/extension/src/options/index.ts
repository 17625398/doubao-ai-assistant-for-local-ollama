// Options 页面逻辑

import { logger } from '@core/utils/logger';
import { AIProvider, AIServiceConfig, aiConfigManager } from '@core/index';

logger.setPrefix('[Doubao Options]');

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoOpen: boolean;
  contextMenu: boolean;
  temperature: number;
  streamResponse: boolean;
  maxContext: number;
}

const defaultSettings: Settings = {
  theme: 'light',
  language: 'zh-CN',
  autoOpen: false,
  contextMenu: true,
  temperature: 0.7,
  streamResponse: true,
  maxContext: 10,
};

class OptionsPage {
  private currentSettings: Settings = { ...defaultSettings };
  private currentAIConfig: AIServiceConfig | null = null;
  private isCheckingOllama = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.loadSettings();
    this.updateUI();
    await this.loadAIConfig();
    this.updateAIUI();
    if (this.currentAIConfig?.provider === 'ollama') {
      await this.checkAndLoadOllamaModels({ silent: true });
    }
    this.showVersion();
    logger.info('Options page initialized');
  }

  private setupEventListeners(): void {
    // 导航切换
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = (e.currentTarget as HTMLElement).getAttribute('data-section');
        if (section) {
          this.switchSection(section);
        }
      });
    });

    // 温度滑块
    const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
    const temperatureValue = document.getElementById('temperature-value');
    if (temperatureInput && temperatureValue) {
      temperatureInput.addEventListener('input', () => {
        temperatureValue.textContent = temperatureInput.value;
        this.currentSettings.temperature = parseFloat(temperatureInput.value);
      });
    }

    // 保存按钮
    document.getElementById('save-btn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // 重置按钮
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.resetSettings();
    });

    // 监听所有设置项变化
    const settingIds = [
      'theme', 'language', 'auto-open', 'context-menu',
      'stream-response', 'max-context'
    ];

    settingIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.collectSettings();
        });
      }
    });

    const aiProviderSelect = document.getElementById('ai-provider');
    aiProviderSelect?.addEventListener('change', () => {
      const provider = this.getValue('ai-provider') as AIProvider;
      this.updateProviderSections(provider);
      if (provider === 'ollama') {
        this.checkAndLoadOllamaModels({ silent: true });
      }
    });

    document.getElementById('ollama-refresh-models')?.addEventListener('click', () => {
      this.checkAndLoadOllamaModels({ silent: false });
    });

    const modelSelect = document.getElementById('ollama-model-select') as HTMLSelectElement | null;
    modelSelect?.addEventListener('change', () => {
      const selected = String(modelSelect.value || '');
      if (selected) {
        this.setValue('ollama-model', selected);
      }
    });

    const baseUrlInput = document.getElementById('ollama-base-url') as HTMLInputElement | null;
    baseUrlInput?.addEventListener('blur', () => {
      const provider = this.getValue('ai-provider') as AIProvider;
      if (provider === 'ollama') {
        this.checkAndLoadOllamaModels({ silent: true });
      }
    });
  }

  private normalizeBaseUrl(raw: string): string {
    const trimmed = String(raw || '').trim();
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }

  private setOllamaCheckStatus(text: string): void {
    const el = document.getElementById('ollama-check-status');
    if (el) el.textContent = text;
  }

  private buildOllamaForbiddenError(baseUrl: string, detail?: string): Error {
    const hint =
      '请求被 Ollama 拒绝（403 Forbidden）。这通常是 CORS/Origin 限制导致：请在运行 Ollama 的机器上设置环境变量 OLLAMA_ORIGINS=chrome-extension://*（或 chrome-extension://<你的扩展ID>）后重启 Ollama。';
    const extra = detail ? ` 详情：${detail}` : '';
    return new Error(`${hint} 地址：${baseUrl}${extra}`);
  }

  private async checkAndLoadOllamaModels(options?: { silent?: boolean }): Promise<void> {
    if (this.isCheckingOllama) return;
    const silent = options?.silent ?? false;

    const refreshBtn = document.getElementById('ollama-refresh-models') as HTMLButtonElement | null;
    const modelSelect = document.getElementById('ollama-model-select') as HTMLSelectElement | null;
    const baseUrlInput = document.getElementById('ollama-base-url') as HTMLInputElement | null;
    const timeoutInput = document.getElementById('ollama-timeout') as HTMLInputElement | null;

    if (!modelSelect || !baseUrlInput) return;

    const baseUrl = this.normalizeBaseUrl(baseUrlInput.value || 'http://192.168.0.32:11434');
    const timeoutMsRaw = timeoutInput ? Number(timeoutInput.value) : 8000;
    const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? Math.min(timeoutMsRaw, 60000) : 8000;

    this.isCheckingOllama = true;
    if (refreshBtn) refreshBtn.disabled = true;
    this.setOllamaCheckStatus('检查中...');

    try {
      if (!silent) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 8000));
        try {
          await fetch(`${baseUrl}`, { method: 'GET', mode: 'no-cors', signal: controller.signal });
        } catch (error) {
          const message = error instanceof Error ? error.message : '无法连接到 Ollama';
          throw new Error(`无法连接到 Ollama：${baseUrl}（${message}）`);
        } finally {
          clearTimeout(timeoutId);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 8000));
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          throw this.buildOllamaForbiddenError(baseUrl, detail);
        }
        throw new Error(detail ? `连接失败：${detail}` : `连接失败：${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { models?: Array<{ name?: unknown }> };
      const names = (data.models || [])
        .map((m) => (typeof m?.name === 'string' ? m.name : ''))
        .filter((n) => Boolean(n));

      modelSelect.innerHTML = '';
      if (names.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '未发现模型（请先在 Ollama 中拉取模型）';
        modelSelect.appendChild(opt);
        this.setOllamaCheckStatus('已连接，但未发现模型');
        if (!silent) {
          this.showNotification('已连接 Ollama，但未发现模型', 'error');
        }
        return;
      }

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '请选择模型';
      modelSelect.appendChild(placeholder);

      names.forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        modelSelect.appendChild(opt);
      });

      if (!silent) {
        this.setOllamaCheckStatus(`已连接，发现 ${names.length} 个模型（正在测试对话接口...）`);
      } else {
        this.setOllamaCheckStatus(`已连接，发现 ${names.length} 个模型`);
      }

      const current = String((document.getElementById('ollama-model') as HTMLInputElement | null)?.value || '');
      if (current && names.includes(current)) {
        modelSelect.value = current;
      } else {
        modelSelect.value = '';
      }

      if (!silent) {
        const testModel = current && names.includes(current) ? current : names[0]!;
        const chatController = new AbortController();
        const chatTimeoutId = setTimeout(() => chatController.abort(), Math.min(timeoutMs, 8000));
        try {
          const chatResponse = await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: testModel,
              stream: false,
              messages: [{ role: 'user', content: 'ping' }],
            }),
            signal: chatController.signal,
          });

          if (!chatResponse.ok) {
            const chatDetail = await chatResponse.text().catch(() => '');
            if (chatResponse.status === 403) {
              throw this.buildOllamaForbiddenError(baseUrl, chatDetail);
            }
            throw new Error(
              chatDetail
                ? `对话接口不可用：${chatDetail}`
                : `对话接口不可用：${chatResponse.status} ${chatResponse.statusText}`
            );
          }
        } finally {
          clearTimeout(chatTimeoutId);
        }

        this.setOllamaCheckStatus(`已连接，发现 ${names.length} 个模型（对话接口正常）`);
        this.showNotification('Ollama 端点正常（tags + chat），模型列表已更新');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查失败';
      this.setOllamaCheckStatus('检查失败');
      if (!silent) {
        this.showNotification(message, 'error');
      }
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
      this.isCheckingOllama = false;
    }
  }

  private switchSection(sectionId: string): void {
    // 更新导航状态
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
      if (item.getAttribute('data-section') === sectionId) {
        item.classList.add('active');
      }
    });

    // 更新内容显示
    document.querySelectorAll('.section').forEach((section) => {
      section.classList.remove('active');
    });
    document.getElementById(sectionId)?.classList.add('active');
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        this.currentSettings = { ...defaultSettings, ...result.settings };
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
    }
  }

  private updateUI(): void {
    // 更新表单值
    const setValue = (id: string, value: string | boolean | number) => {
      const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
      if (element) {
        if (element.type === 'checkbox') {
          (element as HTMLInputElement).checked = value as boolean;
        } else {
          element.value = String(value);
        }
      }
    };

    setValue('theme', this.currentSettings.theme);
    setValue('language', this.currentSettings.language);
    setValue('auto-open', this.currentSettings.autoOpen);
    setValue('context-menu', this.currentSettings.contextMenu);
    setValue('temperature', this.currentSettings.temperature);
    setValue('stream-response', this.currentSettings.streamResponse);
    setValue('max-context', this.currentSettings.maxContext);

    // 更新温度显示
    const temperatureValue = document.getElementById('temperature-value');
    if (temperatureValue) {
      temperatureValue.textContent = String(this.currentSettings.temperature);
    }
  }

  private collectSettings(): void {
    this.currentSettings = {
      theme: this.getValue('theme') as Settings['theme'],
      language: this.getValue('language') as string,
      autoOpen: this.getValue('auto-open', 'boolean') as boolean,
      contextMenu: this.getValue('context-menu', 'boolean') as boolean,
      temperature: parseFloat(this.getValue('temperature') as string),
      streamResponse: this.getValue('stream-response', 'boolean') as boolean,
      maxContext: this.getValue('max-context', 'number') as number,
    };
  }

  private async loadAIConfig(): Promise<void> {
    try {
      const base = aiConfigManager.getConfig();
      const key = 'ai-service-config';
      const stored = await chrome.storage.local.get(key);
      const storedConfig = stored[key] as AIServiceConfig | undefined;

      this.currentAIConfig = mergeAIConfigs(base, storedConfig);
    } catch (error) {
      logger.error('Failed to load AI config:', error);
      this.currentAIConfig = aiConfigManager.getConfig();
    }
  }

  private updateAIUI(): void {
    if (!this.currentAIConfig) return;

    this.setValue('ai-provider', this.currentAIConfig.provider);

    this.setValue('ollama-base-url', this.currentAIConfig.ollama?.baseUrl || 'http://192.168.0.32:11434');
    this.setValue('ollama-model', this.currentAIConfig.ollama?.defaultModel || 'llama2');
    this.setValue('ollama-timeout', this.currentAIConfig.ollama?.timeout ?? 30000);
    this.setValue('ollama-stream', this.currentAIConfig.ollama?.streamEnabled ?? true);
    this.setOllamaCheckStatus('');

    this.setValue('openai-base-url', this.currentAIConfig.openai?.baseUrl || 'https://api.openai.com/v1');
    this.setValue('openai-api-key', this.currentAIConfig.openai?.apiKey || '');
    this.setValue('openai-model', this.currentAIConfig.openai?.defaultModel || 'gpt-3.5-turbo');
    this.setValue('openai-timeout', this.currentAIConfig.openai?.timeout ?? 30000);
    this.setValue('openai-stream', this.currentAIConfig.openai?.streamEnabled ?? true);

    this.setValue('custom-base-url', this.currentAIConfig.custom?.baseUrl || 'http://localhost:1234/v1');
    this.setValue('custom-api-key', this.currentAIConfig.custom?.apiKey || '');
    this.setValue('custom-model', this.currentAIConfig.custom?.defaultModel || '');
    this.setValue('custom-headers', JSON.stringify(this.currentAIConfig.custom?.headers || {}, null, 2));
    this.setValue('custom-timeout', this.currentAIConfig.custom?.timeout ?? 30000);
    this.setValue('custom-stream', this.currentAIConfig.custom?.streamEnabled ?? true);

    this.updateProviderSections(this.currentAIConfig.provider);
  }

  private updateProviderSections(provider: AIProvider): void {
    const sections = [
      { id: 'ai-provider-ollama', provider: 'ollama' },
      { id: 'ai-provider-openai', provider: 'openai' },
      { id: 'ai-provider-custom', provider: 'custom' },
    ] as const;

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.style.display = s.provider === provider ? 'block' : 'none';
    });
  }

  private collectAIConfig(): Partial<AIServiceConfig> {
    const provider = this.getValue('ai-provider') as AIProvider;

    const customHeadersText = String(this.getValue('custom-headers') || '{}');
    let customHeaders: Record<string, string> | undefined;
    try {
      const parsed = JSON.parse(customHeadersText || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        customHeaders = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
        );
      } else {
        throw new Error('Headers 必须是 JSON 对象');
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Headers 解析失败');
    }

    const openaiBaseUrl = String(this.getValue('openai-base-url') || 'https://api.openai.com/v1');
    const openaiApiKey = String(this.getValue('openai-api-key') || '');
    if (provider === 'openai' && openaiBaseUrl.includes('api.openai.com') && !openaiApiKey.trim()) {
      throw new Error('官方 OpenAI 接口需要有效的 API Key');
    }

    return {
      provider,
      ollama: {
        baseUrl: String(this.getValue('ollama-base-url') || 'http://192.168.0.32:11434'),
        defaultModel: String(this.getValue('ollama-model') || 'llama2'),
        timeout: Number(this.getValue('ollama-timeout', 'number') || 30000),
        streamEnabled: Boolean(this.getValue('ollama-stream', 'boolean')),
      },
      openai: {
        baseUrl: openaiBaseUrl,
        apiKey: openaiApiKey,
        defaultModel: String(this.getValue('openai-model') || 'gpt-3.5-turbo'),
        timeout: Number(this.getValue('openai-timeout', 'number') || 30000),
        streamEnabled: Boolean(this.getValue('openai-stream', 'boolean')),
      },
      custom: {
        baseUrl: String(this.getValue('custom-base-url') || 'http://localhost:1234/v1'),
        apiKey: String(this.getValue('custom-api-key') || ''),
        defaultModel: String(this.getValue('custom-model') || ''),
        headers: customHeaders,
        timeout: Number(this.getValue('custom-timeout', 'number') || 30000),
        streamEnabled: Boolean(this.getValue('custom-stream', 'boolean')),
      },
    };
  }

  private async saveSettings(): Promise<void> {
    try {
      this.collectSettings();
      const aiConfig = this.collectAIConfig();
      await chrome.storage.local.set({ settings: this.currentSettings });
      await aiConfigManager.updateConfig(aiConfig);
      this.currentAIConfig = aiConfigManager.getConfig();

      // 显示保存成功提示
      this.showNotification('设置已保存');

      // 应用设置
      this.applySettings();

      logger.info('Settings saved:', this.currentSettings);
    } catch (error) {
      logger.error('Failed to save settings:', error);
      this.showNotification(error instanceof Error ? error.message : '保存失败，请重试', 'error');
    }
  }

  private async resetSettings(): Promise<void> {
    if (confirm('确定要恢复默认设置吗？')) {
      this.currentSettings = { ...defaultSettings };
      this.updateUI();
      await aiConfigManager.resetToDefaults();
      this.currentAIConfig = aiConfigManager.getConfig();
      this.updateAIUI();
      await this.saveSettings();
      this.showNotification('已恢复默认设置');
    }
  }

  private setValue(id: string, value: string | boolean | number): void {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!element) return;
    if ((element as HTMLInputElement).type === 'checkbox') {
      (element as HTMLInputElement).checked = Boolean(value);
      return;
    }
    element.value = String(value);
  }

  private getValue(id: string, type: 'string' | 'boolean' | 'number' = 'string'): string | boolean | number | null {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!element) return null;
    if (type === 'boolean') {
      return (element as HTMLInputElement).checked;
    }
    if (type === 'number') {
      const n = parseInt((element as HTMLInputElement).value, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return element.value;
  }

  private applySettings(): void {
    // 应用主题
    if (this.currentSettings.theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }

    // 更新右键菜单状态
    this.updateContextMenu();
  }

  private async updateContextMenu(): Promise<void> {
    if (this.currentSettings.contextMenu) {
      try {
        await chrome.contextMenus.create({
          id: 'doubao-ai',
          title: '使用豆包AI解释',
          contexts: ['selection'],
        });
      } catch {
        // 菜单已存在，忽略错误
      }
    } else {
      try {
        await chrome.contextMenus.remove('doubao-ai');
      } catch {
        // 菜单不存在，忽略错误
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private showVersion(): void {
    const manifest = chrome.runtime.getManifest();
    const versionEl = document.getElementById('version');
    if (versionEl) {
      versionEl.textContent = manifest.version;
    }
  }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});

function mergeAIConfigs(base: AIServiceConfig, override?: AIServiceConfig): AIServiceConfig {
  if (!override) return base;
  const merged: AIServiceConfig = {
    ...base,
    ...override,
    provider: override.provider || base.provider,
  };

  if (base.ollama || override.ollama) {
    merged.ollama = {
      baseUrl: base.ollama?.baseUrl || 'http://192.168.0.32:11434',
      defaultModel: base.ollama?.defaultModel || 'fredrezones55/qwen3.5-opus:27b',
      timeout: base.ollama?.timeout ?? 30000,
      streamEnabled: base.ollama?.streamEnabled ?? true,
      ...override.ollama,
    };
  }

  if (base.openai || override.openai) {
    merged.openai = {
      apiKey: base.openai?.apiKey || '',
      baseUrl: base.openai?.baseUrl || 'https://api.openai.com/v1',
      defaultModel: base.openai?.defaultModel || 'gpt-3.5-turbo',
      timeout: base.openai?.timeout ?? 30000,
      streamEnabled: base.openai?.streamEnabled ?? true,
      headers: base.openai?.headers,
      ...override.openai,
    };
  }

  if (base.custom || override.custom) {
    merged.custom = {
      baseUrl: base.custom?.baseUrl || 'http://localhost:1234/v1',
      apiKey: base.custom?.apiKey || '',
      defaultModel: base.custom?.defaultModel || '',
      headers: base.custom?.headers,
      timeout: base.custom?.timeout ?? 30000,
      streamEnabled: base.custom?.streamEnabled ?? true,
      ...override.custom,
    };
  }

  return merged;
}
