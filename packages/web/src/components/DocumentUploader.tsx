import React, { useState, useRef } from 'react';
import { DocumentParserUtil } from '@doubao/core';

interface DocumentUploaderProps {
  onDocumentUpload: (document: File) => void;
  onDocumentsUpload: (documents: File[]) => void;
  disabled?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDocumentUpload,
  onDocumentsUpload,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 1) {
      onDocumentUpload(files[0]);
    } else if (files.length > 1) {
      onDocumentsUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 1) {
      onDocumentUpload(files[0]);
    } else if (files.length > 1) {
      onDocumentsUpload(files);
    }
    // 重置输入以允许重复上传相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.htm,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDragging ? '释放文件以上传' : '上传文档'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            拖放文件到此处，或点击选择文件
          </p>
          <p className="text-xs text-gray-400 mb-4">
            支持 PDF、Word、Excel、PowerPoint、文本和图像文件
          </p>
          <button
            onClick={handleButtonClick}
            disabled={disabled}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            选择文件
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploader;