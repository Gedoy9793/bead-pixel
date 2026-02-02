import { RGB, Lab, BeadColor } from '../types';

/**
 * RGB 转 Lab 颜色空间
 * Lab 颜色空间更接近人眼感知，用于更准确的颜色比较
 */
export function rgbToLab(rgb: RGB): Lab {
  // 先转换为 XYZ
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  // sRGB to linear RGB
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // RGB to XYZ (D65 illuminant)
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // XYZ to Lab
  const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
  const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
  const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * 计算两个 Lab 颜色之间的 Delta E 距离（CIE76）
 * 值越小表示颜色越接近
 */
export function deltaE(lab1: Lab, lab2: Lab): number {
  const dL = lab1.l - lab2.l;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * 计算两个 RGB 颜色之间的欧氏距离
 */
export function rgbDistance(rgb1: RGB, rgb2: RGB): number {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Hex 颜色转 RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * RGB 转 Hex 颜色
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * 计算颜色亮度 (0-255)
 */
export function getLuminance(rgb: RGB): number {
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * 判断颜色是否为深色
 */
export function isDarkColor(rgb: RGB): boolean {
  return getLuminance(rgb) < 128;
}

/**
 * 获取对比色（用于在颜色上显示文字）
 */
export function getContrastColor(rgb: RGB): string {
  return isDarkColor(rgb) ? '#FFFFFF' : '#000000';
}

/**
 * 在拼豆色库中找到最接近的颜色
 */
export function findClosestBeadColor(rgb: RGB, colors: BeadColor[]): BeadColor | null {
  if (colors.length === 0) return null;

  const targetLab = rgbToLab(rgb);
  let closestColor = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const colorLab = color.lab || rgbToLab(color.rgb);
    const distance = deltaE(targetLab, colorLab);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

/**
 * 预计算色库的 Lab 值
 */
export function precomputeLabValues(colors: BeadColor[]): BeadColor[] {
  return colors.map((color) => ({
    ...color,
    lab: color.lab || rgbToLab(color.rgb),
  }));
}

/**
 * 颜色混合
 */
export function blendColors(color1: RGB, color2: RGB, ratio: number): RGB {
  return {
    r: Math.round(color1.r * (1 - ratio) + color2.r * ratio),
    g: Math.round(color1.g * (1 - ratio) + color2.g * ratio),
    b: Math.round(color1.b * (1 - ratio) + color2.b * ratio),
  };
}

/**
 * 调整颜色亮度
 */
export function adjustBrightness(rgb: RGB, factor: number): RGB {
  return {
    r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * factor))),
  };
}

/**
 * 颜色相似度判断（0-100，100 表示完全相同）
 */
export function colorSimilarity(rgb1: RGB, rgb2: RGB): number {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  const distance = deltaE(lab1, lab2);
  // Delta E 最大约为 100，转换为相似度
  return Math.max(0, 100 - distance);
}
