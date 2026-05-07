'use client';

import { useState, useEffect, useCallback } from 'react';

export type ModelType = 'text' | 'vision' | 'audio' | 'multimodal';

export interface ModelConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  contextWindow?: number;
  maxTokens?: number;
  modelType: ModelType;
}

export interface MultimodalSettings {
  imageGenerationEnabled: boolean;
  imageEndpoint: string;
  imageApiKey?: string;
  audioEnabled: boolean;
  audioEndpoint: string;
  audioApiKey?: string;
}

export interface ChatSettings {
  streamEnabled: boolean;
  thinkEnabled: boolean;
  toolCallingEnabled: boolean;
}

export interface EmbeddingSettings {
  embeddingModel: string;
  embeddingEndpoint: string;
}

export type ApiMode = 'ollama' | 'openai';

export interface AppSettings {
  darkMode: boolean;
  modelEndpoint: string;
  apiMode: ApiMode;
  models: ModelConfig[];
  selectedModelId: string;
  multimodal: MultimodalSettings;
  chat: ChatSettings;
  embedding: EmbeddingSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  modelEndpoint: 'http://192.168.0.32:11434',
  apiMode: 'ollama',
  models: [
    { id: 'llama3', name: 'Llama 3', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'text' },
    { id: 'mistral', name: 'Mistral', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'text' },
    { id: 'gemma', name: 'Gemma', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'text' },
    { id: 'qwen', name: 'Qwen', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'text' },
    { id: 'llava', name: 'LLaVA', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'vision' },
    { id: 'bakllava', name: 'BakLLaVA', endpoint: 'http://192.168.0.32:11434', contextWindow: 8192, maxTokens: 2048, modelType: 'vision' },
  ],
  selectedModelId: 'llama3',
  multimodal: {
    imageGenerationEnabled: false,
    imageEndpoint: 'http://localhost:8080',
    imageApiKey: '',
    audioEnabled: false,
    audioEndpoint: 'http://localhost:9000',
    audioApiKey: '',
  },
  chat: {
    streamEnabled: true,
    thinkEnabled: false,
    toolCallingEnabled: false,
  },
  embedding: {
    embeddingModel: 'embeddinggemma',
    embeddingEndpoint: 'http://192.168.0.32:11434',
  },
};

const STORAGE_KEY = 'doubao-app-settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ 
          ...prev, 
          ...parsed,
          multimodal: { ...prev.multimodal, ...parsed.multimodal },
          chat: { ...prev.chat, ...parsed.chat },
          embedding: { ...prev.embedding, ...parsed.embedding },
        }));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  }, [settings]);

  const updateDarkMode = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, darkMode: value }));
    document.documentElement.classList.toggle('dark', value);
  }, []);

  const updateModelEndpoint = useCallback((endpoint: string) => {
    setSettings(prev => ({ ...prev, modelEndpoint: endpoint }));
  }, []);

  const selectModel = useCallback((modelId: string) => {
    setSettings(prev => ({ ...prev, selectedModelId: modelId }));
  }, []);

  const addModel = useCallback((model: Omit<ModelConfig, 'id'>) => {
    const newModel: ModelConfig = {
      ...model,
      id: model.name.toLowerCase().replace(/\s+/g, '-'),
    };
    setSettings(prev => ({
      ...prev,
      models: [...prev.models, newModel],
    }));
  }, []);

  const updateModel = useCallback((modelId: string, updates: Partial<ModelConfig>) => {
    setSettings(prev => ({
      ...prev,
      models: prev.models.map(m =>
        m.id === modelId ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  const removeModel = useCallback((modelId: string) => {
    setSettings(prev => {
      const newModels = prev.models.filter(m => m.id !== modelId);
      return {
        ...prev,
        models: newModels,
        selectedModelId: prev.selectedModelId === modelId 
          ? newModels[0]?.id || '' 
          : prev.selectedModelId,
      };
    });
  }, []);

  const updateMultimodalSettings = useCallback((updates: Partial<MultimodalSettings>) => {
    setSettings(prev => ({
      ...prev,
      multimodal: { ...prev.multimodal, ...updates },
    }));
  }, []);

  const updateChatSettings = useCallback((updates: Partial<ChatSettings>) => {
    setSettings(prev => ({
      ...prev,
      chat: { ...prev.chat, ...updates },
    }));
  }, []);

  const updateApiMode = useCallback((mode: ApiMode) => {
    setSettings(prev => ({ ...prev, apiMode: mode }));
  }, []);

  const updateEmbeddingSettings = useCallback((updates: Partial<EmbeddingSettings>) => {
    setSettings(prev => ({
      ...prev,
      embedding: { ...prev.embedding, ...updates },
    }));
  }, []);

  const selectedModel = settings.models.find(m => m.id === settings.selectedModelId);

  const textModels = settings.models.filter(m => m.modelType === 'text' || m.modelType === 'multimodal');
  const visionModels = settings.models.filter(m => m.modelType === 'vision' || m.modelType === 'multimodal');

  return {
    settings,
    selectedModel,
    textModels,
    visionModels,
    isLoading,
    saveStatus,
    saveSettings,
    updateDarkMode,
    updateModelEndpoint,
    updateApiMode,
    selectModel,
    addModel,
    updateModel,
    removeModel,
    updateMultimodalSettings,
    updateChatSettings,
    updateEmbeddingSettings,
  };
};
