'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  OpenClawAgentConfig,
  OpenClawChannelConfig,
  OpenClawSkill,
  OpenClawToolDefinition,
  CronJob,
  GatewayStatus,
  OpenClawChannelType,
} from '@/services/openclaw/openclaw-types'
import { CHANNEL_LABELS, CHANNEL_ICONS } from '@/services/openclaw/openclaw-types'

type TabType =
  | 'overview'
  | 'agents'
  | 'channels'
  | 'skills'
  | 'tools'
  | 'cron'
  | 'config'
  | 'security'

interface OpenClawControlPanelProps {
  onClose: () => void
}

export function OpenClawControlPanel({ onClose }: OpenClawControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null)
  const [agents, setAgents] = useState<OpenClawAgentConfig[]>([])
  const [channels, setChannels] = useState<OpenClawChannelConfig[]>([])
  const [skills, setSkills] = useState<OpenClawSkill[]>([])
  const [tools, setTools] = useState<OpenClawToolDefinition[]>([])
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [gatewayOffline, setGatewayOffline] = useState(false)

  const fetchData = useCallback(async (tab?: TabType) => {
    setLoading(true)
    setError(null)

    try {
      const targetTabs = tab ? [tab] : ['overview', 'agents', 'channels', 'skills', 'tools', 'cron']
      const promises: Promise<{ ok: boolean; status: number; data: any }>[] = []

      if (targetTabs.includes('overview')) {
        promises.push(
          fetch('/api/openclaw/gateway/status')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }
      if (targetTabs.includes('agents')) {
        promises.push(
          fetch('/api/openclaw/agents')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }
      if (targetTabs.includes('channels')) {
        promises.push(
          fetch('/api/openclaw/channels')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }
      if (targetTabs.includes('skills')) {
        promises.push(
          fetch('/api/openclaw/skills')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }
      if (targetTabs.includes('tools')) {
        promises.push(
          fetch('/api/openclaw/tools')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }
      if (targetTabs.includes('cron')) {
        promises.push(
          fetch('/api/openclaw/cron')
            .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
            .catch(() => ({ ok: false, status: 0, data: { success: false, error: '网络错误' } }))
        )
      }

      const results = await Promise.allSettled(promises)
      let anyOffline = false

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const r = result.value
          if (!r.ok && (r.status === 500 || r.status === 502 || r.status === 0)) {
            anyOffline = true
          }
          if (r.ok || r.data.success) {
            switch (targetTabs[idx]) {
              case 'overview':
                setGatewayStatus(r.data)
                break
              case 'agents':
                setAgents(r.data.agents || [])
                break
              case 'channels':
                setChannels(r.data.channels || [])
                break
              case 'skills':
                setSkills(r.data.skills || [])
                break
              case 'tools':
                setTools(r.data.tools || [])
                break
              case 'cron':
                setCronJobs(r.data.jobs || [])
                break
            }
          }
        }
      })

      if (anyOffline) setGatewayOffline(true)
      else setGatewayOffline(false)
    } catch (err) {
      setError('无法加载数据')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail?.tab) setActiveTab(customEvent.detail.tab)
    }
    window.addEventListener('open-openclaw-tab', handler)
    return () => window.removeEventListener('open-openclaw-tab', handler)
  }, [])

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: '总览', icon: '📊' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'channels', label: '通道', icon: '📡' },
    { id: 'skills', label: '技能', icon: '🔧' },
    { id: 'tools', label: '工具', icon: '🛠️' },
    { id: 'cron', label: '定时任务', icon: '⏰' },
    { id: 'config', label: '配置', icon: '⚙️' },
    { id: 'security', label: '安全', icon: '🔒' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex h-[90vh] w-[95vw] max-w-[1400px] flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦞</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">OpenClaw 控制面板</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {gatewayStatus?.connected ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    已连接 v{gatewayStatus.version}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    未连接
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                fetchData(tab.id)
              }}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {gatewayOffline && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xl">🔌</span>
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">
                    OpenClaw Gateway 未连接
                  </h3>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    无法连接到 OpenClaw Gateway (
                    <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-800">
                      http://localhost:18789
                    </code>
                    )。 请确保 OpenClaw 服务已启动，或在「配置」选项卡中修改连接地址。
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => fetchData()}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700 transition-colors"
                    >
                      重新检测连接
                    </button>
                    <a
                      href="https://github.com/openclaw/openclaw#quick-start"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-600 underline hover:text-amber-800 dark:text-amber-400"
                    >
                      查看安装指南 →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading && activeTab === 'overview' ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-500">{error}</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab
                  status={gatewayStatus}
                  agents={agents}
                  channels={channels}
                  skills={skills}
                />
              )}
              {activeTab === 'agents' && (
                <AgentsTab agents={agents} onRefresh={() => fetchData('agents')} />
              )}
              {activeTab === 'channels' && (
                <ChannelsTab channels={channels} onRefresh={() => fetchData('channels')} />
              )}
              {activeTab === 'skills' && (
                <SkillsTab skills={skills} onRefresh={() => fetchData('skills')} />
              )}
              {activeTab === 'tools' && (
                <ToolsTab tools={tools} onRefresh={() => fetchData('tools')} />
              )}
              {activeTab === 'cron' && (
                <CronTab jobs={cronJobs} onRefresh={() => fetchData('cron')} />
              )}
              {activeTab === 'config' && (
                <ConfigTab status={gatewayStatus} onRefresh={() => fetchData()} />
              )}
              {activeTab === 'security' && <SecurityTab onRefresh={() => fetchData()} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({
  status,
  agents,
  channels,
  skills,
}: {
  status: GatewayStatus | null
  agents: OpenClawAgentConfig[]
  channels: OpenClawChannelConfig[]
  skills: OpenClawSkill[]
}) {
  const isOffline = !status?.connected

  const cards = [
    {
      label: '网关状态',
      value: status?.connected ? '在线' : '离线',
      color: status?.connected
        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: status?.connected ? '🟢' : '🔴',
    },
    {
      label: '活跃 Agents',
      value: String(agents.filter(a => a.enabled).length),
      sub: `/ ${agents.length}`,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: '🤖',
    },
    {
      label: '通道总数',
      value: String(channels.length),
      sub: ` (${channels.filter(c => c.status === 'connected').length} 在线)`,
      color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      icon: '📡',
    },
    {
      label: '已启用技能',
      value: String(skills.filter(s => s.enabled).length),
      sub: `/ ${skills.length}`,
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: '🔧',
    },
  ]

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="font-medium text-blue-800 dark:text-blue-200">🚀 快速开始</h3>
          <ol className="mt-2 space-y-1.5 text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside">
            <li>
              克隆 OpenClaw:{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-800">
                git clone https://github.com/openclaw/openclaw.git
              </code>
            </li>
            <li>
              安装依赖并启动:{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-800">
                npm install &amp;&amp; npm run dev
              </code>
            </li>
            <li>
              Gateway 默认运行在{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-800">
                http://localhost:18789
              </code>
            </li>
            <li>返回此面板点击「重新检测连接」</li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-80">{card.label}</span>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {card.value}
              <span className="ml-1 text-sm font-normal opacity-70">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">系统信息</h3>
        <div className="space-y-2 text-sm">
          {status?.version && (
            <div className="flex justify-between">
              <span className="text-gray-500">版本</span>
              <span className="font-mono">{status.version}</span>
            </div>
          )}
          {status?.uptime !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-500">运行时间</span>
              <span>{formatUptime(status.uptime)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">活动会话</span>
            <span>{status?.activeSessions ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">最近注册的 Agents</h3>
        {agents.length > 0 ? (
          <div className="space-y-2">
            {agents.slice(0, 5).map(agent => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${agent.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                  />
                  <span className="text-sm font-medium">{agent.name}</span>
                  <span className="text-xs text-gray-500">{agent.model}</span>
                </div>
                <span className="text-xs text-gray-400">{agent.channels?.length || 0} 通道</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无 Agent</p>
        )}
      </div>
    </div>
  )
}

function AgentsTab({
  agents,
  onRefresh,
}: {
  agents: OpenClawAgentConfig[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formModel, setFormModel] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!formName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/openclaw/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, model: formModel || 'default', enabled: true }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormName('')
        onRefresh()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Agent 管理</h2>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          >
            刷新
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            + 新建 Agent
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Agent 名称"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
            <input
              value={formModel}
              onChange={e => setFormModel(e.target.value)}
              placeholder="模型 (可选)"
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !formName.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      )}

      {agents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  名称
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  模型
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  状态
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  通道
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {agents.map(agent => (
                <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                      {agent.model}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${agent.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${agent.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      {agent.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{agent.channels?.length || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-500 hover:text-blue-700 text-xs mr-2">编辑</button>
                    <button className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
          暂无 Agent，点击「+ 新建 Agent」添加
        </div>
      )}
    </div>
  )
}

function ChannelsTab({
  channels,
  onRefresh,
}: {
  channels: OpenClawChannelConfig[]
  onRefresh: () => void
}) {
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, string>>({})

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const res = await fetch(`/api/openclaw/channels/${id}/test`, { method: 'POST' })
      const data = await res.json()
      setTestResults(prev => ({
        ...prev,
        [id]: data.connected ? `✅ 连接成功 (${data.latency}ms)` : `❌ 失败: ${data.error}`,
      }))
    } catch {
      setTestResults(prev => ({ ...prev, [id]: '❌ 测试失败' }))
    } finally {
      setTestingId(null)
    }
  }

  const statusColor = (s: string) =>
    s === 'connected' ? 'text-green-500' : s === 'error' ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">通道管理</h2>
        <button
          onClick={onRefresh}
          className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          刷新
        </button>
      </div>

      {channels.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  通道
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  类型
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  状态
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  消息数
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {channels.map(ch => (
                <tr key={ch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{CHANNEL_ICONS[ch.type] || '📡'}</span>
                      <span className="font-medium">{ch.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                      {CHANNEL_LABELS[ch.type] || ch.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${statusColor(ch.status ?? '')}`}>
                      {ch.status ?? 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ch.messageCount || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleTest(ch.id)}
                      disabled={testingId === ch.id}
                      className="text-blue-500 hover:text-blue-700 text-xs mr-2"
                    >
                      {testingId === ch.id ? '测试中...' : '测试'}
                    </button>
                    {testResults[ch.id] && (
                      <span className="block text-xs mt-0.5">{testResults[ch.id]}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
          暂无通道，通过 API 或配置文件添加
        </div>
      )}
    </div>
  )
}

function SkillsTab({ skills, onRefresh }: { skills: OpenClawSkill[]; onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const filtered = searchQuery
    ? skills.filter(
        s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : skills

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          技能管理 ({filtered.length}/{skills.length})
        </h2>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索技能..."
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            onClick={onRefresh}
            className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            刷新
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(skill => (
          <div
            key={skill.id}
            className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-sm">{skill.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{skill.description}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${skill.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}
              >
                {skill.source}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>
                v{skill.version} · {skill.category}
              </span>
              <span>{Object.keys(skill.tools).length} 工具</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
          {searchQuery ? '未找到匹配的技能' : '暂无技能'}
        </div>
      )}
    </div>
  )
}

function ToolsTab({
  tools,
  onRefresh,
}: {
  tools: OpenClawToolDefinition[]
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">工具列表 ({tools.length})</h2>
        <button
          onClick={onRefresh}
          className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`rounded-lg border p-4 ${tool.dangerous ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${tool.category === 'browser' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : tool.category === 'canvas' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}
              >
                {tool.category}
              </span>
              {tool.dangerous && <span className="text-xs text-red-500">⚠️ 危险</span>}
            </div>
            <h3 className="mt-2 font-medium text-sm">{tool.name}</h3>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{tool.description}</p>
            <p className="mt-2 text-xs text-gray-400">{tool.parameters.length} 参数</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CronTab({ jobs, onRefresh }: { jobs: CronJob[]; onRefresh: () => void }) {
  const formatTime = (ts?: number) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">定时任务 ({jobs.length})</h2>
        <button
          onClick={onRefresh}
          className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          刷新
        </button>
      </div>

      {jobs.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  任务名
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  调度
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  状态
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  上次运行
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                  运行次数
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium">{job.name}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
                      {job.schedule.expression}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${job.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}
                    >
                      {job.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatTime(job.lastRunAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {job.runCount} / {job.errorCount} ❌
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-500 hover:text-blue-700 text-xs mr-2">执行</button>
                    <button className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-600">
          暂无定时任务
        </div>
      )}
    </div>
  )
}

function ConfigTab({ status, onRefresh }: { status: GatewayStatus | null; onRefresh: () => void }) {
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState(18789)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/openclaw/gateway/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, apiKey }),
      })
      if (res.ok) {
        setSaveResult('✅ 配置已保存')
        onRefresh()
      } else setSaveResult('❌ 保存失败')
    } catch {
      setSaveResult('❌ 网络错误')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">网关配置</h2>

      <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            主机地址
          </label>
          <input
            value={host}
            onChange={e => setHost(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            placeholder="localhost"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            HTTP 端口
          </label>
          <input
            type="number"
            value={port}
            onChange={e => setPort(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            API Key (可选)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            placeholder="输入 API Key..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={onRefresh}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            测试连接
          </button>
          {saveResult && <span className="text-sm">{saveResult}</span>}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-2 font-medium text-sm">连接状态</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">状态</span>
            <span className={status?.connected ? 'text-green-600' : 'text-red-500'}>
              {status?.connected ? '已连接' : '未连接'}
            </span>
          </div>
          {status?.version && (
            <div className="flex justify-between">
              <span className="text-gray-500">版本</span>
              <span>{status.version}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SecurityTab({ onRefresh }: { onRefresh: () => void }) {
  const [dmMode, setDmMode] = useState<'pairing' | 'open' | 'closed'>('pairing')
  const [sandboxMode, setSandboxMode] = useState<'none' | 'docker' | 'ssh'>('none')

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">安全设置</h2>

      <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="font-medium text-sm">DM 配对策略</h3>
        <select
          value={dmMode}
          onChange={e => setDmMode(e.target.value as any)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="pairing">配对模式 (需要配对码)</option>
          <option value="open">开放模式 (允许所有)</option>
          <option value="closed">关闭模式 (禁止 DM)</option>
        </select>
        <p className="text-xs text-gray-500">控制谁可以通过私聊与 AI 助手交互</p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="font-medium text-sm">沙箱模式</h3>
        <select
          value={sandboxMode}
          onChange={e => setSandboxMode(e.target.value as any)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="none">无沙箱 (本地执行)</option>
          <option value="docker">Docker 沙箱</option>
          <option value="ssh">SSH 远程沙箱</option>
        </select>
        <p className="text-xs text-gray-500">控制工具执行的隔离级别</p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <h3 className="font-medium text-sm text-yellow-800 dark:text-yellow-200">⚠️ 安全提醒</h3>
        <ul className="mt-2 space-y-1 text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside">
          <li>生产环境建议使用 Docker 沙箱</li>
          <li>DM 建议使用配对模式防止滥用</li>
          <li>定期检查审计日志发现异常行为</li>
        </ul>
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  if (!seconds) return '-'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}天${h}小时`
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}
