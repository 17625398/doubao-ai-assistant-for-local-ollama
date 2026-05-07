/**
 * Agent-Reach 服务
 * 为 AI Agent 提供互联网访问能力
 * 集成 Jina Reader、Exa 搜索、社交媒体内容获取等功能
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 类型定义
// ============================================

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  score?: number;
  publishedAt?: string;
}

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
}

export interface VideoInfo {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  subtitles?: VideoSubtitle[];
  transcript?: string;
  author?: string;
  viewCount?: number;
  publishedAt?: string;
}

export interface VideoSubtitle {
  language: string;
  languageCode: string;
  content: string;
  url?: string;
}

export interface SocialPost {
  platform: 'twitter' | 'reddit' | 'linkedin' | 'facebook' | 'instagram' | 'xiaohongshu' | 'weibo' | 'bilibili';
  author: {
    id: string;
    name: string;
    handle?: string;
    avatar?: string;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  shares?: number;
  url: string;
  media?: {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
  }[];
  rawData?: any;
}

export interface ChannelStatus {
  name: string;
  enabled: boolean;
  available: boolean;
  configured: boolean;
  error?: string;
}

export interface DiagnosisResult {
  checkedAt: string;
  channels: ChannelStatus[];
  overall: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
}

// 缓存条目
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 缓存配置
interface CacheConfig {
  search: { ttl: number; maxSize: number };
  webPage: { ttl: number; maxSize: number };
  github: { ttl: number; maxSize: number };
  social: { ttl: number; maxSize: number };
}

// 默认缓存配置（毫秒）
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  search: { ttl: 5 * 60 * 1000, maxSize: 100 },      // 5分钟
  webPage: { ttl: 30 * 60 * 1000, maxSize: 50 },     // 30分钟
  github: { ttl: 10 * 60 * 1000, maxSize: 50 },     // 10分钟
  social: { ttl: 2 * 60 * 1000, maxSize: 100 },     // 2分钟
};

// ============================================
// AgentReachChannel 基类
// ============================================

export abstract class AgentReachChannel {
  protected name: string;
  protected enabled: boolean = false;
  protected configured: boolean = false;
  protected lastError?: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract checkAvailability(): Promise<boolean>;
  abstract execute(params: Record<string, any>): Promise<any>;

  async isAvailable(): Promise<boolean> {
    try {
      return await this.checkAvailability();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  getStatus(): ChannelStatus {
    return {
      name: this.name,
      enabled: this.enabled,
      available: false,
      configured: this.configured,
      error: this.lastError,
    };
  }
}

// ============================================
// 缓存管理器
// ============================================

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  private generateKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const config = this.getConfigForKey(key);
    const expiresAt = Date.now() + (ttl || config.ttl);

    // 如果缓存已满，删除最老的条目
    if (this.cache.size >= config.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });
  }

  private getConfigForKey(key: string): { ttl: number; maxSize: number } {
    if (key.startsWith('search')) return this.config.search;
    if (key.startsWith('webPage')) return this.config.webPage;
    if (key.startsWith('github')) return this.config.github;
    if (key.startsWith('social')) return this.config.social;
    return this.config.search;
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  clear(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%',
    };
  }
}

// ============================================
// Web 渠道 - Jina Reader
// ============================================

class WebChannel extends AgentReachChannel {
  private jinaReaderUrl = 'https://r.jina.ai/';

  constructor() {
    super('Web Reader (Jina)');
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch('https://r.jina.ai/status', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(params: { url: string; options?: { extract?: string; targetSelector?: string } }): Promise<WebPageContent> {
    const { url, options = {} } = params;

    // 构建 Jina Reader URL
    let readerUrl = `${this.jinaReaderUrl}${encodeURIComponent(url)}`;
    if (options.extract) {
      readerUrl += `?extract=${encodeURIComponent(options.extract)}`;
    }
    if (options.targetSelector) {
      readerUrl += `${options.extract ? '&' : '?'}target-selector=${encodeURIComponent(options.targetSelector)}`;
    }

    try {
      const response = await fetch(readerUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Jina Reader failed: ${response.status}`);
      }

      const text = await response.text();

      // 解析 Jina 返回的格式
      // 格式: ---url---\ntitle\n---content---\ncontent
      const parts = text.split('\n---\n');
      let title = '';
      let content = '';

      if (parts.length >= 2) {
        const header = parts[0].replace(/^https?:\/\//, '').trim();
        title = parts[1]?.trim() || '';
        content = parts.slice(2).join('\n---\n').trim();
      } else {
        content = text;
      }

      return {
        url,
        title,
        content,
        excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        readingTime: Math.ceil(content.split(/\s+/).length / 200),
      };
    } catch (error) {
      logger.error(`[AgentReach] Web fetch failed for ${url}:`, error);
      throw error;
    }
  }
}

// ============================================
// 搜索渠道 - Exa
// ============================================

class SearchChannel extends AgentReachChannel {
  private exaApiKey?: string;

  constructor() {
    super('Exa Search');
  }

  setApiKey(apiKey: string): void {
    this.exaApiKey = apiKey;
    this.configured = !!apiKey;
  }

  async checkAvailability(): Promise<boolean> {
    if (!this.exaApiKey) {
      return false;
    }
    try {
      const response = await fetch('https://api.exa.ai/health', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.exaApiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(params: {
    query: string;
    type?: 'auto' | 'keyword' | 'neural' | 'article' | 'homepage';
    numResults?: number;
    startCrawlDate?: string;
    endCrawlDate?: string;
    category?: string;
  }): Promise<SearchResult[]> {
    if (!this.exaApiKey) {
      throw new Error('Exa API key not configured');
    }

    const {
      query,
      type = 'auto',
      numResults = 10,
      startCrawlDate,
      endCrawlDate,
      category,
    } = params;

    const body: any = {
      query,
      type,
      numResults,
    };

    if (startCrawlDate || endCrawlDate) {
      body.crawlDate = {};
      if (startCrawlDate) body.crawlDate.startCrawlDate = startCrawlDate;
      if (endCrawlDate) body.crawlDate.endCrawlDate = endCrawlDate;
    }

    if (category) {
      body.category = category;
    }

    try {
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.exaApiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Exa search failed: ${error}`);
      }

      const data = await response.json();

      return (data.results || []).map((result: any) => ({
        url: result.url,
        title: result.title,
        snippet: result.snippet || result.text?.substring(0, 200),
        score: result.score,
        publishedAt: result.publishedAt,
      }));
    } catch (error) {
      logger.error('[AgentReach] Exa search failed:', error);
      throw error;
    }
  }
}

// ============================================
// GitHub 渠道
// ============================================

class GitHubChannel extends AgentReachChannel {
  constructor() {
    super('GitHub');
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/zen', {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(params: {
    action: 'repo' | 'issue' | 'pr' | 'user' | 'search';
    owner?: string;
    repo?: string;
    number?: number;
    query?: string;
    per_page?: number;
  }): Promise<any> {
    const { action, owner, repo, number, query, per_page = 10 } = params;

    let endpoint = '';
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    switch (action) {
      case 'repo':
        endpoint = `/repos/${owner}/${repo}`;
        break;
      case 'issue':
        endpoint = `/repos/${owner}/${repo}/issues/${number}`;
        break;
      case 'pr':
        endpoint = `/repos/${owner}/${repo}/pulls/${number}`;
        break;
      case 'user':
        endpoint = `/users/${owner}`;
        break;
      case 'search':
        endpoint = `/search/code?q=${encodeURIComponent(query || '')}&per_page=${per_page}`;
        break;
      default:
        throw new Error(`Unknown GitHub action: ${action}`);
    }

    try {
      const response = await fetch(`https://api.github.com${endpoint}`, {
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`GitHub API failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`[AgentReach] GitHub ${action} failed:`, error);
      throw error;
    }
  }
}

// ============================================
// 视频渠道 - YouTube/Bilibili
// ============================================

class VideoChannel extends AgentReachChannel {
  constructor() {
    super('Video (yt-dlp)');
  }

  async checkAvailability(): Promise<boolean> {
    // 视频功能需要服务端 yt-dlp 支持
    // 这里返回 true 表示客户端可以发起请求
    return true;
  }

  async execute(params: {
    url: string;
    platform?: 'auto' | 'youtube' | 'bilibili';
    extractSubtitles?: boolean;
    extractTranscript?: boolean;
    format?: 'json' | 'info';
  }): Promise<VideoInfo> {
    const { url, platform = 'auto', extractSubtitles = true, extractTranscript = true, format = 'json' } = params;

    // 对于客户端，我们使用 Web API 方式获取视频信息
    // 对于服务端，可以调用 yt-dlp

    if (platform === 'youtube' || (platform === 'auto' && url.includes('youtube.com'))) {
      return this.getYouTubeInfo(url, extractSubtitles, extractTranscript);
    } else if (platform === 'bilibili' || (platform === 'auto' && url.includes('bilibili.com'))) {
      return this.getBilibiliInfo(url);
    }

    throw new Error('Unsupported video platform');
  }

  private async getYouTubeInfo(url: string, extractSubtitles: boolean, extractTranscript: boolean): Promise<VideoInfo> {
    // 使用 noembed 或 yewtu.be 获取基本信息
    try {
      // 先获取基本信息
      const embedUrl = `https://yewtu.be/api/v1/videos/info?url=${encodeURIComponent(url)}`;

      // 使用 oembed 获取标题
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(10000) }
      );

      let title = '';
      let authorName = '';

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        title = oembedData.title;
        authorName = oembedData.author_name;
      }

      // 尝试获取字幕
      let subtitles: VideoSubtitle[] = [];
      let transcript = '';

      if (extractSubtitles || extractTranscript) {
        try {
          // 使用 Jina Reader 提取 YouTube 字幕
          const captionUrl = `${url.replace('watch?v=', 'api/transcript?video_id=')}`;
          const captionResponse = await fetch(`https://r.jina.ai/${encodeURIComponent(url + '&cc_load_policy=1')}`, {
            signal: AbortSignal.timeout(15000),
          });

          if (captionResponse.ok) {
            const captionText = await captionResponse.text();
            if (captionText.includes('<c>') || captionText.includes('<v>')) {
              // 检测到字幕格式
              transcript = captionText;
              subtitles = [{
                language: 'en',
                languageCode: 'en',
                content: captionText,
              }];
            }
          }
        } catch {
          // 字幕获取失败，继续
        }
      }

      return {
        url,
        title,
        author: authorName,
        subtitles,
        transcript,
      };
    } catch (error) {
      logger.error('[AgentReach] YouTube info fetch failed:', error);
      throw error;
    }
  }

  private async getBilibiliInfo(url: string): Promise<VideoInfo> {
    // 提取 BV 号
    const bvMatch = url.match(/BV[\w]+/);
    const bvid = bvMatch ? bvMatch[0] : null;

    if (!bvid) {
      throw new Error('Invalid Bilibili URL');
    }

    try {
      const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgentReach/1.0)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Bilibili API failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(`Bilibili API error: ${data.message}`);
      }

      const info = data.data;

      return {
        url,
        title: info.title,
        description: info.desc,
        thumbnail: info.pic,
        duration: info.duration,
        author: info.owner?.name,
        viewCount: info.stat?.view,
        publishedAt: new Date(info.pubdate * 1000).toISOString(),
      };
    } catch (error) {
      logger.error('[AgentReach] Bilibili info fetch failed:', error);
      throw error;
    }
  }
}

// ============================================
// RSS 渠道
// ============================================

class RSSChannel extends AgentReachChannel {
  constructor() {
    super('RSS/Atom Feed');
  }

  async checkAvailability(): Promise<boolean> {
    return true; // RSS 是通用协议，总是可用
  }

  async execute(params: { url: string; maxItems?: number }): Promise<any> {
    const { url, maxItems = 20 } = params;

    try {
      // 使用 Jina Reader 解析 RSS
      const readerUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const response = await fetch(readerUrl, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`RSS fetch failed: ${response.status}`);
      }

      const text = await response.text();

      // 简单解析 RSS 内容
      const items: any[] = [];
      const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

      for (let i = 0; i < Math.min(itemMatches.length, maxItems); i++) {
        const item = itemMatches[i];
        const titleMatch = item.match(/<title[^>]*>([^<]+)<\/title>/i);
        const linkMatch = item.match(/<link[^>]*>([^<]+)<\/link>/i);
        const descMatch = item.match(/<description[^>]*>([^<]+)<\/description>/i);
        const pubDateMatch = item.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);

        items.push({
          title: titleMatch ? titleMatch[1].trim() : '',
          link: linkMatch ? linkMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim().substring(0, 300) : '',
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
        });
      }

      return {
        feedUrl: url,
        items,
        itemCount: items.length,
      };
    } catch (error) {
      logger.error('[AgentReach] RSS fetch failed:', error);
      throw error;
    }
  }
}

// ============================================
// Twitter/X 渠道
// ============================================

class TwitterChannel extends AgentReachChannel {
  constructor() {
    super('Twitter/X');
  }

  async checkAvailability(): Promise<boolean> {
    // Twitter 需要认证，但我们可以检查公共服务
    return true;
  }

  async execute(params: {
    action: 'user' | 'tweet' | 'search';
    username?: string;
    tweetId?: string;
    query?: string;
    maxResults?: number;
  }): Promise<any> {
    const { action, username, tweetId, query, maxResults = 10 } = params;

    try {
      // 使用 Nitter 实例获取 Twitter 内容（无需认证）
      const nitterInstances = [
        'nitter.net',
        'nitter.privacydev.net',
        'nitter.poast.org',
        'xcancel.com',
      ];

      const instance = nitterInstances[0];

      switch (action) {
        case 'user': {
          if (!username) throw new Error('Username required');
          const response = await fetch(`https://${instance}/${username}`, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch user: ${response.status}`);
          }

          const html = await response.text();
          return this.parseUserProfile(html, username);
        }

        case 'tweet': {
          if (!tweetId) throw new Error('Tweet ID required');
          // 使用 Jina Reader 解析推文页面
          const tweetUrl = `https://twitter.com/i/status/${tweetId}`;
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(tweetUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch tweet: ${response.status}`);
          }

          const content = await response.text();
          return { content, tweetId, url: tweetUrl };
        }

        case 'search': {
          if (!query) throw new Error('Search query required');
          // 使用 XCancel 搜索
          const searchUrl = `https://xcancel.com/search?src=post&query=${encodeURIComponent(query)}`;
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(searchUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          const html = await response.text();
          return this.parseSearchResults(html, query);
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[AgentReach] Twitter ${action} failed:`, error);
      throw error;
    }
  }

  private parseUserProfile(html: string, username: string): any {
    // 简单的 HTML 解析
    const nameMatch = html.match(/class="profile-card- bio"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)/);
    const bioMatch = html.match(/class="profile-bio"[^>]*>([\s\S]*?)<\/p>/);
    const statsMatch = html.match(/class="profile-stat"[^>]*>.*?<span[^>]*class="stat-count">([0-9,]+)/g);

    return {
      platform: 'twitter',
      username,
      name: nameMatch ? nameMatch[1].trim() : username,
      bio: bioMatch ? bioMatch[1].replace(/<[^>]+>/g, '').trim() : '',
      stats: statsMatch ? this.parseStats(statsMatch) : {},
      fetchedAt: new Date().toISOString(),
    };
  }

  private parseStats(matches: string[]): any {
    const stats: any = {};
    const labels = ['tweets', 'following', 'followers'];
    matches.forEach((match, i) => {
      if (labels[i]) {
        const statMatch = match.match(/class="profile-stat"[^>]*>.*?<span[^>]*class="stat-count">([0-9,]+)/);
        if (statMatch && statMatch[1]) {
          stats[labels[i]] = parseInt(statMatch[1].replace(/,/g, ''), 10);
        }
      }
    });
    return stats;
  }

  private parseSearchResults(html: string, query: string): any {
    const results: any[] = [];
    const tweetMatches = html.match(/<div class="tweet-body"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi) || [];

    for (const match of tweetMatches.slice(0, 10)) {
      const contentMatch = match.match(/<p[^>]*class="tweet-content"[^>]*>([\s\S]*?)<\/p>/);
      const authorMatch = match.match(/class="username"[^>]*>@([^<]+)/);
      const timeMatch = match.match(/class="tweet-date"[^>]*><a[^>]*>([^<]+)/);

      if (contentMatch) {
        results.push({
          content: contentMatch[1].replace(/<[^>]+>/g, '').trim(),
          author: authorMatch ? authorMatch[1] : 'unknown',
          time: timeMatch ? timeMatch[1].trim() : '',
        });
      }
    }

    return {
      query,
      results,
      count: results.length,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ============================================
// Reddit 渠道
// ============================================

class RedditChannel extends AgentReachChannel {
  constructor() {
    super('Reddit');
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch('https://www.reddit.com/.json', {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async execute(params: {
    action: 'subreddit' | 'post' | 'user' | 'search';
    subreddit?: string;
    postId?: string;
    username?: string;
    query?: string;
    sort?: 'hot' | 'new' | 'top' | 'rising';
    limit?: number;
  }): Promise<any> {
    const {
      action, subreddit, postId, username, query,
      sort = 'hot', limit = 10
    } = params;

    try {
      switch (action) {
        case 'subreddit': {
          if (!subreddit) throw new Error('Subreddit name required');
          const response = await fetch(
            `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`,
            {
              headers: { 'User-Agent': 'AgentReach/1.0' },
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!response.ok) {
            throw new Error(`Subreddit fetch failed: ${response.status}`);
          }

          const data = await response.json();
          return this.parseSubredditPosts(data, subreddit);
        }

        case 'post': {
          if (!postId) throw new Error('Post ID required');
          const response = await fetch(
            `https://www.reddit.com/comments/${postId}.json`,
            {
              headers: { 'User-Agent': 'AgentReach/1.0' },
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!response.ok) {
            throw new Error(`Post fetch failed: ${response.status}`);
          }

          const data = await response.json();
          return this.parsePost(data[0]?.data?.children?.[0]?.data);
        }

        case 'user': {
          if (!username) throw new Error('Username required');
          const response = await fetch(
            `https://www.reddit.com/user/${username}/about.json`,
            {
              headers: { 'User-Agent': 'AgentReach/1.0' },
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!response.ok) {
            throw new Error(`User fetch failed: ${response.status}`);
          }

          const data = await response.json();
          return this.parseUser(data.data);
        }

        case 'search': {
          if (!query) throw new Error('Search query required');
          const response = await fetch(
            `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${limit}`,
            {
              headers: { 'User-Agent': 'AgentReach/1.0' },
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          const data = await response.json();
          return this.parseSubredditPosts(data, `search:${query}`);
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[AgentReach] Reddit ${action} failed:`, error);
      throw error;
    }
  }

  private parseSubredditPosts(data: any, subreddit: string): any {
    const posts = (data.data?.children || []).map((child: any) => {
      const post = child.data;
      return {
        id: post.id,
        title: post.title,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        numComments: post.num_comments,
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        createdAt: new Date(post.created_utc * 1000).toISOString(),
        isSelf: post.is_self,
        selfText: post.selftext?.substring(0, 500),
        linkFlairText: post.link_flair_text,
      };
    });

    return {
      subreddit,
      posts,
      count: posts.length,
      fetchedAt: new Date().toISOString(),
    };
  }

  private parsePost(post: any): any {
    if (!post) return null;
    return {
      id: post.id,
      title: post.title,
      author: post.author,
      subreddit: post.subreddit,
      score: post.score,
      numComments: post.num_comments,
      content: post.selftext,
      url: post.url,
      permalink: `https://reddit.com${post.permalink}`,
      createdAt: new Date(post.created_utc * 1000).toISOString(),
      media: post.media?.oembed,
    };
  }

  private parseUser(user: any): any {
    if (!user) return null;
    return {
      id: user.id,
      username: user.name,
      createdAt: new Date(user.created_utf * 1000).toISOString(),
      karma: user.total_karma,
      linkKarma: user.link_karma,
      commentKarma: user.comment_karma,
      iconImg: user.icon_img,
      awarderKarma: user.awarder_karma,
      awardeeKarma: user.awardee_karma,
      hasVerifiedEmail: user.has_verified_email,
      isGold: user.is_gold,
      isMod: user.is_mod,
      subreddit: user.subreddit ? {
        title: user.subreddit.title,
        publicDescription: user.subreddit.public_description,
      } : null,
    };
  }
}

// ============================================
// LinkedIn 渠道
// ============================================

class LinkedInChannel extends AgentReachChannel {
  constructor() {
    super('LinkedIn');
  }

  async checkAvailability(): Promise<boolean> {
    // LinkedIn 需要认证，我们只能通过公开 API 检测
    return true;
  }

  async execute(params: {
    action: 'profile' | 'company' | 'post' | 'search';
    username?: string;  // LinkedIn username or public URL identifier
    companyId?: string;
    postUrn?: string;
    keywords?: string;
  }): Promise<any> {
    const { action, username, companyId, postUrn, keywords } = params;

    try {
      switch (action) {
        case 'profile': {
          if (!username) throw new Error('LinkedIn username/ID required');
          // 使用 proxycurl 或类似服务（需要 API key）
          // 这里提供结构化的请求信息
          return {
            platform: 'linkedin',
            action: 'profile',
            identifier: username,
            note: 'LinkedIn requires authentication or API access',
            suggestedEndpoint: `https://api.proxyscrape.com/v1/?request=getProfile&linkedin_username=${username}`,
          };
        }

        case 'company': {
          if (!companyId) throw new Error('Company ID required');
          return {
            platform: 'linkedin',
            action: 'company',
            identifier: companyId,
            note: 'LinkedIn company pages require authentication',
          };
        }

        case 'search': {
          if (!keywords) throw new Error('Search keywords required');
          // 尝试使用 Google 搜索 LinkedIn 结果
          const searchQuery = encodeURIComponent(`${keywords} site:linkedin.com/in`);
          return {
            platform: 'linkedin',
            action: 'search',
            keywords,
            suggestedSearchUrl: `https://www.google.com/search?q=${searchQuery}`,
            note: 'Use search results to extract profile URLs',
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[AgentReach] LinkedIn ${action} failed:`, error);
      throw error;
    }
  }
}

// ============================================
// Facebook 渠道
// ============================================

class FacebookChannel extends AgentReachChannel {
  constructor() {
    super('Facebook');
  }

  async checkAvailability(): Promise<boolean> {
    // Facebook 公开页面可以访问
    try {
      const response = await fetch('https://www.facebook.com/', {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 403; // Facebook 可能返回 403 但仍然可用
    } catch {
      return false;
    }
  }

  async execute(params: {
    action: 'page' | 'group' | 'post' | 'search';
    pageId?: string;
    groupId?: string;
    postUrl?: string;
    query?: string;
    limit?: number;
  }): Promise<any> {
    const { action, pageId, groupId, postUrl, query, limit = 10 } = params;

    try {
      switch (action) {
        case 'page': {
          if (!pageId) throw new Error('Page ID required');
          // 使用 GraphQL API 获取公开页面信息
          const pageUrl = `https://www.facebook.com/${pageId}`;
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(pageUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Page fetch failed: ${response.status}`);
          }

          const content = await response.text();
          return this.parsePageInfo(content, pageId);
        }

        case 'group': {
          if (!groupId) throw new Error('Group ID required');
          const groupUrl = `https://www.facebook.com/groups/${groupId}`;
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(groupUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Group fetch failed: ${response.status}`);
          }

          const content = await response.text();
          return this.parseGroupInfo(content, groupId);
        }

        case 'post': {
          if (!postUrl) throw new Error('Post URL required');
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(postUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Post fetch failed: ${response.status}`);
          }

          const content = await response.text();
          return this.parsePostContent(content, postUrl);
        }

        case 'search': {
          if (!query) throw new Error('Search query required');
          // 使用 Facebook 搜索
          const searchUrl = `https://www.facebook.com/search/top?q=${encodeURIComponent(query)}`;
          const readerUrl = `https://r.jina.ai/${encodeURIComponent(searchUrl)}`;
          const response = await fetch(readerUrl, {
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          const content = await response.text();
          return this.parseSearchResults(content, query);
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[AgentReach] Facebook ${action} failed:`, error);
      throw error;
    }
  }

  private parsePageInfo(html: string, pageId: string): any {
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const aboutMatch = html.match(/About[:\s]*([\s\S]{0,500}?)(?=Followers|$)/i);
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);

    return {
      platform: 'facebook',
      type: 'page',
      id: pageId,
      name: nameMatch ? nameMatch[1].trim() : pageId,
      about: aboutMatch ? aboutMatch[1].trim() : (descriptionMatch ? descriptionMatch[1] : ''),
      fetchedAt: new Date().toISOString(),
      note: 'Facebook pages may require authentication for full data',
    };
  }

  private parseGroupInfo(html: string, groupId: string): any {
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const descriptionMatch = html.match(/<meta name="description" content="([^"]+)"/);

    return {
      platform: 'facebook',
      type: 'group',
      id: groupId,
      name: nameMatch ? nameMatch[1].trim() : groupId,
      description: descriptionMatch ? descriptionMatch[1] : '',
      fetchedAt: new Date().toISOString(),
      note: 'Facebook groups may require membership for full access',
    };
  }

  private parsePostContent(content: string, url: string): any {
    // 提取帖子内容
    const lines = content.split('\n').filter(line => line.trim());
    const titleMatch = content.match(/(.{10,100})/);

    return {
      platform: 'facebook',
      type: 'post',
      url,
      content: content.substring(0, 2000),
      excerpt: titleMatch ? titleMatch[1].trim() : lines[0] || '',
      fetchedAt: new Date().toISOString(),
    };
  }

  private parseSearchResults(content: string, query: string): any {
    const results: any[] = [];
    const linkMatches = content.match(/https?:\/\/www\.facebook\.com\/[^\s<>"{}|\\^`\[\]]+/gi) || [];

    const seenUrls = new Set<string>();
    for (const url of linkMatches.slice(0, 20)) {
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        const pageName = url.match(/facebook\.com\/([^/?]+)/)?.[1] || '';
        results.push({
          url,
          name: pageName.replace(/-/g, ' '),
          type: url.includes('/groups/') ? 'group' : url.includes('/pages/') ? 'page' : 'profile',
        });
      }
    }

    return {
      platform: 'facebook',
      query,
      results,
      count: results.length,
      fetchedAt: new Date().toISOString(),
    };
  }
}

// ============================================
// Instagram 渠道
// ============================================

class InstagramChannel extends AgentReachChannel {
  constructor() {
    super('Instagram');
  }

  async checkAvailability(): Promise<boolean> {
    // Instagram 公开内容可以访问
    try {
      const response = await fetch('https://www.instagram.com/', {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 403;
    } catch {
      return false;
    }
  }

  async execute(params: {
    action: 'profile' | 'post' | 'hashtag' | 'search';
    username?: string;
    postUrl?: string;
    hashtag?: string;
    query?: string;
    limit?: number;
  }): Promise<any> {
    const { action, username, postUrl, hashtag, query, limit = 12 } = params;

    try {
      switch (action) {
        case 'profile': {
          if (!username) throw new Error('Username required');
          return this.getProfileInfo(username);
        }

        case 'post': {
          if (!postUrl) throw new Error('Post URL required');
          return this.getPostInfo(postUrl);
        }

        case 'hashtag': {
          if (!hashtag) throw new Error('Hashtag required');
          return this.getHashtagPosts(hashtag, limit);
        }

        case 'search': {
          if (!query) throw new Error('Search query required');
          return this.searchContent(query);
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`[AgentReach] Instagram ${action} failed:`, error);
      throw error;
    }
  }

  private async getProfileInfo(username: string): Promise<any> {
    const profileUrl = `https://www.instagram.com/${username}/`;
    const readerUrl = `https://r.jina.ai/${encodeURIComponent(profileUrl)}`;

    const response = await fetch(readerUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.status}`);
    }

    const content = await response.text();
    return this.parseProfileInfo(content, username);
  }

  private async getPostInfo(postUrl: string): Promise<any> {
    const readerUrl = `https://r.jina.ai/${encodeURIComponent(postUrl)}`;
    const response = await fetch(readerUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Post fetch failed: ${response.status}`);
    }

    const content = await response.text();
    return {
      platform: 'instagram',
      type: 'post',
      url: postUrl,
      content: content.substring(0, 2000),
      fetchedAt: new Date().toISOString(),
      note: 'Instagram posts require authentication for full metadata',
    };
  }

  private async getHashtagPosts(hashtag: string, limit: number): Promise<any> {
    const hashtagUrl = `https://www.instagram.com/explore/tags/${hashtag}/`;
    const readerUrl = `https://r.jina.ai/${encodeURIComponent(hashtagUrl)}`;

    const response = await fetch(readerUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Hashtag fetch failed: ${response.status}`);
    }

    const content = await response.text();
    return this.parseHashtagContent(content, hashtag, limit);
  }

  private async searchContent(query: string): Promise<any> {
    const searchUrl = `https://www.instagram.com/search?q=${encodeURIComponent(query)}`;
    const readerUrl = `https://r.jina.ai/${encodeURIComponent(searchUrl)}`;

    const response = await fetch(readerUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const content = await response.text();
    return {
      platform: 'instagram',
      query,
      content: content.substring(0, 1500),
      fetchedAt: new Date().toISOString(),
      note: 'Search results require authentication for full data',
    };
  }

  private parseProfileInfo(html: string, username: string): any {
    const nameMatch = html.match(/"full_name"\s*:\s*"([^"]+)"/);
    const bioMatch = html.match(/"biography"\s*:\s*"([^"]+)"/);
    const followersMatch = html.match(/"edge_followed_by"\s*:\s*\{[^}]*"count"\s*:\s*(\d+)/);
    const followingMatch = html.match(/"edge_follow"\s*:\s*\{[^}]*"count"\s*:\s*(\d+)/);
    const postsMatch = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{[^}]*"count"\s*:\s*(\d+)/);

    return {
      platform: 'instagram',
      type: 'profile',
      username,
      fullName: nameMatch ? nameMatch[1].replace(/\\u[\dA-F]{4}/gi, (match) => 
        String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))) : '',
      bio: bioMatch ? bioMatch[1].replace(/\\u[\dA-F]{4}/gi, (match) =>
        String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))) : '',
      followers: followersMatch ? parseInt(followersMatch[1], 10) : null,
      following: followingMatch ? parseInt(followingMatch[1], 10) : null,
      postsCount: postsMatch ? parseInt(postsMatch[1], 10) : null,
      fetchedAt: new Date().toISOString(),
      note: 'Instagram requires authentication for complete profile data',
    };
  }

  private parseHashtagContent(content: string, hashtag: string, limit: number): any {
    // 提取帖子链接
    const postUrls: string[] = [];
    const urlRegex = /https?:\/\/www\.instagram\.com\/p\/[^\/\s?]+/gi;
    let match;
    while ((match = urlRegex.exec(content)) && postUrls.length < limit) {
      if (!postUrls.includes(match[0])) {
        postUrls.push(match[0]);
      }
    }

    return {
      platform: 'instagram',
      type: 'hashtag',
      hashtag,
      posts: postUrls,
      count: postUrls.length,
      fetchedAt: new Date().toISOString(),
      note: 'Hashtag posts require authentication for full metadata',
    };
  }
}

// ============================================
// AgentReach 服务主类
// ============================================

export class AgentReachService {
  private static instance: AgentReachService;

  // 渠道实例
  private webChannel: WebChannel;
  private searchChannel: SearchChannel;
  private githubChannel: GitHubChannel;
  private videoChannel: VideoChannel;
  private rssChannel: RSSChannel;
  private twitterChannel: TwitterChannel;
  private redditChannel: RedditChannel;
  private linkedinChannel: LinkedInChannel;
  private facebookChannel: FacebookChannel;
  private instagramChannel: InstagramChannel;

  // 缓存管理器
  private cacheManager: CacheManager;

  // 配置
  private exaApiKey?: string;

  private constructor() {
    this.webChannel = new WebChannel();
    this.searchChannel = new SearchChannel();
    this.githubChannel = new GitHubChannel();
    this.videoChannel = new VideoChannel();
    this.rssChannel = new RSSChannel();
    this.twitterChannel = new TwitterChannel();
    this.redditChannel = new RedditChannel();
    this.linkedinChannel = new LinkedInChannel();
    this.facebookChannel = new FacebookChannel();
    this.instagramChannel = new InstagramChannel();
    this.cacheManager = new CacheManager();

    logger.info('[AgentReach] Service initialized');
  }

  static getInstance(): AgentReachService {
    if (!AgentReachService.instance) {
      AgentReachService.instance = new AgentReachService();
    }
    return AgentReachService.instance;
  }

  // ============================================
  // 配置方法
  // ============================================

  setExaApiKey(apiKey: string): void {
    this.exaApiKey = apiKey;
    this.searchChannel.setApiKey(apiKey);
    logger.info('[AgentReach] Exa API key configured');
  }

  getExaApiKey(): string | undefined {
    return this.exaApiKey;
  }

  // ============================================
  // 渠道操作方法
  // ============================================

  /**
   * 读取网页内容
   */
  async readWebPage(url: string, options?: { extract?: string; targetSelector?: string }): Promise<WebPageContent> {
    return this.webChannel.execute({ url, options });
  }

  /**
   * 搜索互联网
   */
  async search(query: string, options?: {
    type?: 'auto' | 'keyword' | 'neural' | 'article' | 'homepage';
    numResults?: number;
    startCrawlDate?: string;
    endCrawlDate?: string;
    category?: string;
  }): Promise<SearchResult[]> {
    if (!this.exaApiKey) {
      // 如果没有 Exa API key，回退到 DuckDuckGo 搜索
      logger.warn('[AgentReach] No Exa API key, falling back to web search');
      return this.fallbackSearch(query, options?.numResults || 10);
    }
    return this.searchChannel.execute({ query, ...options });
  }

  /**
   * 回退搜索 - 使用 DuckDuckGo (带 CORS 代理)
   */
  private async fallbackSearch(query: string, numResults: number = 10): Promise<SearchResult[]> {
    // CORS 代理列表
    const CORS_PROXIES = [
      'https://corsproxy.io/?',
      'https://api.allorigins.win/raw?url=',
    ];

    const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=wt-wt`;

    for (const proxy of CORS_PROXIES) {
      try {
        const proxiedUrl = proxy + encodeURIComponent(searchUrl);
        const response = await fetch(proxiedUrl, { signal: AbortSignal.timeout(15000) });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const html = await response.text();

        // 解析 DuckDuckGo 结果
        const results: SearchResult[] = [];
        const resultMatches = html.match(/<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi) || [];

        for (const match of resultMatches.slice(0, numResults)) {
          const urlMatch = match.match(/href="([^"]+)"/);
          const titleMatch = match.match(/>([^<]+)<\/a>/);
          const snippetMatch = match.match(/result__snippet"[^>]*>([\s\S]*?)</);

          if (urlMatch && titleMatch) {
            results.push({
              url: urlMatch[1],
              title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
              snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '',
            });
          }
        }

        return results;
      } catch (error) {
        console.warn(`Proxy ${proxy} failed for fallback search:`, error);
        continue;
      }
    }

    throw new Error('All search proxies failed. Please check your internet connection.');
  }

  /**
   * 获取 GitHub 信息
   */
  async getGitHubInfo(params: {
    action: 'repo' | 'issue' | 'pr' | 'user' | 'search';
    owner?: string;
    repo?: string;
    number?: number;
    query?: string;
    per_page?: number;
  }): Promise<any> {
    return this.githubChannel.execute(params);
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(url: string, options?: {
    platform?: 'auto' | 'youtube' | 'bilibili';
    extractSubtitles?: boolean;
    extractTranscript?: boolean;
  }): Promise<VideoInfo> {
    return this.videoChannel.execute({ url, ...options });
  }

  /**
   * 获取 RSS/Atom 内容
   */
  async getRSSFeed(url: string, maxItems?: number): Promise<any> {
    return this.rssChannel.execute({ url, maxItems });
  }

  // ============================================
  // 社交媒体方法
  // ============================================

  /**
   * 获取 Twitter/X 用户信息或推文
   */
  async getTwitterInfo(params: {
    action: 'user' | 'tweet' | 'search';
    username?: string;
    tweetId?: string;
    query?: string;
    maxResults?: number;
  }): Promise<any> {
    // 使用缓存
    const cacheKey = `social:twitter:${params.action}:${params.username || ''}:${params.tweetId || ''}:${params.query || ''}`;
    const cached = this.cacheManager.get<any>(cacheKey);
    if (cached) {
      logger.debug('[AgentReach] Twitter cache hit');
      return cached;
    }

    const result = await this.twitterChannel.execute(params);
    this.cacheManager.set(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存
    return result;
  }

  /**
   * 获取 Reddit 内容（帖子、用户、搜索）
   */
  async getRedditInfo(params: {
    action: 'subreddit' | 'post' | 'user' | 'search';
    subreddit?: string;
    postId?: string;
    username?: string;
    query?: string;
    sort?: 'hot' | 'new' | 'top' | 'rising';
    limit?: number;
  }): Promise<any> {
    // 使用缓存
    const cacheKey = `social:reddit:${params.action}:${params.subreddit || ''}:${params.postId || ''}:${params.username || ''}:${params.query || ''}:${params.sort || 'hot'}`;
    const cached = this.cacheManager.get<any>(cacheKey);
    if (cached) {
      logger.debug('[AgentReach] Reddit cache hit');
      return cached;
    }

    const result = await this.redditChannel.execute(params);
    this.cacheManager.set(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存
    return result;
  }

  /**
   * 获取 LinkedIn 公开内容
   */
  async getLinkedInInfo(params: {
    action: 'profile' | 'company' | 'search';
    username?: string;
    companyId?: string;
    keywords?: string;
  }): Promise<any> {
    // LinkedIn 需要特殊处理（通常需要认证）
    const result = await this.linkedinChannel.execute(params);
    return result;
  }

  /**
   * 获取 Facebook 公开内容
   */
  async getFacebookInfo(params: {
    action: 'page' | 'group' | 'post' | 'search';
    pageId?: string;
    groupId?: string;
    postUrl?: string;
    query?: string;
    limit?: number;
  }): Promise<any> {
    // 使用缓存
    const cacheKey = `social:facebook:${params.action}:${params.pageId || ''}:${params.groupId || ''}:${params.query || ''}`;
    const cached = this.cacheManager.get<any>(cacheKey);
    if (cached) {
      logger.debug('[AgentReach] Facebook cache hit');
      return cached;
    }

    const result = await this.facebookChannel.execute(params);
    this.cacheManager.set(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存
    return result;
  }

  /**
   * 获取 Instagram 公开内容
   */
  async getInstagramInfo(params: {
    action: 'profile' | 'post' | 'hashtag' | 'search';
    username?: string;
    postUrl?: string;
    hashtag?: string;
    query?: string;
    limit?: number;
  }): Promise<any> {
    // 使用缓存
    const cacheKey = `social:instagram:${params.action}:${params.username || ''}:${params.hashtag || ''}:${params.query || ''}`;
    const cached = this.cacheManager.get<any>(cacheKey);
    if (cached) {
      logger.debug('[AgentReach] Instagram cache hit');
      return cached;
    }

    const result = await this.instagramChannel.execute(params);
    this.cacheManager.set(cacheKey, result, 2 * 60 * 1000); // 2分钟缓存
    return result;
  }

  // ============================================
  // 缓存管理方法
  // ============================================

  /**
   * 清除缓存
   */
  clearCache(prefix?: 'search' | 'webPage' | 'github' | 'social'): void {
    if (prefix) {
      this.cacheManager.clear(prefix);
      logger.info(`[AgentReach] Cache cleared: ${prefix}`);
    } else {
      this.cacheManager.clear();
      logger.info('[AgentReach] All cache cleared');
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  // ============================================
  // 诊断方法
  // ============================================

  /**
   * 检查所有渠道状态
   */
  async diagnose(): Promise<DiagnosisResult> {
    const channels: ChannelStatus[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Web Reader
    const webAvailable = await this.webChannel.isAvailable();
    channels.push({
      name: 'Web Reader (Jina)',
      enabled: true,
      available: webAvailable,
      configured: true,
      error: webAvailable ? undefined : 'Jina Reader service unavailable',
    });

    // Exa Search
    const searchAvailable = await this.searchChannel.isAvailable();
    channels.push({
      name: 'Exa Search',
      enabled: !!this.exaApiKey,
      available: searchAvailable,
      configured: !!this.exaApiKey,
      error: !this.exaApiKey ? 'API key not configured' : (searchAvailable ? undefined : 'Service unavailable'),
    });

    if (!this.exaApiKey) {
      issues.push('Exa API key not configured - limited search capability');
      recommendations.push('Get free Exa API key at https://exa.ai');
    }

    // GitHub
    const githubAvailable = await this.githubChannel.isAvailable();
    channels.push({
      name: 'GitHub',
      enabled: true,
      available: githubAvailable,
      configured: true,
    });

    // Video
    const videoAvailable = await this.videoChannel.isAvailable();
    channels.push({
      name: 'Video (YouTube/Bilibili)',
      enabled: true,
      available: videoAvailable,
      configured: true,
    });

    // RSS
    const rssAvailable = await this.rssChannel.isAvailable();
    channels.push({
      name: 'RSS/Atom Feed',
      enabled: true,
      available: rssAvailable,
      configured: true,
    });

    // Twitter/X
    const twitterAvailable = await this.twitterChannel.isAvailable();
    channels.push({
      name: 'Twitter/X',
      enabled: true,
      available: twitterAvailable,
      configured: true,
      error: twitterAvailable ? undefined : 'Nitter instances may be unavailable',
    });

    // Reddit
    const redditAvailable = await this.redditChannel.isAvailable();
    channels.push({
      name: 'Reddit',
      enabled: true,
      available: redditAvailable,
      configured: true,
    });

    // LinkedIn
    const linkedinAvailable = await this.linkedinChannel.isAvailable();
    channels.push({
      name: 'LinkedIn',
      enabled: true,
      available: linkedinAvailable,
      configured: true,
      error: 'LinkedIn requires authentication for most content',
    });

    // Facebook
    const facebookAvailable = await this.facebookChannel.isAvailable();
    channels.push({
      name: 'Facebook',
      enabled: true,
      available: facebookAvailable,
      configured: true,
      error: 'Facebook requires authentication for most content',
    });

    // Instagram
    const instagramAvailable = await this.instagramChannel.isAvailable();
    channels.push({
      name: 'Instagram',
      enabled: true,
      available: instagramAvailable,
      configured: true,
      error: 'Instagram requires authentication for most content',
    });

    // 计算整体状态
    const availableCount = channels.filter(c => c.available).length;
    const overall: 'healthy' | 'degraded' | 'unhealthy' =
      availableCount >= 6 ? 'healthy' :
      availableCount >= 3 ? 'degraded' : 'unhealthy';

    return {
      checkedAt: new Date().toISOString(),
      channels,
      overall,
      issues,
      recommendations,
    };
  }

  /**
   * 获取渠道状态列表
   */
  async getChannelStatuses(): Promise<ChannelStatus[]> {
    const diagnosis = await this.diagnose();
    return diagnosis.channels;
  }
}

// 导出单例
export const agentReachService = AgentReachService.getInstance();

export default AgentReachService;
