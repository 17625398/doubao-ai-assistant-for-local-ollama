'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { fetchOllamaModels, type OllamaModelInfo } from '../../../services/doubao-home/services/ollamaHomeClient'
import type { OllamaSettings } from '../../../services/doubao-home/types'

interface ModelSelectorProps {
  settings: OllamaSettings
  onSelectModel: (model: string) => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ settings, onSelectModel }) => {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOllamaModels(settings).then(setModels).catch(() => {})
  }, [settings.baseUrl])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback(
    (model: string) => {
      onSelectModel(model)
      setOpen(false)
    },
    [onSelectModel]
  )

  const displayName = settings.model.split(':')[0] || settings.model

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
        <span className="max-w-[120px] truncate">{displayName}</span>
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-[var(--border-light)] bg-white shadow-lg z-50 max-h-64 overflow-y-auto py-1">
          {models.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-[var(--text-tertiary)]">加载中...</div>
          ) : (
            models.map(m => {
              const isActive = m.name === settings.model
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => handleSelect(m.name)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors ${
                    isActive
                      ? 'bg-[var(--brand-orange)]/10 text-[var(--brand-orange)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-[var(--brand-orange)]' : 'bg-gray-300'}`} />
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.details?.parameter_size && (
                    <span className="shrink-0 text-[9px] text-[var(--text-tertiary)]">{m.details.parameter_size}</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
