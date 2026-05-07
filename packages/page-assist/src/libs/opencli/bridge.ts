const DAEMON_PORT = 19825
const DAEMON_HOST = "127.0.0.1"
const DAEMON_WS_URL = `ws://${DAEMON_HOST}:${DAEMON_PORT}/ext`
const DAEMON_PING_URL = `http://${DAEMON_HOST}:${DAEMON_PORT}/ping`

type Action =
  | "exec"
  | "navigate"
  | "tabs"
  | "cookies"
  | "screenshot"
  | "close-window"
  | "sessions"
  | "set-file-input"
  | "insert-text"
  | "bind-current"
  | "network-capture-start"
  | "network-capture-read"
  | "network-capture-stop"
  | "network-capture-clear"
  | "dom-wait"
  | "dom-click"
  | "dom-type"
  | "dom-set-value"
  | "dom-get-text"
  | "dom-get-attr"
  | "dom-is-visible"
  | "scroll-to"
  | "scroll-by"
  | "cdp"

type Command = {
  id: string
  action: Action
  tabId?: number
  code?: string
  workspace?: string
  url?: string
  op?: "list" | "new" | "close" | "select"
  index?: number
  urlForNew?: string
  domain?: string
  matchDomain?: string
  matchPathPrefix?: string
  format?: "png" | "jpeg"
  quality?: number
  fullPage?: boolean
  files?: string[]
  filesPayload?: { name: string; base64: string; type?: string }[]
  selector?: string
  text?: string
  pattern?: string
  cdpMethod?: string
  cdpParams?: Record<string, unknown>
  cookieOp?: "list" | "get" | "set" | "remove" | "export" | "import"
  cookieName?: string
  cookieValue?: string
  cookieUrl?: string
  cookiePath?: string
  sameSite?: "no_restriction" | "lax" | "strict" | "unspecified"
  secure?: boolean
  expirationDate?: number
  cookieBulk?: {
    url: string
    name: string
    value: string
    path?: string
    secure?: boolean
    sameSite?: "no_restriction" | "lax" | "strict" | "unspecified"
    expirationDate?: number
  }[]
  timeoutMs?: number
  append?: boolean
  deltaY?: number
  visible?: boolean
  attrName?: string
}

type Result = {
  id: string
  ok: boolean
  data?: unknown
  error?: string
}

type AutomationSession = {
  windowId: number
  preferredTabId: number | null
  idleTimer: ReturnType<typeof setTimeout> | null
  owned: boolean
}

const sessions = new Map<string, AutomationSession>()
const attachedDebugTargets = new Set<number>()
const WINDOW_IDLE_TIMEOUT = 30000

const getWorkspaceKey = (workspace?: string) =>
  workspace?.trim() || "default"

const resetIdleTimer = (workspace: string) => {
  const s = sessions.get(workspace)
  if (!s) return
  if (s.idleTimer) clearTimeout(s.idleTimer)
  s.idleTimer = setTimeout(async () => {
    const current = sessions.get(workspace)
    if (!current) return
    try {
      if (current.owned) {
        await chrome.windows.remove(current.windowId)
      }
      if (current.preferredTabId && attachedDebugTargets.has(current.preferredTabId)) {
        try {
          await chrome.debugger.detach({ tabId: current.preferredTabId })
        } catch {}
        attachedDebugTargets.delete(current.preferredTabId)
      }
    } catch {}
    sessions.delete(workspace)
  }, WINDOW_IDLE_TIMEOUT)
}

const isSafeNavigationUrl = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://")

const getOrCreateWindow = async (
  workspace: string,
  initialUrl?: string
): Promise<number> => {
  const existing = sessions.get(workspace)
  if (existing) {
    try {
      await chrome.windows.get(existing.windowId)
      return existing.windowId
    } catch {
      sessions.delete(workspace)
    }
  }
  const url = initialUrl && isSafeNavigationUrl(initialUrl) ? initialUrl : "about:blank"
  const win = await chrome.windows.create({
    url,
    focused: false,
    width: 1280,
    height: 900,
    type: "normal"
  })
  sessions.set(workspace, {
    windowId: win.id!,
    preferredTabId: null,
    idleTimer: null,
    owned: true
  })
  resetIdleTimer(workspace)
  return win.id!
}

