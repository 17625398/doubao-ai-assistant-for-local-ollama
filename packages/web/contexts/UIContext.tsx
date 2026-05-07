'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface UIState {
  sidebarOpen: boolean
  settingsOpen: boolean
  theme: 'light' | 'dark' | 'system'
  panelView: string
}

interface UIContextType {
  state: UIState
  toggleSidebar: () => void
  toggleSettings: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setPanelView: (view: string) => void
}

const UIContext = createContext<UIContextType | null>(null)

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UIState>({
    sidebarOpen: true,
    settingsOpen: false,
    theme: 'system',
    panelView: 'chat',
  })

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }))
  }, [])

  const toggleSettings = useCallback(() => {
    setState(prev => ({ ...prev, settingsOpen: !prev.settingsOpen }))
  }, [])

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    setState(prev => ({ ...prev, theme }))
  }, [])

  const setPanelView = useCallback((panelView: string) => {
    setState(prev => ({ ...prev, panelView }))
  }, [])

  return (
    <UIContext.Provider value={{ state, toggleSidebar, toggleSettings, setTheme, setPanelView }}>
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within UIProvider')
  }
  return context
}
