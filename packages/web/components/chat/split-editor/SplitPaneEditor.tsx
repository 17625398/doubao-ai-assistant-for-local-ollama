'use client'

import React, { useState, useCallback } from 'react';
import { FileText, Download, RefreshCw, Copy, Check } from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'error';
    content: string;
    timestamp: number;
}

interface SplitPaneEditorProps {
    messages: ChatMessage[];
    onClose: () => void;
}

interface EditableMessage {
    id: string;
    role: 'user' | 'model' | 'error';
    originalContent: string;
    editedContent: string;
    isEdited: boolean;
}

const t = (key: string, fallback?: string) => {
    const translations: Record<string, string> = {
        'split_edit_title': '分栏编辑导出',
        'split_edit_desc': '编辑和导出对话内容',
        'edited': '已编辑',
        'compare_view': '对比视图',
        'reset_all': '重置全部',
        'export': '导出',
        'close': '关闭',
        'original_content': '原始内容',
        'edited_content': '编辑内容',
        'copy_to_edit': '复制到编辑区',
        'reset': '重置',
        'user': '用户',
        'model': '模型',
        'export_txt': '导出为 TXT',
        'export_json': '导出为 JSON',
        'export_html': '导出为 HTML',
        'export_time': '导出时间',
        'conversation_export': '对话导出',
    };
    return translations[key] || fallback || key;
};