const resolveTab = async (
  workspace: string,
  tabId?: number
): Promise<number> => {
  const s = sessions.get(workspace)
  if (!s) {
    const winId = await getOrCreateWindow(workspace)
    const tabs = await chrome.tabs.query({ windowId: winId })
    return tabs[0]?.id ?? winId
  }
  if (tabId !== undefined) {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (tab.windowId === s.windowId) return tabId
    } catch {}
  }
  if (s.preferredTabId != null) {
    try {
      const tab = await chrome.tabs.get(s.preferredTabId)
      if (tab.windowId === s.windowId) return s.preferredTabId
    } catch {}
  }
  const tabs = await chrome.tabs.query({ windowId: s.windowId })
  return tabs[0]?.id ?? s.windowId
}

const handleExec = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  if (!cmd.code) {
    return { id: cmd.id, ok: false, error: "Missing code" }
  }
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (code: string) => {
        try {
          // eslint-disable-next-line no-new-func
          const fn = new Function(`return (async () => { ${code} })()`)
          return Promise.resolve(fn()).then(
            (v) => ({ ok: true, value: v }),
            (e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) })
          )
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : String(e) }
        }
      },
      args: [cmd.code]
    }) as unknown as [{ result: { ok: boolean; value?: unknown; error?: string } }]
    if (res?.result?.ok) {
      return { id: cmd.id, ok: true, data: res.result.value }
    }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Execution failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleNavigate = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const winId = await getOrCreateWindow(workspace, cmd.url)
  if (cmd.url && isSafeNavigationUrl(cmd.url)) {
    const tabs = await chrome.tabs.query({ windowId: winId })
    if (tabs[0]?.id) {
      await chrome.tabs.update(tabs[0].id, { url: cmd.url })
      return { id: cmd.id, ok: true, data: { tabId: tabs[0].id, windowId: winId } }
    }
  }
  return { id: cmd.id, ok: true, data: { windowId: winId } }
}

const handleTabs = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const winId = await getOrCreateWindow(workspace)
  const op = cmd.op || "list"
  if (op === "list") {
    const tabs = await chrome.tabs.query({ windowId: winId })
    return {
      id: cmd.id,
      ok: true,
      data: tabs.map((t) => ({
        id: t.id,
        url: t.url,
        title: t.title,
        index: t.index
      }))
    }
  }
  if (op === "new") {
    const initialUrl =
      cmd.urlForNew && isSafeNavigationUrl(cmd.urlForNew) ? cmd.urlForNew : "about:blank"
    const created = await chrome.tabs.create({ windowId: winId, url: initialUrl })
    return { id: cmd.id, ok: true, data: { tabId: created.id, windowId: winId } }
  }
  if (op === "select") {
    const tabs = await chrome.tabs.query({ windowId: winId, index: cmd.index ?? 0 })
    const target = tabs[0]
    if (target?.id) {
      await chrome.tabs.update(target.id, { active: true })
      const s = sessions.get(workspace)
      if (s) s.preferredTabId = target.id
      return { id: cmd.id, ok: true, data: { tabId: target.id } }
    }
    return { id: cmd.id, ok: false, error: "No tab found" }
  }
  if (op === "close") {
    const tabId = await resolveTab(workspace, cmd.tabId)
    try {
      await chrome.tabs.remove(tabId)
      return { id: cmd.id, ok: true }
    } catch (e) {
      return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
  return { id: cmd.id, ok: false, error: "Unsupported tabs operation" }
}

const handleScreenshot = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const winId = await getOrCreateWindow(workspace)
  try {
    if (!cmd.fullPage) {
      const dataUrl = await chrome.tabs.captureVisibleTab(winId, {
        format: cmd.format ?? "png",
        quality: cmd.quality ?? 92
      })
      const base64 = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "")
      return { id: cmd.id, ok: true, data: base64 }
    }
    const [metrics] = await chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ windowId: winId, active: true }))[0]!.id! },
      func: () => {
        const w = window
        const d = document
        const body = d.body
        const html = d.documentElement
        const width = Math.max(
          body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth
        )
        const height = Math.max(
          body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight
        )
        return {
          totalHeight: height,
          viewportHeight: w.innerHeight,
          width: Math.max(w.innerWidth, html.clientWidth || 0),
          dpr: w.devicePixelRatio || 1
        }
      }
    }) as unknown as [{ result: { totalHeight: number; viewportHeight: number; width: number; dpr: number } }]
    const total = Math.max(0, metrics.result.totalHeight)
    const step = Math.max(1, metrics.result.viewportHeight)
    const chunks: string[] = []
    let y = 0
    while (y < total) {
      await chrome.scripting.executeScript({
        target: { tabId: (await chrome.tabs.query({ windowId: winId, active: true }))[0]!.id! },
        func: (pos: number) => { window.scrollTo(0, pos) },
        args: [y]
      })
      await new Promise((r) => setTimeout(r, 120))
      const dataUrl = await chrome.tabs.captureVisibleTab(winId, {
        format: cmd.format ?? "png",
        quality: cmd.quality ?? 92
      })
      chunks.push(dataUrl.replace(/^data:image\/(png|jpeg);base64,/, ""))
      y += step
      if (chunks.length > 300) break
    }
    await chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ windowId: winId, active: true }))[0]!.id! },
      func: () => { window.scrollTo(0, 0) }
    })
    return {
      id: cmd.id,
      ok: true,
      data: {
        chunks,
        width: metrics.result.width,
        viewportHeight: metrics.result.viewportHeight,
        totalHeight: metrics.result.totalHeight,
        format: cmd.format ?? "png"
      }
    }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleCloseWindow = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  const s = sessions.get(workspace)
  if (!s) return { id: cmd.id, ok: true }
  try {
    if (s.owned) {
      await chrome.windows.remove(s.windowId)
    }
  } catch {}
  if (s.idleTimer) clearTimeout(s.idleTimer)
  sessions.delete(workspace)
  return { id: cmd.id, ok: true }
}

