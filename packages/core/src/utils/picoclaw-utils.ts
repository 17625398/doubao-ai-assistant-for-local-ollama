/**
 * PicoClaw 工具函数
 * 提供 PicoClaw 集成相关的工具方法
 */
import { PicoClawConfig } from '../services/chatclaw-picoclaw-service';

/**
 * 验证 PicoClaw 配置
 */
export function validatePicoClawConfig(config: PicoClawConfig): string[] {
  const errors: string[] = [];

  // 验证 Gateway URL
  if (!config.gatewayUrl) {
    errors.push('Gateway URL is required');
  } else if (!isValidUrl(config.gatewayUrl)) {
    errors.push('Invalid Gateway URL');
  }

  // 验证模型配置
  if (!config.models) {
    errors.push('Models configuration is required');
  } else {
    if (!config.models.lightweight) {
      errors.push('Lightweight model configuration is required');
    } else {
      if (!config.models.lightweight.provider) {
        errors.push('Lightweight model provider is required');
      }
      if (!config.models.lightweight.model) {
        errors.push('Lightweight model name is required');
      }
    }

    if (!config.models.heavyweight) {
      errors.push('Heavyweight model configuration is required');
    } else {
      if (!config.models.heavyweight.provider) {
        errors.push('Heavyweight model provider is required');
      }
      if (!config.models.heavyweight.model) {
        errors.push('Heavyweight model name is required');
      }
    }
  }

  // 验证通道配置
  const channels = Object.keys(config.channels || {});
  for (const channel of channels) {
    const channelConfig = config.channels[channel as keyof typeof config.channels];
    if (channelConfig?.enabled) {
      if (!channelConfig.token) {
        errors.push(`${channel} channel token is required`);
      }
    }
  }

  return errors;
}

/**
 * 验证 URL 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成 PicoClaw 配置示例
 */
export function generatePicoClawConfigExample(): PicoClawConfig {
  return {
    enabled: true,
    gatewayUrl: 'http://localhost:18800',
    channels: {
      telegram: {
        enabled: true,
        token: 'YOUR_TELEGRAM_BOT_TOKEN'
      },
      discord: {
        enabled: false,
        token: 'YOUR_DISCORD_BOT_TOKEN'
      },
      slack: {
        enabled: false,
        token: 'YOUR_SLACK_BOT_TOKEN'
      }
    },
    models: {
      lightweight: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'YOUR_DEEPSEEK_API_KEY'
      },
      heavyweight: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: 'YOUR_OPENAI_API_KEY'
      }
    },
    skills: {
      enabled: true,
      directory: './skills'
    },
    cron: {
      enabled: true
    }
  };
}

/**
 * 格式化 PicoClaw 状态
 */
export function formatPicoClawStatus(status: any): string {
  if (status.status === 'running') {
    return `PicoClaw is running (Memory: ${status.memoryUsage || 'N/A'}MB)`;
  } else if (status.status === 'error') {
    return 'PicoClaw has an error';
  } else {
    return 'PicoClaw is stopped';
  }
}

/**
 * 计算消息复杂度
 * 用于模型路由
 */
export function calculateMessageComplexity(message: string): number {
  // 基于消息长度、词汇多样性和复杂度标记计算复杂度
  const lengthScore = Math.min(message.length / 500, 1);
  
  // 检查是否包含代码、数学公式等复杂内容
  const hasCode = /```[\s\S]*?```/.test(message);
  const hasMath = /\$[\s\S]*?\$/.test(message);
  const hasMultipleQuestions = message.split('?').length > 2;
  
  let complexityScore = lengthScore;
  
  if (hasCode) complexityScore += 0.3;
  if (hasMath) complexityScore += 0.2;
  if (hasMultipleQuestions) complexityScore += 0.1;
  
  return Math.min(complexityScore, 1);
}

/**
 * 选择合适的模型
 */
export function selectModel(complexity: number): 'lightweight' | 'heavyweight' {
  // 复杂度阈值，可配置
  const threshold = 0.6;
  return complexity > threshold ? 'heavyweight' : 'lightweight';
}

/**
 * 构建 PicoClaw API 请求头
 */
export function buildPicoClawHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  return headers;
}

/**
 * 处理 PicoClaw API 响应
 */
export async function handlePicoClawResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `PicoClaw API error: ${response.status}`);
  }
  
  return response.json();
}
