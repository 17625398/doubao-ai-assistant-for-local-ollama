'use client';

import { useState, useRef } from 'react';

interface CodeReviewPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export function CodeReviewPanel({ onClose, onGenerate }: CodeReviewPanelProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [reviewType, setReviewType] = useState('quality');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
  ];

  const reviewTypes = [
    { value: 'quality', label: '代码质量分析' },
    { value: 'security', label: '安全漏洞检测' },
    { value: 'performance', label: '性能优化建议' },
    { value: 'best-practices', label: '最佳实践检查' },
    { value: 'refactoring', label: '重构建议' },
    { value: 'documentation', label: '文档生成' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCode(content);
        // 尝试根据文件扩展名设置语言
        const fileName = file.name;
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension) {
          const languageMap: Record<string, string> = {
            js: 'javascript',
            ts: 'typescript',
            py: 'python',
            java: 'java',
            c: 'c',
            cpp: 'cpp',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            php: 'php',
            rb: 'ruby',
            swift: 'swift',
            kt: 'kotlin',
            html: 'html',
            css: 'css',
            json: 'json',
            xml: 'xml',
            yaml: 'yaml',
            yml: 'yaml',
            md: 'markdown',
          };
          if (languageMap[extension]) {
            setLanguage(languageMap[extension]);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!code.trim()) return;

    let prompt = '';
    switch (reviewType) {
      case 'quality':
        prompt = `请分析以下${languages.find(l => l.value === language)?.label}代码的质量，包括可读性、可维护性、潜在问题等，并提供改进建议：\n\n${language}\n${code}\n`;
        break;
      case 'security':
        prompt = `请分析以下${languages.find(l => l.value === language)?.label}代码的安全漏洞，包括注入攻击、XSS、CSRF等，并提供修复建议：\n\n${language}\n${code}\n`;
        break;
      case 'performance':
        prompt = `请分析以下${languages.find(l => l.value === language)?.label}代码的性能问题，包括时间复杂度、空间复杂度、内存使用等，并提供优化建议：\n\n${language}\n${code}\n`;
        break;
      case 'best-practices':
        prompt = `请检查以下${languages.find(l => l.value === language)?.label}代码是否符合最佳实践，包括代码风格、命名规范、设计模式等，并提供改进建议：\n\n${language}\n${code}\n`;
        break;
      case 'refactoring':
        prompt = `请分析以下${languages.find(l => l.value === language)?.label}代码，提供重构建议，使代码更加简洁、高效、可维护：\n\n${language}\n${code}\n`;
        break;
      case 'documentation':
        prompt = `请为以下${languages.find(l => l.value === language)?.label}代码生成详细的文档，包括函数说明、参数说明、返回值说明等：\n\n${language}\n${code}\n`;
        break;
      default:
        prompt = `请分析以下${languages.find(l => l.value === language)?.label}代码：\n\n${language}\n${code}\n`;
    }

    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">代码审查</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* 配置选项 */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">编程语言</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">审查类型</label>
              <select
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reviewTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 文件上传 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">上传代码文件</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                选择文件
              </button>
            </div>
          </div>

          {/* 代码输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">或直接输入代码</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入代码..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] font-mono text-sm"
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              code.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            开始审查
          </button>
        </div>
      </div>
    </div>
  );
}

export default CodeReviewPanel;