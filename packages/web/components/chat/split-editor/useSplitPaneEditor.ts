'use client'

import { useState, useCallback } from 'react';
import { ChatMessage } from '@/types';
import { SplitPaneEditor } from './SplitPaneEditor';

interface UseSplitPaneEditorReturn {
    isOpen: boolean;
    openEditor: (messages: ChatMessage[]) => void;
    closeEditor: () => void;
    EditorComponent: React.FC<{ messages: ChatMessage[] }>;
}

export const useSplitPaneEditor = (): UseSplitPaneEditorReturn => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const openEditor = useCallback((msgs: ChatMessage[]) => {
        setMessages(msgs);
        setIsOpen(true);
    }, []);

    const closeEditor = useCallback(() => {
        setIsOpen(false);
    }, []);

    const EditorComponent = ({ messages: editorMessages }: { messages: ChatMessage[] }) => (
        <SplitPaneEditor
            messages={editorMessages}
            onClose={closeEditor}
        />
    );

    return {
        isOpen,
        openEditor,
        closeEditor,
        EditorComponent,
    };
};