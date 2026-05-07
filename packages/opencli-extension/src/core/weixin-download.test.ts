import { describe, expect, it } from 'vitest';

// 直接导入模块，避免动态导入的性能问题
import * as mod from '../clis/weixin/download.js';

describe('weixin publish time extraction', () => {
  it('prefers publish_time text over create_time-like date strings', () => {
    expect(mod.extractWechatPublishTime(
      '2026年3月24日 22:38',
      'var create_time = "2026年3月24日 22:38";',
    )).toBe('2026年3月24日 22:38');
  });

  it('falls back to unix timestamp create_time values', () => {
    expect(mod.extractWechatPublishTime(
      '',
      'var create_time = "1711291080";',
    )).toBe('2024-03-24 22:38:00');
  });

  it('rejects malformed create_time values', () => {
    expect(mod.extractWechatPublishTime(
      '',
      'var create_time = "2026年3月24日 22:38";',
    )).toBe('');
    expect(mod.extractWechatPublishTime(
      '',
      'var create_time = "1711291080abc";',
    )).toBe('');
    expect(mod.extractWechatPublishTime(
      '',
      'var create_time = "17112910800";',
    )).toBe('');
  });

  it('builds a self-contained browser helper that matches fallback behavior', () => {
    const extractInPage = eval(mod.buildExtractWechatPublishTimeJs()) as (publishTimeText: string, htmlStr: string) => string;

    expect(extractInPage(
      '',
      'var create_time = "1711291080";',
    )).toBe('2024-03-24 22:38:00');
  });

  it('browser helper still prefers DOM publish_time text', () => {
    const extractInPage = eval(mod.buildExtractWechatPublishTimeJs()) as (publishTimeText: string, htmlStr: string) => string;

    expect(extractInPage(
      '2026年3月24日 22:38',
      'var create_time = "1711291080";',
    )).toBe('2026年3月24日 22:38');
  });

  it('detects WeChat verification gate pages', () => {
    expect(mod.detectWechatAccessIssue(
      '环境异常 当前环境异常，完成验证后即可继续访问。 去验证',
      '<html><body><a id="js_verify">去验证</a></body></html>',
    )).toBe('environment verification required');
  });

  it('browser access detector matches the server-side verifier', () => {
    const detectInPage = eval(mod.buildDetectWechatAccessIssueJs()) as (pageText: string, htmlStr: string) => string;

    expect(detectInPage(
      '环境异常 当前环境异常，完成验证后即可继续访问。 去验证',
      '<html>secitptpage/verify.html<a id="js_verify">去验证</a></html>',
    )).toBe('environment verification required');
  });

  it('picks the first non-empty WeChat metadata field', () => {
    expect(mod.pickFirstWechatMetaText('', 'Name cleared', '数字生命卡兹克')).toBe('数字生命卡兹克');
    expect(mod.pickFirstWechatMetaText('', '  聊聊刚刚上线的PixVerse V6视频模型。  ')).toBe('聊聊刚刚上线的PixVerse V6视频模型。');
  });
});
