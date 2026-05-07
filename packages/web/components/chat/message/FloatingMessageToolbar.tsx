'use client'

import React, { useState } from 'react';
import { Copy, Check, Edit3, Volume2, ThumbsUp, Share2, Send, MoreHorizontal, FileText, Star, AlertTriangle, Trash2 } from 'lucide-react';

interface FloatingMessageToolbarProps {
    messageId: string;
    content: string;
    onEdit: () => void;
    onDelete: () => void;
    isUserMessage: boolean;
}

export const FloatingMessageToolbar: React.FC<FloatingMessageToolbarProps> = ({
    messageId,
    content,
    onEdit,
    onDelete,
    isUserMessage,
}) => {
    const [copied, setCopied] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handleCopy = async () => {
        if (!content) return;
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleMenuAction = (action: string) => {
        switch (action) {
            case 'edit':
                onEdit();
                break;
            case 'delete':
                onDelete();
                break;
            default:
                break;
        }
        setShowMenu(false);
    };

    return (
        <div className="absolute bottom-3 right-3 z-50">
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-full px-2 py-1.5 shadow-lg border border-gray-200">
                {!isUserMessage && (
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                        title="编辑"
                        aria-label="编辑消息"
                    >
                        <Edit3 size={16} strokeWidth={2} />
                    </button>
                )}
                
                <button
                    onClick={handleCopy}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                    title="复制"
                    aria-label="复制消息"
                >
                    {copied ? (
                        <Check size={16} className="text-green-500" strokeWidth={2} />
                    ) : (
                        <Copy size={16} strokeWidth={2} />
                    )}
                </button>
                
                <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                    title="朗读"
                    aria-label="朗读消息"
                >
                    <Volume2 size={16} strokeWidth={2} />
                </button>
                
                <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                    title="点赞"
                    aria-label="点赞消息"
                >
                    <ThumbsUp size={16} strokeWidth={2} />
                </button>
                
                <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                    title="分享"
                    aria-label="分享消息"
                >
                    <Share2 size={16} strokeWidth={2} />
                </button>
                
                <button
                    className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                    title="转发"
                    aria-label="转发消息"
                >
                    <Send size={16} strokeWidth={2} />
                </button>
                
                <div className="relative">
                    <button
                        onClick={handleMenuClick}
                        className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 border-l border-gray-200 ml-1"
                        title="更多"
                        aria-label="更多选项"
                    >
                        <MoreHorizontal size={16} strokeWidth={2} />
                    </button>
                    
                    {showMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-40"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
                                <button
                                    onClick={() => handleMenuAction('edit')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={16} className="text-gray-400" />
                                    <span>转为文档编辑</span>
                                </button>
                                <button
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <Star size={16} className="text-gray-400" />
                                    <span>收藏</span>
                                </button>
                                <button
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <AlertTriangle size={16} className="text-gray-400" />
                                    <span>反馈与举报</span>
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                    onClick={() => handleMenuAction('delete')}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    <span>删除</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};