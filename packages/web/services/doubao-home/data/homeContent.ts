export type HomeNavKey = '豆包' | 'AI 浏览器' | 'AI 创作' | '云盘' | '更多';

export const navItems: Array<{ label: HomeNavKey; icon: string; prompt: string }> = [
  { label: '豆包', icon: '●', prompt: '' },
  { label: 'AI 浏览器', icon: '◎', prompt: '帮我分析当前网页内容，并总结重点。' },
  { label: 'AI 创作', icon: '✎', prompt: '帮我写一篇结构清晰、有吸引力的内容。' },
  { label: '云盘', icon: '☁', prompt: '帮我整理文件资料，并生成摘要和行动清单。' },
  { label: '更多', icon: '⊞', prompt: '列出你当前支持的能力，并告诉我怎么使用。' },
];

export const defaultRecentItems = [
  '手机配对话',
  'MedGemma27b 模型介绍',
  'T600 与 1050Ti对比',
  '深度搜索：最新 AI 研究进展',
  '学术文献综述方法',
  '代码审查与优化建议',
  'PPT 大纲自动生成',
  '音乐创作灵感',
];

export const suggestions = [
  '资讯：上海交大开源 SVIM 让 Skill 一次编写处处高效',
  '推荐一部描写女性命运的经典文学片段',
  '如何筛选适合自己的建模软件?',
  '设计一个小型家庭暖通系统',
  '资讯：世界地球日 Apple 中国区以旧换新订单翻倍',
  '请帮我解释一下大型语言模型的工作原理',
  '告诉我数据分析的最新工具和趋势',
  '设计一个长视频脚本创作的方案',
  '资讯：Apple Vision Pro 因领导层调整延期发布',
];

export const uploadMenuItems = [
  { icon: '☁', label: '选择云文件' },
  { icon: '</>', label: '上传代码', hasSubmenu: true },
  { icon: '✂', label: '截屏/贴图' },
  { icon: '🖥', label: '共享屏幕和应用', hasSubmenu: true },
  { icon: '📎', label: '上传文件或图片' },
];

export const tools = [
  ['+', null],
  ['快捷', '请给我 5 个快捷任务模板。'],
  ['小程序', '请推荐一些实用的小程序工具。'],
  ['帮我写作', '请帮我写一篇高质量的文章或文案。'],
  ['PPT 生成', '请把这个主题整理成 PPT 大纲。'],
  ['超级模式', '请开启超级模式，提供更深入的分析。'],
  ['图像生成', '请根据描述生成一张图像。'],
  ['更多', '展示更多可用工具和使用方式。'],
] as const;

export const creationTemplates = [
  { title: '文章写作', prompt: '请围绕这个主题写一篇结构完整、语言自然的文章：' },
  { title: '小红书文案', prompt: '请写一篇小红书风格文案，包含标题、正文和标签：' },
  { title: '周报总结', prompt: '请把以下内容整理成工作周报，包含进展、风险和下周计划：' },
  { title: '邮件润色', prompt: '请帮我润色这封邮件，使其专业、清晰、礼貌：' },
];

export const browserActions = [
  { title: '网页摘要', prompt: '请粘贴网页内容，我会帮你提炼摘要、关键观点和行动项。' },
  { title: '页面问答', prompt: '请基于下面网页内容回答我的问题：' },
  { title: '链接分析', prompt: '请分析这个链接可能包含的信息结构、目标用户和风险点：' },
];

export const moreCapabilities = [
  { title: '本地模型对话', prompt: '请使用本地 Ollama 模型回答我的问题：' },
  { title: '代码解释', prompt: '请解释下面这段代码的作用、风险和优化建议：' },
  { title: '调试助手', prompt: '请根据错误信息定位原因并给出修复步骤：' },
  { title: '资料整理', prompt: '请把下面资料整理成结构化笔记：' },
];

/**
 * 从技能插件注册表动态生成工具栏数据
 * 将内置插件的 toolbarButtons 映射为 tools 格式
 */
export function getToolsFromRegistry(): Array<readonly [string, string | null]> {
  try {
    // 动态导入避免循环依赖（仅在客户端调用）
    const { skillInputPluginRegistry } = require('@core/plugins/skill-input-plugin/registry');
    const plugins = skillInputPluginRegistry.listAll();

    const dynamicTools: Array<readonly [string, string | null]> = [['+', null]];

    for (const p of plugins) {
      if (p.id === 'chat') continue;
      if (p.toolbarButtons?.length) {
        for (const btn of p.toolbarButtons) {
          dynamicTools.push([btn.label, btn.prompt ?? p.guidanceQuestions?.[0] ?? '']);
        }
      } else {
        // 没有自定义按钮时用技能名称
        dynamicTools.push([
          p.icon ? `${p.icon} ${p.name}` : p.name,
          p.guidanceQuestions?.[0] ?? '',
        ]);
      }
    }

    dynamicTools.push(['更多', '展示所有可用能力和使用方式。']);
    return dynamicTools;
  } catch {
    // 回退到静态默认值
    return tools as unknown as Array<readonly [string, string | null]>;
  }
}

/**
 * 从注册表获取所有技能插件用于侧边栏展示
 */
export function getSkillNavItems(): Array<{ id: string; name: string; icon?: string; category: string; prompt: string }> {
  try {
    const { skillInputPluginRegistry } = require('@core/plugins/skill-input-plugin/registry');
    return skillInputPluginRegistry
      .listAll()
      .filter((p: any) => p.id !== 'chat')
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        category: p.category,
        prompt: p.guidanceQuestions?.[0] ?? '',
      }));
  } catch {
    return [];
  }
}
