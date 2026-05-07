'use client';

import React, { useCallback } from 'react';
import { FolderOpen, FileArchive, X, CheckCircle, AlertCircle, Loader2, FileText, FileCode, FileImage, FileAudio, FileVideo } from 'lucide-react';
import { useDirectoryScanner, ScanStatus } from '@/hooks/files/useDirectoryScanner';

interface DirectoryScannerProps {
    onComplete: (contextFile: File) => void;
    onCancel: () => void;
}

const FileIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 20 }) => {
    if (type.includes('image')) return <FileImage size={size} className="text-purple-500" />;
    if (type.includes('audio')) return <FileAudio size={size} className="text-green-500" />;
    if (type.includes('video')) return <FileVideo size={size} className="text-red-500" />;
    if (type.includes('code') || type.includes('javascript') || type.includes('typescript')) return <FileCode size={size} className="text-blue-500" />;
    if (type.includes('text')) return <FileText size={size} className="text-gray-500" />;
    return <FileText size={size} className="text-gray-400" />;
};

const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StatusIcon: React.FC<{ status: ScanStatus }> = ({ status }) => {
    switch (status) {
        case 'scanning':
        case 'processing':
            return <Loader2 className="animate-spin text-blue-500" size={24} />;
        case 'completed':
            return <CheckCircle className="text-green-500" size={24} />;
        case 'error':
            return <AlertCircle className="text-red-500" size={24} />;
        default:
            return null;
    }
};

const StatusText: React.FC<{ status: ScanStatus; progress: { currentFile: string } }> = ({ status, progress }) => {
    switch (status) {
        case 'idle':
            return '准备扫描';
        case 'scanning':
            return `正在扫描文件: ${progress.currentFile}`;
        case 'processing':
            return `正在处理: ${progress.currentFile}`;
        case 'completed':
            return '扫描完成';
        case 'error':
            return '扫描失败';
        default:
            return '';
    }
};

export const DirectoryScanner: React.FC<DirectoryScannerProps> = ({ onComplete, onCancel }) => {
    const { status, progress, result, error, scanDirectory, scanZip, reset } = useDirectoryScanner();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer.items;
        if (!items) return;

        // 检查是否有目录
        let hasDirectory = false;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && typeof item.webkitGetAsEntry === 'function') {
                const entry = item.webkitGetAsEntry();
                if (entry && entry.isDirectory) {
                    hasDirectory = true;
                    break;
                }
            }
        }

        if (hasDirectory) {
            const entries = Array.from(items)
                .filter(item => item.kind === 'file')
                .map(item => item.webkitGetAsEntry?.())
                .filter((entry): entry is FileSystemEntry => Boolean(entry));

            // 递归扫描目录
            const scanEntry = async (entry: FileSystemEntry, path: string = ''): Promise<{ file: File; path: string }[]> => {
                if (entry.isFile) {
                    return new Promise((resolve) => {
                        (entry as FileSystemFileEntry).file((file: File) => {
                            const relativePath = path + file.name;
                            resolve([{ file, path: relativePath }]);
                        });
                    });
                } else if (entry.isDirectory) {
                    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
                    const allEntries: FileSystemEntry[] = [];

                    const readEntries = async (): Promise<FileSystemEntry[]> => {
                        return new Promise((resolve) => {
                            dirReader.readEntries((entries) => resolve(entries));
                        });
                    };

                    let entries = await readEntries();
                    while (entries.length > 0) {
                        allEntries.push(...entries);
                        entries = await readEntries();
                    }

                    const filesArrays = await Promise.all(allEntries.map(child => scanEntry(child, path + entry.name + '/')));
                    return filesArrays.flat();
                }
                return [];
            };

            Promise.all(entries.map(entry => scanEntry(entry))).then(filesArrays => {
                const flatFiles = filesArrays.flat();
                if (flatFiles.length > 0) {
                    scanDirectory(flatFiles);
                }
            });
        } else {
            const files = e.dataTransfer.files;
            if (files.length === 1 && files[0].name.endsWith('.zip')) {
                scanZip(files[0]);
            }
        }
    }, [scanDirectory, scanZip]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (files.length === 1 && files[0].name.endsWith('.zip')) {
            scanZip(files[0]);
        } else {
            scanDirectory(Array.from(files));
        }
    }, [scanDirectory, scanZip]);

    const handleConfirm = useCallback(() => {
        if (result?.contextFile) {
            onComplete(result.contextFile);
        }
    }, [result, onComplete]);

    const handleReset = useCallback(() => {
        reset();
        onCancel();
    }, [reset, onCancel]);

    return (
        <div className="min-h-[400px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <FolderOpen className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">目录扫描</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">拖拽文件夹或选择 ZIP 文件</p>
                    </div>
                </div>
                <button
                    onClick={handleReset}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <X className="text-gray-500" size={20} />
                </button>
            </div>

            {/* Status Bar */}
            {status !== 'idle' && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <StatusIcon status={status} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {StatusText({ status, progress })}
                            </span>
                        </div>
                        {status !== 'completed' && status !== 'error' && (
                            <span className="text-sm text-gray-500">{progress.percentage}%</span>
                        )}
                    </div>
                    
                    {status === 'scanning' || status === 'processing' ? (
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                    ) : null}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertCircle size={16} />
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Drop Zone */}
            {status === 'idle' && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer"
                >
                    <input
                        type="file"
                        multiple
                        // @ts-ignore
                        directory
                        webkitdirectory
                        onChange={handleFileSelect}
                        className="hidden"
                        id="directory-input"
                    />
                    <input
                        type="file"
                        accept=".zip"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="zip-input"
                    />

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                            <FolderOpen className="text-blue-500" size={32} />
                        </div>
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white mb-1">拖拽文件夹到此处</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">或选择 ZIP 文件进行扫描</p>
                        </div>
                        <div className="flex gap-3">
                            <label
                                htmlFor="directory-input"
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <FolderOpen size={16} />
                                    选择文件夹
                                </span>
                            </label>
                            <label
                                htmlFor="zip-input"
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <FileArchive size={16} />
                                    选择 ZIP 文件
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Panel */}
            {result && status === 'completed' && (
                <div className="flex-1 flex flex-col">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                            <p className="text-2xl font-bold text-blue-500">{result.files.length}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">文件数量</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                            <p className="text-2xl font-bold text-green-500">{formatSize(result.totalSize)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">总大小</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                            <p className="text-2xl font-bold text-purple-500">1</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">生成文件</p>
                        </div>
                    </div>

                    {/* File List */}
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 overflow-y-auto">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">扫描到的文件</h3>
                        <div className="space-y-2">
                            {result.files.slice(0, 20).map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-lg"
                                >
                                    <FileIcon type={file.type} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 dark:text-white truncate">{file.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{file.path}</p>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatSize(file.size)}
                                    </span>
                                </div>
                            ))}
                            {result.files.length > 20 && (
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                    还有 {result.files.length - 20} 个文件...
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleReset}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            重新扫描
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                            确认导入
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
