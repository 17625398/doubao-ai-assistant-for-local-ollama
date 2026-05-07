'use client'

import {
  diagnosticsCapabilities,
  productPrinciples,
  runtimeLayers,
  skillCapabilities,
  trustedOriginRules,
} from '@core/index'

const categoryLabels: Record<string, string> = {
  chat: '聊天',
  read: '阅读',
  search: '搜索',
  create: '创作',
  media: '媒体',
  office: '办公',
  developer: '开发',
  ops: '运维',
}

const layerAccent: Record<string, string> = {
  'native-host': 'from-sky-500 to-blue-600',
  'trusted-web': 'from-emerald-500 to-teal-600',
  'ai-extension': 'from-violet-500 to-purple-600',
  'skill-runtime': 'from-fuchsia-500 to-pink-600',
  'canvas-artifact': 'from-amber-500 to-orange-600',
  'native-capability': 'from-cyan-500 to-indigo-600',
  'diagnostics-ops': 'from-slate-500 to-slate-700',
}

export function DoubaoNativeWorkbench() {
  const primarySkills = skillCapabilities.slice(0, 8)
  const officeSkills = skillCapabilities.slice(8)

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b16] text-white">
      <section className="relative border-b border-white/10 px-6 py-10 sm:px-10 lg:px-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(168,85,247,0.25),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.98))]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-100 shadow-2xl backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              Refactored Native AI Workbench
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              本地原生 AI 助手重塑方案
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              按照对 `app` 原生客户端的分析，将本项目重塑为“Chromium 桌面宿主、可信 Web、浏览器 AI 侧边栏、技能运行时、Canvas Artifact、原生增强、诊断运维”七层架构。
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:max-w-xl">
            {[
              ['7', '运行层'],
              ['10+', 'AI 技能'],
              ['4', '诊断域'],
              ['MV3', '扩展模型'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-center shadow-2xl backdrop-blur">
                <div className="text-3xl font-semibold">{value}</div>
                <div className="mt-1 text-slate-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-300">Runtime Architecture</p>
              <h2 className="mt-1 text-2xl font-semibold">七层运行架构</h2>
            </div>
            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-200">可审计蓝图</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {runtimeLayers.map(layer => (
              <article key={layer.id} className="group rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-slate-900/80">
                <div className={`mb-4 h-1.5 rounded-full bg-gradient-to-r ${layerAccent[layer.id]}`} />
                <h3 className="text-lg font-semibold">{layer.name}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-300">{layer.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {layer.localModules.slice(0, 4).map(module => (
                    <span key={module} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300">
                      {module}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-emerald-300">Trusted Surface</p>
            <h2 className="mt-1 text-2xl font-semibold">可信域与通信边界</h2>
            <div className="mt-5 space-y-4">
              {trustedOriginRules.map(rule => (
                <div key={rule.scope} className="rounded-2xl bg-slate-950/60 p-4">
                  <div className="text-sm font-semibold text-white">{rule.scope}</div>
                  <p className="mt-1 text-sm text-slate-400">{rule.purpose}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rule.hosts.slice(0, 5).map(host => (
                      <span key={host} className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">
                        {host}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/15 to-purple-500/10 p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-purple-200">Product Principles</p>
            <h2 className="mt-1 text-2xl font-semibold">重塑原则</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              {productPrinciples.map(principle => (
                <li key={principle} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8 sm:px-10 lg:px-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-pink-300">Skill Runtime</p>
              <h2 className="mt-1 text-2xl font-semibold">插件化 AI 技能矩阵</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              每个技能都通过统一输入插件、消息渲染、侧边栏应用和 Canvas Artifact 组合，保留云端模型依赖与本地原生能力边界。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {primarySkills.map(skill => (
              <article key={skill.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{skill.name}</h3>
                  <span className="rounded-full bg-pink-400/10 px-2 py-1 text-xs text-pink-200">{categoryLabels[skill.category]}</span>
                </div>
                <p className="text-sm leading-6 text-slate-300">{skill.description}</p>
                <div className="mt-4 space-y-2">
                  {skill.entryPoints.slice(0, 3).map(entry => (
                    <div key={entry} className="truncate rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-slate-300">
                      {entry}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {officeSkills.map(skill => (
              <article key={skill.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{skill.name}</h3>
                  <span className="rounded-full bg-amber-400/10 px-2 py-1 text-xs text-amber-200">{categoryLabels[skill.category]}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{skill.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-12 sm:px-10 lg:grid-cols-4 lg:px-14">
        {diagnosticsCapabilities.map(item => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-cyan-300">Diagnostics</p>
            <h3 className="mt-1 text-lg font-semibold">{item.name}</h3>
            <div className="mt-4 space-y-2">
              {item.checks.slice(0, 5).map(check => (
                <div key={check} className="rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                  {check}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
