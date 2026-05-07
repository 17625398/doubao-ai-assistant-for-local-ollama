import React, { useState, useRef, useCallback } from 'react';
import { DocumentParserUtil } from '@doubao/core';

interface DocumentUploaderProps {
  onDocumentUpload: (document: File) => void;
  onDocumentsUpload: (documents: File[]) => void;
  disabled?: boolean;
}

const SUPPORTED_FORMATS = [
  { ext: '.pdf', label: 'PDF', color: 'text-red-500', bg: 'bg-red-50' },
  { ext: '.doc', label: 'Word', color: 'text-blue-500', bg: 'bg-blue-50' },
  { ext: '.docx', label: 'Word', color: 'text-blue-500', bg: 'bg-blue-50' },
  { ext: '.xls', label: 'Excel', color: 'text-green-500', bg: 'bg-green-50' },
  { ext: '.xlsx', label: 'Excel', color: 'text-green-500', bg: 'bg-green-50' },
  { ext: '.ppt', label: 'PPT', color: 'text-orange-500', bg: 'bg-orange-50' },
  { ext: '.pptx', label: 'PPT', color: 'text-orange-500', bg: 'bg-orange-50' },
  { ext: '.txt', label: '文本', color: 'text-gray-500', bg: 'bg-gray-50' },
  { ext: '.md', label: 'Markdown', color: 'text-gray-500', bg: 'bg-gray-50' },
  { ext: '.html', label: 'HTML', color: 'text-purple-500', bg: 'bg-purple-50' },
  { ext: '.htm', label: 'HTML', color: 'text-purple-500', bg: 'bg-purple-50' },
  { ext: '.jpg', label: '图片', color: 'text-pink-500', bg: 'bg-pink-50' },
  { ext: '.jpeg', label: '图片', color: 'text-pink-500', bg: 'bg-pink-50' },
  { ext: '.png', label: '图片', color: 'text-pink-500', bg: 'bg-pink-50' },
  { ext: '.gif', label: '图片', color: 'text-pink-500', bg: 'bg-pink-50' },
  { ext: '.webp', label: '图片', color: 'text-pink-500', bg: 'bg-pink-50' },
];

const getFileIcon = (fileName: string) => {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  const format = SUPPORTED_FORMATS.find(f => f.ext === ext);
  return format || { label: '文件', color: 'text-gray-500', bg: 'bg-gray-50' };
};

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDocumentUpload,
  onDocumentsUpload,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [recentFiles, setRecentFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return `文件 "${file.name}" 超过 50MB 限制`;
    }
    const supportedExts = SUPPORTED_FORMATS.map(f => f.ext);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedExts.includes(ext)) {
      return `不支持的文件格式: ${ext}`;
    }
    return null;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setUploadError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);

    const files = Array.from(e.dataTransfer.files);
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join('；'));
    }

    if (validFiles.length === 1) {
      setRecentFiles(prev => [validFiles[0], ...prev].slice(0, 5));
      onDocumentUpload(validFiles[0]);
    } else if (validFiles.length > 1) {
      setRecentFiles(prev => [...validFiles, ...prev].slice(0, 5));
      onDocumentsUpload(validFiles);
    }
  }, [onDocumentUpload, onDocumentsUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError(null);

    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join('；'));
    }

    if (validFiles.length === 1) {
      setRecentFiles(prev => [validFiles[0], ...prev].slice(0, 5));
      onDocumentUpload(validFiles[0]);
    } else if (validFiles.length > 1) {
      setRecentFiles(prev => [...validFiles, ...prev].slice(0, 5));
      onDocumentsUpload(validFiles);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onDocumentUpload, onDocumentsUpload]);

  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.htm,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg'
            : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
        onClick={disabled ? undefined : handleButtonClick}
      >
        <div className="flex flex-col items-center">
          {/* 动态图标 */}
          <div className={`w-20 h-20 flex items-center justify-center rounded-full mb-4 transition-all duration-300 ${
            isDragging ? 'bg-blue-100 scale-110' : 'bg-gray-100'
          }`}>
            {isDragging ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {isDragging ? '释放文件以上传' : '上传文档'}
          </h3>
          <p className="text-sm text-gray-500 mb-2">
            拖放文件到此处，或点击选择文件
          </p>
          <p className="text-xs text-gray-400 mb-4">
            支持 PDF、Word、Excel、PowerPoint、文本和图像文件（最大 50MB）
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleButtonClick();
            }}
            disabled={disabled}
            className={`px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 active:scale-95'
            }`}
          >
            选择文件
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">上传失败</p>
            <p className="text-sm text-red-600 mt-1">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 最近上传文件 */}
      {recentFiles.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <h4 className="text-sm font-medium text-gray-700">最近上传</h4>
          <div className="flex flex-wrap gap-2">
            {recentFiles.map((file, index) => {
              const icon = getFileIcon(file.name);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded ${icon.bg}`}>
                    <span className={`text-xs font-bold ${icon.color}`}>{icon.label[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 支持的格式标签 */}
      <div className="flex flex-wrap gap-2">
        {['PDF', 'Word', 'Excel', 'PPT', '文本', '图片'].map((format) => (
          <span
            key={format}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
          >
            {format}
          </span>
        ))}
      </div>
    </div>
  );
};

export default DocumentUploader;
