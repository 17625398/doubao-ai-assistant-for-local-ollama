// INI 配置文件解析器

export interface IniConfig {
  proxy?: {
    enabled: boolean;
    url: string;
  };
  ollama?: {
    host: string;
    model: string;
    timeout: number;
    stream: boolean;
  };
  ui?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    fontSize: number;
  };
  privacy?: {
    saveChatHistory: boolean;
    shareUsageData: boolean;
  };
  [section: string]: Record<string, unknown> | undefined;
}

type RawIni = Record<string, Record<string, string>>;

export class IniConfigParser {
  /** 解析 INI 格式字符串为结构化配置 */
  static parse(content: string): IniConfig {
    const raw = IniConfigParser.parseRaw(content);
    const config: IniConfig = {};

    // proxy section
    if (raw.proxy) {
      config.proxy = {
        enabled: raw.proxy.enabled === 'true' || raw.proxy.enabled === '1',
        url: raw.proxy.url ?? '',
      };
    }

    // ollama section
    if (raw.ollama) {
      config.ollama = {
        host: raw.ollama.host ?? 'http://localhost:11434',
        model: raw.ollama.model ?? '',
        timeout: parseInt(raw.ollama.timeout ?? '30000', 10) || 30000,
        stream: raw.ollama.stream !== 'false' && raw.ollama.stream !== '0',
      };
    }

    // ui section
    if (raw.ui) {
      const theme = raw.ui.theme as 'light' | 'dark' | 'system';
      config.ui = {
        theme: ['light', 'dark', 'system'].includes(theme) ? theme : 'system',
        language: raw.ui.language ?? 'zh-CN',
        fontSize: parseInt(raw.ui.fontSize ?? '14', 10) || 14,
      };
    }

    // privacy section
    if (raw.privacy) {
      config.privacy = {
        saveChatHistory: raw.privacy.saveChatHistory !== 'false',
        shareUsageData: raw.privacy.shareUsageData === 'true',
      };
    }

    return config;
  }

  /** 将结构化配置序列化为 INI 字符串 */
  static stringify(config: IniConfig): string {
    const lines: string[] = [];
    for (const [section, values] of Object.entries(config)) {
      if (!values || typeof values !== 'object') continue;
      lines.push(`[${section}]`);
      for (const [key, value] of Object.entries(values)) {
        lines.push(`${key}=${String(value)}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  /** 解析为原始 key-value map */
  private static parseRaw(content: string): RawIni {
    const result: RawIni = {};
    let currentSection = '__root__';

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      // 跳过空行和注释
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;

      // section 头
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].toLowerCase().trim();
        if (!result[currentSection]) result[currentSection] = {};
        continue;
      }

      // key=value
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim().toLowerCase();
        const value = line.slice(eqIdx + 1).trim();
        if (!result[currentSection]) result[currentSection] = {};
        result[currentSection][key] = value;
      }
    }

    return result;
  }
}
