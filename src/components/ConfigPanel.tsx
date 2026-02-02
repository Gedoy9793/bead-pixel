import { useState, useEffect, useRef } from 'react';
import { Select, InputNumber } from 'tdesign-react';
import { LockOnIcon, LockOffIcon } from 'tdesign-icons-react';
import { PixelConfig, BeadBrand } from '../types';
import { beadColorLibraries, getAllColors, getColorLibraries } from '../data/beadColors';

interface ConfigPanelProps {
  config: PixelConfig;
  onChange: (config: Partial<PixelConfig>) => void;
  onApply: () => void;
  hasImage: boolean;
  isProcessing: boolean;
}

// 颜色数量预设选项
const COLOR_COUNT_OPTIONS = [
  { label: '8 色', value: 8 },
  { label: '16 色', value: 16 },
  { label: '24 色', value: 24 },
  { label: '32 色', value: 32 },
  { label: '48 色', value: 48 },
  { label: '64 色', value: 64 },
  { label: '96 色', value: 96 },
  { label: '128 色', value: 128 },
  { label: '全部颜色', value: -1 }, // -1 表示使用品牌的全部颜色
];

export function ConfigPanel({
  config,
  onChange,
  onApply,
  hasImage,
  isProcessing,
}: ConfigPanelProps) {
  const [localWidth, setLocalWidth] = useState(config.width);
  const [localHeight, setLocalHeight] = useState(config.height);
  const [aspectRatio, setAspectRatio] = useState(config.width / config.height);
  
  // 防抖定时器
  const debounceTimerRef = useRef<number | null>(null);
  // 记录上一次的配置，用于检测变化
  const lastAppliedConfigRef = useRef<string>('');

  // 当前品牌的最大颜色数
  const maxColors = getAllColors(config.brand).length;

  // 获取实际的颜色数量（处理"全部颜色"选项）
  const getActualColorCount = (value: number, brand: BeadBrand) => {
    if (value === -1) {
      return getAllColors(brand).length;
    }
    return value;
  };

  // 颜色数量选项（加入当前品牌的全部颜色数）
  const colorCountOptions = COLOR_COUNT_OPTIONS.map((opt) => ({
    ...opt,
    label: opt.value === -1 ? `全部颜色 (${maxColors} 色)` : opt.label,
    // 过滤掉超过品牌最大颜色数的选项（除了"全部颜色"）
  })).filter((opt) => opt.value === -1 || opt.value <= maxColors);

  useEffect(() => {
    setLocalWidth(config.width);
    setLocalHeight(config.height);
    if (config.width > 0 && config.height > 0) {
      setAspectRatio(config.width / config.height);
    }
  }, [config.width, config.height]);

  // 自动应用配置（防抖）
  useEffect(() => {
    if (!hasImage || isProcessing) return;

    const configKey = `${config.width}-${config.height}-${config.colorCount}-${config.brand}`;
    
    // 如果配置没有变化，不触发
    if (configKey === lastAppliedConfigRef.current) return;

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器
    debounceTimerRef.current = window.setTimeout(() => {
      lastAppliedConfigRef.current = configKey;
      onApply();
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [config.width, config.height, config.colorCount, config.brand, hasImage, isProcessing, onApply]);

  // 初始化 lastAppliedConfigRef
  useEffect(() => {
    if (hasImage && !lastAppliedConfigRef.current) {
      lastAppliedConfigRef.current = `${config.width}-${config.height}-${config.colorCount}-${config.brand}`;
    }
  }, [hasImage, config.width, config.height, config.colorCount, config.brand]);

  const handleWidthChange = (value: number) => {
    setLocalWidth(value);
    if (config.lockAspectRatio) {
      const newHeight = Math.round(value / aspectRatio);
      setLocalHeight(newHeight);
      onChange({ width: value, height: newHeight });
    } else {
      onChange({ width: value });
    }
  };

  const handleHeightChange = (value: number) => {
    setLocalHeight(value);
    if (config.lockAspectRatio) {
      const newWidth = Math.round(value * aspectRatio);
      setLocalWidth(newWidth);
      onChange({ width: newWidth, height: value });
    } else {
      onChange({ height: value });
    }
  };

  const handleColorCountChange = (value: number) => {
    const actualCount = getActualColorCount(value, config.brand);
    onChange({ colorCount: actualCount });
  };

  const handleBrandChange = (brand: BeadBrand) => {
    const brandMaxColors = getAllColors(brand).length;
    // 如果当前颜色数超过新品牌的最大颜色数，自动调整
    if (config.colorCount > brandMaxColors) {
      onChange({ brand, colorCount: brandMaxColors });
    } else {
      onChange({ brand });
    }
  };

  // 找到当前颜色数对应的选项值（用于显示）
  const getCurrentColorValue = () => {
    if (config.colorCount >= maxColors) return -1;
    // 找到最接近的预设值
    const preset = COLOR_COUNT_OPTIONS.find((opt) => opt.value === config.colorCount);
    return preset ? preset.value : config.colorCount;
  };

  const brandOptions = getColorLibraries().map((lib) => ({
    label: `${lib.name} (${lib.colors.length} 色)`,
    value: lib.brand,
  }));

  return (
    <div className="p-4 space-y-5">
      <div className="text-sm font-medium text-gray-700 mb-3">
        像素化参数
        {isProcessing && (
          <span className="ml-2 text-xs text-blue-500 animate-pulse">处理中...</span>
        )}
      </div>
      
      {/* 尺寸设置 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">画布尺寸</span>
          <button
            onClick={() => onChange({ lockAspectRatio: !config.lockAspectRatio })}
            className={`
              p-1.5 rounded transition-colors
              ${config.lockAspectRatio 
                ? 'text-primary bg-blue-50' 
                : 'text-gray-400 hover:text-gray-600'
              }
            `}
            title={config.lockAspectRatio ? '解锁宽高比' : '锁定宽高比'}
          >
            {config.lockAspectRatio ? <LockOnIcon size={16} /> : <LockOffIcon size={16} />}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">宽度</label>
            <InputNumber
              value={localWidth}
              onChange={(val) => handleWidthChange(val as number)}
              min={5}
              max={200}
              step={1}
              size="small"
              theme="normal"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">高度</label>
            <InputNumber
              value={localHeight}
              onChange={(val) => handleHeightChange(val as number)}
              min={5}
              max={200}
              step={1}
              size="small"
              theme="normal"
              className="w-full"
            />
          </div>
        </div>
        
        {/* 预设尺寸 */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: '29×29', w: 29, h: 29 },
            { label: '50×50', w: 50, h: 50 },
            { label: '100×100', w: 100, h: 100 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setLocalWidth(preset.w);
                setLocalHeight(preset.h);
                onChange({ width: preset.w, height: preset.h });
              }}
              className={`
                px-2 py-1 text-xs rounded border transition-colors
                ${localWidth === preset.w && localHeight === preset.h
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }
              `}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 颜色数量 - 改为下拉框 */}
      <div className="space-y-2">
        <span className="text-xs text-gray-500">颜色数量</span>
        <Select
          value={getCurrentColorValue()}
          onChange={(val) => handleColorCountChange(val as number)}
          options={colorCountOptions}
          size="small"
          className="w-full"
        />
        <div className="text-xs text-gray-400">
          当前品牌共 {maxColors} 种颜色可用
        </div>
      </div>

      {/* 品牌选择 */}
      <div className="space-y-2">
        <span className="text-xs text-gray-500">拼豆品牌</span>
        <Select
          value={config.brand}
          onChange={(val) => handleBrandChange(val as BeadBrand)}
          options={brandOptions}
          size="small"
          className="w-full"
        />
      </div>
    </div>
  );
}
