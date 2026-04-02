'use client';

import { useState, useRef } from 'react';

interface CloudStoragePanelProps {
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  url: string;
}

// 从本地存储加载文件数据
const loadFilesFromStorage = (): FileItem[] => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedFiles = localStorage.getItem('cloud-storage-files');
      if (storedFiles) {
        const files = JSON.parse(storedFiles);
        // 将日期字符串转换回 Date 对象
        return files.map((file: any) => ({
          ...file,
          uploadDate: new Date(file.uploadDate)
        }));
      }
    }
    return [];
  } catch (error) {
    console.error('Error loading files from storage:', error);
    return [];
  }
};

// 保存文件数据到本地存储
const saveFilesToStorage = (files: FileItem[]) => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('cloud-storage-files', JSON.stringify(files));
    }
  } catch (error) {
    console.error('Error saving files to storage:', error);
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export function CloudStoragePanel({ onClose, onFileSelect }: CloudStoragePanelProps) {
  const [files, setFiles] = useState<FileItem[]>(loadFilesFromStorage);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 0;
        }
        return prev + 10;
      });
    }, 300);

    // 模拟上传完成
    setTimeout(() => {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: uploadedFiles[0].name,
        size: uploadedFiles[0].size,
        type: uploadedFiles[0].type,
        uploadDate: new Date(),
        url: URL.createObjectURL(uploadedFiles[0]),
      };
      const updatedFiles = [newFile, ...files];
      setFiles(updatedFiles);
      saveFilesToStorage(updatedFiles);
    }, 3000);
  };

  const handleFileClick = (file: FileItem) => {
    // 这里可以实现文件预览或下载功能
    console.log('File clicked:', file);
  };

  const handleDeleteFile = (id: string) => {
    const updatedFiles = files.filter((file) => file.id !== id);
    setFiles(updatedFiles);
    saveFilesToStorage(updatedFiles);
  };

  const handleSelectFile = (file: FileItem) => {
    // 这里需要实现文件选择逻辑
    console.log('File selected:', file);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">云盘</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 上传区域 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">上传文件</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                上传文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {isUploading && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-600">上传中... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* 文件列表 */}
          <div>
            <h3 className="font-medium mb-4">文件列表</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      文件名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      大小
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      上传日期
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {file.type.includes('image') ? (
                              <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            ) : file.type.includes('word') ? (
                              <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            ) : file.type.includes('pdf') ? (
                              <div className="h-10 w-10 bg-red-100 rounded flex items-center justify-center">
                                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                            ) : file.type.includes('excel') ? (
                              <div className="h-10 w-10 bg-green-100 rounded flex items-center justify-center">
                                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {file.type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(file.uploadDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleFileClick(file)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleSelectFile(file)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          选择
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CloudStoragePanel;