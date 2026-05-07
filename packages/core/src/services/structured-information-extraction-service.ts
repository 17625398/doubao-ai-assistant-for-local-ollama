export class StructuredInformationExtractionService {
  /**
   * 提取文本中的结构化信息
   * @param text 输入文本
   * @returns 提取的结构化信息
   */
  extractStructuredInformation(text: string): {
    entities: Entity[];
    relationships: Relationship[];
  } {
    if (!text || text.length === 0) {
      return { entities: [], relationships: [] };
    }

    const entities = this.extractEntities(text);
    const relationships = this.extractRelationships(text, entities);

    return { entities, relationships };
  }

  /**
   * 提取实体
   * @param text 输入文本
   * @returns 提取的实体列表
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];
    
    // 提取人物实体
    const personEntities = this.extractPersonEntities(text);
    entities.push(...personEntities);
    
    // 提取组织实体
    const organizationEntities = this.extractOrganizationEntities(text);
    entities.push(...organizationEntities);
    
    // 提取地点实体
    const locationEntities = this.extractLocationEntities(text);
    entities.push(...locationEntities);
    
    // 提取日期实体
    const dateEntities = this.extractDateEntities(text);
    entities.push(...dateEntities);
    
    // 提取数值实体
    const numberEntities = this.extractNumberEntities(text);
    entities.push(...numberEntities);
    
    return entities;
  }

  /**
   * 提取人物实体
   * @param text 输入文本
   * @returns 人物实体列表
   */
  private extractPersonEntities(text: string): Entity[] {
    // 简单的正则表达式匹配，实际应用中应该使用更复杂的NLP模型
    const personPatterns = [
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g, // 匹配姓名
      /(Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+)/g // 匹配带尊称的姓名
    ];
    
    const entities: Entity[] = [];
    
    personPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `person_${entities.length + 1}`,
          type: 'PERSON',
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  /**
   * 提取组织实体
   * @param text 输入文本
   * @returns 组织实体列表
   */
  private extractOrganizationEntities(text: string): Entity[] {
    const organizationPatterns = [
      /([A-Z][a-z]+(\s+[A-Z][a-z]+)+\s+(Inc|Corp|Ltd|Company|Organization|Association|Foundation))/g,
      /(Microsoft|Apple|Google|Amazon|Facebook|Tesla|IBM|Intel|Oracle|Cisco)/g // 常见公司名
    ];
    
    const entities: Entity[] = [];
    
    organizationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `org_${entities.length + 1}`,
          type: 'ORGANIZATION',
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  /**
   * 提取地点实体
   * @param text 输入文本
   * @returns 地点实体列表
   */
  private extractLocationEntities(text: string): Entity[] {
    const locationPatterns = [
      /([A-Z][a-z]+(\s+[A-Z][a-z]+)+\s+(City|Town|Village|Country|State|Province|Region))/g,
      /(New York|London|Paris|Tokyo|Beijing|Shanghai|Guangzhou|Shenzhen|Hong Kong|Singapore)/g // 常见城市名
    ];
    
    const entities: Entity[] = [];
    
    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `loc_${entities.length + 1}`,
          type: 'LOCATION',
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  /**
   * 提取日期实体
   * @param text 输入文本
   * @returns 日期实体列表
   */
  private extractDateEntities(text: string): Entity[] {
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/g, // YYYY-MM-DD
      /(\d{2}\/\d{2}\/\d{4})/g, // MM/DD/YYYY
      /(\d{2}\.\d{2}\.\d{4})/g, // DD.MM.YYYY
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g // 英文日期
    ];
    
    const entities: Entity[] = [];
    
    datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `date_${entities.length + 1}`,
          type: 'DATE',
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  /**
   * 提取数值实体
   * @param text 输入文本
   * @returns 数值实体列表
   */
  private extractNumberEntities(text: string): Entity[] {
    const numberPatterns = [
      /(\d+(\.\d+)?\s*(dollars|USD|CNY|EUR|GBP|JPY))/g, // 货币
      /(\d+(\.\d+)?\s*(percent|%))/g, // 百分比
      /(\d+(\.\d+)?\s*(years|months|days|hours|minutes|seconds))/g, // 时间
      /(\d+(\.\d+)?\s*(meters|kilometers|miles|feet|inches))/g, // 长度
      /(\d+(\.\d+)?\s*(kilograms|pounds|grams|ounces))/g, // 重量
      /(\d+)/g // 其他数字
    ];
    
    const entities: Entity[] = [];
    
    numberPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `num_${entities.length + 1}`,
          type: 'NUMBER',
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }

  /**
   * 提取关系
   * @param text 输入文本
   * @param entities 实体列表
   * @returns 关系列表
   */
  private extractRelationships(text: string, entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    
    // 提取实体之间的关系
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // 检查两个实体是否在文本中接近
        if (Math.abs(entity1.start - entity2.start) < 200) {
          const relationshipType = this.determineRelationshipType(entity1, entity2, text);
          if (relationshipType) {
            relationships.push({
              id: `rel_${relationships.length + 1}`,
              type: relationshipType,
              source: entity1.id,
              target: entity2.id,
              text: text.substring(
                Math.max(0, Math.min(entity1.start, entity2.start) - 50),
                Math.min(text.length, Math.max(entity1.end, entity2.end) + 50)
              ).trim()
            });
          }
        }
      }
    }
    
    return relationships;
  }

  /**
   * 确定关系类型
   * @param entity1 第一个实体
   * @param entity2 第二个实体
   * @param text 输入文本
   * @returns 关系类型
   */
  private determineRelationshipType(entity1: Entity, entity2: Entity, text: string): string | null {
    // 简单的关系类型判断，实际应用中应该使用更复杂的NLP模型
    const betweenText = text.substring(
      Math.min(entity1.end, entity2.end),
      Math.max(entity1.start, entity2.start)
    ).toLowerCase();
    
    // 人物-组织关系
    if ((entity1.type === 'PERSON' && entity2.type === 'ORGANIZATION') ||
        (entity1.type === 'ORGANIZATION' && entity2.type === 'PERSON')) {
      if (betweenText.includes('work') || betweenText.includes('employee') || betweenText.includes('work for') || betweenText.includes('employed by')) {
        return 'WORKS_FOR';
      }
      if (betweenText.includes('found') || betweenText.includes('founder') || betweenText.includes('founded')) {
        return 'FOUNDED';
      }
    }
    
    // 人物-地点关系
    if ((entity1.type === 'PERSON' && entity2.type === 'LOCATION') ||
        (entity1.type === 'LOCATION' && entity2.type === 'PERSON')) {
      if (betweenText.includes('born') || betweenText.includes('birth') || betweenText.includes('from')) {
        return 'BORN_IN';
      }
      if (betweenText.includes('lives') || betweenText.includes('lives in') || betweenText.includes('resides')) {
        return 'LIVES_IN';
      }
    }
    
    // 组织-地点关系
    if ((entity1.type === 'ORGANIZATION' && entity2.type === 'LOCATION') ||
        (entity1.type === 'LOCATION' && entity2.type === 'ORGANIZATION')) {
      if (betweenText.includes('based') || betweenText.includes('located') || betweenText.includes('headquartered')) {
        return 'LOCATED_IN';
      }
    }
    
    // 人物-人物关系
    if (entity1.type === 'PERSON' && entity2.type === 'PERSON') {
      if (betweenText.includes('married') || betweenText.includes('spouse') || betweenText.includes('wife') || betweenText.includes('husband')) {
        return 'MARRIED_TO';
      }
      if (betweenText.includes('friend') || betweenText.includes('friends')) {
        return 'FRIENDS_WITH';
      }
      if (betweenText.includes('family') || betweenText.includes('relative') || betweenText.includes('brother') || betweenText.includes('sister') || betweenText.includes('parent') || betweenText.includes('child')) {
        return 'FAMILY_WITH';
      }
    }
    
    // 实体-日期关系
    if ((entity1.type === 'DATE' && entity2.type !== 'DATE') ||
        (entity1.type !== 'DATE' && entity2.type === 'DATE')) {
      if (betweenText.includes('born') || betweenText.includes('birth')) {
        return 'BORN_ON';
      }
      if (betweenText.includes('founded') || betweenText.includes('established')) {
        return 'FOUNDED_ON';
      }
      if (betweenText.includes('died') || betweenText.includes('death')) {
        return 'DIED_ON';
      }
    }
    
    return null;
  }

  /**
   * 提取自定义实体
   * @param text 输入文本
   * @param patterns 自定义实体模式
   * @returns 提取的自定义实体
   */
  extractCustomEntities(text: string, patterns: Array<{ type: string; pattern: RegExp }>): Entity[] {
    const entities: Entity[] = [];
    
    patterns.forEach(({ type, pattern }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          id: `${type.toLowerCase()}_${entities.length + 1}`,
          type,
          text: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    return entities;
  }
}

// 实体类型
export interface Entity {
  id: string;
  type: string;
  text: string;
  start: number;
  end: number;
}

// 关系类型
export interface Relationship {
  id: string;
  type: string;
  source: string;
  target: string;
  text: string;
}
