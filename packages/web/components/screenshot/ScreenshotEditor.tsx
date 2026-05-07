'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Check, Pencil, Square, Circle, Type, 
  Trash2, Undo, Redo, ZoomIn, ZoomOut, Move
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text';
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
}

interface ScreenshotEditorProps {
  imageDataUrl: string;
  onSave: (imageDataUrl: string) => void;
  onCancel: () => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

export const ScreenshotEditor: React.FC<ScreenshotEditorProps> = ({ imageDataUrl, onSave, onCancel }) => {
  const [tool, setTool] = useState<'select' | 'line' | 'rectangle' | 'circle' | 'text'>('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      redrawCanvas();
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.drawImage(imageRef.current, position.x, position.y);

    shapes.forEach((shape) => {
      ctx!.strokeStyle = shape.color;
      ctx!.fillStyle = shape.color;
      ctx!.lineWidth = shape.strokeWidth;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';

      switch (shape.type) {
        case 'line':
          if (shape.points.length >= 2) {
            ctx!.beginPath();
            ctx!.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx!.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx!.stroke();
          }
          break;

        case 'rectangle':
          if (shape.points.length >= 2) {
            const x = Math.min(shape.points[0].x, shape.points[1].x);
            const y = Math.min(shape.points[0].y, shape.points[1].y);
            const width = Math.abs(shape.points[1].x - shape.points[0].x);
            const height = Math.abs(shape.points[1].y - shape.points[0].y);
            ctx!.strokeRect(x, y, width, height);
          }
          break;

        case 'circle':
          if (shape.points.length >= 2) {
            const x = (shape.points[0].x + shape.points[1].x) / 2;
            const y = (shape.points[0].y + shape.points[1].y) / 2;
            const radius = Math.sqrt(
              Math.pow(shape.points[1].x - shape.points[0].x, 2) +
              Math.pow(shape.points[1].y - shape.points[0].y, 2)
            );
            ctx!.beginPath();
            ctx!.arc(x, y, radius, 0, Math.PI * 2);
            ctx!.stroke();
          }
          break;

        case 'text':
          if (shape.text && shape.points.length >= 1) {
            ctx!.font = `${shape.strokeWidth * 4}px sans-serif`;
            ctx!.fillText(shape.text, shape.points[0].x, shape.points[0].y);
          }
          break;
      }
    });

    if (currentShape) {
      ctx.strokeStyle = currentShape.color;
      ctx.fillStyle = currentShape.color;
      ctx.lineWidth = currentShape.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (currentShape.type) {
        case 'line':
          if (currentShape.points.length >= 1) {
            ctx.beginPath();
            ctx.moveTo(currentShape.points[0].x, currentShape.points[0].y);
            for (let i = 1; i < currentShape.points.length; i++) {
              ctx.lineTo(currentShape.points[i].x, currentShape.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
        case 'circle':
          if (currentShape.points.length >= 2) {
            if (currentShape.type === 'rectangle') {
              const x = Math.min(currentShape.points[0].x, currentShape.points[1].x);
              const y = Math.min(currentShape.points[0].y, currentShape.points[1].y);
              const width = Math.abs(currentShape.points[1].x - currentShape.points[0].x);
              const height = Math.abs(currentShape.points[1].y - currentShape.points[0].y);
              ctx.strokeRect(x, y, width, height);
            } else {
              const x = (currentShape.points[0].x + currentShape.points[1].x) / 2;
              const y = (currentShape.points[0].y + currentShape.points[1].y) / 2;
              const radius = Math.sqrt(
                Math.pow(currentShape.points[1].x - currentShape.points[0].x, 2) +
                Math.pow(currentShape.points[1].y - currentShape.points[0].y, 2)
              );
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          break;
      }
    }
    ctx.restore();
  }, [shapes, currentShape, zoom, position]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...shapes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, shapes]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - position.x;
    const y = (e.clientY - rect.top) / zoom - position.y;

    if (tool === 'select') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      return;
    }

    if (tool === 'text') {
      setTextPosition({ x, y });
      return;
    }

    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type: tool,
      points: [{ x, y }],
      color,
      strokeWidth,
    };
    setCurrentShape(newShape);
  }, [tool, color, strokeWidth, zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    if (!currentShape) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - position.x;
    const y = (e.clientY - rect.top) / zoom - position.y;

    if (currentShape.type === 'line') {
      setCurrentShape({
        ...currentShape,
        points: [...currentShape.points, { x, y }],
      });
    } else {
      setCurrentShape({
        ...currentShape,
        points: [currentShape.points[0], { x, y }],
      });
    }
  }, [isDragging, dragStart, currentShape, zoom, position]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (currentShape && currentShape.points.length >= (currentShape.type === 'line' ? 2 : 1)) {
      saveToHistory();
      setShapes([...shapes, currentShape]);
    }
    setCurrentShape(null);
  }, [isDragging, currentShape, shapes, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes([...history[newIndex]]);
    }
  }, [history, historyIndex]);

  const handleClear = useCallback(() => {
    saveToHistory();
    setShapes([]);
  }, [saveToHistory]);

  const handleSave = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = imageRef.current?.width || 800;
    canvas.height = imageRef.current?.height || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current) return;

    ctx.drawImage(imageRef.current, 0, 0);

    shapes.forEach((shape) => {
      ctx!.strokeStyle = shape.color;
      ctx!.fillStyle = shape.color;
      ctx!.lineWidth = shape.strokeWidth;
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';

      switch (shape.type) {
        case 'line':
          if (shape.points.length >= 2) {
            ctx!.beginPath();
            ctx!.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx!.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx!.stroke();
          }
          break;

        case 'rectangle':
          if (shape.points.length >= 2) {
            const x = Math.min(shape.points[0].x, shape.points[1].x);
            const y = Math.min(shape.points[0].y, shape.points[1].y);
            const width = Math.abs(shape.points[1].x - shape.points[0].x);
            const height = Math.abs(shape.points[1].y - shape.points[0].y);
            ctx!.strokeRect(x, y, width, height);
          }
          break;

        case 'circle':
          if (shape.points.length >= 2) {
            const x = (shape.points[0].x + shape.points[1].x) / 2;
            const y = (shape.points[0].y + shape.points[1].y) / 2;
            const radius = Math.sqrt(
              Math.pow(shape.points[1].x - shape.points[0].x, 2) +
              Math.pow(shape.points[1].y - shape.points[0].y, 2)
            );
            ctx!.beginPath();
            ctx!.arc(x, y, radius, 0, Math.PI * 2);
            ctx!.stroke();
          }
          break;

        case 'text':
          if (shape.text && shape.points.length >= 1) {
            ctx!.font = `${shape.strokeWidth * 4}px sans-serif`;
            ctx!.fillText(shape.text, shape.points[0].x, shape.points[0].y);
          }
          break;
      }
    });

    onSave(canvas.toDataURL('image/png'));
  }, [shapes, onSave]);

  const handleTextConfirm = useCallback(() => {
    if (textInput && textPosition) {
      const newShape: Shape = {
        id: `shape-${Date.now()}`,
        type: 'text',
        points: [textPosition],
        color,
        strokeWidth,
        text: textInput,
      };
      saveToHistory();
      setShapes([...shapes, newShape]);
    }
    setTextInput('');
    setTextPosition(null);
  }, [textInput, textPosition, color, strokeWidth, shapes, saveToHistory]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl w-full max-w-6xl border border-[var(--theme-border-secondary)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">截图编辑器</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors disabled:opacity-50"
              title="撤销"
            >
              <Undo size={18} className="text-[var(--theme-text-tertiary)]" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors disabled:opacity-50"
              title="重做"
            >
              <Redo size={18} className="text-[var(--theme-text-tertiary)]" />
            </button>
            <button
              onClick={handleClear}
              disabled={shapes.length === 0}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors disabled:opacity-50"
              title="清除全部"
            >
              <Trash2 size={18} className="text-[var(--theme-text-tertiary)]" />
            </button>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              <X size={20} className="text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-[var(--theme-border-secondary)]">
          <div className="flex items-center gap-1 p-2">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded-lg transition-colors ${
                tool === 'select' ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]' : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
              title="选择/移动"
            >
              <Move size={18} />
            </button>
            <button
              onClick={() => setTool('line')}
              className={`p-2 rounded-lg transition-colors ${
                tool === 'line' ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]' : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
              title="画笔"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setTool('rectangle')}
              className={`p-2 rounded-lg transition-colors ${
                tool === 'rectangle' ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]' : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
              title="矩形"
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-2 rounded-lg transition-colors ${
                tool === 'circle' ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]' : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
              title="圆形"
            >
              <Circle size={18} />
            </button>
            <button
              onClick={() => setTool('text')}
              className={`p-2 rounded-lg transition-colors ${
                tool === 'text' ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]' : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)]'
              }`}
              title="文字"
            >
              <Type size={18} />
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 p-2">
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-offset-2 ring-[var(--theme-accent-primary)]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-[var(--theme-text-tertiary)]">粗细</span>
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-20 accent-[var(--theme-accent-primary)]"
              />
              <span className="text-xs text-[var(--theme-text-tertiary)] w-8">{strokeWidth}px</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                title="缩小"
              >
                <ZoomOut size={16} className="text-[var(--theme-text-tertiary)]" />
              </button>
              <span className="text-xs text-[var(--theme-text-tertiary)] w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                title="放大"
              >
                <ZoomIn size={16} className="text-[var(--theme-text-tertiary)]" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            ref={containerRef}
            className="flex justify-center items-center min-h-full"
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-[var(--theme-border-secondary)] rounded-xl bg-[var(--theme-bg-primary)] cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--theme-border-secondary)]">
          {textPosition && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入文字..."
                className="px-3 py-2 border border-[var(--theme-border-secondary)] rounded-lg bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]"
                onKeyDown={(e) => e.key === 'Enter' && handleTextConfirm()}
                autoFocus
              />
              <button
                onClick={handleTextConfirm}
                className="p-2 rounded-lg bg-[var(--theme-accent-primary)] text-white hover:bg-[var(--theme-accent-primary)]/90 transition-colors"
              >
                <Check size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] font-medium hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--theme-accent-primary)] text-white font-medium hover:bg-[var(--theme-accent-primary)]/90 transition-colors"
            >
              <Check size={16} />
              保存
            </button>
          </div>
        </div>

        {textPosition && (
          <div
            className="fixed bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-lg shadow-xl p-2"
            style={{
              left: textPosition.x * zoom + position.x + 20,
              top: textPosition.y * zoom + position.y + 20,
            }}
          >
            <span className="text-xs text-[var(--theme-text-tertiary)]">点击画布放置文字</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenshotEditor;