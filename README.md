# AI 图像编辑器

一个基于 Web 的 AI 图像编辑工具，集成了 ComfyUI 后端，提供直观的图层管理和图像生成功能。

![预览图](docs/preview.png)

## ✨ 特性

- 🎨 多图层管理
  - 拖拽排序
  - 图层变换（移动、缩放、旋转）
  - 复制/删除图层
  - 图层可见性控制

- 🔧 画布操作
  - 自由缩放（10% - 300%）
  - 画布大小调整
  - 视图重置
  - 导出功能

- 🤖 AI 能力
  - 基于 ComfyUI 的图像生成
  - 可配置的生成参数
  - 提示词编辑
  - 实时预览

- ⌨️ 快捷键支持
  - `Ctrl + G`: 生成图像
  - `Ctrl + D`: 复制图层
  - `Delete`: 删除图层
  - `Space`: 重置视图
  - 方向键: 移动图层
  - `Shift + 方向键`: 快速移动图层

## 🚀 快速开始

### 前置要求

- Node.js (推荐 v14+)
- Python 3.8+
- ComfyUI 环境

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/yourusername/ai-image-editor.git
cd ai-image-editor
```

2. 启动 ComfyUI 服务
确保 ComfyUI 已经安装并启动


3. 启动代理服务器
```bash
python proxy.py
```

4. 打开网页应用
双击 `index.html` 文件，即可打开网页应用。

## 🛠️ 项目结构
ai-image-editor/
├── api.js # API 服务封装
├── canvas.js # 画布核心逻辑
├── comfyui_workflow.js # ComfyUI 工作流配置
├── workflow_config.js # 工作流参数管理
├── proxy.py # 代理服务器
├── styles.css # 样式文件
└── index.html # 主页面


## 💡 使用说明

1. **图层管理**
   - 拖拽图片到画布或点击上传区域添加图层
   - 在图层列表中拖拽调整顺序
   - 使用图层工具栏进行复制/删除操作
   - 直接在画布上拖拽、缩放、旋转图层

2. **画布操作**
   - 使用工具栏的缩放控件或 Ctrl + 滚轮调整视图
   - 点击重置视图按钮或按空格键恢复默认视图
   - 通过调整画布大小按钮更改画布尺寸

3. **AI 生成**
   - 在左侧面板配置生成参数
   - 调整提示词、随机种子等参数
   - 点击生成按钮或使用 Ctrl + G 快捷键开始生成
   - 生成的图像会自动添加为新图层

## 🔧 配置说明

### 工作流配置

在 `comfyui_workflow.js` 中定义了默认的 ComfyUI 工作流配置：
```javascript
const workflow = {
// ... 工作流配置
};
```

可以根据需要修改节点参数和连接关系。

### 代理服务器配置

`proxy.py` 提供了与 ComfyUI 的通信代理，主要配置项：

- `input_dir`: 输入图片目录
- `output_dir`: 输出图片目录
- 默认端口: 8000

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - 强大的 AI 图像处理后端
- [Font Awesome](https://fontawesome.com/) - 优秀的图标库
- [SortableJS](https://github.com/SortableJS/Sortable) - 流畅的拖拽排序库