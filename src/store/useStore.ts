import { create } from 'zustand';
import { PixelData, PixelConfig, UIState, HistoryItem, EditorTool, BeadBrand } from '../types';
import { defaultConfig } from '../data/beadColors';
import { createEmptyPixelData, floodFill } from '../utils/imageProcessor';

const MAX_HISTORY = 50;

interface StoreState {
  // 像素数据
  pixelData: PixelData;
  // 配置
  config: PixelConfig;
  // 原始图片
  originalImage: string | null;
  // UI 状态
  ui: UIState;
  // 历史记录
  history: HistoryItem[];
  historyIndex: number;
  
  // Actions
  setPixelData: (data: PixelData, saveHistory?: boolean) => void;
  setPixel: (x: number, y: number, colorId: string | null) => void;
  fillArea: (x: number, y: number, colorId: string) => void;
  setConfig: (config: Partial<PixelConfig>) => void;
  setOriginalImage: (image: string | null) => void;
  
  // UI Actions
  setMode: (mode: 'editor' | 'display') => void;
  setTool: (tool: EditorTool) => void;
  setSelectedColor: (colorId: string | null) => void;
  setHighlightColor: (colorId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setShowColorCode: (show: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setShowColorStats: (show: boolean) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Reset
  resetProject: () => void;
  loadProject: (data: { pixelData: PixelData; config: PixelConfig }) => void;
}

const initialUIState: UIState = {
  mode: 'editor',
  currentTool: 'brush',
  selectedColorId: 'P01',
  highlightColorId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showColorCode: true,
  isFullscreen: false,
  showColorStats: true,
};

const initialConfig: PixelConfig = {
  ...defaultConfig,
};

export const useStore = create<StoreState>((set, get) => ({
  pixelData: createEmptyPixelData(initialConfig.width, initialConfig.height),
  config: initialConfig,
  originalImage: null,
  ui: initialUIState,
  history: [],
  historyIndex: -1,

  setPixelData: (data, saveHistory = true) => {
    const state = get();
    
    if (saveHistory) {
      // 保存历史记录
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        pixelData: state.pixelData,
        timestamp: Date.now(),
      });
      
      // 限制历史记录数量
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      set({
        pixelData: data,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      });
    } else {
      set({ pixelData: data });
    }
  },

  setPixel: (x, y, colorId) => {
    const state = get();
    const { pixelData } = state;
    
    if (y < 0 || y >= pixelData.length || x < 0 || x >= pixelData[0].length) {
      return;
    }
    
    // 如果颜色相同，不做操作
    if (pixelData[y][x] === colorId) {
      return;
    }
    
    const newData = pixelData.map((row, rowIndex) => {
      if (rowIndex === y) {
        const newRow = [...row];
        newRow[x] = colorId;
        return newRow;
      }
      return row;
    });
    
    get().setPixelData(newData);
  },

  fillArea: (x, y, colorId) => {
    const state = get();
    const newData = floodFill(state.pixelData, x, y, colorId);
    get().setPixelData(newData);
  },

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },

  setOriginalImage: (image) => {
    set({ originalImage: image });
  },

  // UI Actions
  setMode: (mode) => {
    set((state) => ({
      ui: { ...state.ui, mode },
    }));
  },

  setTool: (tool) => {
    set((state) => ({
      ui: { ...state.ui, currentTool: tool },
    }));
  },

  setSelectedColor: (colorId) => {
    set((state) => ({
      ui: { ...state.ui, selectedColorId: colorId },
    }));
  },

  setHighlightColor: (colorId) => {
    set((state) => ({
      ui: { ...state.ui, highlightColorId: colorId },
    }));
  },

  setZoom: (zoom) => {
    set((state) => ({
      ui: { ...state.ui, zoom: Math.max(0.1, Math.min(10, zoom)) },
    }));
  },

  setPan: (x, y) => {
    set((state) => ({
      ui: { ...state.ui, panX: x, panY: y },
    }));
  },

  setShowColorCode: (show) => {
    set((state) => ({
      ui: { ...state.ui, showColorCode: show },
    }));
  },

  setFullscreen: (fullscreen) => {
    set((state) => ({
      ui: { ...state.ui, isFullscreen: fullscreen },
    }));
  },

  setShowColorStats: (show) => {
    set((state) => ({
      ui: { ...state.ui, showColorStats: show },
    }));
  },

  // History Actions
  undo: () => {
    const state = get();
    if (state.historyIndex >= 0) {
      const previousData = state.history[state.historyIndex].pixelData;
      set({
        pixelData: previousData,
        historyIndex: state.historyIndex - 1,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextIndex = state.historyIndex + 1;
      // 获取当前数据作为重做后的状态
      set({
        historyIndex: nextIndex,
      });
      
      if (nextIndex + 1 < state.history.length) {
        set({
          pixelData: state.history[nextIndex + 1].pixelData,
        });
      }
    }
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex >= 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  // Reset
  resetProject: () => {
    set({
      pixelData: createEmptyPixelData(initialConfig.width, initialConfig.height),
      config: initialConfig,
      originalImage: null,
      ui: initialUIState,
      history: [],
      historyIndex: -1,
    });
  },

  loadProject: (data) => {
    set({
      pixelData: data.pixelData,
      config: data.config,
      history: [],
      historyIndex: -1,
    });
  },
}));

// 辅助 hooks
export const usePixelData = () => useStore((state) => state.pixelData);
export const useConfig = () => useStore((state) => state.config);
export const useUI = () => useStore((state) => state.ui);
export const useCurrentTool = () => useStore((state) => state.ui.currentTool);
export const useSelectedColor = () => useStore((state) => state.ui.selectedColorId);
export const useHighlightColor = () => useStore((state) => state.ui.highlightColorId);
export const useZoom = () => useStore((state) => state.ui.zoom);
