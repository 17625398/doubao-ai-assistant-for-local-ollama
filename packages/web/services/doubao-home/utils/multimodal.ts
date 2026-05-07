/**
 * 多模态附件处理工具
 * 支持：图片、音频、视频、PDF、文档、代码、表格等 60+ 种文件类型
 */

export interface MultimodalAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;           // blob: URL for preview
  base64?: string;            // Base64 encoded content (for API)
  textContent?: string;       // Text file content
  thumbnail?: string;         // Image thumbnail data URL
  status: 'pending' | 'reading' | 'ready' | 'error';
  error?: string;
}

/** 文件类型分类 */
export const FileCategory = {
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  PDF: 'pdf',
  DOCUMENT: 'document',      // doc/xls/ppt etc.
  CODE: 'code',
  TEXT: 'text',
  SPREADSHEET: 'spreadsheet',
  ARCHIVE: 'archive',
  OTHER: 'other',
} as const;

type FileCategoryType = typeof FileCategory[keyof typeof FileCategory];

/** MIME 类型到分类的映射 */
const MIME_CATEGORY_MAP: Record<string, FileCategoryType> = {
  // 图片
  'image/jpeg': FileCategory.IMAGE,
  'image/png': FileCategory.IMAGE,
  'image/gif': FileCategory.IMAGE,
  'image/webp': FileCategory.IMAGE,
  'image/heic': FileCategory.IMAGE,
  'image/heif': FileCategory.IMAGE,
  'image/svg+xml': FileCategory.IMAGE,
  'image/bmp': FileCategory.IMAGE,
  'image/avif': FileCategory.IMAGE,
  // 音频
  'audio/mpeg': FileCategory.AUDIO,
  'audio/mp3': FileCategory.AUDIO,
  'audio/wav': FileCategory.AUDIO,
  'audio/ogg': FileCategory.AUDIO,
  'audio/aac': FileCategory.AUDIO,
  'audio/webm': FileCategory.AUDIO,
  'audio/flac': FileCategory.AUDIO,
  'audio/mp4': FileCategory.AUDIO,
  // 视频
  'video/mp4': FileCategory.VIDEO,
  'video/webm': FileCategory.VIDEO,
  'video/quicktime': FileCategory.VIDEO,
  'video/x-msvideo': FileCategory.VIDEO,
  // PDF
  'application/pdf': FileCategory.PDF,
  // 文档
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileCategory.DOCUMENT,
  'application/msword': FileCategory.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FileCategory.DOCUMENT,
  'application/vnd.ms-powerpoint': FileCategory.DOCUMENT,
  // 表格
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileCategory.SPREADSHEET,
  'application/vnd.ms-excel': FileCategory.SPREADSHEET,
  'text/csv': FileCategory.SPREADSHEET,
  // 压缩包
  'application/zip': FileCategory.ARCHIVE,
  'application/x-zip-compressed': FileCategory.ARCHIVE,
  'application/x-7z-compressed': FileCategory.ARCHIVE,
  'application/gzip': FileCategory.ARCHIVE,
  'application/x-rar-compressed': FileCategory.ARCHIVE,
};

/** 文本类扩展名 */
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.xml', '.csv', '.tsv', '.log', '.rtf',
  '.js', '.ts', '.jsx', '.tsx', '.html', '.htm', '.css', '.scss', '.less',
  '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php',
  '.sh', '.bash', '.ps1', '.bat', '.zsh', '.yaml', '.yml', '.ini', '.cfg', '.toml',
  '.sql', '.sub', '.srt', '.vtt', '.rs', '.swift', '.kt', '.scala', '.r', '.m',
]);

/**
 * 获取文件的分类类型
 */
export function getFileCategory(file: { name: string; type: string }): FileCategoryType {
  // 先按 MIME 类型匹配
  if (MIME_CATEGORY_MAP[file.type]) return MIME_CATEGORY_MAP[file.type];
  
  // 按扩展名判断文本/代码
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return FileCategory.CODE;
  
  // 按主 MIME 类型判断
  if (file.type.startsWith('image/')) return FileCategory.IMAGE;
  if (file.type.startsWith('audio/')) return FileCategory.AUDIO;
  if (file.type.startsWith('video/')) return FileCategory.VIDEO;
  if (file.type.startsWith('text/')) return FileCategory.TEXT;
  if (file.type === 'application/pdf') return FileCategory.PDF;
  
  return FileCategory.OTHER;
}

