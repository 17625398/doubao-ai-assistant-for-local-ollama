// MemPalace 使用示例
import { MemPalaceService, getMemPalaceService } from '@ai-intelligent-analysis-platform/core';

/**
 * MemPalace 使用示例
 * 展示如何创建记忆、搜索记忆以及管理结构化存储
 */
async function memPalaceExample() {
  console.log('=== MemPalace 使用示例 ===');

  // 获取 MemPalace 服务实例
  const memPalace = getMemPalaceService();

  // 初始化服务
  await memPalace.initialize();
  console.log('MemPalace 服务初始化成功');

  // 1. 创建一个新的 wing
  console.log('\n1. 创建新的 wing');
  const wing = await memPalace.createWing('个人知识', '存储个人相关的知识和对话');
  console.log('创建 wing 成功:', wing);

  // 2. 在 wing 中创建一个 room
  console.log('\n2. 创建新的 room');
  const room = await memPalace.createRoom(wing.id, '技术对话', '存储与技术相关的对话');
  console.log('创建 room 成功:', room);

  // 3. 获取默认的 halls
  console.log('\n3. 获取默认 halls');
  const halls = await memPalace.getHalls();
  console.log('默认 halls:', halls);

  // 4. 选择一个 hall 来存储记忆
  const hall = halls[0]; // 使用第一个 hall
  console.log('\n4. 选择 hall:', hall.name);

  // 5. 添加一些记忆
  console.log('\n5. 添加记忆');
  const memory1 = await memPalace.addMemory(
    wing.id,
    room.id,
    hall.id,
    'JavaScript 是一种高级编程语言，广泛用于 Web 开发',
    { role: 'assistant', timestamp: Date.now(), sessionId: 'session-1', tags: ['programming', 'javascript'] }
  );
  console.log('添加记忆 1 成功:', memory1.id);

  const memory2 = await memPalace.addMemory(
    wing.id,
    room.id,
    hall.id,
    'TypeScript 是 JavaScript 的超集，添加了静态类型',
    { role: 'assistant', timestamp: Date.now(), sessionId: 'session-1', tags: ['programming', 'typescript'] }
  );
  console.log('添加记忆 2 成功:', memory2.id);

  // 6. 搜索记忆
  console.log('\n6. 搜索记忆');
  const searchResults = await memPalace.searchMemories('JavaScript');
  console.log('搜索结果:', searchResults.map(r => ({ id: r.memory.id, content: r.memory.content, score: r.score })));

  // 7. 获取房间中的所有记忆
  console.log('\n7. 获取房间中的所有记忆');
  const roomMemories = await memPalace.getMemoriesByRoom(room.id);
  console.log('房间记忆:', roomMemories.map(m => ({ id: m.id, content: m.content })));

  // 8. 获取 wing 中的所有记忆
  console.log('\n8. 获取 wing 中的所有记忆');
  const wingMemories = await memPalace.getMemoriesByWing(wing.id);
  console.log('Wing 记忆:', wingMemories.map(m => ({ id: m.id, content: m.content })));

  // 9. 更新记忆
  console.log('\n9. 更新记忆');
  // 注意：MemPalace 目前没有直接的 updateMemory 方法，需要通过删除和重新添加来更新

  // 10. 删除记忆
  console.log('\n10. 删除记忆');
  await memPalace.deleteMemory(memory2.id);
  console.log('删除记忆 2 成功');

  // 11. 验证记忆已删除
  console.log('\n11. 验证记忆已删除');
  const updatedRoomMemories = await memPalace.getMemoriesByRoom(room.id);
  console.log('更新后的房间记忆:', updatedRoomMemories.map(m => ({ id: m.id, content: m.content })));

  // 12. 清理：删除 room 和 wing
  console.log('\n12. 清理资源');
  await memPalace.deleteRoom(room.id);
  console.log('删除 room 成功');
  
  await memPalace.deleteWing(wing.id);
  console.log('删除 wing 成功');

  console.log('\n=== MemPalace 使用示例完成 ===');
}

// 运行示例
memPalaceExample().catch(console.error);

/**
 * 对话集成示例
 * 展示如何在对话过程中使用 MemPalace
 */
async function conversationIntegrationExample() {
  console.log('\n=== 对话集成示例 ===');

  const memPalace = getMemPalaceService();
  await memPalace.initialize();

  // 假设这是一个对话会话
  const sessionId = 'chat-session-' + Date.now();
  const wingId = 'default-wing';
  const roomId = 'chat-room';
  const hallId = 'default-hall';

  // 模拟用户发送消息
  async function handleUserMessage(message: string) {
    console.log(`用户: ${message}`);
    
    // 搜索相关记忆
    const relevantMemories = await memPalace.searchMemories(message, 3);
    console.log('相关记忆:', relevantMemories.map(r => r.memory.content));

    // 生成回复（这里简化处理）
    const response = `我收到了你的消息: ${message}`;
    console.log(`AI: ${response}`);

    // 存储对话到记忆
    await memPalace.addMemory(
      wingId,
      roomId,
      hallId,
      `用户: ${message}\nAI: ${response}`,
      { role: 'assistant', timestamp: Date.now(), sessionId, tags: ['conversation'] }
    );
  }

  // 模拟对话
  await handleUserMessage('你好，我是新手，能介绍一下 JavaScript 吗？');
  await handleUserMessage('TypeScript 和 JavaScript 有什么区别？');
  await handleUserMessage('谢谢你的解释！');

  console.log('\n=== 对话集成示例完成 ===');
}

// 运行对话集成示例
conversationIntegrationExample().catch(console.error);
