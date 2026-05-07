/**
 * OpenCLI 可视化模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCLIVisualizer, HighlightOptions, OperationFeedback } from './opencli-visualizer';

describe('OpenCLIVisualizer', () => {
  let visualizer: OpenCLIVisualizer;

  beforeEach(() => {
    visualizer = OpenCLIVisualizer.getInstance();
  });

  it('应该正确初始化单例', () => {
    expect(visualizer).toBeDefined();
    expect(visualizer instanceof OpenCLIVisualizer).toBe(true);
  });

  it('应该返回单例实例', () => {
    const instance1 = OpenCLIVisualizer.getInstance();
    const instance2 = OpenCLIVisualizer.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('highlightBySelector 方法应该正常工作', () => {
    expect(() => {
      visualizer.highlightBySelector('div.test', { duration: 1000 });
    }).not.toThrow();
  });

  it('showToast 方法应该正常工作', () => {
    expect(() => {
      visualizer.showToast('Test message', 'info');
    }).not.toThrow();
    
    expect(() => {
      visualizer.showToast('Success message', 'success');
    }).not.toThrow();
    
    expect(() => {
      visualizer.showToast('Error message', 'error');
    }).not.toThrow();
  });

  it('updateStatus 方法应该正常工作', () => {
    expect(() => {
      visualizer.updateStatus('Ready', 'ready');
    }).not.toThrow();
    
    expect(() => {
      visualizer.updateStatus('Busy', 'busy');
    }).not.toThrow();
    
    expect(() => {
      visualizer.updateStatus('Error', 'error');
    }).not.toThrow();
  });

  it('showOperationFeedback 方法应该正常工作', () => {
    const feedback: OperationFeedback = {
      type: 'click',
      status: 'success',
      target: 'button.test',
      message: 'Operation completed',
    };
    
    expect(() => {
      visualizer.showOperationFeedback(feedback);
    }).not.toThrow();
  });

  it('clearAllHighlights 方法应该正常工作', () => {
    expect(() => {
      visualizer.clearAllHighlights();
    }).not.toThrow();
  });
});
