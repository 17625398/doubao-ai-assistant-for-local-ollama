import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
} from '../types/document';
import { logger } from '../utils/logger';
import { DocumentContent } from '../types/document';

export class ImageDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.IMAGE];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let imageUrl = '';
      let imageBase64 = '';

      if (file instanceof File) {
        imageBase64 = await this.fileToBase64(file);
        imageUrl = `data:${file.type};base64,${imageBase64}`;
      } else if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          imageUrl = file;
          imageBase64 = file.split(',')[1] || '';
        } else if (file.startsWith('blob:') || file.startsWith('http')) {
          imageUrl = file;
          try {
            const response = await fetch(file);
            const blob = await response.blob();
            imageBase64 = await this.blobToBase64(blob);
            imageUrl = `data:${blob.type || 'image/png'};base64,${imageBase64}`;
          } catch (e) {
            logger.warn('Failed to fetch remote image, using original URL:', e);
          }
        } else {
          imageUrl = file;
        }
      } else {
        const blob = new Blob([file]);
        imageBase64 = await this.blobToBase64(blob);
        imageUrl = `data:${blob.type || 'image/png'};base64,${imageBase64}`;
      }

      const metadata = await this.parseMetadata(file);

      const content: DocumentContent[] = [
        {
          type: ContentType.IMAGE,
          url: imageUrl,
          alt: metadata.name,
        },
      ];

      if (options?.enableOCR) {
        const ocrText = await this.performOCR(file, options.ocrLanguage);
        if (ocrText.trim()) {
          content.push({
            type: ContentType.TEXT,
            text: ocrText,
          });
        }
      }

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse image document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse image document',
      };
    }
  }

  async performOCR(file: File | ArrayBuffer | string, language: string = 'chi_sim+eng'): Promise<string> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('OCR is not available in server environment');
      }

      if (typeof window.Tesseract === 'undefined') {
        throw new Error('Tesseract.js is not loaded');
      }

      const Tesseract = window.Tesseract;
      let imageData: string | ArrayBuffer;

      if (file instanceof File) {
        imageData = await this.fileToDataURL(file);
      } else if (typeof file === 'string') {
        imageData = file;
      } else {
        imageData = await this.arrayBufferToDataURL(file);
      }

      const result = await Tesseract.recognize(
        imageData,
        language,
        {
          logger: (info) => logger.debug('[OCR]', info),
        }
      );

      return result.data.text;
    } catch (error) {
      logger.error('OCR failed:', error);
      throw new Error('OCR failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private arrayBufferToDataURL(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}
