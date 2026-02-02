import { ExportProject, PixelData, PixelConfig } from '../types';

const PROJECT_VERSION = '1.0.0';

/**
 * 导出项目为 JSON
 */
export function exportProjectToJson(
  pixelData: PixelData,
  config: PixelConfig,
  projectName: string = '未命名项目'
): string {
  const project: ExportProject = {
    version: PROJECT_VERSION,
    name: projectName,
    createdAt: new Date().toISOString(),
    config,
    pixelData,
  };
  
  return JSON.stringify(project, null, 2);
}

/**
 * 导入项目从 JSON
 */
export function importProjectFromJson(jsonString: string): ExportProject | null {
  const data = JSON.parse(jsonString);
  
  // 验证数据格式
  if (!data.version || !data.pixelData || !data.config) {
    console.error('Invalid project format');
    return null;
  }
  
  return data as ExportProject;
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 下载图片
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 读取文件内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 读取文件为 DataURL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
