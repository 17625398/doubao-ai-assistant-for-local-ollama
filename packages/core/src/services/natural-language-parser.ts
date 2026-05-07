export class NaturalLanguageParser {
  /**
   * 解析自然语言指令
   * @param instruction 自然语言指令
   * @returns 解析结果
   */
  static parse(instruction: string): ParsedInstruction {
    const normalizedInstruction = instruction.toLowerCase().trim();
    
    // 提取类型
    const type = this.extractInstructionType(normalizedInstruction);
    
    // 提取目标
    const target = this.extractTarget(normalizedInstruction, type);
    
    // 提取参数
    const parameters = this.extractParameters(normalizedInstruction, type);
    
    return {
      type,
      target,
      parameters,
      originalInstruction: instruction
    };
  }

  /**
   * 提取指令类型
   * @param instruction 标准化的指令
   * @returns 指令类型
   */
  private static extractInstructionType(instruction: string): InstructionType {
    if (instruction.includes('提取') || instruction.includes('获取') || instruction.includes('抓取') || instruction.includes('extract') || instruction.includes('get')) {
      return 'extract';
    }
    
    if (instruction.includes('导航') || instruction.includes('前往') || instruction.includes('打开') || instruction.includes('navigate') || instruction.includes('go to') || instruction.includes('open')) {
      return 'navigate';
    }
    
    if (instruction.includes('点击') || instruction.includes('click')) {
      return 'click';
    }
    
    if (instruction.includes('输入') || instruction.includes('填写') || instruction.includes('type') || instruction.includes('enter')) {
      return 'type';
    }
    
    if (instruction.includes('滚动') || instruction.includes('scroll')) {
      return 'scroll';
    }
    
    if (instruction.includes('搜索') || instruction.includes('search')) {
      return 'search';
    }
    
    // 默认为提取
    return 'extract';
  }

  /**
   * 提取目标
   * @param instruction 标准化的指令
   * @param type 指令类型
   * @returns 目标
   */
  private static extractTarget(instruction: string, type: InstructionType): string {
    switch (type) {
      case 'navigate':
        // 提取URL
        const urlMatch = instruction.match(/(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=.]+)/i);
        if (urlMatch) {
          return urlMatch[0];
        }
        // 提取页面描述
        return instruction.replace(/(导航|前往|打开|navigate|go to|open)\s*(到|to)?\s*/i, '').trim();
        
      case 'click':
        // 提取点击目标
        return instruction.replace(/(点击|click)\s*/i, '').trim();
        
      case 'type':
        // 提取输入目标
        const typeMatch = instruction.match(/(输入|填写|type|enter)\s*(到|into)?\s*(.*?)\s*(内容|文本|with|内容为|文本为)?\s*/i);
        if (typeMatch && typeMatch[3]) {
          return typeMatch[3].trim();
        }
        return instruction.replace(/(输入|填写|type|enter)\s*/i, '').trim();
        
      case 'scroll':
        // 提取滚动目标
        return instruction.replace(/(滚动|scroll)\s*(到|to)?\s*/i, '').trim();
        
      case 'search':
        // 提取搜索内容
        return instruction.replace(/(搜索|search)\s*(for)?\s*/i, '').trim();
        
      case 'extract':
      default:
        // 提取提取目标
        return instruction.replace(/(提取|获取|抓取|extract|get)\s*(.*?)\s*(内容|信息|data|content)?\s*/i, '$2').trim() || '全部内容';
    }
  }

  /**
   * 提取参数
   * @param instruction 标准化的指令
   * @param type 指令类型
   * @returns 参数
   */
  private static extractParameters(instruction: string, type: InstructionType): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // 提取输入内容
    if (type === 'type') {
      const contentMatch = instruction.match(/(内容|文本|with|内容为|文本为)\s*(.*)/i);
      if (contentMatch && contentMatch[2]) {
        parameters.content = contentMatch[2].trim();
      }
    }
    
    // 提取提取选项
    if (type === 'extract') {
      if (instruction.includes('结构化') || instruction.includes('structured')) {
        parameters.structured = true;
      }
      
      if (instruction.includes('包含链接') || instruction.includes('include links')) {
        parameters.includeLinks = true;
      }
      
      if (instruction.includes('包含图片') || instruction.includes('include images')) {
        parameters.includeImages = true;
      }
      
      if (instruction.includes('去除广告') || instruction.includes('remove ads')) {
        parameters.removeAds = true;
      }
      
      if (instruction.includes('去除导航') || instruction.includes('remove navigation')) {
        parameters.removeNavigation = true;
      }
    }
    
    // 提取滚动方向
    if (type === 'scroll') {
      if (instruction.includes('向上') || instruction.includes('up')) {
        parameters.direction = 'up';
      } else if (instruction.includes('向下') || instruction.includes('down')) {
        parameters.direction = 'down';
      } else if (instruction.includes('顶部') || instruction.includes('top')) {
        parameters.direction = 'top';
      } else if (instruction.includes('底部') || instruction.includes('bottom')) {
        parameters.direction = 'bottom';
      }
    }
    
    return parameters;
  }

  /**
   * 生成Page-Agent指令
   * @param parsedInstruction 解析后的指令
   * @returns Page-Agent指令
   */
  static generatePageAgentInstruction(parsedInstruction: ParsedInstruction): string {
    switch (parsedInstruction.type) {
      case 'navigate':
        return `Navigate to ${parsedInstruction.target}`;
        
      case 'click':
        return `Click element matching description: ${parsedInstruction.target}`;
        
      case 'type':
        return `Type "${parsedInstruction.parameters.content || ''}" into element matching description: ${parsedInstruction.target}`;
        
      case 'scroll':
        const direction = parsedInstruction.parameters.direction || 'down';
        return `Scroll ${direction} on the page`;
        
      case 'search':
        return `Search for "${parsedInstruction.target}" on the page`;
        
      case 'extract':
      default:
        let instruction = `Extract ${parsedInstruction.target} from the page`;
        
        if (parsedInstruction.parameters.removeAds) {
          instruction += ', remove ads';
        }
        
        if (parsedInstruction.parameters.removeNavigation) {
          instruction += ', remove navigation';
        }
        
        if (parsedInstruction.parameters.includeLinks) {
          instruction += ', include links';
        }
        
        if (parsedInstruction.parameters.includeImages) {
          instruction += ', include images';
        }
        
        return instruction;
    }
  }

  /**
   * 生成提取选项
   * @param parsedInstruction 解析后的指令
   * @returns 提取选项
   */
  static generateExtractionOptions(parsedInstruction: ParsedInstruction): any {
    const options: any = {};
    
    if (parsedInstruction.parameters.structured) {
      options.structured = true;
    }
    
    if (parsedInstruction.parameters.removeAds) {
      options.removeAds = true;
    }
    
    if (parsedInstruction.parameters.removeNavigation) {
      options.removeNavigation = true;
    }
    
    return options;
  }
}

// 指令类型
export type InstructionType = 'extract' | 'navigate' | 'click' | 'type' | 'scroll' | 'search';

// 解析后的指令接口
export interface ParsedInstruction {
  type: InstructionType;
  target: string;
  parameters: Record<string, any>;
  originalInstruction: string;
}