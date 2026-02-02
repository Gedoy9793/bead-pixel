import { useState, useCallback, useRef, useEffect } from 'react';

interface GestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  initialPinchDistance: number;
  initialZoom: number;
}

interface UseGestureOptions {
  zoom: number;
  panX: number;
  panY: number;
  onZoomChange: (zoom: number) => void;
  onPanChange: (x: number, y: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function useGesture(options: UseGestureOptions) {
  const {
    zoom,
    panX,
    panY,
    onZoomChange,
    onPanChange,
    minZoom = 0.1,
    maxZoom = 10,
  } = options;

  const gestureRef = useRef<GestureState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    initialPinchDistance: 0,
    initialZoom: 1,
  });

  const [isDragging, setIsDragging] = useState(false);

  // 计算两个触摸点之间的距离
  const getPinchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只处理左键
    
    gestureRef.current = {
      ...gestureRef.current,
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: panX,
      lastY: panY,
    };
    setIsDragging(true);
  }, [panX, panY]);

  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gestureRef.current.isDragging) return;

    const dx = e.clientX - gestureRef.current.startX;
    const dy = e.clientY - gestureRef.current.startY;
    
    onPanChange(gestureRef.current.lastX + dx, gestureRef.current.lastY + dy);
  }, [onPanChange]);

  // 鼠标抬起
  const handleMouseUp = useCallback(() => {
    gestureRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * delta));
    
    onZoomChange(newZoom);
  }, [zoom, minZoom, maxZoom, onZoomChange]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 单指拖拽
      gestureRef.current = {
        ...gestureRef.current,
        isDragging: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        lastX: panX,
        lastY: panY,
      };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      // 双指缩放
      const distance = getPinchDistance(e.touches);
      gestureRef.current = {
        ...gestureRef.current,
        isDragging: false,
        initialPinchDistance: distance,
        initialZoom: zoom,
      };
      setIsDragging(false);
    }
  }, [panX, panY, zoom]);

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && gestureRef.current.isDragging) {
      // 单指拖拽
      const dx = e.touches[0].clientX - gestureRef.current.startX;
      const dy = e.touches[0].clientY - gestureRef.current.startY;
      
      onPanChange(gestureRef.current.lastX + dx, gestureRef.current.lastY + dy);
    } else if (e.touches.length === 2 && gestureRef.current.initialPinchDistance > 0) {
      // 双指缩放
      const distance = getPinchDistance(e.touches);
      const scale = distance / gestureRef.current.initialPinchDistance;
      const newZoom = Math.max(
        minZoom,
        Math.min(maxZoom, gestureRef.current.initialZoom * scale)
      );
      
      onZoomChange(newZoom);
    }
  }, [minZoom, maxZoom, onPanChange, onZoomChange]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    gestureRef.current.isDragging = false;
    gestureRef.current.initialPinchDistance = 0;
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onWheel: handleWheel,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
