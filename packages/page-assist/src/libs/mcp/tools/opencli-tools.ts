import { DynamicStructuredTool } from "@langchain/core/tools"
import { z } from "zod"
import { browser } from "wxt/browser"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({ area: "local" })

export const isOpencliBridgeEnabled = async (): Promise<boolean> => {
  const enabled = await storage.get("opencliBridgeEnabled")
  return !!enabled
}

const callBridge = async (command: any): Promise<any> => {
  const res = await browser.runtime.sendMessage({
    type: "opencli_bridge_exec",
    command
  })
  return res as any
}

export const createOpencliTools = (): DynamicStructuredTool[] => {
  const tools: DynamicStructuredTool[] = []

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_navigate",
      description: "Open a dedicated automation window and navigate to a URL (http/https). Returns windowId and tabId.",
      schema: z.object({
        url: z.string().url().describe("Target URL to navigate to (http/https)"),
        workspace: z.string().optional().describe("Logical workspace id for session reuse")
      }),
      responseFormat: "content_and_artifact",
      func: async ({ url, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "navigate", url, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_navigate failed")
        }
        return {
          structuredContent: { action: "navigate", url, data: result.data },
          _meta: { tool: "opencli_navigate" },
          content: [{ type: "text", text: `Navigated to ${url}` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_tabs",
      description: "List/create/select/close tabs in the automation window.",
      schema: z.object({
        op: z.enum(["list", "new", "select", "close"]).describe("Operation"),
        index: z.number().int().optional().describe("Tab index for select"),
        tabId: z.number().int().optional().describe("Target tab id for close"),
        urlForNew: z.string().url().optional().describe("Initial URL for new tab"),
        workspace: z.string().optional().describe("Workspace id")
      }),
      responseFormat: "content_and_artifact",
      func: async ({ op, index, tabId, urlForNew, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "tabs", op, index, tabId, urlForNew, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_tabs failed")
        }
        return {
          structuredContent: { action: "tabs", op, data: result.data },
          _meta: { tool: "opencli_tabs" },
          content: [{ type: "text", text: `Tabs ${op} executed` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_screenshot",
      description: "Capture a viewport screenshot from the automation window. Returns base64 image data.",
      schema: z.object({
        format: z.enum(["png", "jpeg"]).optional().describe("Image format"),
        quality: z.number().int().min(0).max(100).optional().describe("JPEG quality"),
        fullPage: z.boolean().optional().describe("Capture full page by scrolling and slicing"),
        workspace: z.string().optional().describe("Workspace id")
      }),
      responseFormat: "content_and_artifact",
      func: async ({ format, quality, fullPage, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "screenshot", format, quality, fullPage, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_screenshot failed")
        }
        const mime = (format === "jpeg" ? "image/jpeg" : "image/png")
        if (fullPage && result?.data?.chunks) {
          return {
            structuredContent: { action: "screenshot_full", mimeType: mime, chunks: result.data.chunks, meta: { width: result.data.width, viewportHeight: result.data.viewportHeight, totalHeight: result.data.totalHeight } },
            _meta: { tool: "opencli_screenshot" },
            content: [{ type: "text", text: `Captured full page in ${result.data.chunks.length} slices` }]
          } as any
        }
        return {
          structuredContent: { action: "screenshot", mimeType: mime, base64: result.data },
          _meta: { tool: "opencli_screenshot" },
          content: [{ type: "image", mimeType: mime }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_exec",
      description: "Execute JavaScript in the active tab of the automation window. Use with caution.",
      schema: z.object({
        code: z.string().min(1).describe("JavaScript code to execute in page context"),
        workspace: z.string().optional().describe("Workspace id")
      }),
      responseFormat: "content_and_artifact",
      func: async ({ code, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "exec", code, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_exec failed")
        }
        return {
          structuredContent: { action: "exec", result: result.data },
          _meta: { tool: "opencli_exec" },
          content: [{ type: "text", text: "Execution completed" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_bind_current",
      description: "Bind the automation workspace to the user's current active http(s) tab (non-invasive). Optional domain/path constraints.",
      schema: z.object({
        workspace: z.string().optional(),
        matchDomain: z.string().optional(),
        matchPathPrefix: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace, matchDomain, matchPathPrefix }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "bind-current", workspace, matchDomain, matchPathPrefix })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_bind_current failed")
        }
        return {
          structuredContent: { action: "bind-current", data: result.data },
          _meta: { tool: "opencli_bind_current" },
          content: [{ type: "text", text: "Bound to current tab" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_sessions",
      description: "List current automation sessions in the bridge.",
      schema: z.object({}),
      responseFormat: "content_and_artifact",
      func: async () => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "sessions" })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_sessions failed")
        }
        return {
          structuredContent: { action: "sessions", data: result.data },
          _meta: { tool: "opencli_sessions" },
          content: [{ type: "text", text: "Sessions listed" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_wait_for_selector",
      description: "Wait for a CSS selector to appear in the page.",
      schema: z.object({
        selector: z.string(),
        timeoutMs: z.number().int().min(0).optional(),
        visible: z.boolean().optional(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, timeoutMs, visible, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-wait", selector, timeoutMs, visible, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_wait_for_selector failed")
        }
        return {
          structuredContent: { action: "dom-wait", rect: result.data?.rect },
          _meta: { tool: "opencli_wait_for_selector" },
          content: [{ type: "text", text: "Selector appeared" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_click",
      description: "Click an element by CSS selector.",
      schema: z.object({
        selector: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-click", selector, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_click failed")
        }
        return {
          structuredContent: { action: "dom-click", ok: true },
          _meta: { tool: "opencli_click" },
          content: [{ type: "text", text: "Clicked" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_type",
      description: "Type text into an input/textarea/contentEditable by selector.",
      schema: z.object({
        selector: z.string(),
        text: z.string(),
        append: z.boolean().optional(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, text, append, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-type", selector, text, append, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_type failed")
        }
        return {
          structuredContent: { action: "dom-type", ok: true },
          _meta: { tool: "opencli_type" },
          content: [{ type: "text", text: "Typed" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_set_value",
      description: "Set exact value for an input/textarea by selector.",
      schema: z.object({
        selector: z.string(),
        value: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, value, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-set-value", selector, text: value, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_set_value failed")
        }
        return {
          structuredContent: { action: "dom-set-value", ok: true },
          _meta: { tool: "opencli_set_value" },
          content: [{ type: "text", text: "Value set" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_get_text",
      description: "Get textContent of an element by selector.",
      schema: z.object({
        selector: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-get-text", selector, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_get_text failed")
        }
        return {
          structuredContent: { action: "dom-get-text", text: result.data },
          _meta: { tool: "opencli_get_text" },
          content: [{ type: "text", text: String(result.data ?? "") }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_get_attr",
      description: "Get attribute value from an element by selector.",
      schema: z.object({
        selector: z.string(),
        name: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, name, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-get-attr", selector, attrName: name, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_get_attr failed")
        }
        return {
          structuredContent: { action: "dom-get-attr", name, value: result.data },
          _meta: { tool: "opencli_get_attr" },
          content: [{ type: "text", text: String(result.data ?? "") }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_is_visible",
      description: "Check whether an element is visible.",
      schema: z.object({
        selector: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "dom-is-visible", selector, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_is_visible failed")
        }
        return {
          structuredContent: { action: "dom-is-visible", visible: !!result.data?.visible },
          _meta: { tool: "opencli_is_visible" },
          content: [{ type: "text", text: (!!result.data?.visible).toString() }]
        } as any
      }
    })
  )
  tools.push(
    new DynamicStructuredTool({
      name: "opencli_scroll_to_selector",
      description: "Scroll element into view by selector.",
      schema: z.object({
        selector: z.string(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "scroll-to", selector, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_scroll_to_selector failed")
        }
        return {
          structuredContent: { action: "scroll-to", ok: true },
          _meta: { tool: "opencli_scroll_to_selector" },
          content: [{ type: "text", text: "Scrolled to selector" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_scroll_by",
      description: "Scroll vertically by deltaY pixels.",
      schema: z.object({
        deltaY: z.number(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ deltaY, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "scroll-by", deltaY, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_scroll_by failed")
        }
        return {
          structuredContent: { action: "scroll-by", ok: true },
          _meta: { tool: "opencli_scroll_by" },
          content: [{ type: "text", text: "Scrolled" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cdp",
      description: "Send a raw Chrome DevTools Protocol command to the current automation tab. Requires 'debugger' permission.",
      schema: z.object({
        method: z.string(),
        params: z.record(z.any()).optional(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ method, params, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cdp", cdpMethod: method, cdpParams: params, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cdp failed")
        }
        return {
          structuredContent: { action: "cdp", method, result: result.data },
          _meta: { tool: "opencli_cdp" },
          content: [{ type: "text", text: `CDP ${method} ok` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cdp_detach",
      description: "Detach DevTools Protocol from the current automation tab (if attached).",
      schema: z.object({
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cdp", cdpMethod: "detach", workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cdp_detach failed")
        }
        return {
          structuredContent: { action: "cdp_detach", ok: true },
          _meta: { tool: "opencli_cdp_detach" },
          content: [{ type: "text", text: "CDP detached" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_set_file_input",
      description: "Set files on an <input type=file> via JS injection using base64 payloads.",
      schema: z.object({
        selector: z.string().optional().describe("CSS selector; defaults to input[type=file]"),
        files: z.array(z.object({
          name: z.string(),
          base64: z.string(),
          type: z.string().optional()
        })).min(1),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, files, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "set-file-input", selector, filesPayload: files, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_set_file_input failed")
        }
        return {
          structuredContent: { action: "set-file-input", count: result.data?.files ?? files.length },
          _meta: { tool: "opencli_set_file_input" },
          content: [{ type: "text", text: `Files set: ${result.data?.files ?? files.length}` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_set_file_input_cdp",
      description: "Set files on an <input type=file> using CDP (local file paths). Requires debugger permission.",
      schema: z.object({
        selector: z.string().default('input[type=\"file\"]'),
        files: z.array(z.string()).min(1),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ selector, files, workspace }) => {
        const id1 = crypto.randomUUID()
        const docRes = await callBridge({ id: id1, action: "cdp", cdpMethod: "DOM.getDocument", cdpParams: { depth: -1 }, workspace })
        if (!docRes?.ok) throw new Error(docRes?.error || "DOM.getDocument failed")
        const root = docRes.data?.root?.nodeId ?? docRes.data?.nodeId ?? docRes.data?.rootId
        if (!root) throw new Error("No document root id")
        const id2 = crypto.randomUUID()
        const qRes = await callBridge({ id: id2, action: "cdp", cdpMethod: "DOM.querySelector", cdpParams: { nodeId: root, selector }, workspace })
        if (!qRes?.ok) throw new Error(qRes?.error || "DOM.querySelector failed")
        const nodeId = qRes.data?.nodeId
        if (!nodeId) throw new Error("Selector not found")
        const id3 = crypto.randomUUID()
        const setRes = await callBridge({ id: id3, action: "cdp", cdpMethod: "DOM.setFileInputFiles", cdpParams: { files, nodeId }, workspace })
        if (!setRes?.ok) throw new Error(setRes?.error || "DOM.setFileInputFiles failed")
        return {
          structuredContent: { action: "set-file-input-cdp", selector, files },
          _meta: { tool: "opencli_set_file_input_cdp" },
          content: [{ type: "text", text: `CDP set ${files.length} file(s)` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_list",
      description: "List cookies, optionally filtered by domain.",
      schema: z.object({
        domain: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ domain }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cookies", cookieOp: "list", domain })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_list failed")
        }
        return {
          structuredContent: { action: "cookies_list", cookies: result.data },
          _meta: { tool: "opencli_cookies_list" },
          content: [{ type: "text", text: `Listed ${Array.isArray(result.data) ? result.data.length : 0} cookies` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_export",
      description: "Export cookies (domain optional) into an import-ready array with URL synthesized.",
      schema: z.object({
        domain: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ domain }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cookies", cookieOp: "export", domain })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_export failed")
        }
        return {
          structuredContent: { action: "cookies_export", cookies: result.data },
          _meta: { tool: "opencli_cookies_export" },
          content: [{ type: "text", text: `Exported ${Array.isArray(result.data) ? result.data.length : 0} cookies` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_get",
      description: "Get a cookie by url and name.",
      schema: z.object({
        url: z.string().url(),
        name: z.string()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ url, name }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cookies", cookieOp: "get", cookieUrl: url, cookieName: name })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_get failed")
        }
        return {
          structuredContent: { action: "cookies_get", cookie: result.data },
          _meta: { tool: "opencli_cookies_get" },
          content: [{ type: "text", text: result.data ? "Cookie found" : "Cookie not found" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_set",
      description: "Set a cookie for a given URL.",
      schema: z.object({
        url: z.string().url(),
        name: z.string(),
        value: z.string().default(""),
        path: z.string().optional(),
        secure: z.boolean().optional(),
        sameSite: z.enum(["no_restriction", "lax", "strict", "unspecified"]).optional(),
        expirationDate: z.number().int().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ url, name, value, path, secure, sameSite, expirationDate }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({
          id,
          action: "cookies",
          cookieOp: "set",
          cookieUrl: url,
          cookieName: name,
          cookieValue: value,
          cookiePath: path,
          secure,
          sameSite,
          expirationDate
        })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_set failed")
        }
        return {
          structuredContent: { action: "cookies_set", cookie: result.data },
          _meta: { tool: "opencli_cookies_set" },
          content: [{ type: "text", text: "Cookie set" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_import",
      description: "Import cookies from an array (with URL). Each item: {url,name,value,path?,secure?,sameSite?,expirationDate?}.",
      schema: z.object({
        cookies: z.array(z.object({
          url: z.string().url(),
          name: z.string(),
          value: z.string(),
          path: z.string().optional(),
          secure: z.boolean().optional(),
          sameSite: z.enum(["no_restriction", "lax", "strict", "unspecified"]).optional(),
          expirationDate: z.number().int().optional()
        })).min(1)
      }),
      responseFormat: "content_and_artifact",
      func: async ({ cookies }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({
          id,
          action: "cookies",
          cookieOp: "import",
          cookieBulk: cookies
        })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_import failed")
        }
        return {
          structuredContent: { action: "cookies_import", result: result.data },
          _meta: { tool: "opencli_cookies_import" },
          content: [{ type: "text", text: `Imported ${result.data?.total ?? cookies.length} cookies` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_cookies_remove",
      description: "Remove a cookie for a given URL by name.",
      schema: z.object({
        url: z.string().url(),
        name: z.string()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ url, name }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "cookies", cookieOp: "remove", cookieUrl: url, cookieName: name })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_cookies_remove failed")
        }
        return {
          structuredContent: { action: "cookies_remove", result: result.data },
          _meta: { tool: "opencli_cookies_remove" },
          content: [{ type: "text", text: "Cookie removed" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_network_capture_start",
      description: "Start lightweight fetch/XMLHttpRequest capture in the page. Optional 'pattern' to filter URLs (use | to separate).",
      schema: z.object({
        pattern: z.string().optional(),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ pattern, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "network-capture-start", pattern, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_network_capture_start failed")
        }
        return {
          structuredContent: { action: "network-capture-start", ok: true },
          _meta: { tool: "opencli_network_capture_start" },
          content: [{ type: "text", text: "Network capture started" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_network_capture_read",
      description: "Read captured network entries from the page.",
      schema: z.object({
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "network-capture-read", workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_network_capture_read failed")
        }
        return {
          structuredContent: { action: "network-capture-read", data: result.data },
          _meta: { tool: "opencli_network_capture_read" },
          content: [{ type: "text", text: "Network capture read" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_network_capture_stop",
      description: "Stop network capture and restore original fetch/XMLHttpRequest.",
      schema: z.object({
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "network-capture-stop", workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_network_capture_stop failed")
        }
        return {
          structuredContent: { action: "network-capture-stop", ok: true },
          _meta: { tool: "opencli_network_capture_stop" },
          content: [{ type: "text", text: "Network capture stopped" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_network_capture_clear",
      description: "Clear captured network entries.",
      schema: z.object({
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "network-capture-clear", workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_network_capture_clear failed")
        }
        return {
          structuredContent: { action: "network-capture-clear", ok: true },
          _meta: { tool: "opencli_network_capture_clear" },
          content: [{ type: "text", text: "Network capture cleared" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_insert_text",
      description: "Insert text into the current focused input/textarea or contentEditable element.",
      schema: z.object({
        text: z.string().min(1),
        workspace: z.string().optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ text, workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "insert-text", text, workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_insert_text failed")
        }
        return {
          structuredContent: { action: "insert-text", ok: true },
          _meta: { tool: "opencli_insert_text" },
          content: [{ type: "text", text: "Text inserted" }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_stitch_slices",
      description: "Stitch screenshot slices (base64 PNG/JPEG) into a single image and return base64.",
      schema: z.object({
        chunks: z.array(z.string()).min(1).describe("Array of base64 image slices without data URL prefix"),
        width: z.number().int().positive(),
        viewportHeight: z.number().int().positive(),
        totalHeight: z.number().int().positive(),
        format: z.enum(["png", "jpeg"]).default("png"),
        quality: z.number().int().min(0).max(1).optional()
      }),
      responseFormat: "content_and_artifact",
      func: async ({ chunks, width, viewportHeight, totalHeight, format, quality }) => {
        const images: HTMLImageElement[] = []
        for (const b64 of chunks) {
          const img = new Image()
          img.src = `data:image/${format};base64,${b64}`
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error("slice load failed"))
          })
          images.push(img)
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = totalHeight
        const ctx = canvas.getContext("2d")!
        let y = 0
        for (let i = 0; i < images.length; i++) {
          const slice = images[i]
          const drawH = Math.min(viewportHeight, totalHeight - y)
          ctx.drawImage(slice, 0, 0, width, drawH, 0, y, width, drawH)
          y += drawH
          if (y >= totalHeight) break
        }
        const dataUrl = canvas.toDataURL(`image/${format}`, format === "jpeg" ? (quality ?? 0.92) : undefined)
        const base64 = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "")
        return {
          structuredContent: { action: "stitch", base64, mimeType: `image/${format}` },
          _meta: { tool: "opencli_stitch_slices" },
          content: [{ type: "image", mimeType: `image/${format}` }]
        } as any
      }
    })
  )

  tools.push(
    new DynamicStructuredTool({
      name: "opencli_close_window",
      description: "Close the automation window for a workspace and cleanup the session.",
      schema: z.object({
        workspace: z.string().optional().describe("Workspace id")
      }),
      responseFormat: "content_and_artifact",
      func: async ({ workspace }) => {
        const id = crypto.randomUUID()
        const result = await callBridge({ id, action: "close-window", workspace })
        if (!result?.ok) {
          throw new Error(result?.error || "opencli_close_window failed")
        }
        return {
          structuredContent: { action: "close-window", data: result.data },
          _meta: { tool: "opencli_close_window" },
          content: [{ type: "text", text: "Automation window closed" }]
        } as any
      }
    })
  )

  return tools
}
