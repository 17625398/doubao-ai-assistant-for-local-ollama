import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsContent } from './SettingsContent';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useSettingsLogic } from '@/hooks/features/useSettingsLogic';
import { AppSettings, ModelOption } from '@/types';
import { SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '@/components/log-viewer/LogViewer';
import { useIsMobile } from '@/hooks/core/useDevice';

interface SettingsDrawerProps extends SettingsTransferProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  availableModels: ModelOption[];
  onSave: (newSettings: AppSettings) => void;
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => void;
  setAvailableModels: (models: ModelOption[]) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentSettings,
  availableModels,
  onSave,
  onClearAllHistory,
  onClearCache,
  onOpenLogViewer,
  onInstallPwa,
  installState,
  onImportSettings,
  onExportSettings,
  onImportHistory,
  onExportHistory,
  onImportScenarios,
  onExportScenarios,
  setAvailableModels,
  t,
}) => {
  const {
    activeTab,
    setActiveTab,
    confirmConfig,
    closeConfirm,
    scrollContainerRef,
    handleContentScroll,
    handleResetToDefaults,
    handleClearLogs,
    handleRequestClearHistory,
    handleRequestClearCache,
    handleRequestImportHistory,
    updateSetting,
    handleModelChange,
    tabs,
  } = useSettingsLogic({
    isOpen,
    currentSettings,
    onSave,
    onClearAllHistory,
    onClearCache,
    onImportHistory,
    t,
  });

  const isMobile = useIsMobile();
  const activeTabLabelKey = tabs.find((tab) => tab.id === activeTab)?.labelKey ?? 'settingsTitle';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Mobile only */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2999] fade-in"
          onClick={onClose}
        />
      )}

      {/* Settings Panel */}
      <div
        className={`
          h-full flex flex-col bg-[var(--theme-bg-primary)] border-l border-[var(--theme-border-primary)]
          shadow-2xl relative transition-transform duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
          flex-shrink-0 z-[3000]
          ${isMobile ? 'fixed inset-0 w-full' : 'w-[480px] max-w-full'}
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0 border-b border-[var(--theme-border-primary)]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>{t('back')}</span>
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--theme-text-primary)] tracking-tight">
            {t(activeTabLabelKey)}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--theme-bg-accent)] text-white hover:opacity-90 transition-opacity"
          >
            <span>{t('save')}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </header>

        {/* Body: Sidebar + Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <SettingsSidebar
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onClose={onClose}
            t={t}
          />

          {/* Content Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative overflow-hidden">
            {/* Scrollable Content */}
            <div
              ref={scrollContainerRef}
              onScroll={handleContentScroll}
              className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6"
            >
              <SettingsContent
                activeTab={activeTab}
                currentSettings={currentSettings}
                availableModels={availableModels}
                updateSetting={updateSetting}
                handleModelChange={handleModelChange}
                setAvailableModels={setAvailableModels}
                onClearHistory={handleRequestClearHistory}
                onClearCache={handleRequestClearCache}
                onOpenLogViewer={() => { onOpenLogViewer(); onClose(); }}
                onClearLogs={handleClearLogs}
                onReset={handleResetToDefaults}
                onInstallPwa={onInstallPwa}
                installState={installState}
                onImportSettings={onImportSettings}
                onExportSettings={onExportSettings}
                onImportHistory={handleRequestImportHistory}
                onExportHistory={onExportHistory}
                onImportScenarios={onImportScenarios}
                onExportScenarios={onExportScenarios}
                t={t}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <ConfirmationModal
          isOpen={confirmConfig.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          confirmLabel={confirmConfig.confirmLabel}
          cancelLabel={t('cancel')}
        />
      )}
    </>
  );
};
