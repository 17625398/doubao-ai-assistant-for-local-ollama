// AI 服务配置面板组件

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AIProvider,
  OllamaModel,
  OllamaConfig,
  aiConfigManager,
  ollamaClient,
  OpenAICompatibleClient,
  OpenAICompatibleModel,
  linkMindService,
  LinkMindModel,
  logger,
} from '@core/index';

interface AIConfigPanelProps {
  onClose?: () => void;
}

export function AIConfigPanel({ onClose }: AIConfigPanelProps) {
  // 当前提供商
  const [provider, setProvider] = useState<AIProvider>('ollama');

  // Ollama 配置
  const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>({
    baseUrl: '/api/ollama',
    defaultModel: '',
    timeout: 30000,
    streamEnabled: true,
  });

  const [openaiConfig, setOpenaiConfig] = useState({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    defaultModel: 'gpt-3.5-turbo',
    timeout: 30000,
    streamEnabled: true,
  });

  const [customConfig, setCustomConfig] = useState({
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    defaultModel: '',
    timeout: 30000,
    streamEnabled: true,
  });
  const [linkmindConfig, setLinkmindConfig] = useState({
    baseUrl: '/api/linkmind',
    apiKey: '',
    defaultModel: 'qwen-plus',
    timeout: 60000,
    transportMode: 'proxy' as 'direct' | 'backend-relay' | 'proxy',
    gatewayPath: '/api/linkmind',
  });

  const [customHeadersText, setCustomHeadersText] = useState<string>('{}');

  // 可用模型列表
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [openaiModels, setOpenaiModels] = useState<OpenAICompatibleModel[]>([]);
  const [customModels, setCustomModels] = useState<OpenAICompatibleModel[]>([]);
  const [linkmindModels, setLinkmindModels] = useState<LinkMindModel[]>([]);

  // 连接状态
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string>('');
  const [openaiConnectionStatus, setOpenaiConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [openaiConnectionError, setOpenaiConnectionError] = useState<string>('');
  const [customConnectionStatus, setCustomConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [customConnectionError, setCustomConnectionError] = useState<string>('');
  const [linkmindConnectionStatus, setLinkmindConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [linkmindConnectionError, setLinkmindConnectionError] = useState<string>('');
  const requiresOpenAIApiKey = openaiConfig.baseUrl?.includes('api.openai.com');
  const openaiKeyMissing = requiresOpenAIApiKey && !openaiConfig.apiKey?.trim();

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 初始化加载配置
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await aiConfigManager.ensureLoaded();
      if (cancelled) return;

      const config = aiConfigManager.getConfig();
      setProvider(config.provider);

      const nextOllamaConfig: OllamaConfig = config.ollama || {
        baseUrl: '/api/ollama',
        defaultModel: '',
        timeout: 30000,
        streamEnabled: true,
      };
      setOllamaConfig(nextOllamaConfig);

      if (config.openai) {
        setOpenaiConfig({
          baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
          apiKey: config.openai.apiKey || '',
          defaultModel: config.openai.defaultModel || 'gpt-3.5-turbo',
          timeout: config.openai.timeout ?? 30000,
          streamEnabled: config.openai.streamEnabled ?? true,
        });
      }

      if (config.custom) {
        setCustomConfig({
          baseUrl: config.custom.baseUrl || 'http://localhost:1234/v1',
          apiKey: config.custom.apiKey || '',
          defaultModel: config.custom.defaultModel || '',
          timeout: config.custom.timeout ?? 30000,
          streamEnabled: config.custom.streamEnabled ?? true,
        });
        setCustomHeadersText(JSON.stringify(config.custom.headers || {}, null, 2));
      }
      if (config.linkmind) {
        setLinkmindConfig({
          baseUrl: config.linkmind.baseUrl || '/api/linkmind',
          apiKey: config.linkmind.apiKey || '',
          defaultModel: config.linkmind.defaultModel || 'qwen-plus',
          timeout: config.linkmind.timeout ?? 60000,
          transportMode: config.linkmind.transportMode || 'proxy',
          gatewayPath: config.linkmind.gatewayPath || '/api/linkmind',
        });
      }

      if (config.provider === 'ollama') {
        setConnectionStatus('testing');
        setConnectionError('');
        try {
          ollamaClient.updateConfig({
            baseUrl: nextOllamaConfig.baseUrl,
            timeout: nextOllamaConfig.timeout,
          });

          const isAvailable = await ollamaClient.isAvailable();
          if (cancelled) return;
          if (!isAvailable) {
            setConnectionStatus('error');
            setConnectionError('无法连接到 Ollama 服务，请检查地址是否正确');
            return;
          }

          setConnectionStatus('connected');
          const modelList = await ollamaClient.listModels();
          if (cancelled) return;
          setModels(modelList);
        } catch (error) {
          if (cancelled) return;
          setConnectionStatus('error');
          setConnectionError(error instanceof Error ? error.message : '未知错误');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 测试 Ollama 连接
  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    setConnectionError('');

    try {
      // 先更新 Ollama 客户端的配置（使用当前输入框中的值）
      ollamaClient.updateConfig({
        baseUrl: ollamaConfig.baseUrl,
        timeout: ollamaConfig.timeout,
      });

      // 测试连接
      const isAvailable = await ollamaClient.isAvailable();
      if (isAvailable) {
        setConnectionStatus('connected');
        // 刷新模型列表
        const modelList = await ollamaClient.listModels();
        setModels(modelList);
        logger.info('获取到模型列表:', modelList.length, '个模型');
      } else {
        setConnectionStatus('error');
        setConnectionError('无法连接到 Ollama 服务，请检查地址是否正确');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : '未知错误');
      logger.error('连接测试失败:', error);
    }
  }, [ollamaConfig.baseUrl, ollamaConfig.timeout]);

  const testOpenAIConnection = useCallback(async () => {
    if (openaiKeyMissing) {
      setOpenaiConnectionStatus('error');
      setOpenaiConnectionError('官方 OpenAI 接口需要有效的 API Key');
      return;
    }
    setOpenaiConnectionStatus('testing');
    setOpenaiConnectionError('');

    try {
      const client = new OpenAICompatibleClient({
        baseUrl: openaiConfig.baseUrl,
        apiKey: openaiConfig.apiKey,
        defaultModel: openaiConfig.defaultModel,
        timeout: openaiConfig.timeout,
        streamEnabled: openaiConfig.streamEnabled,
      });

      const isAvailable = await client.isAvailable();
      if (!isAvailable) {
        setOpenaiConnectionStatus('error');
        setOpenaiConnectionError('无法连接到服务，请检查地址与鉴权信息');
        return;
      }

      setOpenaiConnectionStatus('connected');
      try {
        const modelList = await client.listModels();
        setOpenaiModels(modelList);
        logger.info('获取到 OpenAI 兼容模型列表:', modelList.length, '个模型');
      } catch {
        setOpenaiModels([]);
      }
    } catch (error) {
      setOpenaiConnectionStatus('error');
      setOpenaiConnectionError(error instanceof Error ? error.message : '未知错误');
      logger.error('OpenAI 连接测试失败:', error);
    }
  }, [openaiConfig.apiKey, openaiConfig.baseUrl, openaiConfig.defaultModel, openaiConfig.streamEnabled, openaiConfig.timeout, openaiKeyMissing]);

  const testCustomConnection = useCallback(async () => {
    setCustomConnectionStatus('testing');
    setCustomConnectionError('');

    let headers: Record<string, string> | undefined;
    try {
      const parsed = JSON.parse(customHeadersText || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        headers = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
        );
      } else {
        throw new Error('Headers 必须是 JSON 对象');
      }
    } catch (error) {
      setCustomConnectionStatus('error');
      setCustomConnectionError(error instanceof Error ? error.message : 'Headers 解析失败');
      return;
    }

    try {
      const client = new OpenAICompatibleClient({
        baseUrl: customConfig.baseUrl,
        apiKey: customConfig.apiKey,
        defaultModel: customConfig.defaultModel,
        timeout: customConfig.timeout,
        streamEnabled: customConfig.streamEnabled,
        headers,
      });

      const isAvailable = await client.isAvailable();
      if (!isAvailable) {
        setCustomConnectionStatus('error');
        setCustomConnectionError('无法连接到服务，请检查地址与请求头');
        return;
      }

      setCustomConnectionStatus('connected');
      const modelList = await client.listModels();
      setCustomModels(modelList);
      logger.info('获取到自定义(OpenAI兼容)模型列表:', modelList.length, '个模型');
    } catch (error) {
      setCustomConnectionStatus('error');
      setCustomConnectionError(error instanceof Error ? error.message : '未知错误');
      logger.error('自定义服务连接测试失败:', error);
    }
  }, [customConfig.apiKey, customConfig.baseUrl, customConfig.defaultModel, customConfig.streamEnabled, customConfig.timeout, customHeadersText]);

  const testLinkMindConnection = useCallback(async () => {
    setLinkmindConnectionStatus('testing');
    setLinkmindConnectionError('');
    try {
      linkMindService.updateConfig({
        baseUrl: linkmindConfig.baseUrl,
        apiKey: linkmindConfig.apiKey,
        timeout: linkmindConfig.timeout,
        transportMode: linkmindConfig.transportMode,
        gatewayPath: linkmindConfig.gatewayPath,
      });
      const result = await linkMindService.testConnection();
      if (!result.success) {
        setLinkmindConnectionStatus('error');
        setLinkmindConnectionError(result.message);
        return;
      }
      setLinkmindConnectionStatus('connected');
      const modelList = await linkMindService.listModels();
      setLinkmindModels(modelList);
    } catch (error) {
      setLinkmindConnectionStatus('error');
      setLinkmindConnectionError(error instanceof Error ? error.message : '未知错误');
    }
  }, [linkmindConfig]);

  // 保存配置
  const saveConfig = async () => {
    setIsLoading(true);
    try {
      if (provider === 'openai' && openaiKeyMissing) {
        setOpenaiConnectionStatus('error');
        setOpenaiConnectionError('官方 OpenAI 接口需要有效的 API Key');
        return;
      }
      let customHeaders: Record<string, string> | undefined;
      try {
        const parsed = JSON.parse(customHeadersText || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          customHeaders = Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
          );
        } else {
          throw new Error('Headers 必须是 JSON 对象');
        }
      } catch (error) {
        setCustomConnectionStatus('error');
        setCustomConnectionError(error instanceof Error ? error.message : 'Headers 解析失败');
        return;
      }

      await aiConfigManager.updateConfig({
        provider,
        ollama: ollamaConfig,
        openai: {
          apiKey: openaiConfig.apiKey,
          baseUrl: openaiConfig.baseUrl,
          defaultModel: openaiConfig.defaultModel,
          timeout: openaiConfig.timeout,
          streamEnabled: openaiConfig.streamEnabled,
        },
        custom: {
          baseUrl: customConfig.baseUrl,
          apiKey: customConfig.apiKey,
          defaultModel: customConfig.defaultModel,
          headers: customHeaders,
          timeout: customConfig.timeout,
          streamEnabled: customConfig.streamEnabled,
        },
        linkmind: {
          baseUrl: linkmindConfig.baseUrl,
          apiKey: linkmindConfig.apiKey,
          defaultModel: linkmindConfig.defaultModel,
          timeout: linkmindConfig.timeout,
          transportMode: linkmindConfig.transportMode,
          gatewayPath: linkmindConfig.gatewayPath,
        },
      });
      logger.info('配置已保存');
      onClose?.();
    } catch (error) {
      logger.error('保存配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'testing':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接';
      case 'error':
        return '连接失败';
      case 'testing':
        return '测试中...';
      default:
        return '未测试';
    }
  };

  const getOpenAIStatusText = () => {
    switch (openaiConnectionStatus) {
      case 'connected':
        return '已连接';
      case 'error':
        return '连接失败';
      case 'testing':
        return '测试中...';
      default:
        return '未测试';
    }
  };

  const getCustomStatusText = () => {
    switch (customConnectionStatus) {
      case 'connected':
        return '已连接';
      case 'error':
        return '连接失败';
      case 'testing':
        return '测试中...';
      default:
        return '未测试';
    }
  };

  console.log('[AIConfigPanel] 渲染配置面板');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">AI 服务配置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 服务提供商选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              服务提供商
            </label>
            <div className="grid grid-cols-4 gap-3">
              {(['ollama', 'openai', 'custom', 'linkmind'] as AIProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    provider === p
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {p === 'ollama' && 'Ollama (本地)'}
                  {p === 'openai' && 'OpenAI'}
                  {p === 'custom' && '自定义'}
                  {p === 'linkmind' && 'LinkMind'}
                </button>
              ))}
            </div>
          </div>

          {/* Ollama 配置 */}
          {provider === 'ollama' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Ollama 配置</h3>

              {/* 服务地址 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  服务地址
                </label>
                <input
                  type="text"
                  value={ollamaConfig.baseUrl}
                  onChange={(e) =>
                    setOllamaConfig({ ...ollamaConfig, baseUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/api/ollama 或 http://localhost:11434"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Web 部署推荐使用 /api/ollama（由服务端 OLLAMA_BASE_URL 指向真实 Ollama）
                </p>
              </div>

              {/* 连接测试和刷新模型列表 */}
              <div className="flex items-center gap-4">
                <button
                  onClick={testConnection}
                  disabled={connectionStatus === 'testing'}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {connectionStatus === 'testing' ? '测试中...' : '测试连接'}
                </button>
                <button
                  onClick={async () => {
                    if (connectionStatus === 'connected') {
                      try {
                        const modelList = await ollamaClient.listModels();
                        setModels(modelList);
                        logger.info('模型列表已刷新:', modelList.length, '个模型');
                      } catch (error) {
                        logger.error('刷新模型列表失败:', error);
                      }
                    }
                  }}
                  disabled={connectionStatus !== 'connected'}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="刷新模型列表"
                >
                  刷新模型
                </button>
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>

              {connectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{connectionError}</p>
                </div>
              )}

              {/* 默认模型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  默认模型
                </label>
                <select
                  value={ollamaConfig.defaultModel}
                  onChange={(e) =>
                    setOllamaConfig({ ...ollamaConfig, defaultModel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择模型...</option>
                  {ollamaConfig.defaultModel &&
                    !models.some((m) => (m.model || m.name) === ollamaConfig.defaultModel) && (
                      <option key="__current_model" value={ollamaConfig.defaultModel}>
                        {ollamaConfig.defaultModel}
                      </option>
                    )}
                  {models.map((model) => (
                    <option key={model.name} value={model.model || model.name}>
                      {model.name}
                      {model.parameter_size && ` (${model.parameter_size})`}
                    </option>
                  ))}
                </select>
                {models.length === 0 && connectionStatus === 'connected' && (
                  <p className="mt-1 text-xs text-yellow-600">
                    未检测到本地模型，请先使用 ollama pull 命令下载模型
                  </p>
                )}
              </div>

              {/* 超时设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  请求超时 (毫秒)
                </label>
                <input
                  type="number"
                  value={ollamaConfig.timeout}
                  onChange={(e) =>
                    setOllamaConfig({
                      ...ollamaConfig,
                      timeout: parseInt(e.target.value) || 30000,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1000"
                  step="1000"
                />
              </div>

              {/* 流式响应 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="streamEnabled"
                  checked={ollamaConfig.streamEnabled}
                  onChange={(e) =>
                    setOllamaConfig({ ...ollamaConfig, streamEnabled: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="streamEnabled" className="ml-2 text-sm text-gray-700">
                  启用流式响应（逐字显示）
                </label>
              </div>

              {/* 模型列表 */}
              {models.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      已安装的模型 ({models.length})
                    </h4>
                    <span className="text-xs text-gray-500">
                      点击模型名称可直接选择为默认模型
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {models.map((model) => {
                      const modelName = model.model || model.name;
                      const isSelected = ollamaConfig.defaultModel === modelName;
                      return (
                        <div
                          key={model.name}
                          className={`flex items-center justify-between text-sm p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100 border border-blue-300'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => {
                            setOllamaConfig({ ...ollamaConfig, defaultModel: modelName });
                            logger.info('已选择模型:', modelName);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                              {model.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">
                              {model.parameter_size && `${model.parameter_size} `}
                              {model.quantization_level && `(${model.quantization_level})`}
                            </span>
                            {!isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOllamaConfig({ ...ollamaConfig, defaultModel: modelName });
                                }}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              >
                                使用
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {ollamaConfig.defaultModel && (
                    <p className="mt-2 text-sm text-blue-600">
                      当前选择的模型: <span className="font-medium">{ollamaConfig.defaultModel}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OpenAI 配置（占位） */}
          {provider === 'openai' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">OpenAI / OpenAI 兼容</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={openaiConfig.baseUrl}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={openaiConfig.apiKey}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="可选（本地兼容服务可能不需要）"
                />
        {requiresOpenAIApiKey && (
          <p className={`mt-1 text-xs ${openaiKeyMissing ? 'text-red-600' : 'text-gray-500'}`}>
            {openaiKeyMissing ? '必须填写 API Key 才能连接官方 OpenAI 接口' : '已检测到官方 OpenAI 接口，将使用该 Key 进行鉴权'}
          </p>
        )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={testOpenAIConnection}
          disabled={openaiConnectionStatus === 'testing' || openaiKeyMissing}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {openaiConnectionStatus === 'testing' ? '测试中...' : '测试连接'}
                </button>
                <span className={`text-sm font-medium ${openaiConnectionStatus === 'connected' ? 'text-green-600' : openaiConnectionStatus === 'error' ? 'text-red-600' : openaiConnectionStatus === 'testing' ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {getOpenAIStatusText()}
                </span>
              </div>

              {openaiConnectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{openaiConnectionError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
                <input
                  list="openai-models"
                  type="text"
                  value={openaiConfig.defaultModel}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, defaultModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：gpt-4o-mini / llama-3.1-8b-instruct"
                />
                <datalist id="openai-models">
                  {openaiModels.map((m) => (
                    <option key={m.id} value={m.id} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求超时 (毫秒)</label>
                <input
                  type="number"
                  value={openaiConfig.timeout}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, timeout: parseInt(e.target.value) || 30000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1000"
                  step="1000"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="openaiStreamEnabled"
                  checked={openaiConfig.streamEnabled}
                  onChange={(e) => setOpenaiConfig({ ...openaiConfig, streamEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="openaiStreamEnabled" className="ml-2 text-sm text-gray-700">
                  启用流式响应（逐字显示）
                </label>
              </div>
            </div>
          )}

          {/* 自定义配置（占位） */}
          {provider === 'custom' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">本地 / 自定义(OpenAI兼容)</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={customConfig.baseUrl}
                  onChange={(e) => setCustomConfig({ ...customConfig, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：http://localhost:1234/v1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  需要支持 /v1/models 与 /v1/chat/completions（LM Studio、vLLM、llama.cpp server 等通常兼容）
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={customConfig.apiKey}
                  onChange={(e) => setCustomConfig({ ...customConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="可选"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                <textarea
                  value={customHeadersText}
                  onChange={(e) => setCustomHeadersText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows={6}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={testCustomConnection}
                  disabled={customConnectionStatus === 'testing'}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {customConnectionStatus === 'testing' ? '测试中...' : '测试连接'}
                </button>
                <span className={`text-sm font-medium ${customConnectionStatus === 'connected' ? 'text-green-600' : customConnectionStatus === 'error' ? 'text-red-600' : customConnectionStatus === 'testing' ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {getCustomStatusText()}
                </span>
              </div>

              {customConnectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{customConnectionError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
                <input
                  list="custom-models"
                  type="text"
                  value={customConfig.defaultModel}
                  onChange={(e) => setCustomConfig({ ...customConfig, defaultModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：llama-3.1-8b-instruct"
                />
                <datalist id="custom-models">
                  {customModels.map((m) => (
                    <option key={m.id} value={m.id} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">请求超时 (毫秒)</label>
                <input
                  type="number"
                  value={customConfig.timeout}
                  onChange={(e) => setCustomConfig({ ...customConfig, timeout: parseInt(e.target.value) || 30000 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1000"
                  step="1000"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customStreamEnabled"
                  checked={customConfig.streamEnabled}
                  onChange={(e) => setCustomConfig({ ...customConfig, streamEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="customStreamEnabled" className="ml-2 text-sm text-gray-700">
                  启用流式响应（逐字显示）
                </label>
              </div>
            </div>
          )}

          {provider === 'linkmind' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">LinkMind 配置</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="text"
                  value={linkmindConfig.baseUrl}
                  onChange={e =>
                    setLinkmindConfig({ ...linkmindConfig, baseUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/api/linkmind 或 https://your-linkmind"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={linkmindConfig.apiKey}
                  onChange={e =>
                    setLinkmindConfig({ ...linkmindConfig, apiKey: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">传输模式</label>
                <select
                  value={linkmindConfig.transportMode}
                  onChange={e =>
                    setLinkmindConfig({
                      ...linkmindConfig,
                      transportMode: e.target.value as 'direct' | 'backend-relay' | 'proxy',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="proxy">proxy（推荐）</option>
                  <option value="backend-relay">backend-relay</option>
                  <option value="direct">direct</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={testLinkMindConnection}
                  disabled={linkmindConnectionStatus === 'testing'}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {linkmindConnectionStatus === 'testing' ? '测试中...' : '测试连接'}
                </button>
                <span
                  className={`text-sm font-medium ${
                    linkmindConnectionStatus === 'connected'
                      ? 'text-green-600'
                      : linkmindConnectionStatus === 'error'
                        ? 'text-red-600'
                        : linkmindConnectionStatus === 'testing'
                          ? 'text-yellow-600'
                          : 'text-gray-600'
                  }`}
                >
                  {linkmindConnectionStatus === 'connected'
                    ? '已连接'
                    : linkmindConnectionStatus === 'error'
                      ? '连接失败'
                      : linkmindConnectionStatus === 'testing'
                        ? '测试中...'
                        : '未测试'}
                </span>
              </div>
              {linkmindConnectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{linkmindConnectionError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
                <input
                  list="linkmind-models"
                  value={linkmindConfig.defaultModel}
                  onChange={e =>
                    setLinkmindConfig({ ...linkmindConfig, defaultModel: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <datalist id="linkmind-models">
                  {linkmindModels.map(m => (
                    <option key={m.id} value={m.id} />
                  ))}
                </datalist>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            取消
          </button>
          <button
            onClick={saveConfig}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIConfigPanel;
