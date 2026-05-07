/**
 * OpenCLI 会话管理器模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCLISessionManager, SessionManagerOptions } from './opencli-session-manager';

describe('OpenCLISessionManager', () => {
  let sessionManager: OpenCLISessionManager;

  beforeEach(() => {
    const options: SessionManagerOptions = {
      autoSave: false,
      encryptSensitiveData: true,
      sessionExpiryDays: 30,
    };
    sessionManager = OpenCLISessionManager.getInstance(options);
  });

  it('应该正确初始化单例', () => {
    expect(sessionManager).toBeDefined();
    expect(sessionManager instanceof OpenCLISessionManager).toBe(true);
  });

  it('应该返回单例实例', () => {
    const instance1 = OpenCLISessionManager.getInstance();
    const instance2 = OpenCLISessionManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('createSession 方法应该创建新会话', () => {
    const session = sessionManager.createSession('Test Session');
    
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.name).toBe('Test Session');
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
  });

  it('getSession 方法应该获取会话', () => {
    const session = sessionManager.createSession('Get Test');
    const retrieved = sessionManager.getSession(session.id);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
    expect(retrieved?.name).toBe('Get Test');
  });

  it('getAllSessions 方法应该获取所有会话', () => {
    sessionManager.createSession('Session 1');
    sessionManager.createSession('Session 2');
    sessionManager.createSession('Session 3');
    
    const sessions = sessionManager.getAllSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(3);
  });

  it('getCurrentSession 方法应该获取当前会话', () => {
    const session = sessionManager.createSession('Current Test');
    const current = sessionManager.getCurrentSession();
    
    expect(current).toBeDefined();
    expect(current?.id).toBe(session.id);
  });

  it('deleteSession 方法应该删除会话', () => {
    const session = sessionManager.createSession('To Delete');
    const sessionId = session.id;
    
    const deleted = sessionManager.deleteSession(sessionId);
    expect(deleted).toBe(true);
    
    const remaining = sessionManager.getSession(sessionId);
    expect(remaining).toBeUndefined();
  });

  it('exportSession 方法应该导出会话为 JSON', () => {
    const session = sessionManager.createSession('Export Test');
    const exported = sessionManager.exportSession(session.id);
    
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');
    
    const parsed = JSON.parse(exported!);
    expect(parsed.id).toBe(session.id);
    expect(parsed.name).toBe('Export Test');
  });

  it('importSession 方法应该导入会话', () => {
    const session = sessionManager.createSession('Import Test');
    const exported = sessionManager.exportSession(session.id);
    
    sessionManager.deleteSession(session.id);
    
    const imported = sessionManager.importSession(exported!);
    expect(imported).toBeDefined();
    expect(imported?.id).toBe(session.id);
    expect(imported?.name).toBe('Import Test');
  });

  it('getSessionStats 方法应该返回统计信息', () => {
    sessionManager.createSession('Stats Test 1');
    sessionManager.createSession('Stats Test 2');
    
    const stats = sessionManager.getSessionStats();
    
    expect(stats).toHaveProperty('totalSessions');
    expect(stats).toHaveProperty('hasCurrentSession');
    expect(stats).toHaveProperty('encryptedSessions');
    expect(stats).toHaveProperty('expiredSessions');
    
    expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
  });

  it('exportSecurityAudit 方法应该导出安全审计报告', () => {
    const audit = sessionManager.exportSecurityAudit();
    
    expect(audit).toHaveProperty('totalSessions');
    expect(audit).toHaveProperty('encryptedCount');
    expect(audit).toHaveProperty('expiredCount');
    expect(audit).toHaveProperty('securityLevel');
    
    expect(['high', 'medium', 'low']).toContain(audit.securityLevel);
  });

  it('应该加密敏感数据', () => {
    const options: SessionManagerOptions = {
      encryptSensitiveData: true,
    };
    const manager = OpenCLISessionManager.getInstance(options);
    
    const session = manager.createSession('Encryption Test');
    const exported = manager.exportSession(session.id, true);
    
    expect(exported).toBeDefined();
    const parsed = JSON.parse(exported!);
    
    if (parsed.cookies) {
      expect(typeof parsed.cookies).toBe('string');
    }
    
    if (parsed.tokens) {
      expect(typeof parsed.tokens).toBe('object');
    }
  });
});
