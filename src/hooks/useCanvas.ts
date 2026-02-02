import { useRef, useEffect, useCallback } from 'react';
import { PixelData, BeadColor } from '../types';
import { renderPixelGrid, screenToPixel, createColorMap, RenderOptions } from '../utils/canvasRenderer';

interface UseCanvasOptions {
  pixelData: PixelData;
  colors: BeadColor[];
  cellSize: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showColorCode: boolean;
  highlightColorId: string | null;
}

export function useCanvas(options: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorMapRef = useRef<Map<string, BeadColor>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  const {
    pixelData,
    colors,
    cellSize,
    zoom,
    panX,
    panY,
    showGrid,
    showColorCode,
    highlightColorId,
  } = options;

  // 更新颜色映射
  useEffect(() => {
    colorMapRef.current = createColorMap(colors);
  }, [colors]);

  // 渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 取消之前的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 使用 requestAnimationFrame 优化渲染
    animationFrameRef.current = requestAnimationFrame(() => {
      renderPixelGrid(ctx, {
        pixelData,
        colorMap: colorMapRef.current,
        cellSize,
        zoom,
        panX,
        panY,
        showGrid,
        showColorCode,
        highlightColorId,
        selectedCell: null,
      });
    });
  }, [pixelData, cellSize, zoom, panX, panY, showGrid, showColorCode, highlightColorId]);

  // 监听变化并重新渲染
  useEffect(() => {
    render();
  }, [render]);

  // 获取像素坐标
  const getPixelCoord = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      return screenToPixel(clientX, clientY, canvas, {
        pixelData,
        cellSize,
        zoom,
        panX,
        panY,
      });
    },
    [pixelData, cellSize, zoom, panX, panY]
  );

  // 调整 Canvas 大小
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    render();
  }, [render]);

  // 监听窗口大小变化
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resizeCanvas]);

  return {
    canvasRef,
    render,
    getPixelCoord,
    resizeCanvas,
    colorMap: colorMapRef.current,
  };
}
