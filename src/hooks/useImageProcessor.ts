import { useState, useCallback, useRef } from 'react';
import { PixelData, BeadBrand } from '../types';
import { loadImageFromFile, pixelateImage } from '../utils/imageProcessor';
import { getAllColors } from '../data/beadColors';

export function useImageProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedImage, setHasLoadedImage] = useState(false);
  const [originalImageData, setOriginalImageData] = useState<string | null>(null);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  
  // 使用 ref 来保存图片，避免闭包问题
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const processImage = useCallback(
    async (
      file: File,
      width: number,
      height: number,
      colorCount: number,
      brand: BeadBrand
    ): Promise<PixelData | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const image = await loadImageFromFile(file);
        loadedImageRef.current = image;
        setHasLoadedImage(true);

        // 保存原始图片
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        setOriginalImageData(canvas.toDataURL('image/png'));

        // 获取色库
        const colors = getAllColors(brand);

        // 像素化处理
        const result = pixelateImage(image, width, height, colorCount, colors);
        setPixelData(result);
        setIsProcessing(false);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '处理图片时出错');
        console.error('processImage error:', err);
        setIsProcessing(false);
        return null;
      }
    },
    []
  );

  const reprocessImage = useCallback(
    async (
      width: number,
      height: number,
      colorCount: number,
      brand: BeadBrand
    ): Promise<PixelData | null> => {
      const loadedImage = loadedImageRef.current;
      if (!loadedImage) {
        setError('没有加载的图片');
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // 获取色库
        const colors = getAllColors(brand);

        // 重新像素化
        const result = pixelateImage(loadedImage, width, height, colorCount, colors);
        setPixelData(result);
        setIsProcessing(false);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '处理图片时出错');
        console.error('reprocessImage error:', err);
        setIsProcessing(false);
        return null;
      }
    },
    []
  );

  return {
    processImage,
    reprocessImage,
    isProcessing,
    error,
    hasLoadedImage,
    originalImageData,
    pixelData,
  };
}
