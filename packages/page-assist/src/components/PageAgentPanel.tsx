'use client'
import { useState, useCallback, useEffect } from 'react'
import { usePageAgent } from '@/hooks/usePageAgent'
import { useTranslation } from 'react-i18next'
import { Loader2, ArrowUp, X, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'

export function PageAgentPanel() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const { execute, isLoading, error, clearError } = usePageAgent()
  const { t } = useTranslation(['playground', 'common'])

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>
      const val = ce.detail
      if (typeof val === 'string') {
        setInput(val)
      }
    }
    window.addEventListener('page-agent:prefill', handler as EventListener)
    return () => {
      window.removeEventListener('page-agent:prefill', handler as EventListener)
    }
  }, [])

  const onRun = useCallback(async () => {
    if (!input.trim()) return
    setOutput('')
    clearError()
    try {
      const res = await execute(input.trim())
      const text = typeof res === 'string' ? res : JSON.stringify(res)
      setOutput(text)
      // 添加到历史记录
      setHistory(prev => [input.trim(), ...prev.slice(0, 9)]) // 保留最近 10 条
    } catch (e: any) {
      setOutput(e?.message || String(e))
    }
  }, [input, execute, clearError])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onRun()
    }
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearOutput = () => {
    setOutput('')
  }

  const selectHistoryItem = (item: string) => {
    setInput(item)
    setShowHistory(false)
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">{t('pageAgent.title', 'Page Agent')}</div>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t('pageAgent.history', 'History')}
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-3 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
          <div className="text-xs font-medium mb-1">{t('pageAgent.recentCommands', 'Recent Commands')}</div>
          <div className="space-y-1">
            {history.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectHistoryItem(item)}
                className="w-full text-left text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 p-2 border border-red-200 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          placeholder={t('pageAgent.placeholder', '例如：点击登录按钮，或在搜索框输入‘Hello’并回车')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          onClick={onRun}
          disabled={isLoading || !input.trim()}
          className={`px-4 py-2 rounded-md flex items-center gap-1 ${isLoading || !input.trim() ? 'bg-gray-300 dark:bg-gray-700 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('pageAgent.executing', '执行中...')}
            </>
          ) : (
            <>
              {t('pageAgent.execute', '执行')}
              <ArrowUp className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {(output || error) && (
        <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <div className="flex justify-between items-center px-3 py-1 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium">{t('pageAgent.output', '输出')}</div>
            <div className="flex gap-2">
              {output && (
                <button
                  type="button"
                  onClick={copyOutput}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      {t('pageAgent.copied', '已复制')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {t('pageAgent.copy', '复制')}
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={clearOutput}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                {t('pageAgent.clear', '清除')}
              </button>
            </div>
          </div>
          <pre className={`p-3 text-xs whitespace-pre-wrap ${error ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-white dark:bg-gray-900'}`}>
            {output || error}
          </pre>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        {t('pageAgent.description', '在本页面直接执行自然语言指令控制 DOM，不需要截图或扩展。')}
      </div>
    </div>
  )
}