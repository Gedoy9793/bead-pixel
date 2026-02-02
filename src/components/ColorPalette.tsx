import { useMemo, useState } from 'react';
import { Input } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { useStore } from '../store/useStore';
import { getAllColors } from '../data/beadColors';
import { getContrastColor } from '../utils/colorUtils';

export function ColorPalette() {
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const setSelectedColor = useStore((s) => s.setSelectedColor);
  const [searchTerm, setSearchTerm] = useState('');

  const colors = useMemo(() => getAllColors(config.brand), [config.brand]);

  // 过滤颜色
  const filteredColors = useMemo(() => {
    if (!searchTerm.trim()) return colors;
    const term = searchTerm.toLowerCase();
    return colors.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
    );
  }, [colors, searchTerm]);

  return (
    <div className="p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">
        颜色面板 ({colors.length} 色)
      </div>

      {/* 搜索框 */}
      <div className="mb-3">
        <Input
          value={searchTerm}
          onChange={(val) => setSearchTerm(val as string)}
          placeholder="搜索颜色名称或编号..."
          prefixIcon={<SearchIcon />}
          size="small"
          clearable
        />
      </div>
      
      {/* 颜色列表 - 显示颜色、名称和编号 */}
      <div className="max-h-[400px] overflow-y-auto space-y-1 px-1 -mx-1">
        {filteredColors.map((color) => (
          <button
            key={color.id}
            onClick={() => setSelectedColor(color.id)}
            className={`
              w-full flex items-center gap-2 p-1.5 rounded-lg transition-all duration-150
              hover:bg-gray-100
              ${ui.selectedColorId === color.id
                ? 'bg-blue-50 ring-2 ring-primary ring-inset'
                : ''
              }
            `}
          >
            {/* 颜色方块 */}
            <div
              className={`
                w-8 h-8 rounded-md border border-gray-200 flex-shrink-0 flex items-center justify-center
                ${color.id === 'transparent' ? 'bg-checkered' : ''}
              `}
              style={{ 
                backgroundColor: color.id === 'transparent' ? undefined : color.hex,
                color: color.id === 'transparent' ? '#666' : getContrastColor(color.rgb),
                backgroundImage: color.id === 'transparent' 
                  ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                  : undefined,
                backgroundSize: color.id === 'transparent' ? '8px 8px' : undefined,
                backgroundPosition: color.id === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
              }}
            >
              {ui.selectedColorId === color.id && (
                <span className="text-xs font-bold">✓</span>
              )}
            </div>
            
            {/* 颜色信息 */}
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-medium text-gray-800 truncate">
                {color.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {color.code}
              </div>
            </div>
          </button>
        ))}

        {filteredColors.length === 0 && (
          <div className="py-4 text-center text-gray-400 text-sm">
            未找到匹配的颜色
          </div>
        )}
      </div>

      {/* 当前选中颜色详情 */}
      {ui.selectedColorId && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          {(() => {
            const selected = colors.find((c) => c.id === ui.selectedColorId);
            if (!selected) return null;
            const isTransparent = selected.id === 'transparent';
            return (
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center"
                  style={{ 
                    backgroundColor: isTransparent ? undefined : selected.hex,
                    color: isTransparent ? '#666' : getContrastColor(selected.rgb),
                    backgroundImage: isTransparent 
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: isTransparent ? '12px 12px' : undefined,
                    backgroundPosition: isTransparent ? '0 0, 0 6px, 6px -6px, -6px 0px' : undefined,
                  }}
                >
                  <span className="text-lg font-bold">✓</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">
                    {selected.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    编号: {selected.code}
                  </div>
                  <div className="text-xs text-gray-400">
                    {isTransparent ? '用于擦除像素' : selected.hex}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
