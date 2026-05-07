/**
 * OpenCLI 技能模块测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenCLISkill, OpenCLIResult } from './opencli-skill';

describe('OpenCLISkill', () => {
  let skill: OpenCLISkill;

  beforeEach(() => {
    skill = OpenCLISkill.getInstance();
  });

  it('应该正确初始化单例', () => {
    expect(skill).toBeDefined();
    expect(skill instanceof OpenCLISkill).toBe(true);
  });

  it('应该返回单例实例', () => {
    const instance1 = OpenCLISkill.getInstance();
    const instance2 = OpenCLISkill.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('应该检查 OpenCLI 是否就绪', () => {
    const isReady = skill.isReady();
    expect(typeof isReady).toBe('boolean');
  });

  it('open 方法应该返回正确格式的结果', async () => {
    const result = await skill.open('https://example.com');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('duration');
  });

  it('click 方法应该返回正确格式的结果', async () => {
    const result = await skill.click('button');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });

  it('type 方法应该返回正确格式的结果', async () => {
    const result = await skill.type('input', 'test text');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });

  it('get 方法应该返回正确格式的结果', async () => {
    const result = await skill.get('div');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });

  it('eval 方法应该返回正确格式的结果', async () => {
    const result = await skill.eval('1 + 1');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });

  it('scroll 方法应该返回正确格式的结果', async () => {
    const result = await skill.scroll('down', 100);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });

  it('wait 方法应该返回正确格式的结果', async () => {
    const result = await skill.wait('1s');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('error');
  });
});
