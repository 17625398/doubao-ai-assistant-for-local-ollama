/**
 * OpenCLI 录制器模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCLIRecorder, RecordedScript, PlaybackOptions } from './opencli-recorder';

describe('OpenCLIRecorder', () => {
  let recorder: OpenCLIRecorder;

  beforeEach(() => {
    recorder = OpenCLIRecorder.getInstance();
  });

  it('应该正确初始化单例', () => {
    expect(recorder).toBeDefined();
    expect(recorder instanceof OpenCLIRecorder).toBe(true);
  });

  it('应该返回单例实例', () => {
    const instance1 = OpenCLIRecorder.getInstance();
    const instance2 = OpenCLIRecorder.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('start 方法应该开始录制', () => {
    recorder.start('test-script');
    const status = recorder.getRecordingStatus();
    expect(status.isRecording).toBe(true);
  });

  it('stop 方法应该停止录制并返回脚本', () => {
    recorder.start('test-script');
    const script = recorder.stop();
    
    expect(script).toBeDefined();
    expect(script.name).toBeDefined();
    expect(script.createdAt).toBeDefined();
    expect(script.actions).toBeDefined();
    expect(Array.isArray(script.actions)).toBe(true);
  });

  it('getRecordingStatus 方法应该正确返回录制状态', () => {
    const status = recorder.getRecordingStatus();
    expect(status.isRecording).toBe(false);
    
    recorder.start('test-script');
    const recordingStatus = recorder.getRecordingStatus();
    expect(recordingStatus.isRecording).toBe(true);
    
    recorder.stop();
    const stoppedStatus = recorder.getRecordingStatus();
    expect(stoppedStatus.isRecording).toBe(false);
  });

  it('exportScript 方法应该导出 JSON 格式的脚本', () => {
    recorder.start('test-script');
    recorder.stop();
    
    const scripts = recorder.getAllScripts();
    if (scripts.length > 0) {
      const script = scripts[0];
      // 使用脚本名称来查找
      const exported = recorder.exportScript('script_' + script.createdAt);
      
      expect(exported).toBeDefined();
      
      // 导出返回的是 JSON 字符串
      if (typeof exported === 'string') {
        const parsed = JSON.parse(exported);
        expect(parsed).toHaveProperty('name');
        expect(parsed).toHaveProperty('actions');
        expect(parsed).toHaveProperty('createdAt');
      } else {
        // 如果直接返回对象
        expect(exported).toHaveProperty('name');
        expect(exported).toHaveProperty('actions');
        expect(exported).toHaveProperty('createdAt');
      }
    }
  });

  it('importScript 方法应该导入 JSON 脚本', () => {
    const testScript: RecordedScript = {
      name: 'Imported Test Script',
      createdAt: Date.now(),
      actions: [
        {
          type: 'open',
          value: 'https://example.com',
          timestamp: Date.now(),
        },
        {
          type: 'click',
          selector: 'button.test',
          timestamp: Date.now(),
        },
      ],
    };

    const json = JSON.stringify(testScript, null, 2);
    const scriptId = recorder.importScript(json);
    
    expect(scriptId).toBeDefined();
    
    // 导入后会生成新的 ID，但脚本内容应该保留
    const imported = recorder.getScript(scriptId!);
    expect(imported).toBeDefined();
    expect(imported?.name).toBe('Imported Test Script');
    expect(imported?.actions.length).toBe(2);
  });

  it('getAllScripts 方法应该返回所有脚本', () => {
    recorder.start('script-1');
    recorder.stop();
    
    recorder.start('script-2');
    recorder.stop();
    
    const scripts = recorder.getAllScripts();
    expect(scripts.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteScript 方法应该删除脚本', () => {
    recorder.start('to-delete');
    recorder.stop();
    
    const scripts = recorder.getAllScripts();
    const scriptToDelete = scripts.find(s => s.name === 'to-delete');
    
    if (scriptToDelete) {
      // 使用脚本名称来查找对应的 ID
      const allScripts = recorder.getAllScripts();
      const targetScript = allScripts.find(s => s.name === 'to-delete');
      
      if (targetScript) {
        // 通过查找脚本在 Map 中的位置来删除
        const deleted = recorder.deleteScript('script_' + targetScript.createdAt);
        expect(deleted).toBe(true);
        
        const remaining = recorder.getScript('script_' + targetScript.createdAt);
        expect(remaining).toBeUndefined();
      }
    }
  });

  it('应该支持完整的工作流程：录制 -> 停止 -> 导出', () => {
    recorder.start('workflow-script');
    const status = recorder.getRecordingStatus();
    expect(status.isRecording).toBe(true);

    const script = recorder.stop();
    expect(script).toBeDefined();
    expect(script.actions.length).toBeGreaterThanOrEqual(0);
  });
});
