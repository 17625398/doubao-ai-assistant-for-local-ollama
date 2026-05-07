'use client';

import React, { useState } from 'react';

interface WebContentExportProps {
  onClose?: () => void;
  content: {
    pageInfo: {
      title: string;
      url: string;
      description: string;
      keywords: string[];
      favicon: string | null;
    };
    mainContent: {
      text: string;
      html: string;
      images: string[];
      links: Array<{ text: string; url: string }>;
    };
    pageStats: {
      wordCount: number;
      imageCount: number;
      linkCount: number;
      characterCount: number;
      htmlSize: number;
    };
  };
}

export function WebContentExport({ onClose, content: webContent }: WebContentExportProps) {
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'markdown' | 'html'>('txt');
  const [isExporting, setIsExporting] = useState(false);

  const generateExportContent = () => {
    switch (exportFormat) {
      case 'txt':
        return generateTxtContent();
      case 'json':
        return generateJsonContent();
      case 'markdown':
        return generateMarkdownContent();
      case 'html':
        return generateHtmlContent();
      default:
        return '';
    }
  };

  const generateTxtContent = () => {
    let content = `# ${webContent.pageInfo.title}\n\n`;
    content += `URL: ${webContent.pageInfo.url}\n\n`;
    content += `Description: ${webContent.pageInfo.description}\n\n`;
    
    if (webContent.pageInfo.keywords.length > 0) {
      content += `Keywords: ${webContent.pageInfo.keywords.join(', ')}\n\n`;
    }
    
    content += `## Content\n\n`;
    content += webContent.mainContent.text + '\n\n';
    
    if (webContent.mainContent.links.length > 0) {
      content += `## Links\n\n`;
      webContent.mainContent.links.forEach((link, index) => {
        content += `${index + 1}. [${link.text}](${link.url})\n`;
      });
      content += '\n';
    }
    
    content += `## Statistics\n\n`;
    content += `Word count: ${webContent.pageStats.wordCount}\n`;
    content += `Image count: ${webContent.pageStats.imageCount}\n`;
    content += `Link count: ${webContent.pageStats.linkCount}\n`;
    content += `Character count: ${webContent.pageStats.characterCount}\n`;
    content += `HTML size: ${Math.round(webContent.pageStats.htmlSize / 1024)}KB\n`;
    
    return content;
  };

  const generateJsonContent = () => {
    return JSON.stringify(webContent, null, 2);
  };

  const generateMarkdownContent = () => {
    let content = `# ${webContent.pageInfo.title}\n\n`;
    content += `[${webContent.pageInfo.url}](${webContent.pageInfo.url})\n\n`;
    content += `## Description\n\n${webContent.pageInfo.description}\n\n`;
    
    if (webContent.pageInfo.keywords.length > 0) {
      content += `## Keywords\n\n`;
      webContent.pageInfo.keywords.forEach(keyword => {
        content += `- ${keyword}\n`;
      });
      content += '\n';
    }
    
    content += `## Content\n\n${webContent.mainContent.text}\n\n`;
    
    if (webContent.mainContent.images.length > 0) {
      content += `## Images\n\n`;
      webContent.mainContent.images.forEach((image, index) => {
        content += `![Image ${index + 1}](${image})\n\n`;
      });
    }
    
    if (webContent.mainContent.links.length > 0) {
      content += `## Links\n\n`;
      webContent.mainContent.links.forEach((link, index) => {
        content += `${index + 1}. [${link.text}](${link.url})\n`;
      });
      content += '\n';
    }
    
    content += `## Statistics\n\n`;
    content += `- Word count: ${webContent.pageStats.wordCount}\n`;
    content += `- Image count: ${webContent.pageStats.imageCount}\n`;
    content += `- Link count: ${webContent.pageStats.linkCount}\n`;
    content += `- Character count: ${webContent.pageStats.characterCount}\n`;
    content += `- HTML size: ${Math.round(webContent.pageStats.htmlSize / 1024)}KB\n`;
    
    return content;
  };

  const generateHtmlContent = () => {
    let content = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n`;
    content += `  <meta charset="UTF-8">\n`;
    content += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
    content += `  <title>${webContent.pageInfo.title}</title>\n`;
    content += `  <style>\n`;
    content += `    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }\n`;
    content += `    h1, h2, h3 { color: #333; }\n`;
    content += `    .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }\n`;
    content += `    .stats { background: #e8f4f8; padding: 15px; border-radius: 5px; margin-top: 20px; }\n`;
    content += `    .links { margin-top: 20px; }\n`;
    content += `    .links ul { list-style: none; padding: 0; }\n`;
    content += `    .links li { margin-bottom: 10px; }\n`;
    content += `  </style>\n`;
    content += `</head>\n<body>\n`;
    content += `  <h1>${webContent.pageInfo.title}</h1>\n`;
    content += `  <div class="info">\n`;
    content += `    <p><strong>URL:</strong> <a href="${webContent.pageInfo.url}">${webContent.pageInfo.url}</a></p>\n`;
    content += `    <p><strong>Description:</strong> ${webContent.pageInfo.description}</p>\n`;
    if (webContent.pageInfo.keywords.length > 0) {
      content += `    <p><strong>Keywords:</strong> ${webContent.pageInfo.keywords.join(', ')}</p>\n`;
    }
    content += `  </div>\n`;
    content += `  <h2>Content</h2>\n`;
    content += `  <p>${webContent.mainContent.text}</p>\n`;
    if (webContent.mainContent.links.length > 0) {
      content += `  <h2>Links</h2>\n`;
      content += `  <div class="links">\n`;
      content += `    <ul>\n`;
      webContent.mainContent.links.forEach(link => {
        content += `      <li><a href="${link.url}">${link.text}</a></li>\n`;
      });
      content += `    </ul>\n`;
      content += `  </div>\n`;
    }
    content += `  <div class="stats">\n`;
    content += `    <h2>Statistics</h2>\n`;
    content += `    <ul>\n`;
    content += `      <li>Word count: ${webContent.pageStats.wordCount}</li>\n`;
    content += `      <li>Image count: ${webContent.pageStats.imageCount}</li>\n`;
    content += `      <li>Link count: ${webContent.pageStats.linkCount}</li>\n`;
    content += `      <li>Character count: ${webContent.pageStats.characterCount}</li>\n`;
    content += `      <li>HTML size: ${Math.round(webContent.pageStats.htmlSize / 1024)}KB</li>\n`;
    content += `    </ul>\n`;
    content += `  </div>\n`;
    content += `</body>\n</html>`;
    
    return content;
  };

  const handleExport = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      const content = generateExportContent();
      const blob = new Blob([content], { type: getMimeType() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsExporting(false);
    }, 500);
  };

  const getMimeType = () => {
    switch (exportFormat) {
      case 'txt':
        return 'text/plain';
      case 'json':
        return 'application/json';
      case 'markdown':
        return 'text/markdown';
      case 'html':
        return 'text/html';
      default:
        return 'text/plain';
    }
  };

  const getFileName = () => {
    const title = webContent.pageInfo.title || 'web-content';
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${safeTitle}.${exportFormat}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-blue-500">
          <h2 className="text-xl font-semibold text-white">导出网页内容</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出格式
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('txt')}
                className={`px-4 py-2 rounded-lg border ${exportFormat === 'txt' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                文本文件 (.txt)
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={`px-4 py-2 rounded-lg border ${exportFormat === 'json' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                JSON 文件 (.json)
              </button>
              <button
                onClick={() => setExportFormat('markdown')}
                className={`px-4 py-2 rounded-lg border ${exportFormat === 'markdown' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                Markdown 文件 (.md)
              </button>
              <button
                onClick={() => setExportFormat('html')}
                className={`px-4 py-2 rounded-lg border ${exportFormat === 'html' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                HTML 文件 (.html)
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预览
            </label>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-sm">
              <pre>{generateExportContent()}</pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isExporting}
          >
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebContentExport;
