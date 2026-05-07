/**
 * 消息验证和清理工具
 * 用于验证和清理消息内容，防止注入攻击和安全问题
 */

export class MessageSanitizer {
  /**
   * 清理文本消息
   * @param content 消息内容
   * @returns 清理后的消息内容
   */
  static sanitizeText(content: string): string {
    if (!content) return '';

    // 先转义特殊字符，避免普通 < > 被误当作标签移除
    let sanitized = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 移除控制字符
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // 限制长度
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }
  
  /**
   * 验证消息内容
   * @param content 消息内容
   * @returns 验证结果
   */
  static validateMessage(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }
    
    if (content.length > 10000) {
      errors.push('Message content too long (maximum 10000 characters)');
    }
    
    // 检查是否包含恶意内容
    const maliciousPatterns = [
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\(/gi,
      /function\(/gi,
      /<script/gi,
      /<iframe/gi
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        errors.push('Message contains potentially malicious content');
        break;
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * 验证附件
   * @param attachments 附件列表
   * @returns 验证结果
   */
  static validateAttachments(attachments: Array<{ type: string; url: string; name?: string }>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!attachments) return { valid: true, errors };
    
    if (attachments.length > 10) {
      errors.push('Too many attachments (maximum 10)');
    }
    
    for (const attachment of attachments) {
      if (!attachment.type || !['file', 'image', 'link'].includes(attachment.type)) {
        errors.push('Invalid attachment type');
      }
      
      if (!attachment.url) {
        errors.push('Attachment URL cannot be empty');
      } else {
        // 验证URL格式
        try {
          new URL(attachment.url);
        } catch {
          errors.push('Invalid attachment URL');
        }
        // 拒绝 javascript: URL
        if (/^javascript:/i.test(attachment.url)) {
          errors.push('Invalid attachment URL');
        }
      }
      
      if (attachment.name && attachment.name.length > 255) {
        errors.push('Attachment name too long (maximum 255 characters)');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * 清理消息请求
   * @param request 消息请求
   * @returns 清理后的消息请求
   */
  static sanitizeMessageRequest(request: {
    channelId: string;
    templateId?: string;
    content: string;
    variables?: Record<string, string>;
    attachments?: Array<{ type: string; url: string; name?: string }>;
  }): {
    channelId: string;
    templateId?: string;
    content: string;
    variables?: Record<string, string>;
    attachments?: Array<{ type: "file" | "image" | "link"; url: string; name?: string }>;
  } {
    return {
      channelId: request.channelId,
      templateId: request.templateId,
      content: this.sanitizeText(request.content),
      variables: request.variables ? Object.fromEntries(
        Object.entries(request.variables).map(([key, value]) => [key, this.sanitizeText(value)])
      ) : undefined,
      attachments: request.attachments ? request.attachments.map(attachment => ({
        type: attachment.type as "file" | "image" | "link",
        url: attachment.url,
        name: attachment.name ? this.sanitizeText(attachment.name) : undefined
      })) : undefined
    };
  }
  
  /**
   * 验证消息请求
   * @param request 消息请求
   * @returns 验证结果
   */
  static validateMessageRequest(request: {
    channelId: string;
    templateId?: string;
    content: string;
    variables?: Record<string, string>;
    attachments?: Array<{ type: string; url: string; name?: string }>;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.channelId) {
      errors.push('Channel ID is required');
    }
    
    const contentValidation = this.validateMessage(request.content);
    if (!contentValidation.valid) {
      errors.push(...contentValidation.errors);
    }
    
    if (request.variables) {
      for (const [key, value] of Object.entries(request.variables)) {
        if (!key || !value) {
          errors.push('Variable key and value cannot be empty');
        }
      }
    }
    
    const attachmentValidation = this.validateAttachments(request.attachments || []);
    if (!attachmentValidation.valid) {
      errors.push(...attachmentValidation.errors);
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export const messageSanitizer = MessageSanitizer;