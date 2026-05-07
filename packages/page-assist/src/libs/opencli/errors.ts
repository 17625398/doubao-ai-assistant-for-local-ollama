export class OpenCLIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'OpenCLIError';
  }
}

export class OpenCLIDaemonError extends OpenCLIError {
  constructor(message: string) {
    super(message, 'DAEMON_ERROR');
    this.name = 'OpenCLIDaemonError';
  }
}

export class OpenCLIExtensionError extends OpenCLIError {
  constructor(message: string) {
    super(message, 'EXTENSION_ERROR');
    this.name = 'OpenCLIExtensionError';
  }
}

export class OpenCLINetworkError extends OpenCLIError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'OpenCLINetworkError';
  }
}

export class OpenCLITimeoutError extends OpenCLIError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'OpenCLITimeoutError';
  }
}

export class OpenCLIActionError extends OpenCLIError {
  constructor(message: string, public action: string) {
    super(message, 'ACTION_ERROR');
    this.name = 'OpenCLIActionError';
  }
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof OpenCLINetworkError) return true;
  if (error instanceof OpenCLITimeoutError) return true;
  
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('AbortError')
  );
}

export function isDaemonError(error: unknown): boolean {
  if (error instanceof OpenCLIDaemonError) return true;
  
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('daemon') ||
    message.includes('port') ||
    message.includes('server')
  );
}

export function isExtensionError(error: unknown): boolean {
  if (error instanceof OpenCLIExtensionError) return true;
  
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('extension') ||
    message.includes('browser') ||
    message.includes('Chrome') ||
    message.includes('Chromium')
  );
}

export function parseOpenCLIError(error: unknown): OpenCLIError {
  if (error instanceof OpenCLIError) return error;
  
  const message = error instanceof Error ? error.message : String(error);
  
  if (isDaemonError(error)) {
    return new OpenCLIDaemonError(message);
  }
  
  if (isExtensionError(error)) {
    return new OpenCLIExtensionError(message);
  }
  
  if (message.includes('timeout') || message.includes('AbortError')) {
    return new OpenCLITimeoutError(message);
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return new OpenCLINetworkError(message);
  }
  
  return new OpenCLIError(message);
}

export function formatOpenCLIError(error: unknown): string {
  const parsedError = parseOpenCLIError(error);
  
  switch (parsedError.code) {
    case 'DAEMON_ERROR':
      return `OpenCLI Daemon Error: ${parsedError.message}\nPlease ensure the OpenCLI daemon is running.`;
    case 'EXTENSION_ERROR':
      return `OpenCLI Extension Error: ${parsedError.message}\nPlease ensure the OpenCLI browser extension is installed and enabled.`;
    case 'NETWORK_ERROR':
      return `OpenCLI Network Error: ${parsedError.message}\nPlease check your network connection.`;
    case 'TIMEOUT_ERROR':
      return `OpenCLI Timeout Error: ${parsedError.message}\nThe operation took too long to complete.`;
    case 'ACTION_ERROR':
      return `OpenCLI Action Error (${(parsedError as OpenCLIActionError).action}): ${parsedError.message}`;
    default:
      return `OpenCLI Error: ${parsedError.message}`;
  }
}
