import { Button, Tooltip } from 'tdesign-react';
import {
  Edit1Icon,
  BrushIcon,
  PaletteIcon,
  RollbackIcon,
  RollfrontIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MoveIcon,
} from 'tdesign-icons-react';
import { EditorTool } from '../types';
import { useStore } from '../store/useStore';
import { getAllColors, getColorById } from '../data/beadColors';

export function Toolbar() {
  const ui = useStore((s) => s.ui);
  const config = useStore((s) => s.config);
  const setTool = useStore((s) => s.setTool);
  const setZoom = useStore((s) => s.setZoom);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);

  const selectedColor = ui.selectedColorId 
    ? getColorById(config.brand, ui.selectedColorId)
    : null;

  const tools: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
    { id: 'move', icon: <MoveIcon />, label: '移动画布 (按住Alt拖拽也可移动)' },
    { id: 'brush', icon: <BrushIcon />, label: '画笔工具' },
    { id: 'bucket', icon: <PaletteIcon />, label: '颜料桶' },
    { id: 'eyedropper', icon: <Edit1Icon />, label: '吸色工具' },
  ];

  return (
    <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-2">
      {/* 工具按钮 */}
      {tools.map((tool) => (
        <Tooltip key={tool.id} content={tool.label} placement="right">
          <button
            onClick={() => setTool(tool.id)}
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              transition-all duration-150
              ${ui.currentTool === tool.id
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
          >
            {tool.icon}
          </button>
        </Tooltip>
      ))}

      <div className="w-8 h-px bg-gray-200 my-2" />

      {/* 撤销/重做 */}
      <Tooltip content="撤销 (Ctrl+Z)" placement="right">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            transition-all duration-150
            ${canUndo()
              ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <RollbackIcon />
        </button>
      </Tooltip>

      <Tooltip content="重做 (Ctrl+Y)" placement="right">
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            transition-all duration-150
            ${canRedo()
              ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <RollfrontIcon />
        </button>
      </Tooltip>

      <div className="w-8 h-px bg-gray-200 my-2" />

      {/* 缩放控制 */}
      <Tooltip content="放大" placement="right">
        <button
          onClick={() => setZoom(ui.zoom * 1.2)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
        >
          <ZoomInIcon />
        </button>
      </Tooltip>

      <div className="text-xs text-gray-400 font-medium">
        {Math.round(ui.zoom * 100)}%
      </div>

      <Tooltip content="缩小" placement="right">
        <button
          onClick={() => setZoom(ui.zoom * 0.8)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
        >
          <ZoomOutIcon />
        </button>
      </Tooltip>

      {/* 当前选中颜色 */}
      <div className="flex-1" />
      
      {selectedColor && (
        <Tooltip content={`${selectedColor.name} (${selectedColor.code})`} placement="right">
          <div
            className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm"
            style={{ backgroundColor: selectedColor.hex }}
          />
        </Tooltip>
      )}
    </div>
  );
}
