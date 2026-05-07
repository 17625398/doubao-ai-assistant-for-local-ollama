import { ChromeMCPClient, createChromeMCPClient } from './chrome-mcp-client';
import { ChromeMCPTools, createChromeMCPTools } from './chrome-mcp-tools';
import { ChromeMCPSkill, createChromeMCPSkill, registerChromeMCPSkill } from './chrome-mcp-skill';

/**
 * Chrome MCP Server 技能
 * 深度集成到 Doubao 技能库中
 */
export {
  // 客户端
  ChromeMCPClient,
  createChromeMCPClient,
  
  // 工具
  ChromeMCPTools,
  createChromeMCPTools,
  
  // 技能
  ChromeMCPSkill,
  createChromeMCPSkill,
  registerChromeMCPSkill
};

/**
 * 默认导出
 */
export default {
  ChromeMCPClient,
  createChromeMCPClient,
  ChromeMCPTools,
  createChromeMCPTools,
  ChromeMCPSkill,
  createChromeMCPSkill,
  registerChromeMCPSkill
};
