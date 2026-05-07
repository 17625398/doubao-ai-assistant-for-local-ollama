'use client';

import { useState, useCallback, useRef } from 'react';
import { generateFolderContext, generateZipContext } from '@/utils/folderImportUtils';

export type ScanStatus = 'idle' | 'scanning' | 'processing' | 'completed' | 'error';

export interface ScanProgress {
    currentFile: string;
    totalFiles: number;
    processedFiles: number;
    percentage: number;
}

export interface ScanResult {
    files: Array<{ name: string; path: string; size: number; type: string }>;
    totalSize: number;
    contextFile: File | null;
}

export interface UseDirectoryScannerReturn {
    status: ScanStatus;
    progress: ScanProgress;
    result: ScanResult | null;
    error: string | null;
    scanDirectory: (files: FileList | File[] | { file: File; path: string }[]) => Promise<void>;
    scanZip: (file: File) => Promise<void>;
    reset: () => void;
}

export const useDirectoryScanner = (): UseDirectoryScannerReturn => {
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [progress, setProgress] = useState<ScanProgress>({
        currentFile: '',
        totalFiles: 0,
        processedFiles: 0,
        percentage: 0,
    });
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<boolean>(false);

    const reset = useCallback(() => {
        abortRef.current = true;
        setStatus('idle');
        setProgress({
            currentFile: '',
            totalFiles: 0,
            processedFiles: 0,
            percentage: 0,
        });
        setResult(null);
        setError(null);
    }, []);

    const scanDirectory = useCallback(async (files: FileList | File[] | { file: File; path: string }[]) => {
        reset();
        abortRef.current = false;

        try {
            setStatus('scanning');
            setError(null);

            const items = Array.isArray(files) ? files : Array.from(files);
            
            // 统计文件信息
            const fileInfo: Array<{ name: string; path: string; size: number; type: string }> = [];
            let totalSize = 0;

            for (const item of items) {
                if (abortRef.current) return;

                let file: File;
                let path: string;

                if ('file' in item && 'path' in item && typeof item.path === 'string') {
                    file = item.file;
                    path = item.path;
                } else {
                    file = item as File;
                    path = file.webkitRelativePath || file.name;
                }

                fileInfo.push({
                    name: file.name,
                    path,
                    size: file.size,
                    type: file.type || 'application/octet-stream',
                });
                totalSize += file.size;
            }

            setProgress({
                currentFile: '正在构建目录结构...',
                totalFiles: fileInfo.length,
                processedFiles: 0,
                percentage: 0,
            });

            // 处理文件生成上下文
            setStatus('processing');
            setProgress(prev => ({ ...prev, currentFile: '正在生成上下文文件...' }));

            const contextFile = await generateFolderContext(items);

            if (abortRef.current) return;

            setProgress({
                currentFile: '',
                totalFiles: fileInfo.length,
                processedFiles: fileInfo.length,
                percentage: 100,
            });

            setResult({
                files: fileInfo,
                totalSize,
                contextFile,
            });
            setStatus('completed');
        } catch (err) {
            setError(err instanceof Error ? err.message : '扫描目录失败');
            setStatus('error');
        }
    }, [reset]);

    const scanZip = useCallback(async (file: File) => {
        reset();
        abortRef.current = false;

        try {
            setStatus('scanning');
            setError(null);
            setProgress({
                currentFile: '正在解压 ZIP 文件...',
                totalFiles: 0,
                processedFiles: 0,
                percentage: 0,
            });

            const contextFile = await generateZipContext(file);

            if (abortRef.current) return;

            // 解析上下文文件获取文件列表
            const content = await contextFile.text();
            const fileMatches = content.match(/--- START OF FILE (.+?) ---/g) || [];
            const fileList = fileMatches.map(match => match.replace(/--- START OF FILE (.+?) ---/, '$1'));

            setProgress({
                currentFile: '',
                totalFiles: fileList.length,
                processedFiles: fileList.length,
                percentage: 100,
            });

            setResult({
                files: fileList.map(name => ({
                    name: name.split('/').pop() || name,
                    path: name,
                    size: 0,
                    type: 'text/plain',
                })),
                totalSize: file.size,
                contextFile,
            });
            setStatus('completed');
        } catch (err) {
            setError(err instanceof Error ? err.message : '解压 ZIP 文件失败');
            setStatus('error');
        }
    }, [reset]);

    return {
        status,
        progress,
        result,
        error,
        scanDirectory,
        scanZip,
        reset,
    };
};
