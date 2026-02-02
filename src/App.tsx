import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, MessagePlugin } from 'tdesign-react';
import { 
  DownloadIcon, 
  UploadIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  BrowseIcon,
} from 'tdesign-icons-react';
import { useStore } from './store/useStore';
import { useImageProcessor } from './hooks/useImageProcessor';
import { importProjectFromJson, readFileAsText } from './utils/fileIO';

import { ImageUploader } from './components/ImageUploader';
import { ConfigPanel } from './components/ConfigPanel';
import { EditorCanvas } from './components/EditorCanvas';
import { DisplayCanvas } from './components/DisplayCanvas';
import { Toolbar } from './components/Toolbar';
import { ColorPalette } from './components/ColorPalette';
import { ColorStats } from './components/ColorStats';
import { ExportDialog } from './components/ExportDialog';

function App() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const ui = useStore((s) => s.ui);
  const config = useStore((s) => s.config);
  const setMode = useStore((s) => s.setMode);
  const setConfig = useStore((s) => s.setConfig);
  const setPixelData = useStore((s) => s.setPixelData);
  const setOriginalImage = useStore((s) => s.setOriginalImage);
  const setHighlightColor = useStore((s) => s.setHighlightColor);
  const loadProject = useStore((s) => s.loadProject);
  const originalImageFromStore = useStore((s) => s.originalImage);

  const { 
    processImage, 
    reprocessImage, 
    isProcessing, 
    hasLoadedImage, 
    originalImageData,
  } = useImageProcessor();

  // 同步原图到 store
  useEffect(() => {
    if (originalImageData && originalImageData !== originalImageFromStore) {
      setOriginalImage(originalImageData);
    }
  }, [originalImageData, originalImageFromStore, setOriginalImage]);

  // 处理模式切换
  const handleModeChange = useCallback((mode: 'editor' | 'display') => {
    // 切换到编辑模式时清除高亮
    if (mode === 'editor') {
      setHighlightColor(null);
    }
    setMode(mode);
  }, [setHighlightColor, setMode]);

  // 处理图片上传
  const handleFileSelect = useCallback(async (file: File) => {
    const currentConfig = useStore.getState().config;
    const result = await processImage(
      file,
      currentConfig.width,
      currentConfig.height,
      currentConfig.colorCount,
      currentConfig.brand
    );
    if (result) {
      setPixelData(result, false);
      MessagePlugin.success('图片处理完成');
    }
  }, [processImage, setPixelData]);

  // 应用配置
  const handleApplyConfig = useCallback(async () => {
    if (!hasLoadedImage) return;
    
    const currentConfig = useStore.getState().config;
    const result = await reprocessImage(
      currentConfig.width, 
      currentConfig.height, 
      currentConfig.colorCount, 
      currentConfig.brand
    );
    if (result) {
      setPixelData(result, false);
      MessagePlugin.success('参数应用成功');
    }
  }, [hasLoadedImage, reprocessImage, setPixelData]);

  // 导入项目
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await readFileAsText(file);
    const project = importProjectFromJson(text);
    
    if (project) {
      loadProject({
        pixelData: project.pixelData,
        config: project.config,
      });
      MessagePlugin.success('项目导入成功');
    } else {
      MessagePlugin.error('导入失败：无效的项目文件');
    }
    
    e.target.value = '';
  }, [loadProject]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          useStore.getState().undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          useStore.getState().redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 使用 store 中的 originalImage 或 hook 中的
  const displayOriginalImage = originalImageFromStore || originalImageData;

  return (
    <div className="w-full h-full flex flex-col bg-background-light">
      {/* 顶部导航栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo - 与网页图标一致 */}
          <div className="w-9 h-9 flex items-center justify-center text-2xl">
            🎨
          </div>
          <h1 className="text-lg font-semibold text-gray-800">拼豆图纸生成器</h1>
        </div>
        
        {/* 模式切换按钮组 */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleModeChange('editor')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${ui.mode === 'editor'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }
            `}
          >
            <EditIcon size="16px" />
            <span>编辑模式</span>
          </button>
          <button
            onClick={() => handleModeChange('display')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${ui.mode === 'display'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }
            `}
          >
            <BrowseIcon size="16px" />
            <span>展示模式</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="small"
            icon={<UploadIcon />}
            onClick={() => importInputRef.current?.click()}
          >
            导入
          </Button>
          <Button
            theme="primary"
            size="small"
            icon={<DownloadIcon />}
            onClick={() => setShowExportDialog(true)}
          >
            导出
          </Button>
        </div>
      </header>
      
      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden flex">
        {ui.mode === 'editor' ? (
          <>
            {/* 左侧工具栏 */}
            <Toolbar />
            
            {/* 中间画布区域 */}
            <div className="flex-1 overflow-hidden">
              <EditorCanvas />
            </div>
            
            {/* 右侧面板 */}
            <div 
              className={`
                bg-white border-l border-gray-200 flex flex-col shrink-0
                transition-all duration-300 ease-in-out
                ${rightPanelCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
              `}
            >
              {!rightPanelCollapsed && (
                <div className="flex flex-col h-full">
                  {/* 图片上传 */}
                  <div className="p-4 border-b border-gray-100">
                    <ImageUploader 
                      onFileSelect={handleFileSelect}
                      disabled={isProcessing}
                      originalImage={displayOriginalImage}
                    />
                  </div>
                  
                  {/* 配置面板 */}
                  <div className="border-b border-gray-100">
                    <ConfigPanel
                      config={config}
                      onChange={setConfig}
                      onApply={handleApplyConfig}
                      hasImage={hasLoadedImage}
                      isProcessing={isProcessing}
                    />
                  </div>
                  
                  {/* 颜色面板 */}
                  <div className="flex-1 overflow-y-auto">
                    <ColorPalette />
                  </div>
                </div>
              )}
            </div>
            
            {/* 面板折叠按钮 */}
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-l-lg p-1 shadow-sm hover:bg-gray-50 transition-colors"
              style={{ right: rightPanelCollapsed ? 0 : '288px' }}
            >
              {rightPanelCollapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </button>
          </>
        ) : (
          <>
            {/* 展示模式 */}
            <div className="flex-1 overflow-hidden">
              <DisplayCanvas />
            </div>
            
            {/* 颜色统计面板 */}
            {ui.showColorStats && (
              <div className="w-64 bg-white border-l border-gray-200 shrink-0">
                <ColorStats />
              </div>
            )}
          </>
        )}
      </main>

      {/* 导出对话框 */}
      <ExportDialog
        visible={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  );
}

export default App;
