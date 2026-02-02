import { PixelData, BeadColor } from '../types';
import { getContrastColor, hexToRgb } from './colorUtils';

export interface RenderOptions {
  pixelData: PixelData;
  colorMap: Map<string, BeadColor>;
  cellSize: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showColorCode: boolean;
  highlightColorId: string | null;
  selectedCell: { x: number; y: number } | null;
  showHighlightBorder?: boolean; // 是否显示高亮边框，默认 true
}

/**
 * 渲染像素网格到 Canvas
 */
export function renderPixelGrid(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions
): void {
  const {
    pixelData,
    colorMap,
    cellSize,
    zoom,
    panX,
    panY,
    showGrid,
    showColorCode,
    highlightColorId,
    selectedCell,
    showHighlightBorder = true,
  } = options;

  const height = pixelData.length;
  const width = height > 0 ? pixelData[0].length : 0;
  
  const canvas = ctx.canvas;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // 清空画布
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 保存上下文状态
  ctx.save();
  
  // 应用变换：先平移到画布中心，然后缩放，最后平移到偏移位置
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const gridWidth = width * cellSize;
  const gridHeight = height * cellSize;
  
  ctx.translate(centerX + panX, centerY + panY);
  ctx.scale(zoom, zoom);
  ctx.translate(-gridWidth / 2, -gridHeight / 2);

  // 绘制背景（棋盘格，表示透明）
  const checkerSize = cellSize / 2;
  ctx.fillStyle = '#e0e0e0';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x * cellSize;
      const py = y * cellSize;
      
      // 绘制棋盘格
      for (let cy = 0; cy < 2; cy++) {
        for (let cx = 0; cx < 2; cx++) {
          if ((cx + cy) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = '#e0e0e0';
          }
          ctx.fillRect(
            px + cx * checkerSize,
            py + cy * checkerSize,
            checkerSize,
            checkerSize
          );
        }
      }
    }
  }

  // 绘制像素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorId = pixelData[y][x];
      if (!colorId) continue;
      
      const color = colorMap.get(colorId);
      if (!color) continue;

      const px = x * cellSize;
      const py = y * cellSize;
      
      // 绘制像素颜色
      ctx.fillStyle = color.hex;
      ctx.fillRect(px, py, cellSize, cellSize);

      // 高亮效果
      if (highlightColorId && colorId !== highlightColorId) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(px, py, cellSize, cellSize);
      }
    }
  }

  // 绘制网格线
  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    
    // 垂直线
    for (let x = 0; x <= width; x++) {
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, height * cellSize);
    }
    
    // 水平线
    for (let y = 0; y <= height; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(width * cellSize, y * cellSize);
    }
    
    ctx.stroke();
  }

  // 绘制色号文字
  if (showColorCode && cellSize * zoom >= 20) {
    const fontSize = Math.max(8, Math.min(cellSize * 0.35, 14));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorId = pixelData[y][x];
        if (!colorId) continue;
        
        const color = colorMap.get(colorId);
        if (!color) continue;

        // 如果有高亮且不是高亮颜色，跳过
        if (highlightColorId && colorId !== highlightColorId) continue;

        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        
        // 根据背景色选择文字颜色
        ctx.fillStyle = getContrastColor(color.rgb);
        ctx.fillText(color.code, px, py);
      }
    }
  }

  // 绘制选中单元格高亮
  if (selectedCell) {
    const { x, y } = selectedCell;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      ctx.strokeStyle = '#0052D9';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeRect(
        x * cellSize + 1 / zoom,
        y * cellSize + 1 / zoom,
        cellSize - 2 / zoom,
        cellSize - 2 / zoom
      );
    }
  }

  // 绘制高亮颜色的边框（仅在启用时）
  if (highlightColorId && showHighlightBorder) {
    ctx.strokeStyle = '#E34D59';
    ctx.lineWidth = 2 / zoom;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorId = pixelData[y][x];
        if (colorId === highlightColorId) {
          ctx.strokeRect(
            x * cellSize + 1 / zoom,
            y * cellSize + 1 / zoom,
            cellSize - 2 / zoom,
            cellSize - 2 / zoom
          );
        }
      }
    }
  }

  // 恢复上下文状态
  ctx.restore();
}

/**
 * 将屏幕坐标转换为像素坐标
 */
export function screenToPixel(
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement,
  options: {
    pixelData: PixelData;
    cellSize: number;
    zoom: number;
    panX: number;
    panY: number;
  }
): { x: number; y: number } | null {
  const { pixelData, cellSize, zoom, panX, panY } = options;
  
  const height = pixelData.length;
  const width = height > 0 ? pixelData[0].length : 0;
  
  const rect = canvas.getBoundingClientRect();
  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;
  
  // 计算像素坐标（考虑缩放比例）
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const gridWidth = width * cellSize;
  const gridHeight = height * cellSize;

  // 反向变换
  const x = ((canvasX * scaleX - centerX - panX) / zoom + gridWidth / 2) / cellSize;
  const y = ((canvasY * scaleY - centerY - panY) / zoom + gridHeight / 2) / cellSize;
  
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);
  
  if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
    return { x: pixelX, y: pixelY };
  }
  
  return null;
}

/**
 * 创建颜色映射表
 */
export function createColorMap(colors: BeadColor[]): Map<string, BeadColor> {
  const map = new Map<string, BeadColor>();
  for (const color of colors) {
    map.set(color.id, color);
  }
  return map;
}

/**
 * 导出 Canvas 为图片
 */
export function exportCanvasToImage(
  pixelData: PixelData,
  colorMap: Map<string, BeadColor>,
  scale: number = 1
): string {
  const height = pixelData.length;
  const width = height > 0 ? pixelData[0].length : 0;
  
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  
  // 绘制像素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorId = pixelData[y][x];
      if (!colorId) {
        // 透明
        continue;
      }
      
      const color = colorMap.get(colorId);
      if (color) {
        ctx.fillStyle = color.hex;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  return canvas.toDataURL('image/png');
}
