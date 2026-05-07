import type { DoubaoHomeMessage, LocalCapabilityStatus, OllamaSettings } from '../types';
import { testOllamaConnection } from './ollamaHomeClient';

export async function inspectLocalCapabilities(settings: OllamaSettings): Promise<LocalCapabilityStatus> {
  try {
    const result = await testOllamaConnection(settings);
    return { ollama: 'online', modelCount: result.count, activeModel: settings.model };
  } catch {
    return { ollama: 'offline', modelCount: 0, activeModel: settings.model };
  }
}

export async function readLocalTextFile(file: File): Promise<{ name: string; size: number; content: string }> {
  const content = await file.text();
  return { name: file.name, size: file.size, content };
}

export function buildFileSummaryPrompt(file: { name: string; content: string }): string {
  const content = file.content.length > 12000 ? `${file.content.slice(0, 12000)}\n\n[内容已截断，仅导入前 12000 字符]` : file.content;
  return `请分析这个本地文件，输出摘要、关键要点、风险和后续行动。\n\n文件名：${file.name}\n\n文件内容：\n${content}`;
}

export function exportSessionMarkdown(messages: DoubaoHomeMessage[]): string {
  const lines = ['# 豆包本地会话导出', '', `导出时间：${new Date().toISOString()}`, ''];
  for (const message of messages) {
    lines.push(`## ${message.role === 'user' ? '用户' : '助手'}`, '', message.content, '');
  }
  return lines.join('\n');
}

export async function copySessionMarkdown(messages: DoubaoHomeMessage[]): Promise<void> {
  await navigator.clipboard.writeText(exportSessionMarkdown(messages));
}

export function buildDiagnosticsPrompt(status: LocalCapabilityStatus, settings: OllamaSettings): string {
  return `请根据以下本地能力状态给出诊断和修复建议：\n\nOllama 状态：${status.ollama}\n模型数量：${status.modelCount}\n当前模型：${settings.model}\n端点：${settings.baseUrl}\n\n请输出：1. 当前状态判断；2. 可能问题；3. Windows 本地排查步骤；4. 推荐模型配置。`;
}
