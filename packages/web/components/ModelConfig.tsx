import React, { useState, useEffect } from 'react';
import { ModelConfig as ModelConfigType, modelManager } from '@core/utils/model-manager';

interface ModelConfigProps {
  onModelChange?: (model: ModelConfigType) => void;
}

export const ModelConfig: React.FC<ModelConfigProps> = ({ onModelChange }) => {
  const [models, setModels] = useState<ModelConfigType[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModel, setNewModel] = useState<Omit<ModelConfigType, 'id'>>({
    name: '',
    provider: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    parameters: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40
    }
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // 加载模型列表
  useEffect(() => {
    const loadModels = () => {
      const modelList = modelManager.getModels();
      setModels(modelList);
      const defaultModel = modelManager.getDefaultModel();
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
        onModelChange?.(defaultModel);
      }
    };

    loadModels();
  }, [onModelChange]);

  // 处理模型选择
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      onModelChange?.(model);
    }
  };

  // 处理设置默认模型
  const handleSetDefault = (modelId: string) => {
    modelManager.setDefaultModel(modelId);
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      onModelChange?.(model);
    }
    // 重新加载模型列表
    setModels(modelManager.getModels());
  };

  // 处理删除模型
  const handleDeleteModel = (modelId: string) => {
    if (window.confirm('确定要删除这个模型吗？')) {
      modelManager.deleteModel(modelId);
      setModels(modelManager.getModels());
      const defaultModel = modelManager.getDefaultModel();
      if (defaultModel) {
        setSelectedModelId(defaultModel.id);
        onModelChange?.(defaultModel);
      } else {
        setSelectedModelId('');
      }
    }
  };

  // 处理添加模型
  const handleAddModel = () => {
    if (newModel.name) {
      modelManager.addModel(newModel);
      setModels(modelManager.getModels());
      setIsAddingModel(false);
      setNewModel({
        name: '',
        provider: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        parameters: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40
        }
      });
    }
  };

  // 处理导入Ollama模型
  const handleImportOllamaModels = async () => {
    setIsImporting(true);
    setImportMessage('正在导入Ollama模型...');
    try {
      const count = await modelManager.importOllamaModels();
      setImportMessage(`成功导入 ${count} 个Ollama模型`);
      setModels(modelManager.getModels());
    } catch (error) {
      setImportMessage('导入失败，请检查Ollama服务是否运行');
    } finally {
      setIsImporting(false);
      // 3秒后清除消息
      setTimeout(() => setImportMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">模型管理</h2>
        <div className="flex gap-2">
          <button
            onClick={handleImportOllamaModels}
            disabled={isImporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isImporting ? '导入中...' : '导入Ollama模型'}
          </button>
          <button
            onClick={() => setIsAddingModel(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            添加模型
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="p-3 bg-blue-100 text-blue-700 rounded-md">
          {importMessage}
        </div>
      )}

      {isAddingModel && (
        <div className="p-4 border border-gray-200 rounded-lg bg-white">
          <h3 className="text-lg font-medium mb-4">添加新模型</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
              <input
                type="text"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="输入模型名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提供商</label>
              <select
                value={newModel.provider}
                onChange={(e) => setNewModel({ ...newModel, provider: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">基础URL</label>
              <input
                type="text"
                value={newModel.baseUrl}
                onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="输入API基础URL"
              />
            </div>
            {newModel.parameters && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">模型参数</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">温度</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={newModel.parameters.temperature}
                      onChange={(e) => setNewModel({
                        ...newModel,
                        parameters: {
                          ...newModel.parameters!,
                          temperature: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Top P</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={newModel.parameters.topP}
                      onChange={(e) => setNewModel({
                        ...newModel,
                        parameters: {
                          ...newModel.parameters!,
                          topP: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Top K</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={newModel.parameters.topK}
                      onChange={(e) => setNewModel({
                        ...newModel,
                        parameters: {
                          ...newModel.parameters!,
                          topK: parseInt(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddModel}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setIsAddingModel(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                模型名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                提供商
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {models.map((model) => (
              <tr key={model.id} className={selectedModelId === model.id ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{model.name}</span>
                    {model.isDefault && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                        默认
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-900">{model.provider}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {model.isVision ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      多模态
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                      文本
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleModelSelect(model.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      选择
                    </button>
                    {!model.isDefault && (
                      <button
                        onClick={() => handleSetDefault(model.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        设置默认
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteModel(model.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
