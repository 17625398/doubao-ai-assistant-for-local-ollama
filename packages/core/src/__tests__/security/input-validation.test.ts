/**
 * 输入验证和 XSS 防护安全测试
 * 测试消息清理、输入验证、HTML 转义和恶意内容检测
 */

import { describe, it, expect } from 'vitest';
import { MessageSanitizer } from '../../utils/message-sanitizer';

describe('输入验证和 XSS 防护安全测试', () => {
  describe('MessageSanitizer.sanitizeText - HTML 标签转义', () => {
    it('应转义 script 标签', () => {
      const input = '<script>alert("XSS")</script>';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('应转义 iframe 标签', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).not.toContain('<iframe');
      expect(result).toContain('&lt;iframe');
    });

    it('应转义 img 标签和 onerror 属性', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).not.toContain('<img');
      expect(result).toContain('onerror');
      expect(result).toContain('&lt;img');
    });

    it('应转义所有 HTML 标签', () => {
      const input = '<p>Hello <b>world</b></p>';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('&lt;p&gt;Hello &lt;b&gt;world&lt;/b&gt;&lt;/p&gt;');
    });
  });

  describe('MessageSanitizer.sanitizeText - 特殊字符转义', () => {
    it('应转义 & 字符', () => {
      const input = 'A & B';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('A &amp; B');
    });

    it('应转义 < 和 > 字符', () => {
      const input = '5 < 10 > 3';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('5 &lt; 10 &gt; 3');
    });

    it('应转义双引号', () => {
      const input = 'say "hello"';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('say &quot;hello&quot;');
    });

    it('应转义单引号', () => {
      const input = "it's fine";
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('it&#039;s fine');
    });

    it('应防止属性注入攻击', () => {
      const input = '" onclick="alert(1)" data-x="';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toContain('&quot;');
      expect(result).toContain('&quot; onclick=&quot;alert(1)&quot; data-x=&quot;');
    });
  });

  describe('MessageSanitizer.sanitizeText - 控制字符移除', () => {
    it('应移除空字节字符', () => {
      const input = 'hello\x00world';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).not.toContain('\x00');
    });

    it('应移除其他控制字符', () => {
      const input = 'hello\x01\x02\x03world';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('helloworld');
    });

    it('应移除 DEL 字符', () => {
      const input = 'hello\x7Fworld';
      const result = MessageSanitizer.sanitizeText(input);
      expect(result).toBe('helloworld');
    });
  });

  describe('MessageSanitizer.sanitizeText - 长度限制', () => {
    it('应限制超长文本', () => {
      const input = 'a'.repeat(15000);
      const result = MessageSanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10003);
      expect(result.endsWith('...')).toBe(true);
    });

    it('应正常处理空字符串', () => {
      const result = MessageSanitizer.sanitizeText('');
      expect(result).toBe('');
    });

    it('应正常处理 null/undefined', () => {
      const result = MessageSanitizer.sanitizeText(null as any);
      expect(result).toBe('');
    });
  });

  describe('MessageSanitizer.validateMessage - 恶意内容检测', () => {
    it('应检测 javascript: 协议', () => {
      const input = 'javascript:alert(1)';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message contains potentially malicious content');
    });

    it('应检测 onerror 事件处理器', () => {
      const input = '<img onerror=alert(1)>';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应检测 onload 事件处理器', () => {
      const input = '<body onload=alert(1)>';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应检测 onclick 事件处理器', () => {
      const input = '<button onclick=alert(1)>';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应检测 eval 调用', () => {
      const input = 'eval("alert(1)")';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应检测 script 标签', () => {
      const input = '<script>alert(1)</script>';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应检测 iframe 标签', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
    });

    it('应允许正常消息通过', () => {
      const input = 'Hello, this is a normal message with some code: `console.log("hello")`';
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('MessageSanitizer.validateMessage - 长度验证', () => {
    it('应拒绝空消息', () => {
      const result = MessageSanitizer.validateMessage('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message content cannot be empty');
    });

    it('应拒绝仅空白字符的消息', () => {
      const result = MessageSanitizer.validateMessage('   \n\t  ');
      expect(result.valid).toBe(false);
    });

    it('应拒绝超过 10000 字符的消息', () => {
      const input = 'a'.repeat(10001);
      const result = MessageSanitizer.validateMessage(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Message content too long (maximum 10000 characters)');
    });
  });

  describe('MessageSanitizer.validateAttachments - 附件安全', () => {
    it('应验证有效的附件', () => {
      const attachments = [
        { type: 'image' as const, url: 'https://example.com/image.jpg' },
        { type: 'file' as const, url: 'https://example.com/doc.pdf', name: 'document.pdf' }
      ];
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(true);
    });

    it('应拒绝超过 10 个附件', () => {
      const attachments = Array.from({ length: 11 }, (_, i) => ({
        type: 'image' as const,
        url: `https://example.com/image${i}.jpg`
      }));
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Too many attachments (maximum 10)');
    });

    it('应拒绝无效的文件类型', () => {
      const attachments = [
        { type: 'executable' as any, url: 'https://example.com/file.exe' }
      ];
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid attachment type');
    });

    it('应拒绝无效的 URL', () => {
      const attachments = [
        { type: 'image' as const, url: 'not-a-valid-url' }
      ];
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid attachment URL');
    });

    it('应拒绝 javascript: URL', () => {
      const attachments = [
        { type: 'link' as const, url: 'javascript:alert(1)' }
      ];
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(false);
    });

    it('应拒绝过长的文件名', () => {
      const attachments = [
        { type: 'file' as const, url: 'https://example.com/file.pdf', name: 'a'.repeat(256) }
      ];
      const result = MessageSanitizer.validateAttachments(attachments);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Attachment name too long (maximum 255 characters)');
    });
  });

  describe('MessageSanitizer.sanitizeMessageRequest - 请求清理', () => {
    it('应清理消息内容', () => {
      const request = {
        channelId: 'test-channel',
        content: '<script>alert(1)</script>Hello',
        variables: { name: '<b>John</b>' }
      };
      const result = MessageSanitizer.sanitizeMessageRequest(request);
      expect(result.content).toBe('&lt;script&gt;alert(1)&lt;/script&gt;Hello');
      expect(result.variables!.name).toBe('&lt;b&gt;John&lt;/b&gt;');
    });

    it('应清理附件名称', () => {
      const request = {
        channelId: 'test-channel',
        content: 'Hello',
        attachments: [
          { type: 'file' as const, url: 'https://example.com/file.pdf', name: '<script>evil</script>' }
        ]
      };
      const result = MessageSanitizer.sanitizeMessageRequest(request);
      expect(result.attachments![0].name).toBe('&lt;script&gt;evil&lt;/script&gt;');
    });

    it('应保留有效的 channelId', () => {
      const request = {
        channelId: 'channel-123',
        content: 'Hello'
      };
      const result = MessageSanitizer.sanitizeMessageRequest(request);
      expect(result.channelId).toBe('channel-123');
    });
  });

  describe('XSS 向量测试', () => {
    const xssVectors = [
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      '<img src=x onerror="&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041">',
      '<svg onload=alert(1)>',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<details open ontoggle=alert(1)>',
      '<marquee onstart=alert(1)>',
      '<a href="javascript:alert(1)">click</a>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
    ];

    xssVectors.forEach((vector, index) => {
      it(`应防御 XSS 向量 #${index + 1}`, () => {
        const sanitized = MessageSanitizer.sanitizeText(vector);
        const validated = MessageSanitizer.validateMessage(vector);

        // 清理后的内容不应包含可执行的原生 HTML（< 已被转义为 &lt;）
        expect(sanitized).not.toMatch(/<script\b/i);
        expect(sanitized).not.toMatch(/<\w+\s+on\w+\s*=/i);
        expect(sanitized).not.toMatch(/href\s*=\s*["']?javascript:/i);
        expect(sanitized).not.toMatch(/data\s*=\s*["']?javascript:/i);
        expect(sanitized).not.toMatch(/src\s*=\s*["']?javascript:/i);

        // 验证应拒绝恶意内容
        expect(validated.valid).toBe(false);
      });
    });
  });
});