const handleUnsupported = async (cmd: Command, feature: string): Promise<Result> => {
  return { id: cmd.id, ok: false, error: `${feature} is not supported in Page Assist bridge` }
}

const handleSetFileInput = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || 'input[type="file"]'
  const filesPayload = Array.isArray(cmd.filesPayload) ? cmd.filesPayload : []
  if (filesPayload.length === 0) {
    return { id: cmd.id, ok: false, error: "Missing filesPayload" }
  }
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, payload: { name: string; base64: string; type?: string }[]) => {
        const el = document.querySelector<HTMLInputElement>(sel)
        if (!el) return { ok: false, error: "Selector not found" }
        const dt = new DataTransfer()
        for (const f of payload) {
          const b64 = f.base64.replace(/^data:.*;base64,/, "")
          const bin = atob(b64)
          const len = bin.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
          const blob = new Blob([bytes], { type: f.type || "application/octet-stream" })
          const file = new File([blob], f.name, { type: f.type || "application/octet-stream" })
          dt.items.add(file)
        }
        Object.defineProperty(el, "files", { value: dt.files })
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
        return { ok: true, count: dt.files.length }
      },
      args: [selector, filesPayload]
    }) as unknown as [{ result: { ok: boolean; error?: string; count?: number } }]
    if (res?.result?.ok) {
      return { id: cmd.id, ok: true, data: { files: res.result.count } }
    }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Failed to set files" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleCookies = async (cmd: Command): Promise<Result> => {
  const op = cmd.cookieOp || "list"
  if (op === "list") {
    const details: chrome.cookies.GetAllDetails = {}
    if (cmd.domain) details.domain = cmd.domain
    const cookies = await chrome.cookies.getAll(details)
    return { id: cmd.id, ok: true, data: cookies }
  }
  if (op === "export") {
    const details: chrome.cookies.GetAllDetails = {}
    if (cmd.domain) details.domain = cmd.domain
    const cookies = await chrome.cookies.getAll(details)
    const mapped = cookies.map((c) => {
      const host = (c.domain || "").replace(/^\./, "")
      const protocol = c.secure ? "https" : "http"
      const path = c.path || "/"
      const url = `${protocol}://${host}${path}`
      const sameSite = (c.sameSite || "unspecified") as unknown as "no_restriction" | "lax" | "strict" | "unspecified"
      return {
        url,
        name: c.name,
        value: c.value,
        path: c.path,
        secure: c.secure,
        sameSite,
        expirationDate: c.expirationDate
      }
    })
    return { id: cmd.id, ok: true, data: mapped }
  }
  if (op === "get") {
    if (!cmd.cookieUrl || !cmd.cookieName) return { id: cmd.id, ok: false, error: "cookieUrl and cookieName required" }
    const c = await chrome.cookies.get({ url: cmd.cookieUrl, name: cmd.cookieName })
    return { id: cmd.id, ok: true, data: c || null }
  }
  if (op === "set") {
    if (!cmd.cookieUrl || !cmd.cookieName) return { id: cmd.id, ok: false, error: "cookieUrl and cookieName required" }
    const setParams: chrome.cookies.SetDetails = {
      url: cmd.cookieUrl,
      name: cmd.cookieName,
      value: cmd.cookieValue ?? "",
      path: cmd.cookiePath
    }
    if (typeof cmd.secure === "boolean") setParams.secure = cmd.secure
    if (cmd.sameSite && cmd.sameSite !== "unspecified") {
      setParams.sameSite = cmd.sameSite as chrome.cookies.SameSiteStatus
    }
    if (typeof cmd.expirationDate === "number") setParams.expirationDate = cmd.expirationDate
    const c = await chrome.cookies.set(setParams)
    return { id: cmd.id, ok: true, data: c }
  }
  if (op === "import") {
    const list = Array.isArray(cmd.cookieBulk) ? cmd.cookieBulk : []
    if (list.length === 0) return { id: cmd.id, ok: false, error: "cookieBulk required" }
    const results: Array<{ name: string; ok: boolean; error?: string }> = []
    for (const item of list) {
      try {
        const setParams: chrome.cookies.SetDetails = {
          url: item.url,
          name: item.name,
          value: item.value,
          path: item.path
        }
        if (typeof item.secure === "boolean") setParams.secure = item.secure
        if (item.sameSite && item.sameSite !== "unspecified") {
          setParams.sameSite = item.sameSite as chrome.cookies.SameSiteStatus
        }
        if (typeof item.expirationDate === "number") setParams.expirationDate = item.expirationDate
        await chrome.cookies.set(setParams)
        results.push({ name: item.name, ok: true })
      } catch (e) {
        results.push({ name: item.name, ok: false, error: e instanceof Error ? e.message : String(e) })
      }
    }
    return { id: cmd.id, ok: true, data: { total: list.length, results } }
  }
  if (op === "remove") {
    if (!cmd.cookieUrl || !cmd.cookieName) return { id: cmd.id, ok: false, error: "cookieUrl and cookieName required" }
    const r = await chrome.cookies.remove({ url: cmd.cookieUrl, name: cmd.cookieName })
    return { id: cmd.id, ok: true, data: r }
  }
  return { id: cmd.id, ok: false, error: "Unsupported cookies operation" }
}

