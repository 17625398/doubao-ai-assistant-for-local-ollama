import { useRef, useCallback, useState } from 'react'

type AgentConfig = {
  model?: string
  baseURL?: string
  apiKey?: string
  language?: string
}

export function usePageAgent(config?: AgentConfig) {
  const agentRef = useRef<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureAgent = useCallback(async () => {
    if (typeof window === 'undefined') return null
    if (agentRef.current) return agentRef.current
    
    try {
      setIsLoading(true)
      setError(null)
      const mod = await import('page-agent')
      const PageAgent = (mod as any).PageAgent ?? (mod as any).default?.PageAgent ?? (mod as any)
      const storedModel = typeof window !== 'undefined' ? window.localStorage.getItem('pageAgent.model') || '' : ''
      const storedBaseURL = typeof window !== 'undefined' ? window.localStorage.getItem('pageAgent.baseURL') || '' : ''
      const storedApiKey = typeof window !== 'undefined' ? window.localStorage.getItem('pageAgent.apiKey') || '' : ''
      const agent = new PageAgent({
        model: config?.model ?? (storedModel || process.env.NEXT_PUBLIC_PAGE_AGENT_MODEL || 'qwen3.5-plus'),
        baseURL: config?.baseURL ?? (storedBaseURL || process.env.NEXT_PUBLIC_PAGE_AGENT_BASE_URL || ''),
        apiKey: config?.apiKey ?? (storedApiKey || process.env.NEXT_PUBLIC_PAGE_AGENT_API_KEY || ''),
        language: config?.language ?? (navigator.language || 'en-US')
      })
      agentRef.current = agent
      return agent
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Page Agent')
      console.error('Failed to initialize Page Agent:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [config?.model, config?.baseURL, config?.apiKey, config?.language])

  const execute = useCallback(async (instruction: string) => {
    try {
      setIsLoading(true)
      setError(null)
      const agent = await ensureAgent()
      if (!agent) throw new Error('PageAgent unavailable in this environment')
      return await agent.execute(instruction)
    } catch (err: any) {
      setError(err?.message || 'Failed to execute instruction')
      console.error('Failed to execute instruction:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [ensureAgent])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getStatus = useCallback(() => {
    return {
      isLoading,
      error,
      isInitialized: !!agentRef.current
    }
  }, [isLoading, error])

  return { 
    execute, 
    isLoading, 
    error, 
    clearError,
    getStatus
  }
}