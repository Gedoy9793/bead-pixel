import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getAllColors, getColorById } from '../data/beadColors';
import { ColorStatItem } from '../types';
import { getContrastColor } from '../utils/colorUtils';

export function ColorStats() {
  const pixelData = useStore((s) => s.pixelData);
  const config = useStore((s) => s.config);
  const ui = useStore((s) => s.ui);
  const setHighlightColor = useStore((s) => s.setHighlightColor);

  const colors = useMemo(() => getAllColors(config.brand), [config.brand]);

  // 统计颜色使用量
  const stats = useMemo<ColorStatItem[]>(() => {
    const countMap = new Map<string, number>();
    
    for (const row of pixelData) {
      for (const colorId of row) {
        if (colorId) {
          countMap.set(colorId, (countMap.get(colorId) || 0) + 1);
        }
      }
    }

    const result: ColorStatItem[] = [];
    countMap.forEach((count, colorId) => {
      const color = colors.find((c) => c.id === colorId);
      if (color) {
        result.push({ colorId, color, count });
      }
    });

    // 按数量排序
    result.sort((a, b) => b.count - a.count);
    return result;
  }, [pixelData, colors]);

  // 总数
  const totalCount = useMemo(() => {
    return stats.reduce((sum, item) => sum + item.count, 0);
  }, [stats]);

  const handleClick = (colorId: string) => {
    if (ui.highlightColorId === colorId) {
      setHighlightColor(null);
    } else {
      setHighlightColor(colorId);
    }
  };

  if (stats.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        暂无颜色数据
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-700">颜色统计</div>
        <div className="text-xs text-gray-400 mt-1">
          共 {stats.length} 种颜色，{totalCount} 颗珠子
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {stats.map((item) => (
            <button
              key={item.colorId}
              onClick={() => handleClick(item.colorId)}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg
                transition-all duration-150 text-left
                ${ui.highlightColorId === item.colorId
                  ? 'bg-primary/10 ring-2 ring-primary/30'
                  : 'hover:bg-gray-50'
                }
              `}
            >
              {/* 颜色块 */}
              <div
                className="w-8 h-8 rounded-md shadow-sm border border-gray-200 flex items-center justify-center text-xs font-bold shrink-0"
                style={{ 
                  backgroundColor: item.color.hex,
                  color: getContrastColor(item.color.rgb),
                }}
              >
                {ui.highlightColorId === item.colorId ? '✓' : item.color.code}
              </div>

              {/* 颜色信息 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {item.color.name}
                </div>
                <div className="text-xs text-gray-400">
                  {item.color.code}
                </div>
              </div>

              {/* 数量 */}
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-gray-800">
                  {item.count}
                </div>
                <div className="text-xs text-gray-400">
                  {((item.count / totalCount) * 100).toFixed(1)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 取消高亮按钮 */}
      {ui.highlightColorId && (
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setHighlightColor(null)}
            className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            取消高亮
          </button>
        </div>
      )}
    </div>
  );
}