const handleNetworkCaptureStart = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const pattern = cmd.pattern || ""
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (pat: string) => {
        const w = window as any
        if (w.__PA_NETCAP && w.__PA_NETCAP.installed) {
          w.__PA_NETCAP.pattern = pat
          return
        }
        const entries: any[] = []
        const patterns = pat
        const limit = 200
        const keep = () => { if (entries.length > limit) entries.shift() }
        const should = (url: string) => {
          if (!patterns) return true
          return String(patterns).split("|").filter(Boolean).some((p: string) => url.includes(p))
        }
        const origFetch = (window as any).fetch
        const origXHR = (window as any).XMLHttpRequest
        ;(window as any).__PA_NETCAP = { installed: true, entries, pattern: patterns, origFetch, origXHR }
        ;(window as any).fetch = async (...args: any[]) => {
          const url = String(args[0])
          const start = Date.now()
          try {
            const res = await origFetch(...args)
            if (should(url)) {
              const ct = res.headers.get("content-type") || ""
              let preview = ""
              try { if (ct.includes("json")) preview = JSON.stringify(await res.clone().json()).slice(0, 2000)
                else if (ct.startsWith("text/")) preview = (await res.clone().text()).slice(0, 2000)
              } catch {}
              entries.push({ kind: "fetch", url, method: (args[1]?.method || "GET"), status: res.status, contentType: ct, preview, t: start })
              keep()
            }
            return res
          } catch (e) {
            if (should(url)) {
              entries.push({ kind: "fetch", url, method: (args[1]?.method || "GET"), error: String(e), t: start })
              keep()
            }
            throw e
          }
        }
        const OrigXHR = origXHR
        class X extends OrigXHR {
          _m: string = "GET"
          _u: string = ""
          open(m: string, u: string, ...rest: any[]) {
            this._m = m
            this._u = u
            return super.open(m, u, ...rest as any)
          }
          send(body?: any) {
            const t = Date.now()
            this.addEventListener("loadend", () => {
              try {
                if (!should(this._u)) return
                let preview = ""
                const ct = this.getResponseHeader("content-type") || ""
                if (ct.includes("json")) preview = String(this.responseText || "").slice(0, 2000)
                else if (ct.startsWith("text/")) preview = String(this.responseText || "").slice(0, 2000)
                entries.push({ kind: "xhr", url: this._u, method: this._m, status: this.status, contentType: ct, preview, t })
                keep()
              } catch {}
            })
            return super.send(body as any)
          }
        }
        ;(window as any).XMLHttpRequest = X as any
      },
      args: [pattern]
    })
    return { id: cmd.id, ok: true }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleNetworkCaptureRead = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const w = window as any
        if (!w.__PA_NETCAP || !w.__PA_NETCAP.installed) return { installed: false, entries: [] }
        return { installed: true, entries: w.__PA_NETCAP.entries.slice(-200) }
      }
    }) as unknown as [{ result: { installed: boolean; entries: unknown[] } }]
    return { id: cmd.id, ok: true, data: res?.result || { installed: false, entries: [] } }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleNetworkCaptureStop = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const w = window as any
        if (w.__PA_NETCAP && w.__PA_NETCAP.installed) {
          try {
            if (w.__PA_NETCAP.origFetch) w.fetch = w.__PA_NETCAP.origFetch
            if (w.__PA_NETCAP.origXHR) w.XMLHttpRequest = w.__PA_NETCAP.origXHR
          } catch {}
          w.__PA_NETCAP.installed = false
        }
      }
    })
    return { id: cmd.id, ok: true }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleNetworkCaptureClear = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const w = window as any
        if (w.__PA_NETCAP && Array.isArray(w.__PA_NETCAP.entries)) {
          w.__PA_NETCAP.entries.length = 0
        }
      }
    })
    return { id: cmd.id, ok: true }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleInsertText = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const text = cmd.text || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (t: string) => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return { ok: false, error: "No active element" }
        if ((el as any).isContentEditable) {
          document.execCommand("insertText", false, t)
          return { ok: true }
        }
        if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "text")) {
          const input = el as HTMLTextAreaElement | HTMLInputElement
          const start = (input.selectionStart ?? input.value.length)
          const end = (input.selectionEnd ?? input.value.length)
          const value = input.value
          input.value = value.slice(0, start) + t + value.slice(end)
          const pos = start + t.length
          input.selectionStart = input.selectionEnd = pos
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.dispatchEvent(new Event("change", { bubbles: true }))
          return { ok: true }
        }
        return { ok: false, error: "Unsupported active element" }
      },
      args: [text]
    }) as unknown as [{ result: { ok: boolean; error?: string } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Insert failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomWait = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  const timeoutMs = Math.max(0, cmd.timeoutMs || 5000)
  const visible = !!cmd.visible
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (sel: string, waitMs: number, needVisible: boolean) => {
        const deadline = Date.now() + waitMs
        let found: Element | null = null
        while (Date.now() < deadline) {
          found = document.querySelector(sel)
          if (found) {
            if (!needVisible) break
            const el = found as HTMLElement
            const style = window.getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            const ok = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0
            if (ok) break
          }
          await new Promise((r) => setTimeout(r, 100))
        }
        if (!found) return { ok: false, error: "Timeout" }
        const rect = (found as HTMLElement).getBoundingClientRect()
        return { ok: true, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } }
      },
      args: [selector, timeoutMs, visible]
    }) as unknown as [{ result: { ok: boolean; error?: string; rect?: any } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true, data: res.result }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Wait failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomClick = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        try {
          el.scrollIntoView({ block: "center", inline: "center" })
        } catch {}
        const r = el.getBoundingClientRect()
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }))
        el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }))
        el.click()
        return { ok: true }
      },
      args: [selector]
    }) as unknown as [{ result: { ok: boolean; error?: string } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Click failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomType = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  const text = cmd.text || ""
  const append = !!cmd.append
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, t: string, ap: boolean) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        if ((el as any).isContentEditable) {
          el.focus()
          document.execCommand("insertText", false, t)
          return { ok: true }
        }
        if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "checkbox" && (el as HTMLInputElement).type !== "radio")) {
          const input = el as HTMLTextAreaElement | HTMLInputElement
          if (ap) {
            input.value = (input.value || "") + t
          } else {
            input.value = t
          }
          input.focus()
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.dispatchEvent(new Event("change", { bubbles: true }))
          return { ok: true }
        }
        return { ok: false, error: "Unsupported element" }
      },
      args: [selector, text, append]
    }) as unknown as [{ result: { ok: boolean; error?: string } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Type failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomSetValue = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  const text = cmd.text || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, t: string) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
          const input = el as HTMLTextAreaElement | HTMLInputElement
          input.value = t
          input.dispatchEvent(new Event("input", { bubbles: true }))
          input.dispatchEvent(new Event("change", { bubbles: true }))
          return { ok: true }
        }
        return { ok: false, error: "Unsupported element" }
      },
      args: [selector, text]
    }) as unknown as [{ result: { ok: boolean; error?: string } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Set value failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomGetText = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        const text = (el.textContent || "").trim()
        return { ok: true, text }
      },
      args: [selector]
    }) as unknown as [{ result: { ok: boolean; error?: string; text?: string } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true, data: res.result.text || "" }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Get text failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomGetAttr = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  const name = cmd.attrName || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, n: string) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        const v = el.getAttribute(n)
        return { ok: true, value: v }
      },
      args: [selector, name]
    }) as unknown as [{ result: { ok: boolean; error?: string; value?: string | null } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true, data: res.result.value ?? null }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Get attr failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleDomIsVisible = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return { ok: false, error: "Selector not found" }
        const style = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        const visible = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0
        return { ok: true, visible }
      },
      args: [selector]
    }) as unknown as [{ result: { ok: boolean; error?: string; visible?: boolean } }]
    if (res?.result?.ok) return { id: cmd.id, ok: true, data: { visible: !!res.result.visible } }
    return { id: cmd.id, ok: false, error: res?.result?.error || "Visible check failed" }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleScrollTo = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const selector = cmd.selector || ""
  try {
    if (selector) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel: string) => {
          const el = document.querySelector(sel) as HTMLElement | null
          if (el) el.scrollIntoView()
        },
        args: [selector]
      })
    }
    return { id: cmd.id, ok: true }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleScrollBy = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const deltaY = Number.isFinite(cmd.deltaY) ? Number(cmd.deltaY) : 0
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (dy: number) => {
        window.scrollBy(0, dy)
      },
      args: [deltaY]
    })
    return { id: cmd.id, ok: true }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const ensureDebuggerAttached = async (tabId: number) => {
  if (attachedDebugTargets.has(tabId)) return
  await chrome.debugger.attach({ tabId }, "1.3")
  attachedDebugTargets.add(tabId)
}

