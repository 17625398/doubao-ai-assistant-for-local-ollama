import type { WebArtifact } from './types';

export function getArtifactKindLabel(kind: WebArtifact['kind']): string {
  const labels: Record<string, string> = {
    'skill-result': '技能结果',
    'diagnostic-report': '诊断报告',
    'code-artifact': '代码产物',
    'ppt-preview': 'PPT 预览',
    'video-artifact': '视频',
    'whiteboard': '白板',
    'step-canvas': '分步展示',
    'search-result': '搜索结果',
  };
  return labels[kind] || kind;
}

export function getArtifactDetail(artifact: WebArtifact): string {
  if ('code' in artifact) return artifact.code;
  if ('summary' in artifact) return artifact.summary || '';
  return JSON.stringify(artifact.metadata || {});
}
