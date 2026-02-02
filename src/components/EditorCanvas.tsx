import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';
import { getAllColors } from '../data/beadColors';
import { renderPixelGrid, screenToPixel, createColorMap } from '../utils/canvasRenderer';

const CELL_SIZE = 20;

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);

  const pixelData = useStore((s) => s.pixelData);
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const setPixel = useStore((s) => s.setPixel);
  const fillArea = useStore((s) => s.fillArea);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const setSelectedColor = useStore((s) => s.setSelectedColor);

  const colors = getAllColors(config.brand);
  const colorMap = createColorMap(colors);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  
  // 记录上一次的像素数据尺寸，用于检测尺寸变化
  const lastSizeRef = useRef({ width: 0, height: 0 });

  // 计算适合的缩放比例
  const calculateFitZoom = useCallback(() => {
    const container = containerRef.current;
    if (!container || pixelData.length === 0) return 1;

    const rect = container.getBoundingClientRect();
    const gridWidth = pixelData[0].length * CELL_SIZE;
    const gridHeight = pixelData.length * CELL_SIZE;

    // 留出一些边距
    const padding = 40;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;

    // 取较小的缩放比例，确保完整显示
    return Math.min(scaleX, scaleY, 2); // 最大不超过 2 倍
  }, [pixelData]);

  // 当像素数据尺寸变化时，自动调整缩放
  useEffect(() => {
    if (pixelData.length === 0) return;
    
    const currentWidth = pixelData[0]?.length || 0;
    const currentHeight = pixelData.length;
    
    // 检测尺寸是否变化
    if (lastSizeRef.current.width !== currentWidth || lastSizeRef.current.height !== currentHeight) {
      lastSizeRef.current = { width: currentWidth, height: currentHeight };
      
      // 延迟一帧执行，确保容器尺寸已更新
      requestAnimationFrame(() => {
        const fitZoom = calculateFitZoom();
        setZoom(fitZoom);
        setPan(0, 0); // 重置平移，居中显示
      });
    }
  }, [pixelData, calculateFitZoom, setZoom, setPan]);

  // 渲染
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderPixelGrid(ctx, {
      pixelData,
      colorMap,
      cellSize: CELL_SIZE,
      zoom: ui.zoom,
      panX: ui.panX,
      panY: ui.panY,
      showGrid: true,
      showColorCode: ui.showColorCode && ui.zoom >= 0.8,
      highlightColorId: ui.highlightColorId,
      selectedCell: null,
    });
  }, [pixelData, colorMap, ui.zoom, ui.panX, ui.panY, ui.showColorCode, ui.highlightColorId]);

  // 调整画布大小
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    render();
  }, [render]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    render();
  }, [render]);

  // 使用原生事件监听器处理 wheel 事件，设置 passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const currentZoom = useStore.getState().ui.zoom;
      setZoom(currentZoom * delta);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  // 获取像素坐标
  const getPixelAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return screenToPixel(clientX, clientY, canvas, {
      pixelData,
      cellSize: CELL_SIZE,
      zoom: ui.zoom,
      panX: ui.panX,
      panY: ui.panY,
    });
  };

  // 处理绘制
  const handleDraw = (clientX: number, clientY: number) => {
    const pixel = getPixelAt(clientX, clientY);
    if (!pixel) return;

    // 防止重复绘制同一个像素
    if (lastPixel.current?.x === pixel.x && lastPixel.current?.y === pixel.y) {
      return;
    }
    lastPixel.current = pixel;

    if (ui.currentTool === 'brush' && ui.selectedColorId) {
      setPixel(pixel.x, pixel.y, ui.selectedColorId);
    } else if (ui.currentTool === 'bucket' && ui.selectedColorId) {
      fillArea(pixel.x, pixel.y, ui.selectedColorId);
    } else if (ui.currentTool === 'eyedropper') {
      const colorId = pixelData[pixel.y]?.[pixel.x];
      if (colorId) {
        setSelectedColor(colorId);
      }
    }
  };

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && ui.currentTool === 'move')) {
      // 中键或 Alt+左键 或移动工具: 拖拽
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: ui.panX,
        panY: ui.panY,
      };
    } else if (e.button === 0) {
      // 左键: 绘制
      isDrawing.current = true;
      lastPixel.current = null;
      handleDraw(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
    } else if (isDrawing.current) {
      handleDraw(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    setIsDragging(false);
    lastPixel.current = null;
  };

  // 触摸事件
  const touchStart = useRef<{ x: number; y: number; dist: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (ui.currentTool === 'move') {
        // 移动工具：单指拖拽
        setIsDragging(true);
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: ui.panX,
          panY: ui.panY,
        };
      } else {
        // 单指绘制
        isDrawing.current = true;
        lastPixel.current = null;
        handleDraw(e.touches[0].clientX, e.touches[0].clientY);
      }
    } else if (e.touches.length === 2) {
      // 双指缩放/平移
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStart.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx * dx + dy * dy),
      };
      dragStart.current = { x: 0, y: 0, panX: ui.panX, panY: ui.panY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (isDragging) {
        // 移动工具拖拽
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
      } else if (isDrawing.current) {
        handleDraw(e.touches[0].clientX, e.touches[0].clientY);
      }
    } else if (e.touches.length === 2 && touchStart.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / touchStart.current.dist;
      setZoom(ui.zoom * scale);
      touchStart.current.dist = dist;

      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const pdx = cx - touchStart.current.x;
      const pdy = cy - touchStart.current.y;
      setPan(dragStart.current.panX + pdx, dragStart.current.panY + pdy);
    }
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
    setIsDragging(false);
    touchStart.current = null;
    lastPixel.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-100 overflow-hidden"
      style={{ 
        cursor: isDragging 
          ? 'grabbing' 
          : ui.currentTool === 'move' 
            ? 'grab' 
            : ui.currentTool === 'brush' 
              ? 'crosshair' 
              : 'default' 
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="block"
      />
    </div>
  );
}
