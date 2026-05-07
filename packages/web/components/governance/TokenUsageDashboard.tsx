'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface TokenUsageDashboardProps {
  onClose?: () => void;
}

interface UsageData {
  period: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  averageLatencyMs: number;
  topModels: Array<{ model: string; tokens: number; count: number }>;
  hourlyDistribution: Array<{ hour: number; tokens: number; count: number }>;
}

export function TokenUsageDashboard({ onClose }: TokenUsageDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'cache' | 'filters'>('overview');
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [data, setData] = useState<UsageData | null>(null);
  const [dailyRemaining, setDailyRemaining] = useState<{ used: number; limit: number; percentage: number; exceeded: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, dailyRes] = await Promise.all([
        fetch(`/api/linkmind/governance/stats?period=${period}`),
        fetch('/api/linkmind/governance/daily-remaining'),
      ]);

      const statsData = await statsRes.json();
      if (statsData.success) setData(statsData);

      const dailyData = await dailyRes.json();
      if (dailyData.success) setDailyRemaining(dailyData);
    } catch (err) {
      setError('无法加载用量数据');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const formatCost = (n: number) => `$${n.toFixed(4)}`;

  const maxHourlyTokens = data?.hourlyDistribution
    ? Math.max(...data.hourlyDistribution.map((h) => h.tokens), 1)
    : 1;

  const barColor = (pct: number) => {
    if (pct > 90) return 'bg-red-500';
    if (pct > 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h2 className="text-lg font-semibold text-white">用量仪表盘</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Period Selector */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">时间范围:</span>
          {(['today', 'yesterday', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {{ today: '今天', yesterday: '昨天', week: '本周', month: '本月', all: '全部' }[p]}
            </button>
          ))}
          <button onClick={fetchData} disabled={loading} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700" title="刷新">
            <svg className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {[
            { id: 'overview' as const, label: '📈 总览' },
            { id: 'models' as const, label: '🤖 模型排行' },
            { id: 'cache' as const, label: '💾 缓存状态' },
            { id: 'filters' as const, label: '🛡️ 过滤规则' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <span>⚠️</span> {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400">×</button>
            </div>
          )}

          {loading && !data && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-3 border-amber-300 border-t-transparent rounded-full" />
            </div>
          )}

          {activeTab === 'overview' && data && (
            <div className="space-y-6">
              {/* Daily Quota */}
              {dailyRemaining && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">今日配额使用情况</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dailyRemaining.exceeded ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {dailyRemaining.percentage}% 已用
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor(dailyRemaining.percentage)}`}
                      style={{ width: `${Math.min(dailyRemaining.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>{formatTokens(dailyRemaining.used)} 已使用</span>
                    <span>{formatTokens(dailyRemaining.limit)} 上限</span>
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '总 Token 数', value: formatTokens(data.totalTokens), icon: '🔤', color: 'from-violet-500 to-purple-500' },
                  { label: '请求数量', value: String(data.requestCount), icon: '📡', color: 'from-cyan-500 to-blue-500' },
                  { label: '预估费用', value: formatCost(data.totalCost), icon: '💰', color: 'from-emerald-500 to-teal-500' },
                  { label: '平均延迟', value: `${data.averageLatencyMs}ms`, icon: '⚡', color: 'from-amber-500 to-orange-500' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                    <span className="text-xl">{stat.icon}</span>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Hourly Distribution Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">每小时 Token 分布</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-end gap-1 h-32">
                    {data.hourlyDistribution.map((h) => (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full rounded-t-sm bg-gradient-to-t from-amber-400 to-orange-400 min-h-[2px] transition-all hover:from-amber-500 hover:to-orange-500"
                          style={{ height: `${(h.tokens / maxHourlyTokens) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                    {[0, 6, 12, 18, 23].map((h) => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && data && (
            <div className="space-y-3">
              {data.topModels.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">🤖</p>
                  <p className="text-sm">暂无模型使用数据</p>
                </div>
              ) : (
                data.topModels.map((model, idx) => (
                  <div key={model.model} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-lg font-bold w-8 text-center text-gray-400">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-sm font-semibold truncate">{model.model}</code>
                        <span className="text-sm font-bold text-amber-600">{formatTokens(model.tokens)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                          style={{ width: `${(model.tokens / (data.topModels[0]?.tokens || 1)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[11px] text-gray-400">
                        <span>{model.count} 次请求</span>
                        <span>{data.totalTokens > 0 ? ((model.tokens / data.totalTokens) * 100).toFixed(1) : 0}% 占比</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'cache' && (
            <CacheStatusPanel />
          )}

          {activeTab === 'filters' && (
            <FilterRulesPanel />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 flex justify-between">
          <span>Governance Dashboard v1.0</span>
          <span>Powered by LinkMind Governance API</span>
        </div>
      </div>
    </div>
  );
}

function CacheStatusPanel() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/linkmind/governance/cache/stats')
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '缓存条目', value: stats?.size ?? 0, sub: `/${stats?.maxSize ?? 0}` },
          { label: '命中率', value: `${((stats?.hitRate ?? 0) * 100).toFixed(1)}%`, sub: '' },
          { label: '内存占用', value: stats?.entries?.reduce((a: number, e: any) => a + (e.sizeBytes || 0), 0) > 1024
            ? `${((stats.entries.reduce((a: number, e: any) => a + (e.sizeBytes || 0), 0)) / 1024).toFixed(1)}KB`
            : `${stats?.entries?.reduce((a: number, e: any) => a + (e.sizeBytes || 0), 0) || 0}B`, sub: '' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-xl font-bold">{item.value}<span className="text-sm text-gray-400 ml-0.5">{item.sub}</span></p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      {stats?.entries?.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 mb-2">热门缓存条目 (Top 20)</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {stats.entries.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                <code className="truncate max-w-[60%]">{entry.key}</code>
                <div className="flex items-center gap-3 text-gray-400">
                  <span>{entry.hits} 命中</span>
                  <span>{entry.ageMs > 60000 ? `${Math.round(entry.ageMs / 60000)}min` : `${Math.round(entry.ageMs / 1000)}s`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRulesPanel() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/linkmind/governance/filters')
      .then((r) => r.json())
      .then((d) => { if (d.success) setRules(d.rules); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-amber-300 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🛡️</p>
          <p className="text-sm">暂无过滤规则</p>
        </div>
      ) : (
        rules.map((rule: any) => (
          <div key={rule.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
              rule.action === 'block' ? 'bg-red-500' : rule.action === 'warn' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}>
              {rule.action === 'block' ? '🚫' : rule.action === 'warn' ? '⚠️' : '✏️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{rule.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 rounded">{rule.category}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${rule.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {rule.enabled ? '启用' : '禁用'}
                </span>
              </div>
              <code className="text-xs text-gray-500 mt-0.5 block truncate">{typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.source}</code>
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">优先级 {rule.priority}</span>
          </div>
        ))
      )}
    </div>
  );
}
