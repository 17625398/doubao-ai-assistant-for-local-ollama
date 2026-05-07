'use client';

import React from 'react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">测试页面</h1>
        <p className="text-gray-600">如果能看到这个页面，说明基本功能正常工作！</p>
      </div>
    </div>
  );
}
