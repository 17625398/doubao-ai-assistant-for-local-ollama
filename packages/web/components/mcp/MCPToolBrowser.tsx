'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { MCPTool, MCPServerConfig } from '@core/services/mcp-bridge-service';

interface MCPToolBrowserProps {
  onClose?: () => void;
  onToolCall?: (toolName: string, serverId: string, args: Record<string, any>) => Promise<string>;
}

interface ServerStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  toolCount: number;
  lastError: string | null;
}

export function MCPToolBrowser({ onClose, onToolCall }: MCPToolBrowserProps) {
  const [activeTab, setActiveTab] = useState<'tools' | 'servers' | 'call'>('tools');
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [callArgs, setCallArgs] = useState<Record<string, any>>({});
  const [callResult, setCallResult] = useState<string>('');
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServer, setNewServer] = useState<Partial<MCPServerConfig>>({
    name: '',
    type: 'stdio',
    command: '',
    args: [],
    enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/linkmind/mcp?action=list-servers');
      const data = await res.json();
      if (data.success && data.servers) {
        setServers(data.servers.map((s: any) => ({
          ...s,
          status: s.status || 'disconnected',
          toolCount: s.toolCount || 0,
        })));
      }

      const toolsRes = await fetch('/api/linkmind/mcp');
      const toolsData = await toolsRes.json();
      if (toolsData.success && Array.isArray(toolsData.tools)) {
        setTools(toolsData.tools);
      }
    } catch {}
  };

  const filteredTools = searchQuery
    ? tools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  const handleAddServer = async () => {
    if (!newServer.name?.trim()) return;
 
    try {
      const res = await fetch('/api/linkmind/mcp?action=add-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer),
      });
 
      const data = await res.json();
      if (data.success) {
        setShowAddServer(false);
        setNewServer({ name: '', type: 'stdio', command: '', args: [], enabled: true });
        loadData();
      } else {
        setError(data.error || '添加服务器失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleEnableServer = async (serverId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/linkmind/mcp?action=${enabled ? 'enable' : 'disable'}&serverId=${serverId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        setError(data.error || `操作失败`);
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    if (!confirm('确定要删除此服务器配置吗？')) return;
    try {
      const res = await fetch(`/api/linkmind/mcp?action=remove&serverId=${serverId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleValidateServers = async () => {
    try {
      const res = await fetch('/api/linkmind/mcp?action=validate', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert('验证完成！');
        loadData();
      } else {
        setError(data.error || '验证失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    const defaults: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
        if (prop.default !== undefined) defaults[key] = prop.default;
        else if (prop.type === 'string') defaults[key] = '';
        else if (prop.type === 'number') defaults[key] = 0;
        else if (prop.type === 'boolean') defaults[key] = false;
        else defaults[key] = '';
      }
    }
    setCallArgs(defaults);
    setCallResult('');
    setActiveTab('call');
  };

  const handleCallTool = async () => {
    if (!selectedTool || !onToolCall) return;

    setIsCalling(true);
    setError(null);

    try {
      const result = await onToolCall(selectedTool.name, selectedTool.serverId, callArgs);
      setCallResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCalling(false);
    }
  };

  const statusColor = (status: ServerStatus['status']) =>
    ({
      connected: 'bg-green-500',
      disconnected: 'bg-gray-400',
      error: 'bg-red-500',
      connecting: 'bg-yellow-500 animate-pulse',
    })[status] || 'bg-gray-400';

  const statusLabel = (status: ServerStatus['status']) =>
    ({ connected: '已连接', disconnected: '未连接', error: '错误', connecting: '连接中' })[status] || status;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔌</span>
            <h2 className="text-lg font-semibold text-white">MCP 工具浏览器</h2>
            <span className="px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full">{tools.length} 工具</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddServer(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors"
            >
              + 添加服务器
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {[
            { id: 'tools' as const, label: `🛠️ 工具列表 (${filteredTools.length})` },
            { id: 'servers' as const, label: `🖥️ 服务器 (${servers.length})` },
            { id: 'call' as const, label: '⚡ 调用工具' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <span>⚠️</span> {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Add Server Modal */}
          {showAddServer && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg space-y-3">
              <h3 className="text-sm font-medium text-emerald-700">添加 MCP 服务器</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={newServer.name || ''}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="服务器名称"
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
                <select
                  value={newServer.type}
                  onChange={(e) => setNewServer({ ...newServer, type: e.target.value as 'stdio' | 'sse' })}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="stdio">stdio</option>
                  <option value="sse">SSE</option>
                </select>
                <input
                  value={newServer.command || ''}
                  onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                  placeholder="命令 (如 npx, node, python)"
                  className="col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddServer(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                  取消
                </button>
                <button onClick={handleAddServer} className="px-4 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600">
                  添加
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索工具名称或描述..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              {filteredTools.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🔍</p>
                  <p className="text-sm">{searchQuery ? '未找到匹配的工具' : '暂无可用工具，请先添加 MCP 服务器'}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredTools.map((tool) => (
                    <button
                      key={`${tool.serverId}:${tool.name}`}
                      onClick={() => handleSelectTool(tool)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 border border-transparent hover:border-emerald-200 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-semibold text-emerald-600 group-hover:text-emerald-500">
                              {tool.name}
                            </code>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded">
                              {tool.serverName}
                            </span>
                          </div>
                          {tool.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.description}</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">服务器列表</span>
                <button
                  onClick={handleValidateServers}
                  className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  ✅ 验证全部
                </button>
              </div>
              {servers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🖥️</p>
                  <p className="text-sm">暂无 MCP 服务器</p>
                  <button onClick={() => setShowAddServer(true)} className="mt-3 text-sm text-emerald-500 hover:text-emerald-600">
                    + 添加第一个服务器
                  </button>
                </div>
              ) : (
                servers.map((server) => (
                  <div key={server.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusColor(server.status)}`} />
                        <span className="font-medium text-sm">{server.name}</span>
                        <span className="text-xs text-gray-400">{server.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 mr-2">
                          {statusLabel(server.status)} · {server.toolCount} 工具
                        </span>
                        <button
                          onClick={() => handleEnableServer(server.id, server.status !== 'connected')}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            server.status === 'connected'
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {server.status === 'connected' ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleRemoveServer(server.id)}
                          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    {server.lastError && (
                      <p className="mt-2 text-xs text-red-500">{server.lastError}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'call' && selectedTool && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-semibold text-emerald-600">{selectedTool.name}</code>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded">
                    {selectedTool.serverName}
                  </span>
                </div>
                {selectedTool.description && (
                  <p className="text-xs text-gray-600">{selectedTool.description}</p>
                )}
              </div>

              {selectedTool.inputSchema?.properties && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-500">参数配置</h4>
                  {Object.entries(selectedTool.inputSchema.properties as Record<string, any>).map(([key, prop]: [string, any]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">
                        {key}
                        {prop.required && <span className="text-red-400 ml-1">*</span>}
                        {prop.type && <span className="text-gray-400 ml-1">({prop.type})</span>}
                        {prop.description && <span className="ml-1 text-gray-400">— {prop.description}</span>}
                      </label>
                      {prop.type === 'boolean' ? (
                        <select
                          value={String(callArgs[key] ?? '')}
                          onChange={(e) => setCallArgs({ ...callArgs, [key]: e.target.value === 'true' })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        >
                          <option value="">选择...</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : prop.enum ? (
                        <select
                          value={String(callArgs[key] ?? '')}
                          onChange={(e) => setCallArgs({ ...callArgs, [key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        >
                          <option value="">选择...</option>
                          {prop.enum.map((v: string) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <textarea
                          value={String(callArgs[key] ?? '')}
                          onChange={(e) => setCallArgs({ ...callArgs, [key]: e.target.value })}
                          placeholder={prop.description || `输入 ${key}`}
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleCallTool}
                disabled={isCalling}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isCalling ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    执行中...
                  </>
                ) : (
                  <>⚡ 执行调用</>
                )}
              </button>

              {callResult && (
                <div className="p-4 bg-gray-900 rounded-lg overflow-auto max-h-64">
                  <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">{callResult}</pre>
                </div>
              )}
            </div>
          )}

          {!selectedTool && activeTab === 'call' && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">⚡</p>
              <p className="text-sm">请从工具列表中选择一个工具进行调用</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 flex justify-between">
          <span>MCP Tool Browser v1.0</span>
          <span>{servers.length} 服务器 · {tools.length} 工具可用</span>
        </div>
      </div>
    </div>
  );
}
