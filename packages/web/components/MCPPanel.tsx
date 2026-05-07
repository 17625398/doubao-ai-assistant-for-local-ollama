'use client';

import React, { useState } from 'react';

interface MCPPanelProps {
  onClose?: () => void;
}

interface MCPService {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastUsed: string;
}

export function MCPPanel({ onClose }: MCPPanelProps) {
  const [services, setServices] = useState<MCPService[]>([
    { id: '1', name: '文件系统服务', description: '读写本地文件和目录', status: 'connected', lastUsed: '2024-01-15 10:30' },
    { id: '2', name: '数据库服务', description: '连接和查询数据库', status: 'disconnected', lastUsed: '从未' },
    { id: '3', name: 'API网关服务', description: '统一API调用管理', status: 'connected', lastUsed: '2024-01-15 09:15' },
    { id: '4', name: '搜索服务', description: '全文搜索和索引', status: 'error', lastUsed: '2024-01-14 16:20' },
  ]);

  const getStatusColor = (status: MCPService['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-gray-400';
      case 'error':
        return 'bg-red-500';
    }
  };

  const getStatusText = (status: MCPService['status']) => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '错误';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-500">
          <h2 className="text-xl font-semibold text-white">MCP 服务管理</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">已配置的服务</h3>
            <div className="space-y-3">
              {services.map(service => (
                <div
                  key={service.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        service.status === 'connected'
                          ? 'bg-green-100 text-green-700'
                          : service.status === 'disconnected'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {getStatusText(service.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        最后使用: {service.lastUsed}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加新服务</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务名称</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="输入服务名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务地址</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="http://localhost:8080"
                />
              </div>
            </div>
            <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
              添加服务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MCPPanel;
