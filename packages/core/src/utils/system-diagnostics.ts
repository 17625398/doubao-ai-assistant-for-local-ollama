// 系统诊断模块

import { logger } from './logger';
import { eventBus } from './event-bus';

const safeRequire = (id: string) => {
  try {
    // eslint-disable-next-line no-eval
    const req = (0, eval)('require');
    return typeof req === 'function' ? req(id) : null;
  } catch {
    return null;
  }
};

/**
 * 系统诊断事件
 */
export interface SystemDiagnosticsEvents {
  'system:diagnostics:status-updated': SystemStatus;
  'system:diagnostics:error-detected': SystemError;
  'system:diagnostics:health-check': SystemHealthCheckResult;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  timestamp: number;
  cpu: CPUStatus;
  memory: MemoryStatus;
  disk: DiskStatus;
  network: NetworkStatus;
  services: ServiceStatus[];
  overall: 'healthy' | 'warning' | 'critical';
}

/**
 * CPU 状态
 */
export interface CPUStatus {
  usage: number; // 使用率百分比
  cores: number;
  model: string;
}

/**
 * 内存状态
 */
export interface MemoryStatus {
  total: number; // 总内存（字节）
  used: number; // 已使用内存（字节）
  free: number; // 可用内存（字节）
  usage: number; // 使用率百分比
}

/**
 * 磁盘状态
 */
export interface DiskStatus {
  total: number; // 总磁盘空间（字节）
  used: number; // 已使用磁盘空间（字节）
  free: number; // 可用磁盘空间（字节）
  usage: number; // 使用率百分比
}

/**
 * 网络状态
 */
export interface NetworkStatus {
  isOnline: boolean;
  latency: number; // 网络延迟（毫秒）
  downloadSpeed: number; // 下载速度（字节/秒）
  uploadSpeed: number; // 上传速度（字节/秒）
}

/**
 * 服务状态
 */
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  message?: string;
  lastChecked: number;
}

/**
 * 系统错误
 */
export interface SystemError {
  timestamp: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: any;
}

/**
 * 系统健康检查结果
 */
export interface SystemHealthCheckResult {
  timestamp: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: SystemIssue[];
  recommendations: string[];
}

/**
 * 系统问题
 */
export interface SystemIssue {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  solution?: string;
}

/**
 * 系统诊断服务
 */
export class SystemDiagnosticsService {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 60000; // 默认 60 秒检查一次

  constructor() {
    logger.info('SystemDiagnosticsService initialized');
  }

  /**
   * 启动系统诊断
   */
  start(interval: number = 60000): void {
    this.checkInterval = interval;
    this.performDiagnostics();
    this.intervalId = setInterval(() => this.performDiagnostics(), this.checkInterval);
    logger.info(`System diagnostics started with interval: ${interval}ms`);
  }

  /**
   * 停止系统诊断
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('System diagnostics stopped');
    }
  }

  /**
   * 执行系统诊断
   */
  async performDiagnostics(): Promise<SystemStatus> {
    try {
      const status = await this.collectSystemStatus();
      eventBus.emit('system:diagnostics:status-updated', status);
      return status;
    } catch (error) {
      const systemError: SystemError = {
        timestamp: Date.now(),
        type: 'diagnostics_error',
        message: 'Failed to perform system diagnostics',
        severity: 'error',
        details: error instanceof Error ? error.message : String(error),
      };
      eventBus.emit('system:diagnostics:error-detected', systemError);
      logger.error('Failed to perform system diagnostics:', error);
      throw error;
    }
  }

  /**
   * 收集系统状态
   */
  private async collectSystemStatus(): Promise<SystemStatus> {
    const timestamp = Date.now();

    // 收集 CPU 状态
    const cpuStatus = await this.collectCPUStatus();

    // 收集内存状态
    const memoryStatus = await this.collectMemoryStatus();

    // 收集磁盘状态
    const diskStatus = await this.collectDiskStatus();

    // 收集网络状态
    const networkStatus = await this.collectNetworkStatus();

    // 收集服务状态
    const servicesStatus = await this.collectServicesStatus();

    // 计算整体状态
    const overall = this.calculateOverallStatus(cpuStatus, memoryStatus, diskStatus, networkStatus, servicesStatus);

    return {
      timestamp,
      cpu: cpuStatus,
      memory: memoryStatus,
      disk: diskStatus,
      network: networkStatus,
      services: servicesStatus,
      overall,
    };
  }

