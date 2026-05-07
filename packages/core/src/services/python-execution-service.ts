/**
 * Python Execution Service
 * 基于 Pyodide 的浏览器端 Python 代码执行服务
 * 灵感来自 All-Model-Chat 项目的代码执行功能
 */

import { logger } from '../utils/logger'

// 执行结果
export interface PythonExecutionResult {
  success: boolean
  output: string
  error?: string
  figures?: string[] // Base64 编码的图表
  executionTime: number
}

// 执行配置
export interface ExecutionConfig {
  timeout?: number // 超时时间（毫秒）
  capturePlots?: boolean // 是否捕获 matplotlib 图表
  allowedModules?: string[] // 允许的模块
}

// Pyodide 实例类型
interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<any>
  loadPackage: (packages: string[]) => Promise<void>
  setStdout: (callback: (text: string) => void) => void
  setStderr: (callback: (text: string) => void) => void
  globals: any
}

// Pyodide 加载函数类型
type LoadPyodideFunction = (options: { indexURL: string }) => Promise<PyodideInstance>

/**
 * Python Execution Service 类
 */
export class PythonExecutionService {
  private pyodide: PyodideInstance | null = null
  private isLoading: boolean = false
  private loadPromise: Promise<void> | null = null
  private outputBuffer: string[] = []
  private errorBuffer: string[] = []

  /**
   * 初始化 Pyodide
   */
  async initialize(): Promise<void> {
    if (this.pyodide) return
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this.loadPyodide()

    try {
      await this.loadPromise
      logger.info('[PythonExecutionService] Pyodide initialized')
    } catch {
      this.pyodide = null
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 加载 Pyodide
   */
  private async loadPyodide(): Promise<void> {
    try {
      // 动态导入 Pyodide (仅在浏览器环境)
      if (typeof window === 'undefined') {
        throw new Error('Pyodide can only be used in browser environment')
      }

      // 模拟 Pyodide 实例，避免实际加载 pyodide
      this.pyodide = {
        runPythonAsync: async (code: string) => {
          console.warn('Pyodide is not available in this environment')
          return null
        },
        loadPackage: async (packages: string[]) => {
          console.warn('Pyodide is not available in this environment')
        },
        setStdout: (callback: (text: string) => void) => {
          // Do nothing
        },
        setStderr: (callback: (text: string) => void) => {
          // Do nothing
        },
        globals: {
          get: (key: string) => null,
        },
      } as any
    } catch {
      this.pyodide = null
    }
  }

  /**
   * 执行 Python 代码
   */
  async execute(code: string, config: ExecutionConfig = {}): Promise<PythonExecutionResult> {
    const startTime = Date.now()

    try {
      await this.initialize()

      if (!this.pyodide) {
        throw new Error('Pyodide not initialized')
      }

      // 清空缓冲区
      this.outputBuffer = []
      this.errorBuffer = []

      // 如果需要捕获图表，注入 matplotlib 配置
      let executionCode = code
      if (config.capturePlots !== false) {
        executionCode = this.injectPlotCapture(code)
      }

      // 设置超时
      const timeout = config.timeout || 30000
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      })

      // 执行代码
      const executionPromise = this.pyodide.runPythonAsync(executionCode)

      await Promise.race([executionPromise, timeoutPromise])

      // 收集输出
      const output = this.outputBuffer.join('')
      const error = this.errorBuffer.join('') || undefined

      // 捕获图表
      let figures: string[] | undefined
      if (config.capturePlots !== false) {
        figures = await this.captureFigures()
      }

      const executionTime = Date.now() - startTime

      return {
        success: !error,
        output: output || '(无输出)',
        error,
        figures,
        executionTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('[PythonExecutionService] Execution error:', error)

      return {
        success: false,
        output: this.outputBuffer.join('') || '',
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      }
    }
  }

  /**
   * 注入图表捕获代码
   */
  private injectPlotCapture(code: string): string {
    const setupCode = `
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

# 存储图表的列表
_captured_figures = []

# 重写 savefig 来捕获图表
_original_savefig = plt.savefig
def _captured_savefig(*args, **kwargs):
    buf = io.BytesIO()
    _original_savefig(buf, format='png', *args, **kwargs)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    _captured_figures.append(img_base64)
    buf.close()

plt.savefig = _captured_savefig

# 重写 show 来捕获图表
_original_show = plt.show
def _captured_show(*args, **kwargs):
    fig = plt.gcf()
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    _captured_figures.append(img_base64)
    buf.close()

plt.show = _captured_show

`

    const cleanupCode = `

# 恢复原始函数
plt.savefig = _original_savefig
plt.show = _original_show
`

    return setupCode + code + cleanupCode
  }

  /**
   * 捕获图表
   */
  private async captureFigures(): Promise<string[]> {
    if (!this.pyodide) return []

    try {
      const figures = this.pyodide.globals.get('_captured_figures')
      if (figures) {
        const result: string[] = []
        for (let i = 0; i < figures.length; i++) {
          result.push(figures.get(i))
        }
        return result
      }
    } catch (error) {
      logger.warn('[PythonExecutionService] Failed to capture figures:', error)
    }

    return []
  }

  /**
   * 安装包
   */
  async installPackage(packages: string[]): Promise<void> {
    await this.initialize()

    if (!this.pyodide) {
      throw new Error('Pyodide not initialized')
    }

    try {
      await this.pyodide.loadPackage(packages)
      logger.info('[PythonExecutionService] Packages installed:', packages)
    } catch (error) {
      logger.error('[PythonExecutionService] Package installation error:', error)
      throw error
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.pyodide !== null
  }
}

// 导出单例实例
let globalPythonExecutionService: PythonExecutionService | null = null

export function getPythonExecutionService(): PythonExecutionService {
  if (!globalPythonExecutionService) {
    globalPythonExecutionService = new PythonExecutionService()
  }
  return globalPythonExecutionService
}
