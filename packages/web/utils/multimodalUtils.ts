import { UploadedFile } from '../types';
import { SUPPORTED_IMAGE_MIME_TYPES } from '../constants/fileConstants';

export interface ModelMultimodalCapabilities {
  supportsImages: boolean;
  supportsVision: boolean;
  supportsImageGeneration: boolean;
  supportsImageEditing: boolean;
  maxImageCount: number;
  maxImageSizeBytes: number;
  supportedImageFormats: string[];
}

export const VISION_MODELS = [
  'gemini-3-pro-preview',
  'models/gemini-3-pro-preview',
  'gemini-3-flash-preview',
  'models/gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'models/gemini-3.1-pro-preview',
  'gemini-3.1-flash-preview',
  'models/gemini-3.1-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'models/gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash-preview',
  'models/gemini-2.5-flash-preview',
  'gemini-1.5-pro-preview',
  'models/gemini-1.5-pro-preview',
  'gemini-1.5-flash-preview',
  'models/gemini-1.5-flash-preview',
];

export const IMAGE_EDIT_MODELS = [
  'gemini-3-pro-image-preview',
  'models/gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'models/gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image-preview',
  'models/gemini-2.5-flash-image-preview',
];

export const IMAGE_GEN_MODELS = [
  'imagen-3.0-fast-preview',
  'imagen-3.0-preview',
  'imagen-3.0-pro-preview',
];

export const getModelMultimodalCapabilities = (modelId: string | null | undefined): ModelMultimodalCapabilities => {
  if (!modelId) {
    return {
      supportsImages: false,
      supportsVision: false,
      supportsImageGeneration: false,
      supportsImageEditing: false,
      maxImageCount: 0,
      maxImageSizeBytes: 0,
      supportedImageFormats: [],
    };
  }

  const lowerId = modelId.toLowerCase();
  const isVisionModel = VISION_MODELS.some(m => m.toLowerCase() === lowerId);
  const isImageEditModel = IMAGE_EDIT_MODELS.some(m => m.toLowerCase() === lowerId);
  const isImageGenModel = IMAGE_GEN_MODELS.some(m => m.toLowerCase() === lowerId);

  let maxImageCount = 0;
  let maxImageSizeBytes = 0;

  if (isVisionModel) {
    if (lowerId.includes('gemini-3') || lowerId.includes('gemini-3.1')) {
      maxImageCount = 14;
      maxImageSizeBytes = 20 * 1024 * 1024;
    } else {
      maxImageCount = 10;
      maxImageSizeBytes = 10 * 1024 * 1024;
    }
  } else if (isImageEditModel) {
    maxImageCount = 1;
    maxImageSizeBytes = 50 * 1024 * 1024;
  }

  return {
    supportsImages: isVisionModel || isImageEditModel,
    supportsVision: isVisionModel,
    supportsImageGeneration: isImageGenModel,
    supportsImageEditing: isImageEditModel,
    maxImageCount,
    maxImageSizeBytes,
    supportedImageFormats: SUPPORTED_IMAGE_MIME_TYPES,
  };
};

export const isVisionModel = (modelId: string | null | undefined): boolean => {
  if (!modelId) return false;
  const lowerId = modelId.toLowerCase();
  return VISION_MODELS.some(m => m.toLowerCase() === lowerId);
};

export const isImageEditModel = (modelId: string | null | undefined): boolean => {
  if (!modelId) return false;
  const lowerId = modelId.toLowerCase();
  return IMAGE_EDIT_MODELS.some(m => m.toLowerCase() === lowerId);
};

export const isImageGenModel = (modelId: string | null | undefined): boolean => {
  if (!modelId) return false;
  const lowerId = modelId.toLowerCase();
  return IMAGE_GEN_MODELS.some(m => m.toLowerCase() === lowerId);
};

export const isImageFile = (file: UploadedFile): boolean => {
  return SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
};

export const validateImageForModel = (
  file: UploadedFile,
  modelId: string
): { valid: boolean; error?: string } => {
  const capabilities = getModelMultimodalCapabilities(modelId);

  if (!capabilities.supportsImages) {
    return {
      valid: false,
      error: '当前模型不支持图片输入',
    };
  }

  if (!isImageFile(file)) {
    return {
      valid: false,
      error: '文件不是有效的图片格式',
    };
  }

  if (file.size > capabilities.maxImageSizeBytes) {
    const maxSizeMB = (capabilities.maxImageSizeBytes / 1024 / 1024).toFixed(1);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `图片大小超过限制，最大支持 ${maxSizeMB}MB，当前文件 ${fileSizeMB}MB`,
    };
  }

  return { valid: true };
};

export const validateImagesForModel = (
  files: UploadedFile[],
  modelId: string
): { valid: boolean; errors: string[] } => {
  const capabilities = getModelMultimodalCapabilities(modelId);
  const errors: string[] = [];

  if (!capabilities.supportsImages) {
    errors.push('当前模型不支持图片输入');
    return { valid: false, errors };
  }

  const imageFiles = files.filter(isImageFile);

  if (imageFiles.length > capabilities.maxImageCount) {
    errors.push(`图片数量超过限制，最多支持 ${capabilities.maxImageCount} 张图片`);
  }

  for (const file of imageFiles) {
    const result = validateImageForModel(file, modelId);
    if (!result.valid && result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { valid: errors.length === 0, errors };
};

export const getImageSizeInfo = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};