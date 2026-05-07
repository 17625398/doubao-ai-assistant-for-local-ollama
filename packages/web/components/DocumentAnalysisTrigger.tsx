import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel'

interface DocumentAnalysisTriggerProps {
  className?: string
}

export const DocumentAnalysisTrigger: React.FC<DocumentAnalysisTriggerProps> = ({
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setShowPanel(true)}
        className={`
          flex items-center gap-3 px-6 py-4
          bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
          text-white rounded-2xl font-bold text-lg
          shadow-xl hover:shadow-2xl
          transition-all duration-300
          hover:scale-[1.02] hover:-translate-y-1
          active:scale-[0.98] active:translate-y-0
          ${className}
        `}
      >
        <FileText className="w-6 h-6" />
        文档智能分析
      </button>

      {/* 分析面板 */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <DocumentAnalysisPanel onClose={() => setShowPanel(false)} />
          </div>
        </div>
      )}
    </>
  )
}

export default DocumentAnalysisTrigger