const handleCdp = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  resetIdleTimer(workspace)
  const tabId = await resolveTab(workspace, cmd.tabId)
  const method = cmd.cdpMethod || ""
  const params = cmd.cdpParams || {}
  try {
    if (!(chrome as any).debugger) {
      return { id: cmd.id, ok: false, error: "debugger permission is required for CDP" }
    }
    if (method.toLowerCase() === "detach" || method === "Debugger.detach") {
      if (attachedDebugTargets.has(tabId)) {
        try { await chrome.debugger.detach({ tabId }) } catch {}
        attachedDebugTargets.delete(tabId)
      }
      return { id: cmd.id, ok: true, data: { detached: true } }
    }
    await ensureDebuggerAttached(tabId)
    const res = await chrome.debugger.sendCommand({ tabId }, method, params as any)
    return { id: cmd.id, ok: true, data: res }
  } catch (e) {
    return { id: cmd.id, ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

const handleBindCurrent = async (cmd: Command): Promise<Result> => {
  const workspace = getWorkspaceKey(cmd.workspace)
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!active?.id || !active.windowId) return { id: cmd.id, ok: false, error: "No active tab" }
  const url = active.url || ""
  const isHttp = url.startsWith("http://") || url.startsWith("https://")
  if (!isHttp) return { id: cmd.id, ok: false, error: "Active tab is not http(s)" }
  if (cmd.matchDomain) {
    try {
      const host = new URL(url).hostname
      const ok = host === cmd.matchDomain || host.endsWith(`.${cmd.matchDomain}`)
      if (!ok) return { id: cmd.id, ok: false, error: "Domain not matched" }
    } catch {
      return { id: cmd.id, ok: false, error: "Invalid URL" }
    }
  }
  if (cmd.matchPathPrefix) {
    try {
      const path = new URL(url).pathname
      if (!path.startsWith(cmd.matchPathPrefix)) {
        return { id: cmd.id, ok: false, error: "Path not matched" }
      }
    } catch {
      return { id: cmd.id, ok: false, error: "Invalid URL" }
    }
  }
  const existing = sessions.get(workspace)
  if (existing?.idleTimer) clearTimeout(existing.idleTimer)
  sessions.set(workspace, {
    windowId: active.windowId,
    preferredTabId: active.id,
    idleTimer: null,
    owned: false
  })
  resetIdleTimer(workspace)
  return { id: cmd.id, ok: true, data: { windowId: active.windowId, tabId: active.id, owned: false } }
}

const handleSessionsList = async (cmd: Command): Promise<Result> => {
  const data = Array.from(sessions.entries()).map(([key, s]) => ({
    workspace: key,
    windowId: s.windowId,
    tabId: s.preferredTabId,
    owned: s.owned
  }))
  return { id: cmd.id, ok: true, data }
}

const handleCommand = async (cmd: Command): Promise<Result> => {
  try {
    switch (cmd.action) {
      case "exec":
        return await handleExec(cmd)
      case "navigate":
        return await handleNavigate(cmd)
      case "tabs":
        return await handleTabs(cmd)
      case "screenshot":
        return await handleScreenshot(cmd)
      case "set-file-input":
        return await handleSetFileInput(cmd)
      case "cookies":
        return await handleCookies(cmd)
      case "network-capture-start":
        return await handleNetworkCaptureStart(cmd)
      case "network-capture-read":
        return await handleNetworkCaptureRead(cmd)
      case "network-capture-stop":
        return await handleNetworkCaptureStop(cmd)
      case "network-capture-clear":
        return await handleNetworkCaptureClear(cmd)
      case "insert-text":
        return await handleInsertText(cmd)
      case "dom-wait":
        return await handleDomWait(cmd)
      case "dom-click":
        return await handleDomClick(cmd)
      case "dom-type":
        return await handleDomType(cmd)
      case "dom-set-value":
        return await handleDomSetValue(cmd)
      case "dom-get-text":
        return await handleDomGetText(cmd)
      case "dom-get-attr":
        return await handleDomGetAttr(cmd)
      case "dom-is-visible":
        return await handleDomIsVisible(cmd)
      case "scroll-to":
        return await handleScrollTo(cmd)
      case "scroll-by":
        return await handleScrollBy(cmd)
      case "cdp":
        return await handleCdp(cmd)
      case "bind-current":
        return await handleBindCurrent(cmd)
      case "sessions":
        return await handleSessionsList(cmd)
      case "close-window":
        return await handleCloseWindow(cmd)
      default:
        return await handleUnsupported(cmd, cmd.action)
    }
  } catch (e) {
    return {
      id: cmd.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }
  }
}

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_EAGER_ATTEMPTS = 6
const WS_RECONNECT_BASE_DELAY = 2000
const WS_RECONNECT_MAX_DELAY = 5000

const scheduleReconnect = () => {
  if (reconnectTimer) return
  reconnectAttempts++
  if (reconnectAttempts > MAX_EAGER_ATTEMPTS) return
  const delay = Math.min(WS_RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts - 1), WS_RECONNECT_MAX_DELAY)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connect()
  }, delay)
}

