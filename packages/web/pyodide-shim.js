// Pyodide shim for browser environment
// This shim provides mock implementations for Node.js modules

const mockFn = (...args) => {
  console.warn('Node.js module called in browser environment', args);
  return null;
};

const mockStream = {
  on: mockFn,
  pipe: mockFn,
  write: mockFn,
  end: mockFn,
  destroy: mockFn,
};

const mockChildProcess = {
  spawn: mockFn,
  exec: mockFn,
  execSync: mockFn,
  fork: mockFn,
  spawnSync: mockFn,
};

const mockFs = {
  readFileSync: mockFn,
  writeFileSync: mockFn,
  existsSync: () => false,
  readFile: mockFn,
  writeFile: mockFn,
  mkdirSync: mockFn,
  readdirSync: () => [],
  statSync: () => ({ isDirectory: () => false }),
};

// Export as both default and named exports
export default mockFn;
export const fs = mockFs;
export const child_process = mockChildProcess;
export const path = { join: (...args) => args.join('/'), resolve: (...args) => args[args.length - 1] };
export const os = { platform: () => 'browser', homedir: () => '/' };
export const util = { promisify: (fn) => fn };
export const stream = { Readable: mockStream, Writable: mockStream, PassThrough: mockStream };
export const http = mockFn;
export const https = mockFn;
export const net = mockFn;
export const tls = mockFn;
export const zlib = mockFn;
export const async_hooks = { createHook: mockFn, executionAsyncId: () => 0 };
export const url = { URL: globalThis.URL };
export const buffer = { Buffer: globalThis.Buffer || ArrayBuffer };
export const process = globalThis.process || { env: {}, cwd: () => '/', platform: () => 'browser' };
export const spawn = mockFn;
export const createWriteStream = mockFn;
export const Readable = mockStream;
export const Writable = mockStream;
