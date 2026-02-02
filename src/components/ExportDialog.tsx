import { useState } from 'react';
import { Dialog, Button, Input, Tabs } from 'tdesign-react';
import { DownloadIcon, FileIcon, ImageIcon } from 'tdesign-icons-react';
import { useStore } from '../store/useStore';
import { getAllColors } from '../data/beadColors';
import { createColorMap, exportCanvasToImage } from '../utils/canvasRenderer';
import { exportProjectToJson, downloadFile, downloadImage } from '../utils/fileIO';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportDialog({ visible, onClose }: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState('project');
  const [projectName, setProjectName] = useState('我的拼豆项目');
  const [imageScale, setImageScale] = useState(10);

  const pixelData = useStore((s) => s.pixelData);
  const config = useStore((s) => s.config);

  const colors = getAllColors(config.brand);
  const colorMap = createColorMap(colors);

  const handleExportProject = () => {
    const json = exportProjectToJson(pixelData, config, projectName);
    downloadFile(json, `${projectName}.json`, 'application/json');
    onClose();
  };

  const handleExportImage = () => {
    const dataUrl = exportCanvasToImage(pixelData, colorMap, imageScale);
    downloadImage(dataUrl, `${projectName}.png`);
    onClose();
  };

  const height = pixelData.length;
  const width = height > 0 ? pixelData[0].length : 0;

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      header="导出项目"
      footer={null}
      width={450}
    >
      <Tabs value={activeTab} onChange={(val) => setActiveTab(val as string)}>
        <Tabs.TabPanel value="project" label="导出项目文件">
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">项目名称</label>
              <Input
                value={projectName}
                onChange={(val) => setProjectName(val as string)}
                placeholder="输入项目名称"
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <FileIcon size={16} />
                <span className="text-sm font-medium">JSON 格式</span>
              </div>
              <p className="text-xs text-gray-400">
                保存完整的项目数据，包括像素数据和配置参数。
                可以随时导入继续编辑。
              </p>
            </div>

            <Button
              theme="primary"
              block
              icon={<DownloadIcon />}
              onClick={handleExportProject}
            >
              下载项目文件
            </Button>
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel value="image" label="导出图片">
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-2">
                像素缩放比例: {imageScale}x
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={imageScale}
                onChange={(e) => setImageScale(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1x (原始大小)</span>
                <span>50x</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <ImageIcon size={16} />
                <span className="text-sm font-medium">PNG 格式</span>
              </div>
              <p className="text-xs text-gray-400">
                输出尺寸: {width * imageScale} × {height * imageScale} 像素
              </p>
            </div>

            <Button
              theme="primary"
              block
              icon={<DownloadIcon />}
              onClick={handleExportImage}
            >
              下载图片
            </Button>
          </div>
        </Tabs.TabPanel>
      </Tabs>
    </Dialog>
  );
}
