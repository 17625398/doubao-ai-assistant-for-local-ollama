import { describe, it, expect } from 'vitest';
import {
  getModelMultimodalCapabilities,
  isVisionModel,
  isImageEditModel,
  isImageGenModel,
  isImageFile,
  validateImageForModel,
  validateImagesForModel,
  getImageSizeInfo,
} from '../multimodalUtils';
import { UploadedFile } from '../../types';

describe('multimodalUtils', () => {
  describe('getModelMultimodalCapabilities', () => {
    it('should return default capabilities for null/undefined model', () => {
      expect(getModelMultimodalCapabilities(null)).toEqual({
        supportsImages: false,
        supportsVision: false,
        supportsImageGeneration: false,
        supportsImageEditing: false,
        maxImageCount: 0,
        maxImageSizeBytes: 0,
        supportedImageFormats: [],
      });

      expect(getModelMultimodalCapabilities(undefined)).toEqual({
        supportsImages: false,
        supportsVision: false,
        supportsImageGeneration: false,
        supportsImageEditing: false,
        maxImageCount: 0,
        maxImageSizeBytes: 0,
        supportedImageFormats: [],
      });
    });

    it('should return correct capabilities for Gemini 3 Flash', () => {
      const capabilities = getModelMultimodalCapabilities('gemini-3-flash-preview');
      expect(capabilities.supportsImages).toBe(true);
      expect(capabilities.supportsVision).toBe(true);
      expect(capabilities.supportsImageGeneration).toBe(false);
      expect(capabilities.supportsImageEditing).toBe(false);
      expect(capabilities.maxImageCount).toBe(14);
      expect(capabilities.maxImageSizeBytes).toBe(20 * 1024 * 1024);
    });

    it('should return correct capabilities for Gemini 3.1 Pro', () => {
      const capabilities = getModelMultimodalCapabilities('gemini-3.1-pro-preview');
      expect(capabilities.supportsImages).toBe(true);
      expect(capabilities.supportsVision).toBe(true);
      expect(capabilities.maxImageCount).toBe(14);
    });

    it('should return correct capabilities for image edit model', () => {
      const capabilities = getModelMultimodalCapabilities('gemini-3-pro-image-preview');
      expect(capabilities.supportsImages).toBe(true);
      expect(capabilities.supportsVision).toBe(false);
      expect(capabilities.supportsImageEditing).toBe(true);
      expect(capabilities.maxImageCount).toBe(1);
      expect(capabilities.maxImageSizeBytes).toBe(50 * 1024 * 1024);
    });

    it('should return correct capabilities for image gen model', () => {
      const capabilities = getModelMultimodalCapabilities('imagen-3.0-preview');
      expect(capabilities.supportsImages).toBe(false);
      expect(capabilities.supportsImageGeneration).toBe(true);
      expect(capabilities.maxImageCount).toBe(0);
    });
  });

  describe('isVisionModel', () => {
    it('should return true for vision models', () => {
      expect(isVisionModel('gemini-3-flash-preview')).toBe(true);
      expect(isVisionModel('gemini-3.1-pro-preview')).toBe(true);
      expect(isVisionModel('gemini-2.5-flash-preview')).toBe(true);
      expect(isVisionModel('models/gemini-3-flash-preview')).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(isVisionModel('imagen-3.0-preview')).toBe(false);
      expect(isVisionModel('gemma-2-9b-it')).toBe(false);
      expect(isVisionModel('unknown-model')).toBe(false);
    });
  });

  describe('isImageEditModel', () => {
    it('should return true for image edit models', () => {
      expect(isImageEditModel('gemini-3-pro-image-preview')).toBe(true);
      expect(isImageEditModel('gemini-2.5-flash-image-preview')).toBe(true);
    });

    it('should return false for non-image-edit models', () => {
      expect(isImageEditModel('gemini-3-flash-preview')).toBe(false);
      expect(isImageEditModel('imagen-3.0-preview')).toBe(false);
    });
  });

  describe('isImageGenModel', () => {
    it('should return true for image generation models', () => {
      expect(isImageGenModel('imagen-3.0-preview')).toBe(true);
      expect(isImageGenModel('imagen-3.0-fast-preview')).toBe(true);
      expect(isImageGenModel('imagen-3.0-pro-preview')).toBe(true);
    });

    it('should return false for non-image-gen models', () => {
      expect(isImageGenModel('gemini-3-flash-preview')).toBe(false);
      expect(isImageGenModel('gemini-3-pro-image-preview')).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      expect(isImageFile({ id: '1', name: 'test.jpg', type: 'image/jpeg', size: 1000 } as UploadedFile)).toBe(true);
      expect(isImageFile({ id: '2', name: 'test.png', type: 'image/png', size: 1000 } as UploadedFile)).toBe(true);
    });

    it('should return false for non-image files', () => {
      expect(isImageFile({ id: '1', name: 'test.pdf', type: 'application/pdf', size: 1000 } as UploadedFile)).toBe(false);
      expect(isImageFile({ id: '2', name: 'test.txt', type: 'text/plain', size: 1000 } as UploadedFile)).toBe(false);
    });
  });

  describe('validateImageForModel', () => {
    const createImageFile = (sizeBytes: number): UploadedFile => ({
      id: 'test',
      name: 'test.jpg',
      type: 'image/jpeg',
      size: sizeBytes,
    } as UploadedFile);

    it('should return valid for valid image and supporting model', () => {
      const result = validateImageForModel(createImageFile(1000), 'gemini-3-flash-preview');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for model that does not support images', () => {
      const result = validateImageForModel(createImageFile(1000), 'imagen-3.0-preview');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('当前模型不支持图片输入');
    });

    it('should return invalid for non-image file', () => {
      const pdfFile = { id: '1', name: 'test.pdf', type: 'application/pdf', size: 1000 } as UploadedFile;
      const result = validateImageForModel(pdfFile, 'gemini-3-flash-preview');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('文件不是有效的图片格式');
    });

    it('should return invalid for oversized image', () => {
      const oversizedFile = createImageFile(30 * 1024 * 1024);
      const result = validateImageForModel(oversizedFile, 'gemini-3-flash-preview');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('图片大小超过限制');
    });
  });

  describe('validateImagesForModel', () => {
    const createImageFile = (sizeBytes: number, name: string = 'test.jpg'): UploadedFile => ({
      id: name,
      name,
      type: 'image/jpeg',
      size: sizeBytes,
    } as UploadedFile);

    it('should return valid for valid images', () => {
      const files = [createImageFile(1000), createImageFile(2000)];
      const result = validateImagesForModel(files, 'gemini-3-flash-preview');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for too many images', () => {
      const files = Array(15).fill(null).map((_, i) => createImageFile(1000, `test${i}.jpg`));
      const result = validateImagesForModel(files, 'gemini-3-flash-preview');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('图片数量超过限制');
    });

    it('should return invalid for non-supporting model', () => {
      const files = [createImageFile(1000)];
      const result = validateImagesForModel(files, 'imagen-3.0-preview');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('当前模型不支持图片输入');
    });
  });

  describe('getImageSizeInfo', () => {
    it('should format bytes correctly', () => {
      expect(getImageSizeInfo(500)).toBe('500 B');
      expect(getImageSizeInfo(1024)).toBe('1.0 KB');
      expect(getImageSizeInfo(1536)).toBe('1.5 KB');
      expect(getImageSizeInfo(1024 * 1024)).toBe('1.0 MB');
      expect(getImageSizeInfo(1536 * 1024)).toBe('1.5 MB');
    });
  });
});