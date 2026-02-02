import { useRef } from 'react';
import { Button } from 'tdesign-react';
import { UploadIcon, ImageIcon, RefreshIcon } from 'tdesign-icons-react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  originalImage?: string | null;
}

export function ImageUploader({ onFileSelect, disabled, originalImage }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // 重置 input 以允许选择相同文件
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      
      {originalImage ? (
        // 显示原图预览
        <div className="relative group">
          <div className="w-full aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img 
              src={originalImage} 
              alt="原图预览" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Button
              theme="primary"
              size="small"
              icon={<RefreshIcon />}
              onClick={handleClick}
              disabled={disabled}
            >
              更换图片
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">原图预览 · 悬停更换</p>
        </div>
      ) : (
        // 上传区域
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`
            border-2 border-dashed rounded-lg p-6
            flex flex-col items-center justify-center gap-3
            cursor-pointer transition-all duration-200
            ${disabled 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-primary hover:bg-blue-50/30'
            }
          `}
        >
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${disabled ? 'bg-gray-100' : 'bg-blue-50'}
          `}>
            <ImageIcon size={24} className={disabled ? 'text-gray-400' : 'text-primary'} />
          </div>
          
          <div className="text-center">
            <p className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
              点击或拖拽上传图片
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 JPG、PNG、GIF 格式
            </p>
          </div>
          
          <Button
            theme="primary"
            variant="outline"
            size="small"
            disabled={disabled}
            icon={<UploadIcon />}
          >
            选择图片
          </Button>
        </div>
      )}
    </div>
  );
}
