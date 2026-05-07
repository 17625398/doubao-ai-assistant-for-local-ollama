// Pyodide 类型声明文件
// 用于浏览器端 Python 执行

declare module 'pyodide' {
  export interface PyodideInstance {
    runPythonAsync: (code: string) => Promise<any>
    loadPackage: (packages: string[]) => Promise<void>
    setStdout: (callback: (text: string) => void) => void
    setStderr: (callback: (text: string) => void) => void
    globals: any
  }

  export function loadPyodide(options: { indexURL: string }): Promise<PyodideInstance>
}

// 全局类型声明
declare global {
  interface Window {
    pyodide?: any
  }
}

export {}
