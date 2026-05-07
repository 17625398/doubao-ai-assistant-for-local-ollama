// 网络Worker - 处理网络请求、文件上传下载等任务

import { messageRouter } from '../message-router';

// 注册消息处理器
messageRouter.register('fetch', async (payload: { url: string; options?: RequestInit }) => {
  return fetchData(payload.url, payload.options);
});

messageRouter.register('uploadFile', async (payload: { url: string; file: File; options?: RequestInit }) => {
  return uploadFile(payload.url, payload.file, payload.options);
});

messageRouter.register('downloadFile', async (payload: { url: string; options?: RequestInit }) => {
  return downloadFile(payload.url, payload.options);
});

// 发送网络请求
async function fetchData(url: string, options?: RequestInit): Promise<any> {
  console.log(`Fetching data from: ${url}`);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 尝试解析JSON
    try {
      return await response.json();
    } catch {
      // 如果不是JSON，返回文本
      return await response.text();
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// 上传文件
async function uploadFile(url: string, file: File, options?: RequestInit): Promise<any> {
  console.log(`Uploading file to: ${url}`);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// 下载文件
async function downloadFile(url: string, options?: RequestInit): Promise<Blob> {
  console.log(`Downloading file from: ${url}`);
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

// 监听消息
self.onmessage = async (event) => {
  const message = event.data;
  
  if (message.type === 'event') {
    // 处理事件
    console.log('Received event:', message.event, message.payload);
  } else {
    // 处理消息
    const response = await messageRouter.handle(message);
    self.postMessage(response);
  }
};

// 发送初始化事件
self.postMessage({
  type: 'event',
  event: 'workerInitialized',
  payload: {
    workerType: 'network',
    timestamp: Date.now()
  }
});