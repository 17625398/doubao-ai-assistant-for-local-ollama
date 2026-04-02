'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AIConfigPanel } from '@/components/AIConfigPanel';
import { AICreationPanel } from '@/components/ai-creation/AICreationPanel';
import { CloudStoragePanel } from '@/components/cloud-storage/CloudStoragePanel';
import { QuickToolsPanel } from '@/components/quick-tools/QuickToolsPanel';
import { ScreenshotQuestionPanel } from '@/components/screenshot-question/ScreenshotQuestionPanel';
import { ScreenSharePanel } from '@/components/screen-share/ScreenSharePanel';
import { PPTGenerationPanel } from '@/components/ppt-generation/PPTGenerationPanel';
import { WritingAssistantPanel } from '@/components/writing-assistant/WritingAssistantPanel';
import { VoiceChatPanel } from '@/components/voice-chat/VoiceChatPanel';
import { AudioTranslatePanel } from '@/components/audio-translate/AudioTranslatePanel';
import { LogicModePanel } from '@/components/logic-mode/LogicModePanel';
import { MiniProgramPanel } from '@/components/mini-program/MiniProgramPanel';
import { BookmarkPanel } from '@/components/bookmark/BookmarkPanel';
import { AddBookmarkModal } from '@/components/bookmark/AddBookmarkModal';
import { CodeReviewPanel } from '@/components/code-review/CodeReviewPanel';
import { DataAnalysisPanel } from '@/components/data-analysis/DataAnalysisPanel';
import { TranslationPanel } from '@/components/translation/TranslationPanel';
import { SummaryPanel } from '@/components/summary/SummaryPanel';
import { useOllamaChat } from '@/hooks/useOllamaChat';
import { DocumentParserUtil, textPicker } from '@doubao/core';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [aiCreationPanelOpen, setAiCreationPanelOpen] = useState(false);
  const [cloudStoragePanelOpen, setCloudStoragePanelOpen] = useState(false);
  const [quickToolsPanelOpen, setQuickToolsPanelOpen] = useState(false);
  const [screenshotQuestionPanelOpen, setScreenshotQuestionPanelOpen] = useState(false);
  const [screenSharePanelOpen, setScreenSharePanelOpen] = useState(false);
  const [pptGenerationPanelOpen, setPptGenerationPanelOpen] = useState(false);
  const [writingAssistantPanelOpen, setWritingAssistantPanelOpen] = useState(false);
  const [voiceChatPanelOpen, setVoiceChatPanelOpen] = useState(false);
  const [audioTranslatePanelOpen, setAudioTranslatePanelOpen] = useState(false);
  const [logicModePanelOpen, setLogicModePanelOpen] = useState(false);
  const [miniProgramPanelOpen, setMiniProgramPanelOpen] = useState(false);
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false);
  const [addBookmarkModalOpen, setAddBookmarkModalOpen] = useState(false);
  const [addBookmarkData, setAddBookmarkData] = useState({ content: '', title: '' });
  const [codeReviewPanelOpen, setCodeReviewPanelOpen] = useState(false);
  const [dataAnalysisPanelOpen, setDataAnalysisPanelOpen] = useState(false);
  const [translationPanelOpen, setTranslationPanelOpen] = useState(false);
  const [summaryPanelOpen, setSummaryPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 Ollama 聊天 Hook
  const {
    messages,
    isLoading,
    error,
    currentModel,
    sendMessage,
    clearMessages,
    stopGeneration,
  } = useOllamaChat({
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听自定义事件
  useEffect(() => {
    // 初始化文本选择器
    textPicker.init();

    const handleOpenAICreation = () => setAiCreationPanelOpen(true);
    const handleOpenCloudStorage = () => setCloudStoragePanelOpen(true);
    const handleOpenQuickTools = () => setQuickToolsPanelOpen(true);
    const handleOpenScreenshotQuestion = () => setScreenshotQuestionPanelOpen(true);
    const handleOpenScreenShare = () => setScreenSharePanelOpen(true);
    const handleOpenPPTGeneration = () => setPptGenerationPanelOpen(true);
    const handleOpenWritingAssistant = () => setWritingAssistantPanelOpen(true);
    const handleOpenVoiceChat = () => setVoiceChatPanelOpen(true);
    const handleOpenAudioTranslate = () => setAudioTranslatePanelOpen(true);
    const handleOpenLogicMode = () => setLogicModePanelOpen(true);
    const handleOpenMiniProgram = () => setMiniProgramPanelOpen(true);
    const handleOpenBookmarkPanel = () => setBookmarkPanelOpen(true);
    const handleOpenAddBookmark = (e: CustomEvent) => {
      setAddBookmarkData(e.detail || { content: '', title: '' });
      setAddBookmarkModalOpen(true);
    };
    const handleOpenCodeReview = () => setCodeReviewPanelOpen(true);
    const handleOpenDataAnalysis = () => setDataAnalysisPanelOpen(true);
    const handleOpenTranslation = () => setTranslationPanelOpen(true);
    const handleOpenSummary = () => setSummaryPanelOpen(true);

    const initialPanel = new URLSearchParams(window.location.search).get('panel');
    if (initialPanel === 'settings') setConfigPanelOpen(true);
    if (initialPanel === 'quick-tools') setQuickToolsPanelOpen(true);
    if (initialPanel === 'voice-chat') setVoiceChatPanelOpen(true);
    if (initialPanel === 'audio-translate') setAudioTranslatePanelOpen(true);
    if (initialPanel === 'bookmark') setBookmarkPanelOpen(true);
    if (initialPanel === 'translation') setTranslationPanelOpen(true);
    if (initialPanel === 'screen-share') setScreenSharePanelOpen(true);

    // 文本选择器事件处理
    const handleTextPickerExplain = (e: CustomEvent) => {
      const { text } = e.detail;
      handleSendMessage(`请解释以下内容：\n${text}`);
    };

    const handleTextPickerSummarize = (e: CustomEvent) => {
      const { text } = e.detail;
      handleSendMessage(`请总结以下内容：\n${text}`);
    };

    const handleTextPickerSave = (e: CustomEvent) => {
      const { text } = e.detail;
      setAddBookmarkData({ content: text, title: text.substring(0, 50) });
      setAddBookmarkModalOpen(true);
    };

    window.addEventListener('open-ai-creation', handleOpenAICreation);
    window.addEventListener('open-cloud-storage', handleOpenCloudStorage);
    window.addEventListener('open-quick-tools', handleOpenQuickTools);
    window.addEventListener('open-screenshot-question', handleOpenScreenshotQuestion);
    window.addEventListener('open-screen-share', handleOpenScreenShare);
    window.addEventListener('open-ppt-generation', handleOpenPPTGeneration);
    window.addEventListener('open-writing-assistant', handleOpenWritingAssistant);
    window.addEventListener('open-voice-chat', handleOpenVoiceChat);
    window.addEventListener('open-audio-translate', handleOpenAudioTranslate);
    window.addEventListener('open-logic-mode', handleOpenLogicMode);
    window.addEventListener('open-mini-program', handleOpenMiniProgram);
    window.addEventListener('open-bookmark-panel', handleOpenBookmarkPanel);
    window.addEventListener('open-add-bookmark', handleOpenAddBookmark as EventListener);
    window.addEventListener('open-code-review', handleOpenCodeReview);
    window.addEventListener('open-data-analysis', handleOpenDataAnalysis);
    window.addEventListener('open-translation', handleOpenTranslation);
    window.addEventListener('open-summary', handleOpenSummary);
    window.addEventListener('text-picker:explain', handleTextPickerExplain as EventListener);
    window.addEventListener('text-picker:summarize', handleTextPickerSummarize as EventListener);
    window.addEventListener('text-picker:save', handleTextPickerSave as EventListener);

    return () => {
      // 销毁文本选择器
      textPicker.destroy();

      window.removeEventListener('open-ai-creation', handleOpenAICreation);
      window.removeEventListener('open-cloud-storage', handleOpenCloudStorage);
      window.removeEventListener('open-quick-tools', handleOpenQuickTools);
      window.removeEventListener('open-screenshot-question', handleOpenScreenshotQuestion);
      window.removeEventListener('open-screen-share', handleOpenScreenShare);
      window.removeEventListener('open-ppt-generation', handleOpenPPTGeneration);
      window.removeEventListener('open-writing-assistant', handleOpenWritingAssistant);
      window.removeEventListener('open-voice-chat', handleOpenVoiceChat);
      window.removeEventListener('open-audio-translate', handleOpenAudioTranslate);
      window.removeEventListener('open-logic-mode', handleOpenLogicMode);
      window.removeEventListener('open-mini-program', handleOpenMiniProgram);
      window.removeEventListener('open-bookmark-panel', handleOpenBookmarkPanel);
      window.removeEventListener('open-add-bookmark', handleOpenAddBookmark as EventListener);
      window.removeEventListener('open-code-review', handleOpenCodeReview);
      window.removeEventListener('open-data-analysis', handleOpenDataAnalysis);
      window.removeEventListener('open-translation', handleOpenTranslation);
      window.removeEventListener('open-summary', handleOpenSummary);
      window.removeEventListener('text-picker:explain', handleTextPickerExplain as EventListener);
      window.removeEventListener('text-picker:summarize', handleTextPickerSummarize as EventListener);
      window.removeEventListener('text-picker:save', handleTextPickerSave as EventListener);
    };
  }, []);

  // 处理发送消息
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    let fullContent = content;
    const validFiles = attachments?.filter((f): f is File => f instanceof File) ?? [];
    const imageFiles = validFiles.filter((f) => f.type.startsWith('image/'));
    const otherFiles = validFiles.filter((f) => !f.type.startsWith('image/'));
    const imageBase64s: string[] = [];

    const fileToBase64 = async (file: File): Promise<string> => {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { signal: controller.signal, cache: 'no-store' });
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const isLikelyImageUrl = (raw: string): boolean => {
      try {
        const u = new URL(raw);
        if (u.hostname === 'picsum.photos') return true;
        const p = u.pathname.toLowerCase();
        return /\.(png|jpg|jpeg|gif|webp|bmp|svg|ico)$/.test(p);
      } catch {
        return false;
      }
    };

    const fetchImageBase64FromUrl = async (raw: string): Promise<string> => {
      const maxAttempts = 2;
      const timeoutMs = 20000;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await fetchWithTimeout(raw, timeoutMs);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const blob = await response.blob();
          if (!blob.type.startsWith('image/')) throw new Error(`Not an image (${blob.type || 'unknown'})`);
          const file = new File([blob], 'remote-image', { type: blob.type });
          return await fileToBase64(file);
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            await sleep(400 * attempt);
            continue;
          }
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Failed to fetch image');
    };

    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        try {
          imageBase64s.push(await fileToBase64(file));
        } catch (error) {
          console.error('Failed to read image attachment:', error);
          fullContent += `\n\n【图片读取失败】\n文件：${file.name}\n原因：${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      if (imageBase64s.length > 0) {
        fullContent += `\n\n【已附带图片】\n${imageFiles.map((f) => f.name).join('\n')}`;
      }
    }

    // 如果有附件，解析附件内容
    if (otherFiles.length > 0) {
      for (const file of otherFiles) {
        try {
          // 解析文档
          const parseResult = await DocumentParserUtil.parse(file, {
            extractText: true,
            enableChunking: true,
            chunkSize: 2000,
            chunkOverlap: 200,
            enableCache: true,
          });

          const extractedText = typeof parseResult.text === 'string' ? parseResult.text.trim() : '';

          if (parseResult.success && extractedText) {
            // 将文档内容添加到消息中
            fullContent += `\n\n【附件内容】\n${extractedText}`;
          } else if (parseResult.success) {
            fullContent += `\n\n【附件信息】\n文件：${file.name}\n类型：${file.type || 'unknown'}\n说明：未提取到可用文本内容`;
          } else {
            const errorMessage = parseResult.error || '解析失败';
            console.error('Failed to parse attachment:', errorMessage);
            fullContent += `\n\n【附件解析失败】\n${errorMessage}`;
          }
        } catch (error) {
          console.error('Error processing attachment:', error);
          fullContent += `\n\n【附件处理错误】\n${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    const urlMatches = content.match(/https?:\/\/[^\s<>()]+/g) || [];
    const urls = Array.from(new Set(urlMatches)).slice(0, 3);

    if (urls.length > 0) {
      for (const url of urls) {
        if (isLikelyImageUrl(url)) {
          try {
            const base64 = await fetchImageBase64FromUrl(url);
            imageBase64s.push(base64);
            fullContent += `\n\n【已附带图片】\n${url}`;
          } catch (error) {
            fullContent += `\n\n【图片下载失败】\n链接：${url}\n原因：${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          continue;
        }

        try {
          const response = await fetchWithTimeout(`/api/read?url=${encodeURIComponent(url)}&timeoutMs=30000`, 35000);
          const data = await response.json();
          if (data?.success && typeof data.content === 'string' && data.content.trim()) {
            fullContent += `\n\n【网页内容】\n链接：${url}\n${data.content.trim()}`;
          } else {
            const errorMessage = typeof data?.error === 'string' ? data.error : '提取失败';
            fullContent += `\n\n【网页提取失败】\n链接：${url}\n原因：${errorMessage}`;
          }
        } catch (error) {
          fullContent += `\n\n【网页提取失败】\n链接：${url}\n原因：${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }

    await sendMessage(fullContent, imageBase64s.length > 0 ? { images: imageBase64s } : undefined);
  };

  const handleSendVoiceMessage = (content: string, audio?: Blob) => {
    if (audio) {
      const meta = `\n\n【语音】大小：${Math.round(audio.size / 1024)}KB，格式：${audio.type || 'unknown'}`;
      void handleSendMessage(`${content}${meta}`);
      return;
    }
    void handleSendMessage(content);
  };

  // 新建对话
  const createNewChat = () => {
    clearMessages();
  };

  // 处理AI创作生成
  const handleAICreationGenerate = async (prompt: string) => {
    await handleSendMessage(prompt);
  };

  // 处理快捷工具生成
  const handleQuickToolsGenerate = async (prompt: string) => {
    await handleSendMessage(prompt);
  };

  // 处理截图提问
  const handleScreenshotQuestion = async (image: string, question: string) => {
    const prompt = `请分析以下截图并回答问题：\n问题：${question}\n截图：${image}`;
    await handleSendMessage(prompt);
  };

  // 处理共享屏幕
  const handleScreenShare = (stream: MediaStream) => {
    console.log('Screen share started:', stream);
    // 这里可以实现屏幕共享的逻辑
  };

  // 处理 PPT 生成
  const handlePPTGeneration = async (title: string, content: string, style: string, pageCount: number) => {
    const prompt = `请根据以下内容生成一个 ${pageCount} 页的 PPT，风格为 ${style}：\n标题：${title}\n内容：${content}`;
    await handleSendMessage(prompt);
  };

  // 处理音频翻译
  const handleAudioTranslate = async (audio: Blob, sourceLanguage: string, targetLanguage: string) => {
    // 这里需要实现音频翻译逻辑
    // 由于 Ollama 不直接支持音频翻译，我们可以使用语音识别 + 文本翻译的方式
    const prompt = `请翻译以下内容从 ${sourceLanguage === 'auto' ? '自动检测' : sourceLanguage} 到 ${targetLanguage}：\n[音频内容]\n（注：这是一个音频文件，需要先进行语音识别，然后再翻译）`;
    await handleSendMessage(prompt);
  };

  // 处理文件选择
  const handleFileSelect = (file: any) => {
    console.log('File selected:', file);
    // 这里可以实现文件选择的逻辑
  };

  return (
    <div className="flex h-screen bg-white">
      {/* 侧边栏 */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={createNewChat}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 头部 */}
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onNewChat={createNewChat}
          onOpenConfig={() => {
            console.log('[Page] 打开设置面板');
            setConfigPanelOpen(true);
          }}
        />

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-28 h-28 mb-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                <span className="text-6xl font-bold text-white">豆</span>
              </div>
              <h1 className="text-3xl font-semibold mb-2 text-gray-800">有什么我能帮你的吗？</h1>
              <p className="text-gray-500 mb-12">我是豆包，您的智能AI助手</p>
              <div className="mt-6 grid grid-cols-2 gap-4 max-w-2xl">
                <button
                  onClick={() => handleSendMessage('帮我写一篇关于人工智能发展的文章')}
                  className="px-6 py-4 text-left text-sm bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="text-blue-500 mb-1">✍️</div>
                  帮我写一篇文章
                </button>
                <button
                  onClick={() => handleSendMessage('解释一下量子力学的基本原理')}
                  className="px-6 py-4 text-left text-sm bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="text-blue-500 mb-1">🧠</div>
                  解释一下量子力学
                </button>
                <button
                  onClick={() => handleSendMessage('翻译这段文字：Hello, how are you?')}
                  className="px-6 py-4 text-left text-sm bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="text-blue-500 mb-1">🌐</div>
                  翻译这段文字
                </button>
                <button
                  onClick={() => handleSendMessage('写一段React组件代码')}
                  className="px-6 py-4 text-left text-sm bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="text-blue-500 mb-1">💻</div>
                  写一段代码
                </button>
              </div>
            </div>
          ) : (
            <>
              <MessageList messages={messages} />
              {isLoading && (
                <div className="px-4 py-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-200" />
                    <span className="text-sm ml-2">思考中...</span>
                    <button
                      onClick={stopGeneration}
                      className="ml-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                    >
                      停止生成
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="px-4 py-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">
                      错误: {error.message}
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入框 */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          onOpenConfig={() => setConfigPanelOpen(true)}
          currentModel={currentModel}
        />
      </div>

      {/* AI 配置面板 */}
      {(() => {
        console.log('[Page] configPanelOpen状态:', configPanelOpen);
        return configPanelOpen;
      })() && (
        <AIConfigPanel onClose={() => setConfigPanelOpen(false)} />
      )}

      {/* AI创作面板 */}
      {aiCreationPanelOpen && (
        <AICreationPanel 
          onClose={() => setAiCreationPanelOpen(false)}
          onGenerate={handleAICreationGenerate}
        />
      )}

      {/* 云盘面板 */}
      {cloudStoragePanelOpen && (
        <CloudStoragePanel 
          onClose={() => setCloudStoragePanelOpen(false)}
          onFileSelect={handleFileSelect}
        />
      )}

      {/* 快捷工具面板 */}
      {quickToolsPanelOpen && (
        <QuickToolsPanel 
          onClose={() => setQuickToolsPanelOpen(false)}
          onGenerate={handleQuickToolsGenerate}
        />
      )}

      {/* 截图提问面板 */}
      {screenshotQuestionPanelOpen && (
        <ScreenshotQuestionPanel 
          onClose={() => setScreenshotQuestionPanelOpen(false)}
          onSubmit={handleScreenshotQuestion}
        />
      )}

      {/* 共享屏幕面板 */}
      {screenSharePanelOpen && (
        <ScreenSharePanel 
          onClose={() => setScreenSharePanelOpen(false)}
          onShare={handleScreenShare}
        />
      )}

      {/* PPT 生成面板 */}
      {pptGenerationPanelOpen && (
        <PPTGenerationPanel 
          onClose={() => setPptGenerationPanelOpen(false)}
          onGenerate={handlePPTGeneration}
        />
      )}

      {/* 写作助手面板 */}
      {writingAssistantPanelOpen && (
        <WritingAssistantPanel 
          onClose={() => setWritingAssistantPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 语音聊天面板 */}
      {voiceChatPanelOpen && (
        <VoiceChatPanel 
          onClose={() => setVoiceChatPanelOpen(false)}
          onSendMessage={handleSendVoiceMessage}
        />
      )}

      {/* 音频翻译面板 */}
      {audioTranslatePanelOpen && (
        <AudioTranslatePanel 
          onClose={() => setAudioTranslatePanelOpen(false)}
          onTranslate={handleAudioTranslate}
        />
      )}

      {/* 逻辑模式面板 */}
      {logicModePanelOpen && (
        <LogicModePanel 
          onClose={() => setLogicModePanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 小程序面板 */}
      {miniProgramPanelOpen && (
        <MiniProgramPanel 
          onClose={() => setMiniProgramPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 书签面板 */}
      {bookmarkPanelOpen && (
        <BookmarkPanel 
          isOpen={bookmarkPanelOpen}
          onClose={() => setBookmarkPanelOpen(false)}
        />
      )}

      {/* 添加书签模态框 */}
      {addBookmarkModalOpen && (
        <AddBookmarkModal 
          isOpen={addBookmarkModalOpen}
          onClose={() => setAddBookmarkModalOpen(false)}
          initialContent={addBookmarkData.content}
          initialTitle={addBookmarkData.title}
        />
      )}

      {/* 代码审查面板 */}
      {codeReviewPanelOpen && (
        <CodeReviewPanel 
          onClose={() => setCodeReviewPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 数据分析面板 */}
      {dataAnalysisPanelOpen && (
        <DataAnalysisPanel 
          onClose={() => setDataAnalysisPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 翻译工具面板 */}
      {translationPanelOpen && (
        <TranslationPanel 
          onClose={() => setTranslationPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}

      {/* 文本总结面板 */}
      {summaryPanelOpen && (
        <SummaryPanel 
          onClose={() => setSummaryPanelOpen(false)}
          onGenerate={handleSendMessage}
        />
      )}
    </div>
  );
}