/**
 * 获取文件类型的图标（emoji 或 SVG 描述）
 */
export function getFileIcon(category: FileCategoryType): string {
  switch (category) {
    case FileCategory.IMAGE: return '\u{1F5BC}\uFE0F';   // 🖼️
    case FileCategory.AUDIO: return '\u{1F3B5}';          // 🎵
    case FileCategory.VIDEO: return '\u{1F3AC}';          // 🎬
    case FileCategory.PDF: return '\u{1F4C4}';             // 📄
    case FileCategory.DOCUMENT: return '\u{1F4C4}';        // 📄
    case FileCategory.CODE: return '\u{1F4BB}';            // 💻
    case FileCategory.TEXT: return '\u{1F4DD}';            // 📝
    case FileCategory.SPREADSHEET: return '\u{1F4CA}';     // 📊
    case FileCategory.ARCHIVE: return '\u{1F916}';         // 🤖 (zip)
    default: return '\u{1F4CE}';                           // 📎
  }
}

/**
 * 获取文件分类的显示名称
 */
export function getCategoryLabel(category: FileCategoryType): string {
  const labels: Record<FileCategoryType, string> = {
    [FileCategory.IMAGE]: '图片',
    [FileCategory.AUDIO]: '音频',
    [FileCategory.VIDEO]: '视频',
    [FileCategory.PDF]: 'PDF文档',
    [FileCategory.DOCUMENT]: '文档',
    [FileCategory.CODE]: '代码',
    [FileCategory.TEXT]: '文本',
    [FileCategory.SPREADSHEET]: '表格',
    [FileCategory.ARCHIVE]: '压缩包',
    [FileCategory.OTHER]: '文件',
  };
  return labels[category] || '文件';
}

/**
 * 将文件转换为 Base64 编码
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文本文件内容
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 处理单个多模态附件
 * - 图片/音频/视频/PDF → Base64 编码
 * - 文本/代码 → 读取文本内容
 * - 其他 → 仅保存元信息
 */
