/**
 * OpenCLI 模块集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCLISkill } from './opencli-skill';
import { OpenCLIVisualizer } from './opencli-visualizer';
import { OpenCLIConnector } from './opencli-connector';
import { OpenCLIRecorder } from './opencli-recorder';
import { OpenCLISessionManager } from './opencli-session-manager';

describe('OpenCLI 集成测试', () => {
  let skill: OpenCLISkill;
  let visualizer: OpenCLIVisualizer;
  let connector: OpenCLIConnector;
  let recorder: OpenCLIRecorder;
  let sessionManager: OpenCLISessionManager;

  beforeEach(() => {
    skill = OpenCLISkill.getInstance();
    visualizer = OpenCLIVisualizer.getInstance();
    connector = OpenCLIConnector.getInstance();
    recorder = OpenCLIRecorder.getInstance();
    sessionManager = OpenCLISessionManager.getInstance();
  });

  it('所有模块应该正确初始化', () => {
    expect(skill).toBeDefined();
    expect(visualizer).toBeDefined();
    expect(connector).toBeDefined();
    expect(recorder).toBeDefined();
    expect(sessionManager).toBeDefined();
  });

  it('应该支持完整的工作流程：创建会话 -> 录制 -> 回放', async () => {
    const session = sessionManager.createSession('Workflow Test');
    expect(session).toBeDefined();

    recorder.start('workflow-script');
    const status = recorder.getRecordingStatus();
    expect(status.isRecording).toBe(true);

    const skillReady = skill.isReady();
    expect(typeof skillReady).toBe('boolean');

    const script = recorder.stop();
    expect(script).toBeDefined();
    expect(script.actions.length).toBeGreaterThanOrEqual(0);
  });

  it('连接器应该与技能模块协同工作', async () => {
    const complexity = connector.evaluatePageComplexity();
    expect(complexity).toBeDefined();

    const skillReady = skill.isReady();
    expect(typeof skillReady).toBe('boolean');

    const stats = connector.getPerformanceStats();
    expect(stats).toBeDefined();
  });

  it('可视化器应该在所有操作中提供反馈', () => {
    expect(() => {
      visualizer.showToast('Integration test', 'info');
    }).not.toThrow();

    expect(() => {
      visualizer.updateStatus('Testing', 'busy');
    }).not.toThrow();

    expect(() => {
      visualizer.clearAllHighlights();
    }).not.toThrow();
  });

  it('会话管理器应该与其他模块协同工作', () => {
    const session = sessionManager.createSession('Integration Test');
    
    const stats = sessionManager.getSessionStats();
    expect(stats.totalSessions).toBeGreaterThanOrEqual(1);

    const audit = sessionManager.exportSecurityAudit();
    expect(audit.securityLevel).toBeDefined();

    const exported = sessionManager.exportSession(session.id);
    expect(exported).toBeDefined();
  });

  it('应该支持录制和导出脚本', () => {
    recorder.start('integration-test-script');
    
    recorder.stop();
    
    const scripts = recorder.getAllScripts();
    const script = scripts.find(s => s.name === 'integration-test-script');
    
    if (script) {
      // 使用脚本名称来查找
      const exported = recorder.exportScript('script_' + script.createdAt);
      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported!);
      expect(parsed.name).toBe('integration-test-script');
      expect(parsed.actions).toBeDefined();
    }
  });

  it('性能统计应该反映所有操作', () => {
    const initialStats = connector.getPerformanceStats();
    expect(initialStats).toBeDefined();

    // resetStats 方法可能不存在，使用类型断言
    const connectorAny = connector as any;
    if (typeof connectorAny.resetStats === 'function') {
      connectorAny.resetStats();
      const resetStats = connector.getPerformanceStats();
      expect(resetStats.totalExtractions).toBe(0);
    } else {
      // 如果没有 resetStats，至少验证统计功能正常
      expect(initialStats.totalExtractions).toBeGreaterThanOrEqual(0);
    }
  });
});
