import { useRef, useEffect, useCallback, useState } from 'react';
import { Button, Switch } from 'tdesign-react';
import { FullscreenExitIcon, FullscreenIcon } from 'tdesign-icons-react';
import { useStore } from '../store/useStore';
import { getAllColors } from '../data/beadColors';
import { renderPixelGrid, createColorMap } from '../utils/canvasRenderer';

const CELL_SIZE = 25;

export function DisplayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pixelData = useStore((s) => s.pixelData);
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const setZoom = useStore((s) => s.setZoom);
  const setPan = useStore((s) => s.setPan);
  const setShowColorCode = useStore((s) => s.setShowColorCode);
  const setFullscreen = useStore((s) => s.setFullscreen);
  const setShowColorStats = useStore((s) => s.setShowColorStats);

  const colors = getAllColors(config.brand);
  const colorMap = createColorMap(colors);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStart = useRef<{ x: number; y: number; dist: number } | null>(null);

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
      showColorCode: ui.showColorCode,
      highlightColorId: ui.highlightColorId,
      selectedCell: null,
      showHighlightBorder: false, // 展示模式不显示高亮边框
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

  // 全屏切换
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: ui.panX,
      panY: ui.panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: ui.panX,
        panY: ui.panY,
      };
    } else if (e.touches.length === 2) {
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
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
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
    setIsDragging(false);
    touchStart.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-gray-900 overflow-hidden relative"
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
        className="block cursor-grab active:cursor-grabbing"
      />

      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">显示色号</span>
          <Switch
            value={ui.showColorCode}
            onChange={(val) => setShowColorCode(val as boolean)}
            size="small"
          />
        </div>

        <div className="w-px h-4 bg-white/20" />

        <div className="flex items-center gap-2">
          <span className="text-white text-sm">统计面板</span>
          <Switch
            value={ui.showColorStats}
            onChange={(val) => setShowColorStats(val as boolean)}
            size="small"
          />
        </div>

        <div className="w-px h-4 bg-white/20" />

        <Button
          variant="text"
          theme="default"
          size="small"
          icon={ui.isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          onClick={toggleFullscreen}
          className="!text-white hover:!bg-white/10"
        >
          {ui.isFullscreen ? '退出全屏' : '全屏'}
        </Button>
      </div>

      {/* 缩放指示 */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm">
        缩放: {Math.round(ui.zoom * 100)}%
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white/70 text-xs">
        拖拽移动 · 滚轮缩放 · 双指缩放
      </div>
    </div>
  );
}
