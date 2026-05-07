import React, { memo, useState } from 'react'
import { Wand2, PictureInPicture, PictureInPicture2, Maximize2, Minimize2, Columns } from 'lucide-react'
import { ModelOption } from '../../types'
import { useI18n } from '../../contexts/I18nContext'
import { IconNewChat, IconSidebarToggle, IconScenarios } from '../icons/CustomIcons'
import { HeaderModelSelector } from './HeaderModelSelector'
import { getModelCapabilities } from '../../utils/modelHelpers'
import { useChatStore } from '../../stores/chatStore'
import { SplitPaneEditor } from '../chat/split-editor/SplitPaneEditor'

interface HeaderProps {
  onNewChat: () => void
  onOpenScenariosModal: () => void
  onToggleHistorySidebar: () => void
  isLoading: boolean
  currentModelName: string
  availableModels: ModelOption[]
  selectedModelId: string
  onSelectModel: (modelId: string) => void
  isSwitchingModel: boolean
  isHistorySidebarOpen: boolean
  onLoadCanvasPrompt: () => void
  isCanvasPromptActive: boolean
  isPipSupported: boolean
  isPipActive: boolean
  onTogglePip: () => void
  themeId: string
  thinkingLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'
  onSetThinkingLevel: (level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH') => void
  newChatShortcut: string
  pipShortcut: string
}

const HeaderComponent: React.FC<HeaderProps> = ({
  onNewChat,
  onOpenScenariosModal,
  onToggleHistorySidebar,
  isLoading,
  currentModelName,
  availableModels,
  selectedModelId,
  onSelectModel,
  isSwitchingModel,
  isHistorySidebarOpen,
  onLoadCanvasPrompt,
  isCanvasPromptActive,
  isPipSupported,
  isPipActive,
  onTogglePip,
  themeId,
  thinkingLevel,
  onSetThinkingLevel,
  newChatShortcut,
  pipShortcut,
}) => {
  const { t } = useI18n()
  const [isSplitEditorOpen, setIsSplitEditorOpen] = useState(false)
  const activeMessages = useChatStore(s => s.activeMessages)
  
  const headerButtonBase =
    'w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] hover:scale-105 active:scale-95'
  
  const headerButtonInactive =
    'bg-transparent text-[var(--theme-icon-settings)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] active:bg-[var(--theme-bg-tertiary)] active:text-[var(--theme-text-primary)]'
  
  const headerButtonActive =
    'text-[var(--theme-text-link)] bg-[var(--theme-bg-accent)]/10 hover:bg-[var(--theme-bg-accent)]/20'

  const canvasPromptAriaLabel = isCanvasPromptActive
    ? t('canvasHelperActive_aria')
    : t('canvasHelperInactive_aria')
  const canvasPromptTitle = isCanvasPromptActive
    ? t('canvasHelperActive_title')
    : t('canvasHelperInactive_title')

  const iconSize = 18
  const strokeWidth = 2

  const { isNativeAudioModel, isImagenModel, isTtsModel } = getModelCapabilities(
    selectedModelId || ''
  )

  const showTextTools = !isNativeAudioModel && !isImagenModel && !isTtsModel

  return (
    <header
      className={`${themeId === 'pearl' ? 'bg-[var(--theme-bg-primary)]/80' : 'bg-[var(--theme-bg-secondary)]/80'} backdrop-blur-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0 relative z-20 border-b border-[var(--theme-border-secondary)]`}
    >
      {/* Left Section: Sidebar Toggle & Model Selector */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleHistorySidebar}
          className={`${headerButtonBase} ${headerButtonInactive} ${isHistorySidebarOpen ? 'bg-[var(--theme-bg-tertiary)]' : ''}`}
          aria-label={isHistorySidebarOpen ? t('historySidebarClose') : t('historySidebarOpen')}
          title={
            isHistorySidebarOpen ? t('historySidebarClose_short') : t('historySidebarOpen_short')
          }
        >
          <IconSidebarToggle size={iconSize} strokeWidth={strokeWidth} />
        </button>

        <div className="hidden sm:block w-px h-6 bg-[var(--theme-border-secondary)]" />

        <HeaderModelSelector
          currentModelName={currentModelName}
          availableModels={availableModels}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          isSwitchingModel={isSwitchingModel}
          isLoading={isLoading}
          thinkingLevel={thinkingLevel}
          onSetThinkingLevel={onSetThinkingLevel}
        />
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 justify-end flex-shrink-0">
        {/* Canvas Helper Button */}
        {showTextTools && (
          <button
            onClick={onLoadCanvasPrompt}
            disabled={isLoading}
            className={`${headerButtonBase} ${isCanvasPromptActive ? headerButtonActive : headerButtonInactive}`}
            aria-label={canvasPromptAriaLabel}
            title={canvasPromptTitle}
          >
            <Wand2 size={iconSize} strokeWidth={strokeWidth} />
          </button>
        )}

        {/* Scenarios Button */
        <button
          onClick={onOpenScenariosModal}
          className={`${headerButtonBase} ${headerButtonInactive}`}
          aria-label={t('scenariosManage_aria')}
          title={t('scenariosManage_title')}
        >
          <IconScenarios size={iconSize} strokeWidth={strokeWidth} />
        </button>

        {/* Split Editor Button */
        <button
          onClick={() => setIsSplitEditorOpen(true)}
          disabled={activeMessages.length === 0}
          className={`${headerButtonBase} ${headerButtonInactive} ${activeMessages.length === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[var(--theme-bg-accent)]/10'}`}
          aria-label={t('splitEditor_aria', 'Open Split Editor')}
          title={t('splitEditor_title', 'Split Edit & Export')}
          style={{ backgroundColor: activeMessages.length > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
        >
          <Columns size={iconSize} strokeWidth={strokeWidth} style={{ color: activeMessages.length > 0 ? '#3b82f6' : 'inherit' }} />
        </button>

        {/* PiP Button */}
        {isPipSupported && (
          <button
            onClick={onTogglePip}
            className={`${headerButtonBase} ${headerButtonInactive}`}
            aria-label={isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
            title={
              (isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture') +
              (pipShortcut ? ` (${pipShortcut})` : '')
            }
          >
            {isPipActive ? (
              <Minimize2 size={iconSize} strokeWidth={strokeWidth} />
            ) : (
              <Maximize2 size={iconSize} strokeWidth={strokeWidth} />
            )}
          </button>
        )}

        {/* New Chat Button - Mobile Only */}
        <a
          href="/"
          onClick={e => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault()
              onNewChat()
            }
          }}
          className={`${headerButtonBase} ${headerButtonInactive} sm:hidden no-underline`}
          aria-label={t('headerNewChat_aria')}
          title={t('newChat') + (newChatShortcut ? ` (${newChatShortcut})` : '')}
        >
          <IconNewChat size={iconSize} strokeWidth={strokeWidth} />
        </a>
      </div>

      {/* Split Pane Editor Modal */}
      {isSplitEditorOpen && (
        <SplitPaneEditor
          messages={activeMessages}
          onClose={() => setIsSplitEditorOpen(false)}
        />
      )}
    </header>
  )
}

export const Header = memo(HeaderComponent)
