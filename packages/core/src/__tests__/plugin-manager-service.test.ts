// 插件管理服务测试

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pluginManager, PluginManagerService } from '../services/plugin-manager-service';
import { PluginStatus } from '../types/plugin';
import { logger } from '../utils/logger';

// 模拟 logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PluginManagerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清空插件列表
    const plugins = pluginManager.getPlugins();
    for (const name of plugins.keys()) {
      pluginManager.uninstallPlugin(name);
    }
  });

  it('should register plugin', () => {
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      status: PluginStatus.INACTIVE,
    };
    
    pluginManager.registerPlugin(testPlugin);
    const plugin = pluginManager.getPlugin('test-plugin');
    expect(plugin).toBe(testPlugin);
  });

  it('should register plugin manifest', () => {
    const testManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
    };
    
    pluginManager.registerPluginManifest(testManifest);
    const manifest = pluginManager.getPluginManifest('test-plugin');
    expect(manifest).toBe(testManifest);
  });

  it('should activate plugin', async () => {
    const activateSpy = vi.fn();
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      status: PluginStatus.INACTIVE,
      activate: activateSpy,
    };
    
    pluginManager.registerPlugin(testPlugin);
    await pluginManager.activatePlugin('test-plugin');
    
    expect(activateSpy).toHaveBeenCalled();
    expect(testPlugin.status).toBe(PluginStatus.ACTIVE);
  });

  it('should deactivate plugin', async () => {
    const deactivateSpy = vi.fn();
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      status: PluginStatus.ACTIVE,
      deactivate: deactivateSpy,
    };
    
    pluginManager.registerPlugin(testPlugin);
    await pluginManager.deactivatePlugin('test-plugin');
    
    expect(deactivateSpy).toHaveBeenCalled();
    expect(testPlugin.status).toBe(PluginStatus.INACTIVE);
  });

  it('should uninstall plugin', async () => {
    const uninstallSpy = vi.fn();
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      status: PluginStatus.INACTIVE,
      uninstall: uninstallSpy,
    };
    
    pluginManager.registerPlugin(testPlugin);
    await pluginManager.uninstallPlugin('test-plugin');
    
    expect(uninstallSpy).toHaveBeenCalled();
    expect(pluginManager.getPlugin('test-plugin')).toBeUndefined();
  });

  it('should get plugin status', () => {
    const testPlugin = {
      name: 'test-plugin',
      version: '1.0.0',
      status: PluginStatus.ACTIVE,
    };
    
    pluginManager.registerPlugin(testPlugin);
    const status = pluginManager.getPluginStatus('test-plugin');
    expect(status).toBe(PluginStatus.ACTIVE);
  });

  it('should check plugin dependencies', () => {
    const testManifest = {
      name: 'test-plugin',
      version: '1.0.0',
      dependencies: {
        'dependency1': '1.0.0',
        'dependency2': '2.0.0',
      },
    };
    
    pluginManager.registerPluginManifest(testManifest);
    const missingDependencies = pluginManager.checkPluginDependencies('test-plugin');
    expect(missingDependencies).toContain('dependency1@1.0.0');
    expect(missingDependencies).toContain('dependency2@2.0.0');
  });

  it('should get singleton instance of plugin manager', () => {
    const manager1 = PluginManagerService.getInstance();
    const manager2 = PluginManagerService.getInstance();
    expect(manager1).toBe(manager2);
  });
});
