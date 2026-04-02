'use client';

import { useState, useRef } from 'react';

interface DataAnalysisPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export function DataAnalysisPanel({ onClose, onGenerate }: DataAnalysisPanelProps) {
  const [data, setData] = useState('');
  const [analysisType, setAnalysisType] = useState('summary');
  const [dataFormat, setDataFormat] = useState('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analysisTypes = [
    { value: 'summary', label: '数据摘要' },
    { value: 'trends', label: '趋势分析' },
    { value: 'correlation', label: '相关性分析' },
    { value: 'prediction', label: '预测分析' },
    { value: 'visualization', label: '数据可视化建议' },
    { value: 'anomaly', label: '异常检测' },
  ];

  const dataFormats = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'excel', label: 'Excel' },
    { value: 'table', label: '表格' },
    { value: 'text', label: '文本' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setData(content);
        // 尝试根据文件扩展名设置数据格式
        const fileName = file.name;
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension) {
          const formatMap: Record<string, string> = {
            csv: 'csv',
            json: 'json',
            xlsx: 'excel',
            xls: 'excel',
            txt: 'text',
          };
          if (formatMap[extension]) {
            setDataFormat(formatMap[extension]);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!data.trim()) return;

    let prompt = '';
    switch (analysisType) {
      case 'summary':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据进行摘要分析，包括数据结构、字段含义、数据量、基本统计信息等：\n\n${dataFormat}\n${data}\n`;
        break;
      case 'trends':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据进行趋势分析，识别数据中的趋势、模式和变化：\n\n${dataFormat}\n${data}\n`;
        break;
      case 'correlation':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据进行相关性分析，识别变量之间的关系：\n\n${dataFormat}\n${data}\n`;
        break;
      case 'prediction':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据进行预测分析，基于历史数据预测未来趋势：\n\n${dataFormat}\n${data}\n`;
        break;
      case 'visualization':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据提供数据可视化建议，包括适合的图表类型、可视化方案等：\n\n${dataFormat}\n${data}\n`;
        break;
      case 'anomaly':
        prompt = `请对以下${dataFormats.find(f => f.value === dataFormat)?.label}数据进行异常检测，识别数据中的异常值和异常模式：\n\n${dataFormat}\n${data}\n`;
        break;
      default:
        prompt = `请分析以下${dataFormats.find(f => f.value === dataFormat)?.label}数据：\n\n${dataFormat}\n${data}\n`;
    }

    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">数据分析</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">分析类型</label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {analysisTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">数据格式</label>
              <select
                value={dataFormat}
                onChange={(e) => setDataFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dataFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 文件上传 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">上传数据文件</label>
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

          {/* 数据输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">或直接输入数据</label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="请输入数据..."
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
            disabled={!data.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              data.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            开始分析
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataAnalysisPanel;