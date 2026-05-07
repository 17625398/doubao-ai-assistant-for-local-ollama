'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import {
  defaultOllamaSettings,
  loadOllamaSettings,
  saveOllamaSettings,
  testOllamaConnection,
  type OllamaModelInfo,
} from '../../../services/doubao-home/services/ollamaHomeClient'
import type { OllamaSettings, LocalCapabilityStatus } from '../../../services/doubao-home/types'

interface OllamaContextValue {
  settings: OllamaSettings
  status: LocalCapabilityStatus['ollama']
  models: OllamaModelInfo[]
  modelCount: number
  error: string | null
  isLoading: boolean
  updateSettings: (settings: OllamaSettings) => void
  connect: () => Promise<void>
  disconnect: () => void
  sendChat: (messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<string>
}

const OllamaContext = createContext<OllamaContextValue | null>(null)

export function OllamaProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<OllamaSettings>(defaultOllamaSettings)
  const [status, setStatus] = useState<LocalCapabilityStatus['ollama']>('unknown')
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loaded = loadOllamaSettings()
    setSettings(loaded)
  }, [])

  const updateSettings = useCallback((newSettings: OllamaSettings) => {
    const saved = saveOllamaSettings(newSettings)
    setSettings(saved)
    setError(null)
  }, [])

  const connect = useCallback(async () => {
    setIsLoading(true)
    setStatus('checking')
    setError(null)
    
    try {
      const result = await testOllamaConnection(settings)
      setModels(result.models)
      setStatus(result.count > 0 ? 'online' : 'offline')
      if (result.count === 0) {
        setError('No models available')
      }
    } catch (err) {
      setStatus('offline')
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsLoading(false)
    }
  }, [settings])

  const disconnect = useCallback(() => {
    setStatus('offline')
    setModels([])
    setError(null)
  }, [])

  const sendChat = useCallback(async (messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> => {
    if (status !== 'online') {
      throw new Error('Ollama not connected')
    }
    
    const response = await fetch('/api/ollama/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-doubao-ollama-upstream': settings.baseUrl,
      },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        messages,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.message?.content || ''
  }, [status, settings])

  const modelCount = useMemo(() => models.length, [models])

  const value = useMemo(() => ({
    settings,
    status,
    models,
    modelCount,
    error,
    isLoading,
    updateSettings,
    connect,
    disconnect,
    sendChat,
  }), [settings, status, models, modelCount, error, isLoading, updateSettings, connect, disconnect, sendChat])

  return (
    <OllamaContext.Provider value={value}>
      {children}
    </OllamaContext.Provider>
  )
}

export function useOllama(): OllamaContextValue {
  const context = useContext(OllamaContext)
  if (!context) {
    throw new Error('useOllama must be used within OllamaProvider')
  }
  return context
}

export { OllamaContext }