  /**
   * 收集 CPU 状态
   */
  private async collectCPUStatus(): Promise<CPUStatus> {
    try {
      if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
        // 浏览器环境
        return {
          usage: 0, // 浏览器环境无法获取 CPU 使用率
          cores: navigator.hardwareConcurrency,
          model: 'Unknown (Browser)',
        };
      } else if (typeof process !== 'undefined' && process.cpuUsage) {
        // Node.js 环境
        const cpuUsage = process.cpuUsage();
        const totalUsage = cpuUsage.user + cpuUsage.system;
        const usagePercent = (totalUsage / 1000000 / 1) * 100; // 假设 1 秒的采样时间
        return {
          usage: Math.min(100, usagePercent),
          cores: require('os').cpus().length,
          model: require('os').cpus()[0].model,
        };
      }
    } catch (error) {
      logger.warn('Failed to collect CPU status:', error);
    }

    return {
      usage: 0,
      cores: 1,
      model: 'Unknown',
    };
  }

  /**
   * 收集内存状态
   */
  private async collectMemoryStatus(): Promise<MemoryStatus> {
    try {
      if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
        // 浏览器环境
        const total = (navigator as any).deviceMemory * 1024 * 1024 * 1024; // 转换为字节
        return {
          total,
          used: 0, // 浏览器环境无法获取详细内存使用情况
          free: total,
          usage: 0,
        };
      } else if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
        // Node.js 环境
        const os = require('os');
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usage = (used / total) * 100;
        return {
          total,
          used,
          free,
          usage,
        };
      }
    } catch (error) {
      logger.warn('Failed to collect memory status:', error);
    }

    return {
      total: 0,
      used: 0,
      free: 0,
      usage: 0,
    };
  }

  /**
   * 收集磁盘状态
   */
  private async collectDiskStatus(): Promise<DiskStatus> {
    try {
      if (typeof process !== 'undefined') {
        // Node.js 环境
        const fs = safeRequire('fs');
        if (!fs) throw new Error('fs not available');
        const stats = fs.statSync('.');
        const total = 100 * 1024 * 1024 * 1024; // 假设 100GB
        const used = stats.size;
        const free = total - used;
        const usage = (used / total) * 100;
        return {
          total,
          used,
          free,
          usage,
        };
      }
    } catch (error) {
      logger.warn('Failed to collect disk status:', error);
    }

    return {
      total: 0,
      used: 0,
      free: 0,
      usage: 0,
    };
  }

  /**
   * 收集网络状态
   */
  private async collectNetworkStatus(): Promise<NetworkStatus> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        // 浏览器环境
        return {
          isOnline: navigator.onLine,
          latency: 0, // 浏览器环境需要额外的网络测试
          downloadSpeed: 0,
          uploadSpeed: 0,
        };
      } else if (typeof process !== 'undefined') {
        // Node.js 环境
        return {
          isOnline: true, // 简化处理
          latency: 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
        };
      }
    } catch (error) {
      logger.warn('Failed to collect network status:', error);
    }

    return {
      isOnline: false,
      latency: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
    };
  }

  /**
   * 收集服务状态
   */
  private async collectServicesStatus(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = [];

    // 检查 Ollama 服务
    try {
      const { ollamaClient } = await import('./ollama-client');
      const isAvailable = await ollamaClient.isAvailable();
      services.push({
        name: 'Ollama Service',
        status: isAvailable ? 'running' : 'stopped',
        message: isAvailable ? 'Ollama service is available' : 'Ollama service is not available',
        lastChecked: Date.now(),
      });
    } catch (error) {
      services.push({
        name: 'Ollama Service',
        status: 'error',
        message: 'Failed to check Ollama service status',
        lastChecked: Date.now(),
      });
    }

    // 检查网络代理服务
    try {
      const { networkProxyService } = await import('./network-proxy');
      services.push({
        name: 'Network Proxy Service',
        status: 'running',
        message: 'Network proxy service is running',
        lastChecked: Date.now(),
      });
    } catch (error) {
      services.push({
        name: 'Network Proxy Service',
        status: 'error',
        message: 'Failed to check network proxy service status',
        lastChecked: Date.now(),
      });
    }

    return services;
  }

  /**
   * 计算整体状态
   */
  private calculateOverallStatus(
    cpu: CPUStatus,
    memory: MemoryStatus,
    disk: DiskStatus,
    network: NetworkStatus,
    services: ServiceStatus[]
  ): 'healthy' | 'warning' | 'critical' {
    let issues = 0;
    let criticalIssues = 0;

    // 检查 CPU 使用率
    if (cpu.usage > 80) {
      issues++;
      if (cpu.usage > 90) criticalIssues++;
    }

    // 检查内存使用率
    if (memory.usage > 80) {
      issues++;
      if (memory.usage > 90) criticalIssues++;
    }

    // 检查磁盘使用率
    if (disk.usage > 80) {
      issues++;
      if (disk.usage > 90) criticalIssues++;
    }

    // 检查网络状态
    if (!network.isOnline) {
      issues++;
      criticalIssues++;
    }

    // 检查服务状态
    services.forEach(service => {
      if (service.status === 'error') {
        issues++;
        criticalIssues++;
      } else if (service.status === 'stopped') {
        issues++;
      }
    });

    if (criticalIssues > 0) {
      return 'critical';
    } else if (issues > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<SystemHealthCheckResult> {
    try {
      const status = await this.performDiagnostics();
      const issues = this.identifyIssues(status);
      const recommendations = this.generateRecommendations(issues);

      const result: SystemHealthCheckResult = {
        timestamp: Date.now(),
        status: status.overall,
        issues,
        recommendations,
      };

      eventBus.emit('system:diagnostics:health-check', result);
      return result;
    } catch (error) {
      logger.error('Failed to perform health check:', error);
      throw error;
    }
  }

  /**
   * 识别系统问题
   */
  private identifyIssues(status: SystemStatus): SystemIssue[] {
    const issues: SystemIssue[] = [];

    // 检查 CPU 问题
    if (status.cpu.usage > 80) {
      issues.push({
        id: `cpu_${Date.now()}`,
        type: 'cpu_usage',
        message: `CPU usage is high: ${status.cpu.usage.toFixed(2)}%`,
        severity: status.cpu.usage > 90 ? 'critical' : 'warning',
        solution: 'Close unnecessary applications or upgrade your CPU',
      });
    }

    // 检查内存问题
    if (status.memory.usage > 80) {
      issues.push({
        id: `memory_${Date.now()}`,
        type: 'memory_usage',
        message: `Memory usage is high: ${status.memory.usage.toFixed(2)}%`,
        severity: status.memory.usage > 90 ? 'critical' : 'warning',
        solution: 'Close unnecessary applications or upgrade your memory',
      });
    }

    // 检查磁盘问题
    if (status.disk.usage > 80) {
      issues.push({
        id: `disk_${Date.now()}`,
        type: 'disk_usage',
        message: `Disk usage is high: ${status.disk.usage.toFixed(2)}%`,
        severity: status.disk.usage > 90 ? 'critical' : 'warning',
        solution: 'Clean up disk space or upgrade your storage',
      });
    }

    // 检查网络问题
    if (!status.network.isOnline) {
      issues.push({
        id: `network_${Date.now()}`,
        type: 'network_status',
        message: 'Network is offline',
        severity: 'critical',
        solution: 'Check your network connection',
      });
    }

    // 检查服务问题
    status.services.forEach(service => {
      if (service.status === 'error') {
        issues.push({
          id: `service_${service.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'service_error',
          message: `${service.name} is in error state: ${service.message}`,
          severity: 'critical',
          solution: `Restart ${service.name}`,
        });
      } else if (service.status === 'stopped') {
        issues.push({
          id: `service_${service.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'service_stopped',
          message: `${service.name} is stopped`,
          severity: 'warning',
          solution: `Start ${service.name}`,
        });
      }
    });

    return issues;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(issues: SystemIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(issue => issue.type === 'cpu_usage')) {
      recommendations.push('Consider upgrading your CPU or closing resource-intensive applications');
    }

    if (issues.some(issue => issue.type === 'memory_usage')) {
      recommendations.push('Consider upgrading your memory or closing memory-intensive applications');
    }

    if (issues.some(issue => issue.type === 'disk_usage')) {
      recommendations.push('Consider cleaning up disk space or upgrading your storage');
    }

    if (issues.some(issue => issue.type === 'network_status')) {
      recommendations.push('Check your network connection and ensure you have a stable internet connection');
    }

    if (issues.some(issue => issue.type === 'service_error')) {
      recommendations.push('Restart the affected services and check their configuration');
    }

    if (issues.some(issue => issue.type === 'service_stopped')) {
      recommendations.push('Start the stopped services to ensure all features are available');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your system is running optimally. No recommendations at this time.');
    }

    return recommendations;
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.performDiagnostics();
  }

  /**
   * 获取健康检查结果
   */
  async getHealthCheckResult(): Promise<SystemHealthCheckResult> {
    return this.performHealthCheck();
  }
}

/**
 * 全局系统诊断服务实例
 */
export const systemDiagnosticsService = new SystemDiagnosticsService();

export default SystemDiagnosticsService;
