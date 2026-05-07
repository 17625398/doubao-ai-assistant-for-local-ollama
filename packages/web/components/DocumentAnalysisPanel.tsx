import React, { useState, useCallback } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { DocumentAnalyzer } from './DocumentAnalyzer'

interface DocumentAnalysisPanelProps {
  onClose?: () => void
  className?: string
}

export const DocumentAnalysisPanel: React.FC<DocumentAnalysisPanelProps> = ({
  onClose,
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 处理文件上传
  const handleFileUpload = useCallback((file: File) => {
    // 验证文件类型
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xls', '.xlsx']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('不支持的文件类型，请上传 PDF、Word、Excel 或文本文件')
      return
    }

    // 验证文件大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
      setError('文件过大，请上传小于 50MB 的文件')
      return
    }

    setSelectedFile(file)
    setError(null)
  }, [])

  // 处理拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  // 处理文件选择
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  return (
    <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-2xl font-bold">文档智能分析</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-white/80 text-sm">
          支持 PDF、Word、Excel、文本等多种格式，自动提取内容并进行深度语义分析
        </p>
      </div>

      <div className="p-6">
        {/* 文件上传区域 */}
        {!selectedFile ? (
          <div
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center transition-all
              ${dragOver
                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }
            `}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className={`w-16 h-16 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {dragOver ? '释放文件以上传' : '上传文档'}
            </h3>
            
            <p className="text-gray-600 mb-4">
              拖拽文件到此处，或点击下方按钮选择文件
            </p>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.xls,.xlsx"
              onChange={handleFileInputChange}
              className="hidden"
              id="document-upload"
            />
            
            <label
              htmlFor="document-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Upload className="w-5 h-5" />
              选择文件
            </label>

            <p className="mt-4 text-sm text-gray-500">
              支持 PDF、Word、Excel、文本文件（最大 50MB）
            </p>
          </div>
        ) : (
          /* 已选择文件 */
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 text-red-600 mt-0.5">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-900">上传失败</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 文档分析器 */}
        {selectedFile && !error && (
          <DocumentAnalyzer
            document={selectedFile}
            onAnalysisComplete={(result, llmResult) => {
              console.log('[DocumentAnalysisPanel] Analysis completed', {
                result,
                llmResultLength: llmResult?.length
              })
            }}
          />
        )}

        {/* 功能说明 */}
        <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">✨ 分析模式说明</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                📝 全文摘要
              </h4>
              <p className="text-sm text-gray-700">
                智能提取文档的核心内容和要点，生成简洁准确的摘要
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                📋 结构提取
              </h4>
              <p className="text-sm text-gray-700">
                分析文档的章节结构和层次关系，提取文档框架
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                🔑 关键信息
              </h4>
              <p className="text-sm text-gray-700">
                抽取实体、日期、数字等关键信息，快速定位重点
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                💬 问答模式
              </h4>
              <p className="text-sm text-gray-700">
                基于文档内容回答您的问题，深入理解文档细节
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200 md:col-span-2">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                ⚖️ 对比分析
              </h4>
              <p className="text-sm text-gray-700">
                对比多个文档的异同点，分析各文档的特点和侧重点
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentAnalysisPanel
