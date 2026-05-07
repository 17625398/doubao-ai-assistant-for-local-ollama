


import React from 'react';
import { SettingsTab } from '../../hooks/features/useSettingsLogic';
import { translations } from '../../utils/appUtils';

interface SettingsSidebarProps {
    tabs: Array<{ id: SettingsTab; labelKey: string; icon: React.ElementType }>;
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
    onClose: () => void;
    t: (key: keyof typeof translations | string, fallback?: string) => string;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
    tabs,
    activeTab,
    setActiveTab,
    onClose,
    t
}) => {
    return (
        <aside className="flex-shrink-0 w-48 sm:w-56 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border-primary)] flex flex-col">
            {/* Sidebar Header */}
            <div className="flex items-center px-4 sm:px-5 py-4 sm:py-5 flex-shrink-0">
                <span className="text-base font-semibold text-[var(--theme-text-primary)]">{t('settingsTitle')}</span>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3 flex flex-col gap-1" role="tablist">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all outline-none select-none w-full text-left
                            ${isActive
                                    ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]/50 hover:text-[var(--theme-text-primary)]'
                                }
                            focus-visible:ring-2 focus-visible:ring-[var(--theme-border-focus)]
                            `}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "text-[var(--theme-text-primary)]" : "text-[var(--theme-text-tertiary)]"} />
                            <span>{t(tab.labelKey)}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};
