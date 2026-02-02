// RGB 颜色类型
export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Lab 颜色类型（用于更准确的颜色比较）
export interface Lab {
  l: number;
  a: number;
  b: number;
}

// 拼豆颜色定义
export interface BeadColor {
  id: string;
  name: string;
  code: string;
  hex: string;
  rgb: RGB;
  lab?: Lab;
}

// 拼豆品牌
export type BeadBrand = 'perler' | 'artkal' | 'hama' | 'mard' | 'nabbi' | 'ikea';

// 拼豆色库
export interface BeadColorLibrary {
  brand: BeadBrand;
  name: string;
  colors: BeadColor[];
}

// 单个像素数据
export interface Pixel {
  colorId: string;
  x: number;
  y: number;
}

// 像素数据（二维数组存储色号ID）
export type PixelData = (string | null)[][];

// 像素化配置
export interface PixelConfig {
  width: number;
  height: number;
  colorCount: number;
  brand: BeadBrand;
  lockAspectRatio: boolean;
}

// 编辑工具类型
export type EditorTool = 'brush' | 'bucket' | 'eyedropper' | 'move';

// 历史记录项
export interface HistoryItem {
  pixelData: PixelData;
  timestamp: number;
}

// UI 状态
export interface UIState {
  mode: 'editor' | 'display';
  currentTool: EditorTool;
  selectedColorId: string | null;
  highlightColorId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showColorCode: boolean;
  isFullscreen: boolean;
  showColorStats: boolean;
}

// 项目状态
export interface ProjectState {
  // 像素数据
  pixelData: PixelData;
  // 配置
  config: PixelConfig;
  // 原始图片数据
  originalImage: string | null;
  // UI 状态
  ui: UIState;
  // 历史记录
  history: HistoryItem[];
  historyIndex: number;
}

// 颜色统计项
export interface ColorStatItem {
  colorId: string;
  color: BeadColor;
  count: number;
}

// 导出格式
export interface ExportProject {
  version: string;
  name: string;
  createdAt: string;
  config: PixelConfig;
  pixelData: PixelData;
}

// 点位置
export interface Point {
  x: number;
  y: number;
}

// 矩形区域
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