const connect = async () => {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return
  try {
    const ctrl = AbortSignal.timeout(1000)
    const res = await fetch(DAEMON_PING_URL, { signal: ctrl })
    if (!res.ok) return
  } catch {
    return
  }
  try {
    ws = new WebSocket(DAEMON_WS_URL)
  } catch {
    scheduleReconnect()
    return
  }
  ws.onopen = () => {
    reconnectAttempts = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    try {
      ws?.send(JSON.stringify({ type: "hello", version: "page-assist-bridge" }))
    } catch {}
  }
  ws.onmessage = async (event) => {
    try {
      const cmd = JSON.parse(String(event.data)) as Command
      const res = await handleCommand(cmd)
      ws?.send(JSON.stringify(res))
    } catch {}
  }
  ws.onclose = () => {
    ws = null
    scheduleReconnect()
  }
  ws.onerror = () => {
    ws?.close()
  }
}

let initialized = false
export const initOpencliBridge = async () => {
  if (initialized) return
  initialized = true
  chrome.alarms.create("opencli_bridge_keepalive", { periodInMinutes: 0.4 })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "opencli_bridge_keepalive") void connect()
  })
  await connect()
}

export const execLocalOpencliCommand = async (cmd: Command): Promise<Result> => {
  return await handleCommand(cmd)
}