const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const SplitPaneEditor: React.FC<SplitPaneEditorProps> = ({ messages, onClose }) => {
    const iconSize = 18;

    const [editableMessages, setEditableMessages] = useState<EditableMessage[]>(
        messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            originalContent: msg.content || '',
            editedContent: msg.content || '',
            isEdited: false,
        }))
    );

    const [activeTab, setActiveTab] = useState<'compare' | 'single'>('compare');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleContentChange = useCallback((index: number, content: string) => {
        setEditableMessages(prev => prev.map((msg, i) => {
            if (i === index) {
                return {
                    ...msg,
                    editedContent: content,
                    isEdited: content !== msg.originalContent,
                };
            }
            return msg;
        }));
    }, []);

    const handleResetMessage = useCallback((index: number) => {
        setEditableMessages(prev => prev.map((msg, i) => {
            if (i === index) {
                return {
                    ...msg,
                    editedContent: msg.originalContent,
                    isEdited: false,
                };
            }
            return msg;
        }));
    }, []);

    const handleCopyToRight = useCallback((index: number) => {
        setEditableMessages(prev => prev.map((msg, i) => {
            if (i === index) {
                return {
                    ...msg,
                    editedContent: msg.originalContent,
                    isEdited: false,
                };
            }
            return msg;
        }));
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    }, []);

    const handleResetAll = useCallback(() => {
        setEditableMessages(prev => prev.map(msg => ({
            ...msg,
            editedContent: msg.originalContent,
            isEdited: false,
        })));
    }, []);

    const handleExportAsTxt = useCallback(() => {
        const content = editableMessages.map(msg => {
            const roleLabel = msg.role === 'user' ? t('user', 'User') : t('model', 'Model');
            return `${roleLabel}:\n${msg.editedContent}\n\n---\n`;
        }).join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        triggerDownload(URL.createObjectURL(blob), `conversation-${Date.now()}.txt`);
    }, [editableMessages]);

    const handleExportAsJson = useCallback(() => {
        const exportData = editableMessages.map(msg => ({
            role: msg.role,
            content: msg.editedContent,
            isEdited: msg.isEdited,
        }));

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        triggerDownload(URL.createObjectURL(blob), `conversation-${Date.now()}.json`);
    }, [editableMessages]);

    const handleExportAsHtml = useCallback(() => {
        const messagesHtml = editableMessages.map((msg) => `
            <div class="message-block ${msg.role === 'user' ? 'user-message' : 'model-message'}">
                <div class="message-header">
                    <span class="role-badge">${msg.role === 'user' ? t('user', 'User') : t('model', 'Model')}</span>
                    ${msg.isEdited ? '<span class="edited-badge">Edited</span>' : ''}
                </div>
                <div class="message-content">${msg.editedContent.replace(/\n/g, '<br>')}</div>
            </div>
        `).join('');

        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('conversation_export', 'Conversation Export')}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 24px; }
        .header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #1a1a1a; }
        .message-block { margin-bottom: 20px; padding: 16px; border-radius: 8px; }
        .user-message { background: #007bff; color: white; }
        .model-message { background: #f8f9fa; color: #1a1a1a; }
        .message-header { display: flex; gap: 8px; margin-bottom: 8px; }
        .role-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .user-message .role-badge { background: rgba(255,255,255,0.2); }
        .model-message .role-badge { background: #e9ecef; }
        .edited-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #ffc107; color: #333; }
        .message-content { line-height: 1.6; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t('conversation_export', 'Conversation Export')}</h1>
            <p style="color: #666; margin: 8px 0 0;">${t('export_time', 'Exported at')}: ${new Date().toLocaleString()}</p>
        </div>
        ${messagesHtml}
    </div>
</body>
</html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        triggerDownload(URL.createObjectURL(blob), `conversation-${Date.now()}.html`);
    }, [editableMessages]);

    const editedCount = editableMessages.filter(m => m.isEdited).length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--theme-bg-primary)] rounded-xl shadow-premium w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--theme-border-primary)]">
                    <div className="flex items-center gap-3">
                        <FileText size={24} className="text-[var(--theme-text-link)]" />
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--theme-text-link)]">
                                {t('split_edit_title', 'Split Edit & Export')}
                            </h2>
                            <p className="text-sm text-[var(--theme-text-tertiary)]">
                                {t('split_edit_desc', 'Edit and export conversation content')}
                                {editedCount > 0 && (
                                    <span className="ml-2 text-[var(--theme-text-link)]">
                                        ({editedCount} {t('edited', 'edited')})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab(activeTab === 'compare' ? 'single' : 'compare')}
                            className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                            style={{
                                background: activeTab === 'compare' 
                                    ? 'var(--theme-bg-tertiary)' 
                                    : 'transparent',
                                color: activeTab === 'compare' 
                                    ? 'var(--theme-text-primary)' 
                                    : 'var(--theme-text-tertiary)',
                            }}
                        >
                            {t('compare_view', 'Compare View')}
                        </button>
                        
                        <button
                            onClick={handleResetAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                        >
                            <RefreshCw size={iconSize} />
                            {t('reset_all', 'Reset All')}
                        </button>
                        
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[var(--theme-bg-link)] text-white rounded-lg hover:opacity-90 transition-opacity">
                                <Download size={iconSize} />
                                {t('export', 'Export')}
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--theme-bg-primary)] rounded-lg shadow-lg border border-[var(--theme-border-secondary)] py-2 hidden group-hover:block">
                                <button
                                    onClick={handleExportAsTxt}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] flex items-center gap-2"
                                >
                                    <FileText size={14} />
                                    {t('export_txt', 'Export as TXT')}
                                </button>
                                <button
                                    onClick={handleExportAsJson}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] flex items-center gap-2"
                                >
                                    <FileText size={14} />
                                    {t('export_json', 'Export as JSON')}
                                </button>
                                <button
                                    onClick={handleExportAsHtml}
                                    className="w-full px-4 py-2 text-left text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)] flex items-center gap-2"
                                >
                                    <FileText size={14} />
                                    {t('export_html', 'Export as HTML')}
                                </button>
                            </div>
                        </div>
                        
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                        >
                            {t('close', 'Close')}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-4">
                    {activeTab === 'compare' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <div className="px-4 py-2 bg-[var(--theme-bg-secondary)] rounded-t-lg border border-b-0 border-[var(--theme-border-secondary)]">
                                    <h3 className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center gap-2">
                                        <FileText size={14} />
                                        {t('original_content', 'Original Content')}
                                    </h3>
                                </div>
                                <div className="flex-1 border border-[var(--theme-border-secondary)] rounded-b-lg overflow-auto p-4 space-y-4">
                                    {editableMessages.map((msg, index) => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 rounded-lg ${
                                                msg.role === 'user' 
                                                    ? 'bg-[var(--theme-bg-user-message)]' 
                                                    : 'bg-[var(--theme-bg-secondary)]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
                                                    background: msg.role === 'user' 
                                                        ? 'rgba(255,255,255,0.2)' 
                                                        : 'var(--theme-bg-tertiary)',
                                                    color: msg.role === 'user' 
                                                        ? 'var(--theme-bg-user-message-text)' 
                                                        : 'var(--theme-text-secondary)',
                                                }}>
                                                    {msg.role === 'user' ? t('user', 'User') : t('model', 'Model')}
                                                </span>
                                                <button
                                                    onClick={() => handleCopyToRight(index)}
                                                    className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                                                    title={t('copy_to_edit', 'Copy to edit')}
                                                >
                                                    {copiedIndex === index ? (
                                                        <Check size={14} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap break-all" style={{
                                                color: msg.role === 'user' 
                                                    ? 'var(--theme-bg-user-message-text)' 
                                                    : 'var(--theme-text-primary)',
                                            }}>
                                                {msg.originalContent}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <div className="px-4 py-2 bg-[var(--theme-bg-secondary)] rounded-t-lg border border-b-0 border-[var(--theme-border-secondary)]">
                                    <h3 className="text-sm font-medium text-[var(--theme-text-secondary)] flex items-center gap-2">
                                        <FileText size={14} />
                                        {t('edited_content', 'Edited Content')}
                                    </h3>
                                </div>
                                <div className="flex-1 border border-[var(--theme-border-secondary)] rounded-b-lg overflow-auto p-4 space-y-4">
                                    {editableMessages.map((msg, index) => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 rounded-lg ${
                                                msg.role === 'user' 
                                                    ? 'bg-[var(--theme-bg-user-message)]' 
                                                    : 'bg-[var(--theme-bg-secondary)]'
                                            } ${msg.isEdited ? 'ring-2 ring-[var(--theme-border-focus)]' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
                                                    background: msg.role === 'user' 
                                                        ? 'rgba(255,255,255,0.2)' 
                                                        : 'var(--theme-bg-tertiary)',
                                                    color: msg.role === 'user' 
                                                        ? 'var(--theme-bg-user-message-text)' 
                                                        : 'var(--theme-text-secondary)',
                                                }}>
                                                    {msg.role === 'user' ? t('user', 'User') : t('model', 'Model')}
                                                    {msg.isEdited && (
                                                        <span className="ml-1 text-xs bg-yellow-500 text-yellow-900 px-1 rounded">
                                                            {t('edited', 'Edited')}
                                                        </span>
                                                    )}
                                                </span>
                                                {msg.isEdited && (
                                                    <button
                                                        onClick={() => handleResetMessage(index)}
                                                        className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                                                        title={t('reset', 'Reset')}
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={msg.editedContent}
                                                onChange={(e) => handleContentChange(index, e.target.value)}
                                                className="w-full h-24 p-2 text-sm rounded bg-transparent resize-none focus:outline-none"
                                                style={{
                                                    color: msg.role === 'user' 
                                                        ? 'var(--theme-bg-user-message-text)' 
                                                        : 'var(--theme-text-primary)',
                                                    caretColor: msg.role === 'user' 
                                                        ? 'var(--theme-bg-user-message-text)' 
                                                        : 'var(--theme-text-primary)',
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {editableMessages.map((msg, index) => (
                                <div
                                    key={msg.id}
                                    className={`p-4 rounded-lg border ${
                                        msg.role === 'user' 
                                            ? 'bg-[var(--theme-bg-user-message)] border-transparent' 
                                            : 'bg-[var(--theme-bg-secondary)] border-[var(--theme-border-secondary)]'
                                    } ${msg.isEdited ? 'ring-2 ring-[var(--theme-border-focus)]' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium px-2 py-0.5 rounded" style={{
                                            background: msg.role === 'user' 
                                                ? 'rgba(255,255,255,0.2)' 
                                                : 'var(--theme-bg-tertiary)',
                                            color: msg.role === 'user' 
                                                ? 'var(--theme-bg-user-message-text)' 
                                                : 'var(--theme-text-secondary)',
                                        }}>
                                            {msg.role === 'user' ? t('user', 'User') : t('model', 'Model')}
                                            {msg.isEdited && (
                                                <span className="ml-1 text-xs bg-yellow-500 text-yellow-900 px-1 rounded">
                                                    {t('edited', 'Edited')}
                                                </span>
                                            )}
                                        </span>
                                        {msg.isEdited && (
                                            <button
                                                onClick={() => handleResetMessage(index)}
                                                className="p-1 text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
                                                title={t('reset', 'Reset')}
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        value={msg.editedContent}
                                        onChange={(e) => handleContentChange(index, e.target.value)}
                                        className="w-full min-h-[100px] p-2 text-sm rounded bg-transparent resize-none focus:outline-none"
                                        style={{
                                            color: msg.role === 'user' 
                                                ? 'var(--theme-bg-user-message-text)' 
                                                : 'var(--theme-text-primary)',
                                            caretColor: msg.role === 'user' 
                                                ? 'var(--theme-bg-user-message-text)' 
                                                : 'var(--theme-text-primary)',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};