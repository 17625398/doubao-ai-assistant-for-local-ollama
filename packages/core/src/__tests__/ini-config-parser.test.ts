import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { IniConfigParser } from '../utils/ini-config-parser';

describe('IniConfigParser - P5: parse/stringify 幂等性', () => {
  it('parse(stringify(parse(s))) deepEquals parse(s)', () => {
    // 使用已知有效的 INI 字符串进行幂等性测试
    const samples = [
      '[ollama]\nhost=http://localhost:11434\nmodel=llama3.2\ntimeout=30000\nstream=true',
      '[proxy]\nenabled=true\nurl=http://proxy:8080\n[ui]\ntheme=dark\nlanguage=zh-CN',
      '[privacy]\nsaveChatHistory=true\nshareUsageData=false',
      '',
      '[ollama]\nhost=http://localhost:11434',
    ];

    for (const s of samples) {
      const first = IniConfigParser.parse(s);
      const second = IniConfigParser.parse(IniConfigParser.stringify(first));
      expect(second).toEqual(first);
    }
  });

  it('parse 正确解析 ollama section', () => {
    const ini = '[ollama]\nhost=http://localhost:11434\nmodel=llama3.2\ntimeout=60000\nstream=false';
    const cfg = IniConfigParser.parse(ini);
    expect(cfg.ollama?.host).toBe('http://localhost:11434');
    expect(cfg.ollama?.model).toBe('llama3.2');
    expect(cfg.ollama?.timeout).toBe(60000);
    expect(cfg.ollama?.stream).toBe(false);
  });

  it('parse 正确解析 proxy section', () => {
    const ini = '[proxy]\nenabled=true\nurl=http://proxy.example.com:8080';
    const cfg = IniConfigParser.parse(ini);
    expect(cfg.proxy?.enabled).toBe(true);
    expect(cfg.proxy?.url).toBe('http://proxy.example.com:8080');
  });

  it('parse 正确解析 ui section 主题', () => {
    const ini = '[ui]\ntheme=dark\nlanguage=en-US';
    const cfg = IniConfigParser.parse(ini);
    expect(cfg.ui?.theme).toBe('dark');
    expect(cfg.ui?.language).toBe('en-US');
  });

  it('空字符串返回空配置', () => {
    const cfg = IniConfigParser.parse('');
    expect(cfg).toEqual({});
  });

  it('注释行被忽略', () => {
    const ini = '; 这是注释\n# 也是注释\n[ollama]\nhost=http://localhost:11434';
    const cfg = IniConfigParser.parse(ini);
    expect(cfg.ollama?.host).toBe('http://localhost:11434');
  });

  it('属性测试：stringify 输出可被 parse 还原', () => {
    fc.assert(
      fc.property(
        fc.record({
          host: fc.constantFrom('http://localhost:11434', 'http://192.168.1.1:11434'),
          model: fc.constantFrom('llama3.2', 'mistral', 'codellama'),
          timeout: fc.integer({ min: 1000, max: 120000 }),
          stream: fc.boolean(),
        }),
        ({ host, model, timeout, stream }) => {
          const original = { ollama: { host, model, timeout, stream } };
          const serialized = IniConfigParser.stringify(original);
          const restored = IniConfigParser.parse(serialized);
          expect(restored.ollama?.host).toBe(host);
          expect(restored.ollama?.model).toBe(model);
          expect(restored.ollama?.timeout).toBe(timeout);
          expect(restored.ollama?.stream).toBe(stream);
        }
      )
    );
  });
});
