import React, { useState, useCallback } from 'react'
import { FileText, Sparkles, List, Key, MessageCircle, GitCompare, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { DocumentAnalysisService, type DocumentContent, type AnalysisResult } from '@core/services/document-analysis-service'

// 分析模式类型
export type AnalysisModeType = 'summary' | 'structure' | 'extraction' | 'qa' | 'compare'

// 组件 Props
interface DocumentAnalyzerProps {
  document: File
  onAnalysisComplete?: (result: AnalysisResult, llmResult: string) => void
  className?: string
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({
  document,
  onAnalysisComplete,
  className = ''
}) => {
  const [selectedMode, setSelectedMode] = useState<AnalysisModeType>('summary')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [llmResult, setLlmResult] = useState<string | null>(null)
  const [parsedContent, setParsedContent] = useState<DocumentContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState('')

  // 分析模式配置
  const analysisModes = [
    {
      id: 'summary' as AnalysisModeType,
      label: '全文摘要',
      icon: Sparkles,
      description: '提取文档的核心内容和要点',
      color: 'blue'
    },
    {
      id: 'structure' as AnalysisModeType,
      label: '结构提取',
      icon: List,
      description: '分析文档的章节结构和层次关系',
      color: 'purple'
    },
    {
      id: 'extraction' as AnalysisModeType,
      label: '关键信息',
      icon: Key,
      description: '抽取实体、日期、数字等关键信息',
      color: 'green'
    },
    {
      id: 'qa' as AnalysisModeType,
      label: '问答模式',
      icon: MessageCircle,
      description: '基于文档内容回答问题',
      color: 'orange'
    },
    {
      id: 'compare' as AnalysisModeType,
      label: '对比分析',
      icon: GitCompare,
      description: '对比多个文档的异同点',
      color: 'red'
    }
  ]

  // 解析文档
  const parseDocument = useCallback(async () => {
    setParsing(true)
    setError(null)
    
    try {
      const service = new DocumentAnalysisService()
      const content = await service.parseDocument(document)
      setParsedContent(content)
      logger.info('[DocumentAnalyzer] Document parsed successfully', {
        name: document.name,
        size: document.size,
        textLength: content.text.length
      })
      return content
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '文档解析失败'
      setError(errorMsg)
      logger.error('[DocumentAnalyzer] Document parsing failed:', error)
      return null
    } finally {
      setParsing(false)
    }
  }, [document])

  // 执行分析（使用 LLM 进行语义分析）
  const performAnalysis = useCallback(async () => {
    setLoading(true)
    setParsing(true)
    setError(null)

    try {
      const service = new DocumentAnalysisService()
      
      // 使用 fullAnalysis 方法进行完整分析流程
      const { content, llmResult, analysisResult } = await service.fullAnalysis(
        document,
        selectedMode,
        selectedMode === 'qa' ? customQuestion : undefined
      )

      setParsedContent(content)
      setLlmResult(llmResult)
      setAnalysisResult(analysisResult)
      onAnalysisComplete?.(analysisResult, llmResult)
      
      logger.info('[DocumentAnalyzer] Full analysis completed', {
        mode: selectedMode,
        textLength: content.text.length,
        resultLength: llmResult.length
      })

      return { content, llmResult, analysisResult }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '分析失败'
      setError(errorMsg)
      logger.error('[DocumentAnalyzer] Analysis failed:', error)
      return null
    } finally {
      setLoading(false)
      setParsing(false)
    }
  }, [selectedMode, document, customQuestion, onAnalysisComplete])

  // 渲染分析结果
  const renderResult = () => {
    if (!llmResult) return null

    return (
      <div className="space-y-6">
        {/* LLM 完整分析结果 */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
          <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI 分析结果
          </h3>
          <div className="text-purple-800 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
            {llmResult}
          </div>
        </div>

        {/* 结构化摘要（如果有） */}
        {analysisResult && analysisResult.summary && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              结构化摘要
            </h3>
            <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
              {analysisResult.summary}
            </p>
          </div>
        )}

        {/* 关键点 */}
        {analysisResult && analysisResult.keyPoints && analysisResult.keyPoints.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
              <List className="w-5 h-5" />
              关键点
            </h3>
            <ul className="space-y-2">
              {analysisResult.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-purple-800">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-900">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 主题 */}
        {analysisResult && analysisResult.topics && analysisResult.topics.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5" />
              主题词
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysisResult.topics.map((topic, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-green-100 text-green-900 rounded-full text-sm font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 实体 */}
        {analysisResult && analysisResult.entities && analysisResult.entities.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              识别的实体
            </h3>
            <div className="space-y-3">
              {analysisResult.entities.map((entity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded text-sm font-medium">
                    {entity.type}
                  </span>
                  <span className="text-orange-800">{entity.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl ${className}`}>
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6" />
          <h2 className="text-xl font-bold">文档分析</h2>
        </div>
        <p className="text-white/80 text-sm">
          文件：{document.name} ({(document.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      </div>

      <div className="p-6">
        {/* 分析模式选择 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">选择分析模式</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysisModes.map((mode) => {
              const Icon = mode.icon
              const isSelected = selectedMode === mode.id
              
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${isSelected
                      ? `border-${mode.color}-500 bg-${mode.color}-50 shadow-lg scale-[1.02]`
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                    }
                  `}
                >
                  {isSelected && (
                    <div className={`absolute -top-2 -right-2 w-6 h-6 bg-${mode.color}-500 rounded-full flex items-center justify-center`}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`w-10 h-10 rounded-lg bg-${mode.color}-100 flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 text-${mode.color}-600`} />
                  </div>
                  
                  <h4 className="font-bold text-gray-900 mb-1">{mode.label}</h4>
                  <p className="text-sm text-gray-600">{mode.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 问答模式的自定义问题输入 */}
        {selectedMode === 'qa' && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-orange-600" />
              输入您的问题
            </h3>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="请输入您想基于文档内容的问题，例如：&#10;- 这篇文档的主要观点是什么？&#10;- 文档中提到的关键数据有哪些？&#10;- 作者的核心论点是什么？"
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all resize-none"
              rows={4}
            />
          </div>
        )}

        {/* 分析按钮 */}
        <button
          onClick={performAnalysis}
          disabled={loading || parsing}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
            ${loading || parsing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            }
            text-white
          `}
        >
          {loading || parsing ? (
            <span className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              {parsing ? '正在解析文档...' : '正在分析...'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              开始分析
            </span>
          )}
        </button>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">分析失败</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 分析结果 */}
        {analysisResult && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              分析结果
            </h3>
            {renderResult()}
          </div>
        )}
      </div>
    </div>
  )
}

// Logger (简单实现)
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[DocumentAnalyzer] ${message}`, data || '')
  },
  error: (message: string, error?: any) => {
    console.error(`[DocumentAnalyzer] ${message}`, error || '')
  },
  warn: (message: string, data?: any) => {
    console.warn(`[DocumentAnalyzer] ${message}`, data || '')
  }
}

export default DocumentAnalyzer