export async function processAttachment(file: File): Promise<MultimodalAttachment> {
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const category = getFileCategory(file);
  
  const attachment: MultimodalAttachment = {
    id,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    dataUrl: URL.createObjectURL(file),
    status: 'reading',
  };

  try {
    switch (category) {
      case FileCategory.IMAGE:
      case FileCategory.VIDEO:
      case FileCategory.AUDIO:
      case FileCategory.PDF:
        // 媒体和 PDF 文件转 Base64
        attachment.base64 = await fileToBase64(file);
        break;

      case FileCategory.CODE:
      case FileCategory.TEXT:
        // 文本文件读取内容
        attachment.textContent = await readTextFile(file);
        // 同时保留 Base64 用于 API 发送
        try {
          attachment.base64 = await fileToBase64(file);
        } catch { /* 非必须 */ }
        break;

      case FileCategory.DOCUMENT:
      case FileCategory.SPREADSHEET:
        // 尝试读取 Office 文件（可能需要特殊处理）
        try {
          attachment.textContent = await readTextFile(file);
        } catch {
          attachment.base64 = await fileToBase64(file);
        }
        break;

      case FileCategory.ARCHIVE:
        // ZIP 等压缩包仅存储元数据，不自动解压
        break;

      default:
        // 其他类型尝试转为 Base64
        try {
          attachment.base64 = await fileToBase64(file);
        } catch { /* 忽略 */ }
    }

    attachment.status = 'ready';
  } catch (error) {
    attachment.status = 'error';
    attachment.error = error instanceof Error ? error.message : String(error);
  }

  return attachment;
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * 生成带附件的消息提示
 */
export function buildMultimodalPrompt(
  text: string,
  attachments: MultimodalAttachment[]
): { prompt: string; hasMedia: boolean; hasTextContent: boolean } {
  let hasMedia = false;
  let hasTextContent = false;
  const parts: string[] = [];

  for (const att of attachments) {
    if (att.status !== 'ready') continue;

    const category = getFileCategory(att);

    switch (category) {
      case FileCategory.IMAGE:
        hasMedia = true;
        parts.push(`[图片: ${att.name} (${formatFileSize(att.size)})]`);
        break;

      case FileCategory.AUDIO:
        hasMedia = true;
        parts.push(`[音频: ${att.name} (${formatFileSize(att.size)})]`);
        break;

      case FileCategory.VIDEO:
        hasMedia = true;
        parts.push(`[视频: ${att.name} (${formatFileSize(att.size)})]`);
        break;

      case FileCategory.PDF:
        hasTextContent = true;
        if (att.textContent) {
          // 优先使用已解析的文本内容
          const textPreview = att.textContent.slice(0, 8000); // 限制长度
          parts.push(`【PDF文档解析内容 - ${att.name}】\n\n${textPreview}${att.textContent.length > 8000 ? '\n\n...(文档内容较长，已截取前8000字)...' : ''}`);
        } else {
          parts.push(`[PDF文档: ${att.name} (${formatFileSize(att.size)})]`);
        }
        break;

      case FileCategory.DOCUMENT:
      case FileCategory.SPREADSHEET:
        hasTextContent = true;
        if (att.textContent) {
          // 优先使用已解析的文本内容
          const textPreview = att.textContent.slice(0, 8000);
          parts.push(`【文档解析内容 - ${att.name}】\n\n${textPreview}${att.textContent.length > 8000 ? '\n\n...(文档内容较长，已截取前8000字)...' : ''}`);
        } else {
          parts.push(`[${getCategoryLabel(category)}: ${att.name} (${formatFileSize(att.size)})]`);
        }
        break;

      case FileCategory.CODE:
        hasTextContent = true;
        const codePreview = att.textContent?.slice(0, 500) || '';
        parts.push(`[代码文件: ${att.name} (${formatFileSize(att.size)})]\n\`\`\`\n${codePreview}${codePreview.length >= 500 ? '\\n...(内容较长)...' : ''}\n\`\`\``);
        break;

      case FileCategory.TEXT:
        hasTextContent = true;
        const textPreview = att.textContent?.slice(0, 1000) || '';
        parts.push(`[文件: ${att.name} (${formatFileSize(att.size)})]\n${textPreview}${textPreview.length >= 1000 ? '\\n...(内容较长)...' : ''}`);
        break;

      default:
        parts.push(`[附件: ${att.name} (${formatFileSize(att.size)})]`);
    }
  }

  const prompt = [...parts, text].filter(Boolean).join('\n\n');
  return { prompt, hasMedia, hasTextContent };
}

/**
 * 支持的文件 accept 属性值（用于 input 元素）
 */
export const MULTIMEDIA_ACCEPT =
  '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,' +
  '.mp3,.wav,.ogg,.flac,.aac,.m4a,.webma,' +
  '.mp4,.webm,.mov,.avi,' +
  '.pdf,' +
  '.doc,.docx,.xls,.xlsx,.ppt,.pptx,' +
  '.txt,.md,.json,.xml,.csv,.yaml,.yml,.log,' +
  '.py,.js,.ts,.jsx,.tsx,.java,.c,.cpp,.go,.rs,.php,.sh,.bat,' +
  '.html,.css,.scss,.sql,.rb,.swift,.kt,' +
  '.zip,.rar,.7z';

/**
 * 最大文件大小限制（按类别）
 */
export const MAX_FILE_SIZES: Record<FileCategoryType | 'default', number> = {
  [FileCategory.IMAGE]: 20 * 1024 * 1024,       // 20MB
  [FileCategory.AUDIO]: 25 * 1024 * 1024,       // 25MB
  [FileCategory.VIDEO]: 50 * 1024 * 1024,       // 50MB
  [FileCategory.PDF]: 20 * 1024 * 1024,         // 20MB
  [FileCategory.DOCUMENT]: 10 * 1024 * 1024,     // 10MB
  [FileCategory.CODE]: 5 * 1024 * 1024,          // 5MB
  [FileCategory.TEXT]: 10 * 1024 * 1024,        // 10MB
  [FileCategory.SPREADSHEET]: 10 * 1024 * 1024, // 10MB
  [FileCategory.ARCHIVE]: 50 * 1024 * 1024,     // 50MB
  [FileCategory.OTHER]: 10 * 1024 * 1024,       // 10MB
  'default': 10 * 1024 * 1024,                  // 10MB 默认
};

/**
 * 检查文件是否超过大小限制
 */
export function checkFileSize(file: { size: number; type: string; name: string }): {
  valid: boolean;
  maxSize: number;
  actualSize: number;
} {
  const category = getFileCategory(file);
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES['default'];
  return {
    valid: file.size <= maxSize,
    maxSize,
    actualSize: file.size,
  };
}
