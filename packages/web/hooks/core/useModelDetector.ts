'use client';

import { useState, useCallback } from 'react';

export interface DetectedModel {
  name: string;
  model: string;
  modified_at: string;
  size: string;
  digest: string;
  details?: {
    parameter_size: string;
    quantization_level: string;
  };
}

export type DetectionStatus = 'idle' | 'detecting' | 'success' | 'error';

export interface UseModelDetectorReturn {
  status: DetectionStatus;
  detectedModels: DetectedModel[];
  error: string | null;
  detectModels: (endpoint: string) => Promise<void>;
  clearDetection: () => void;
}

export const useModelDetector = (): UseModelDetectorReturn => {
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [detectedModels, setDetectedModels] = useState<DetectedModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const detectModels = useCallback(async (endpoint: string) => {
    setStatus('detecting');
    setError(null);

    try {
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        setDetectedModels(data.models);
        setStatus('success');
      } else {
        setDetectedModels([]);
        setStatus('success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法连接到模型服务');
      setStatus('error');
    }
  }, []);

  const clearDetection = useCallback(() => {
    setStatus('idle');
    setDetectedModels([]);
    setError(null);
  }, []);

  return {
    status,
    detectedModels,
    error,
    detectModels,
    clearDetection,
  };
};
