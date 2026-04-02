import React from 'react';

interface DocumentProcessingStatusProps {
  isProcessing: boolean;
  progress: number;
  status: string;
  error?: string;
}

export const DocumentProcessingStatus: React.FC<DocumentProcessingStatusProps> = ({
  isProcessing,
  progress,
  status,
  error,
}) => {
  if (!isProcessing && !error) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-lg border">
      {error ? (
        <div className="flex items-center gap-2 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.266-1.667-.266-2.43 0L3.34 16c-.77 2.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">处理失败</span>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{status}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentProcessingStatus;