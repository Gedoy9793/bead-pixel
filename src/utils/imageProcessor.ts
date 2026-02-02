import { RGB, BeadColor, PixelData } from '../types';
import { findClosestBeadColor, precomputeLabValues } from './colorUtils';

/**
 * 从 File 对象加载图片
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 从 URL 加载图片
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 获取图片的像素数据
 */
export function getImagePixelData(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  
  // 使用最近邻插值以保持像素边缘清晰
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * 颜色量化 - 中位切分法 (Median Cut)
 * 将图片颜色减少到指定数量
 */
interface ColorBox {
  colors: RGB[];
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function createColorBox(colors: RGB[]): ColorBox {
  let rMin = 255, rMax = 0;
  let gMin = 255, gMax = 0;
  let bMin = 255, bMax = 0;

  for (const color of colors) {
    rMin = Math.min(rMin, color.r);
    rMax = Math.max(rMax, color.r);
    gMin = Math.min(gMin, color.g);
    gMax = Math.max(gMax, color.g);
    bMin = Math.min(bMin, color.b);
    bMax = Math.max(bMax, color.b);
  }

  return { colors, rMin, rMax, gMin, gMax, bMin, bMax };
}

function splitColorBox(box: ColorBox): [ColorBox, ColorBox] {
  const rRange = box.rMax - box.rMin;
  const gRange = box.gMax - box.gMin;
  const bRange = box.bMax - box.bMin;

  // 找到范围最大的通道
  let channel: 'r' | 'g' | 'b';
  if (rRange >= gRange && rRange >= bRange) {
    channel = 'r';
  } else if (gRange >= rRange && gRange >= bRange) {
    channel = 'g';
  } else {
    channel = 'b';
  }

  // 按该通道排序
  const sorted = [...box.colors].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);

  return [
    createColorBox(sorted.slice(0, mid)),
    createColorBox(sorted.slice(mid)),
  ];
}

function getAverageColor(box: ColorBox): RGB {
  let rSum = 0, gSum = 0, bSum = 0;
  for (const color of box.colors) {
    rSum += color.r;
    gSum += color.g;
    bSum += color.b;
  }
  const count = box.colors.length;
  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

/**
 * 中位切分颜色量化
 */
export function medianCutQuantize(imageData: ImageData, colorCount: number): RGB[] {
  const colors: RGB[] = [];
  const data = imageData.data;

  // 提取所有像素颜色
  for (let i = 0; i < data.length; i += 4) {
    // 忽略完全透明的像素
    if (data[i + 3] < 128) continue;
    colors.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    });
  }

  if (colors.length === 0) {
    return [{ r: 255, g: 255, b: 255 }];
  }

  // 初始化颜色盒子
  let boxes: ColorBox[] = [createColorBox(colors)];

  // 递归分割直到达到目标颜色数
  while (boxes.length < colorCount) {
    // 找到包含最多颜色且范围最大的盒子
    let maxIndex = 0;
    let maxVolume = 0;
    
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.colors.length < 2) continue;
      
      const volume = (box.rMax - box.rMin) * (box.gMax - box.gMin) * (box.bMax - box.bMin);
      if (volume > maxVolume) {
        maxVolume = volume;
        maxIndex = i;
      }
    }

    if (maxVolume === 0) break;

    // 分割盒子
    const [box1, box2] = splitColorBox(boxes[maxIndex]);
    boxes.splice(maxIndex, 1, box1, box2);
  }

  // 返回每个盒子的平均颜色
  return boxes.map(getAverageColor);
}

/**
 * 将像素颜色映射到量化后的调色板
 */
function mapToNearestColor(rgb: RGB, palette: RGB[]): RGB {
  let minDist = Infinity;
  let nearest = palette[0];

  for (const color of palette) {
    const dist = Math.pow(rgb.r - color.r, 2) + 
                 Math.pow(rgb.g - color.g, 2) + 
                 Math.pow(rgb.b - color.b, 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = color;
    }
  }

  return nearest;
}

/**
 * 像素化图像并映射到拼豆色号
 */
export function pixelateImage(
  image: HTMLImageElement,
  width: number,
  height: number,
  colorCount: number,
  beadColors: BeadColor[]
): PixelData {
  // 获取缩小后的像素数据
  const imageData = getImagePixelData(image, width, height);
  
  // 颜色量化
  const palette = medianCutQuantize(imageData, colorCount);
  
  // 预计算 Lab 值
  const colorsWithLab = precomputeLabValues(beadColors);
  
  // 创建像素数据数组
  const pixelData: PixelData = [];
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      
      // 检查透明度
      if (data[i + 3] < 128) {
        row.push(null);
        continue;
      }

      const originalColor: RGB = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      };

      // 先映射到量化调色板
      const quantizedColor = mapToNearestColor(originalColor, palette);
      
      // 再映射到拼豆色号
      const beadColor = findClosestBeadColor(quantizedColor, colorsWithLab);
      row.push(beadColor?.id || null);
    }
    pixelData.push(row);
  }

  return pixelData;
}

/**
 * 创建空白像素数据
 */
export function createEmptyPixelData(width: number, height: number): PixelData {
  return Array(height).fill(null).map(() => Array(width).fill(null));
}

/**
 * 调整像素数据尺寸
 */
export function resizePixelData(
  pixelData: PixelData,
  newWidth: number,
  newHeight: number
): PixelData {
  const oldHeight = pixelData.length;
  const oldWidth = oldHeight > 0 ? pixelData[0].length : 0;

  const newData: PixelData = [];

  for (let y = 0; y < newHeight; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < newWidth; x++) {
      // 简单的最近邻缩放
      const srcX = Math.floor(x * oldWidth / newWidth);
      const srcY = Math.floor(y * oldHeight / newHeight);
      
      if (srcY < oldHeight && srcX < oldWidth) {
        row.push(pixelData[srcY][srcX]);
      } else {
        row.push(null);
      }
    }
    newData.push(row);
  }

  return newData;
}

/**
 * 颜料桶填充算法 (Flood Fill)
 */
export function floodFill(
  pixelData: PixelData,
  startX: number,
  startY: number,
  newColorId: string
): PixelData {
  const height = pixelData.length;
  const width = height > 0 ? pixelData[0].length : 0;

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return pixelData;
  }

  const targetColorId = pixelData[startY][startX];
  
  // 如果目标颜色和新颜色相同，不需要填充
  if (targetColorId === newColorId) {
    return pixelData;
  }

  // 创建副本
  const newData = pixelData.map(row => [...row]);
  
  // BFS 填充
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (newData[y][x] !== targetColorId) continue;
    
    visited.add(key);
    newData[y][x] = newColorId;

    // 添加相邻像素
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return newData;
}
