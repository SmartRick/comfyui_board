/**
 * @typedef {Object} Layer
 * @property {string} id - 图层唯一标识
 * @property {HTMLImageElement} image - 图层图片元素
 * @property {number} x - 图层x坐标
 * @property {number} y - 图层y坐标
 * @property {number} width - 图层宽度
 * @property {number} height - 图层高度
 * @property {number} rotation - 图层旋转角度
 * @property {number} scale - 图层缩放比例
 */

class CanvasBoard {
    /**
     * @constructor
     */
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.layers = [];
        this.selectedLayer = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.activeHandle = null;
        this.transformOrigin = null;
        this.zoomLevel = 1;
        
        this.initCanvas();
        this.bindEvents();
        this.initResizeDialog();
        this.initExportFunction();
        this.initGenerateButton();
        this.initConfigPanel();
        this.initShortcuts();
        this.initZoomControls();
    }

    /**
     * 初始化画布
     */
    initCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // 初始化画布位置
        this.updateCanvasPosition();
        
        // 监听容器大小变化
        const resizeObserver = new ResizeObserver(() => {
            this.updateCanvasPosition();
        });
        resizeObserver.observe(this.canvas.parentElement);
        
        this.render();
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 画布事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // 拖放区域事件
        const dragArea = document.getElementById('dragArea');
        const fileInput = document.getElementById('fileInput');
        
        // 拖放事件
        dragArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragArea.classList.add('drag-over');
        });
        
        dragArea.addEventListener('dragleave', () => {
            dragArea.classList.remove('drag-over');
        });
        
        dragArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dragArea.classList.remove('drag-over');
            this.handleImageDrop(e);
        });
        
        // 点击上传
        dragArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageFile(file);
            }
            // 清空 input 值，允许重复选择同一文件
            fileInput.value = '';
        });
        
        // 图层列表排序
        const layerList = document.getElementById('layerList');
        new Sortable(layerList, {
            onEnd: this.handleLayerReorder.bind(this)
        });
        
        // 缩放显示
        this.zoomText = document.querySelector('.zoom-text');
    }

    /**
     * 处理图片文件
     * @param {File} file 
     */
    handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            // 设置一个标志，防止重复加载
            let isLoaded = false;
            
            img.onload = () => {
                // 确保只加载一次
                if (!isLoaded) {
                    isLoaded = true;
                    this.addLayer(img);
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * 处理图片拖放
     * @param {DragEvent} e 
     */
    handleImageDrop(e) {
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            this.handleImageFile(file);
        }
    }

    /**
     * 添加新图层
     * @param {HTMLImageElement} image 
     */
    addLayer(image) {
        // 检查是否已经存在相同的图层
        const existingLayer = this.layers.find(layer => 
            layer.image.src === image.src && 
            layer.x === (this.canvas.width - (image.width * 0.8)) / 2 &&
            layer.y === (this.canvas.height - (image.height * 0.8)) / 2
        );
        
        if (existingLayer) {
            console.log('Layer already exists, skipping duplicate');
            return;
        }

        // 计算适当的初始尺寸
        let width = image.width;
        let height = image.height;
        const maxSize = Math.min(this.canvas.width * 0.8, this.canvas.height * 0.8);
        
        if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
        } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
        }

        const layer = {
            id: `layer-${Date.now()}`,
            image: image,
            x: (this.canvas.width - width) / 2,
            y: (this.canvas.height - height) / 2,
            width: width,
            height: height,
            scale: 1,
            rotation: 0,
            naturalWidth: image.width,
            naturalHeight: image.height,
            zIndex: Math.max(...this.layers.map(l => l.zIndex), -1) + 1
        };
        
        // 如果是新加载的图片，设置跨域属性
        if (!image.crossOrigin) {
            image.crossOrigin = 'anonymous';
        }
        
        this.layers.push(layer);
        this.selectedLayer = layer;
        this.updateLayerList();
        this.updateZoomText();
        this.render();
    }

    /**
     * 更新图层列表
     */
    updateLayerList() {
        const layerList = document.getElementById('layerList');
        layerList.innerHTML = this.layers.map(layer => `
            <li class="layer-item ${this.selectedLayer === layer ? 'selected' : ''}" data-id="${layer.id}">
                <div class="layer-preview">
                    <img src="${layer.image.src}" alt="Layer preview">
                </div>
                <div class="layer-info">
                    <span class="layer-name">图层 ${layer.id.split('-')[1]}</span>
                </div>
                <div class="layer-actions">
                    <button class="layer-btn duplicate-btn" title="复制图层" data-id="${layer.id}">
                        <i class="fas fa-clone"></i>
                    </button>
                    <button class="layer-btn delete-btn" title="删除图层" data-id="${layer.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `).join('');

        // 重新绑定事件
        this.bindLayerEvents();
    }

    /**
     * 绑定图层相关事件
     */
    bindLayerEvents() {
        const layerList = document.getElementById('layerList');
        
        // 图层选择事件
        layerList.querySelectorAll('.layer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-actions')) {
                    const layerId = item.dataset.id;
                    this.selectLayer(layerId);
                }
            });
        });

        // 删除按钮事件
        layerList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layerId = btn.dataset.id;
                this.deleteLayer(layerId);
            });
        });

        // 复制按钮事件
        layerList.querySelectorAll('.duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layerId = btn.dataset.id;
                this.duplicateLayer(layerId);
            });
        });
    }

    /**
     * 复制图层
     * @param {string} layerId 要复制的图层ID
     */
    duplicateLayer(layerId) {
        const sourceLayer = this.layers.find(layer => layer.id === layerId);
        if (!sourceLayer) return;

        // 创建新图层
        const newLayer = {
            ...JSON.parse(JSON.stringify(sourceLayer)), // 深拷贝基本属性
            id: `layer-${Date.now()}`, // 新的唯一ID
            x: sourceLayer.x + 20, // 偏移位置
            y: sourceLayer.y + 20,
            image: sourceLayer.image, // 直接使用原图像对象
            zIndex: Math.max(...this.layers.map(l => l.zIndex), -1) + 1
        };

        // 添加新图层
        this.layers.push(newLayer);
        this.selectedLayer = newLayer;
        this.updateLayerList();
        this.render();
    }

    /**
     * 删除图层
     * @param {string} layerId 
     */
    deleteLayer(layerId) {
        if (this.selectedLayer && this.selectedLayer.id === layerId) {
            this.selectedLayer = null;
        }
        this.layers = this.layers.filter(layer => layer.id !== layerId);
        this.updateLayerList();
        this.updateZoomText();
        this.render();
    }

    /**
     * 处理图层重新排序
     * @param {Event} evt 
     */
    handleLayerReorder(evt) {
        const newIndex = evt.newIndex;
        const oldIndex = evt.oldIndex;
        
        // 更新所有图层的 zIndex
        this.layers.forEach((layer, index) => {
            layer.zIndex = index;
        });
        
        // 移动图层
        const layer = this.layers[oldIndex];
        this.layers.splice(oldIndex, 1);
        this.layers.splice(newIndex, 0, layer);
        
        // 更新选中状态的视觉效果
        this.updateLayerSelection(layer.id);
        this.render();
    }

    /**
     * 更新图层选中状态
     * @param {string|null} selectedId 
     */
    updateLayerSelection(selectedId) {
        const items = document.querySelectorAll('.layer-item');
        items.forEach(item => {
            if (item.dataset.id === selectedId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * 渲染画布
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 按 zIndex 排序并渲染图层（从下到上）
        [...this.layers]
            .sort((a, b) => a.zIndex - b.zIndex)
            .forEach(layer => {
                this.renderLayer(layer);
            });
    }

    /**
     * 渲染图层
     * @param {Layer} layer 
     */
    renderLayer(layer) {
        const ctx = this.ctx;
        ctx.save();

        // 获取图层中心点
        const centerX = layer.x + (layer.width * layer.scale) / 2;
        const centerY = layer.y + (layer.height * layer.scale) / 2;

        // 应用变换
        ctx.translate(centerX, centerY);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);

        // 绘制图像
        ctx.drawImage(
            layer.image,
            layer.x,
            layer.y,
            layer.width * layer.scale,
            layer.height * layer.scale
        );

        // 如果是选中的图层，绘制控制框和手柄
        if (layer === this.selectedLayer) {
            this.drawSelectionFrame(layer);
        }

        ctx.restore();
    }

    /**
     * 绘制选择框和控制手柄
     * @param {Layer} layer 
     */
    drawSelectionFrame(layer) {
        const ctx = this.ctx;
        
        // 计算实际尺寸和位置
        const width = layer.width * layer.scale;
        const height = layer.height * layer.scale;
        
        // 绘制选择框
        ctx.strokeStyle = '#1890ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(layer.x, layer.y, width, height);
        
        // 绘制控制手柄
        ctx.setLineDash([]);
        const handles = this.getHandles(layer);
        handles.forEach(handle => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#1890ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    /**
     * 获取控制手柄位置
     * @param {Layer} layer 
     * @returns {Array<{x: number, y: number, type: string}>}
     */
    getHandles(layer) {
        const width = layer.width * layer.scale;
        const height = layer.height * layer.scale;
        
        return [
            { x: layer.x, y: layer.y, type: 'nw-resize' },
            { x: layer.x + width / 2, y: layer.y, type: 'n-resize' },
            { x: layer.x + width, y: layer.y, type: 'ne-resize' },
            { x: layer.x + width, y: layer.y + height / 2, type: 'e-resize' },
            { x: layer.x + width, y: layer.y + height, type: 'se-resize' },
            { x: layer.x + width / 2, y: layer.y + height, type: 's-resize' },
            { x: layer.x, y: layer.y + height, type: 'sw-resize' },
            { x: layer.x, y: layer.y + height / 2, type: 'w-resize' }
        ];
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} e 
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 检查是否点击了控制手柄（如果有选中的图层）
        if (this.selectedLayer) {
            const handle = this.getClickedHandle(x, y);
            if (handle) {
                this.activeHandle = handle;
                this.transformOrigin = this.getOppositeHandle(handle, this.selectedLayer);
                return;
            }
        }

        // 检查是否点击了图层
        const clickedLayer = this.getLayerAtPoint(x, y);
        
        if (clickedLayer) {
            // 更新选中状态
            this.selectedLayer = clickedLayer;
            this.updateLayerSelection(clickedLayer.id);
            
            // 开始拖动
            this.isDragging = true;
            this.dragStartX = x - clickedLayer.x;
            this.dragStartY = y - clickedLayer.y;
            
            // 更新缩放显示
            this.updateZoomText();
        } else {
            // 点击空白处，清除选中状态
            this.selectedLayer = null;
            this.updateLayerSelection(null);
        }

        this.render();
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} e 
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.activeHandle) {
            this.handleTransform(x, y);
        } else if (this.isDragging && this.selectedLayer) {
            this.selectedLayer.x = x - this.dragStartX;
            this.selectedLayer.y = y - this.dragStartY;
        }

        // 更新鼠标样式
        this.updateCursor(x, y);
        this.render();
    }

    /**
     * 处理变换（缩放/旋转）
     * @param {number} x 
     * @param {number} y 
     */
    handleTransform(x, y) {
        const layer = this.selectedLayer;
        if (!layer || !this.activeHandle) return;

        if (this.activeHandle.type.includes('resize')) {
            // 获取对角点作为缩放参考点
            const oppositeHandle = this.getOppositeHandle(this.activeHandle, layer);
            
            // 计算新的宽度和高度
            let newWidth, newHeight;
            const type = this.activeHandle.type;
            
            // 根据手柄类型计算新尺寸
            if (type.includes('e')) {
                newWidth = x - layer.x;
            } else if (type.includes('w')) {
                newWidth = (oppositeHandle.x - x);
            }
            
            if (type.includes('s')) {
                newHeight = y - layer.y;
            } else if (type.includes('n')) {
                newHeight = (oppositeHandle.y - y);
            }
            
            // 如果是角落的手柄，保持宽高比
            if (type.includes('n') && type.includes('e') || 
                type.includes('s') && type.includes('w') ||
                type.includes('n') && type.includes('w') ||
                type.includes('s') && type.includes('e')) {
                const ratio = layer.width / layer.height;
                if (Math.abs(newWidth / ratio) > Math.abs(newHeight)) {
                    newHeight = newWidth / ratio;
                } else {
                    newWidth = newHeight * ratio;
                }
            }
            
            // 计算新的缩放比例
            if (newWidth && newHeight) {
                const scaleX = newWidth / layer.width;
                const scaleY = newHeight / layer.height;
                const newScale = Math.max(scaleX, scaleY);
                
                // 限制缩放范围
                if (newScale >= 0.1 && newScale <= 5) {
                    // 保存原始中心点
                    const oldCenterX = layer.x + (layer.width * layer.scale) / 2;
                    const oldCenterY = layer.y + (layer.height * layer.scale) / 2;
                    
                    // 更新缩放
                    layer.scale = newScale;
                    
                    // 根据手柄类型调整位置
                    if (type.includes('w')) {
                        layer.x = oppositeHandle.x - layer.width * layer.scale;
                    }
                    if (type.includes('n')) {
                        layer.y = oppositeHandle.y - layer.height * layer.scale;
                    }
                    
                    this.updateZoomText();
                }
            }
        }
        
        this.render();
    }

    /**
     * 处理滚轮缩放
     * @param {WheelEvent} e 
     */
    handleWheel(e) {
        e.preventDefault();
        
        if (!this.selectedLayer) return;

        const layer = this.selectedLayer;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算鼠标相对于图层中心的位置
        const centerX = layer.x + layer.width * layer.scale / 2;
        const centerY = layer.y + layer.height * layer.scale / 2;
        
        // 计算鼠标相对于图层的位置比例
        const relativeX = (mouseX - centerX) / (layer.width * layer.scale);
        const relativeY = (mouseY - centerY) / (layer.height * layer.scale);

        // 计算新的缩放值
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, layer.scale * scaleFactor));

        if (newScale !== layer.scale) {
            // 更新缩放
            const oldScale = layer.scale;
            layer.scale = newScale;

            // 调整位置以保持鼠标位置不变
            const scaleRatio = newScale / oldScale;
            const dx = (mouseX - centerX) * (scaleRatio - 1);
            const dy = (mouseY - centerY) * (scaleRatio - 1);
            
            layer.x -= dx;
            layer.y -= dy;

            this.updateZoomText();
            this.render();
        }
    }

    /**
     * 获取点击的控制手柄
     * @param {number} x 
     * @param {number} y 
     * @returns {Object|null}
     */
    getClickedHandle(x, y) {
        if (!this.selectedLayer) return null;
        
        const handles = this.getHandles(this.selectedLayer);
        const hitRadius = 5;
        
        return handles.find(handle => {
            const dx = x - handle.x;
            const dy = y - handle.y;
            return (dx * dx + dy * dy) <= hitRadius * hitRadius;
        });
    }

    /**
     * 获取对应的对角手柄
     * @param {Object} handle 
     * @param {Layer} layer 
     * @returns {Object}
     */
    getOppositeHandle(handle, layer) {
        const width = layer.width * layer.scale;
        const height = layer.height * layer.scale;
        
        const oppositeTypes = {
            'nw-resize': { x: layer.x + width, y: layer.y + height },
            'ne-resize': { x: layer.x, y: layer.y + height },
            'se-resize': { x: layer.x, y: layer.y },
            'sw-resize': { x: layer.x + width, y: layer.y },
            'n-resize': { x: layer.x + width / 2, y: layer.y + height },
            's-resize': { x: layer.x + width / 2, y: layer.y },
            'e-resize': { x: layer.x, y: layer.y + height / 2 },
            'w-resize': { x: layer.x + width, y: layer.y + height / 2 }
        };
        
        return oppositeTypes[handle.type];
    }

    /**
     * 更新鼠标样式
     * @param {number} x 
     * @param {number} y 
     */
    updateCursor(x, y) {
        if (this.activeHandle) {
            // 如果正在拖动手柄，保持当前的鼠标样式
            return;
        }

        if (this.selectedLayer) {
            const handle = this.getClickedHandle(x, y);
            if (handle) {
                this.canvas.style.cursor = handle.type;
                return;
            }
        }

        const isOverLayer = this.getLayerAtPoint(x, y);
        this.canvas.style.cursor = isOverLayer ? 'move' : 'default';
    }

    /**
     * 获取指定位置的图层
     * @param {number} x 
     * @param {number} y 
     * @returns {Layer|null}
     */
    getLayerAtPoint(x, y) {
        // 从上到下检查图层（按 zIndex 从大到小排序）
        const sortedLayers = [...this.layers].sort((a, b) => b.zIndex - a.zIndex);
        
        for (const layer of sortedLayers) {
            // 计算图层的实际边界
            const scaledWidth = layer.width * layer.scale;
            const scaledHeight = layer.height * layer.scale;
            
            // 计算点击位置相对于图层左上角的偏移
            const dx = x - layer.x;
            const dy = y - layer.y;
            
            // 检查点是否在图层的边界范围内
            if (dx >= 0 && dx <= scaledWidth && 
                dy >= 0 && dy <= scaledHeight) {
                
                // 如果有旋转，需要进行额外检查
                if (layer.rotation !== 0) {
                    // 计算相对于中心点的坐标
                    const centerX = scaledWidth / 2;
                    const centerY = scaledHeight / 2;
                    const relativeX = dx - centerX;
                    const relativeY = dy - centerY;
                    
                    // 应用反向旋转
                    const angle = -layer.rotation * Math.PI / 180;
                    const rotatedX = relativeX * Math.cos(angle) - relativeY * Math.sin(angle);
                    const rotatedY = relativeX * Math.sin(angle) + relativeY * Math.cos(angle);
                    
                    // 检查旋转后的点是否在图层范围内
                    if (Math.abs(rotatedX) <= scaledWidth / 2 && 
                        Math.abs(rotatedY) <= scaledHeight / 2) {
                        return layer;
                    }
                } else {
                    return layer;
                }
            }
        }
        
        return null;
    }

    /**
     * 更新缩放文本显示
     */
    updateZoomText() {
        if (this.zoomText && this.selectedLayer) {
            this.zoomText.textContent = `${Math.round(this.selectedLayer.scale * 100)}%`;
        }
    }

    /**
     * 处理鼠标松开事件
     */
    handleMouseUp() {
        this.isDragging = false;
        this.activeHandle = null;
        this.transformOrigin = null;
    }

    /**
     * 初始化分辨率调整对话框
     */
    initResizeDialog() {
        const resizeBtn = document.getElementById('resizeCanvasBtn');
        const modal = document.getElementById('resizeModal');
        const cancelBtn = document.getElementById('cancelResize');
        const confirmBtn = document.getElementById('confirmResize');
        const widthInput = document.getElementById('canvasWidth');
        const heightInput = document.getElementById('canvasHeight');
        const ratioCheckbox = document.getElementById('maintainRatio');
        
        // 初始化输入值
        widthInput.value = this.canvas.width;
        heightInput.value = this.canvas.height;
        
        // 保存原始宽高比
        const aspectRatio = this.canvas.width / this.canvas.height;
        
        // 处理宽度变化
        widthInput.addEventListener('input', () => {
            if (ratioCheckbox.checked) {
                heightInput.value = Math.round(widthInput.value / aspectRatio);
            }
        });
        
        // 处理高度变化
        heightInput.addEventListener('input', () => {
            if (ratioCheckbox.checked) {
                widthInput.value = Math.round(heightInput.value * aspectRatio);
            }
        });
        
        // 预设尺寸按钮
        document.querySelectorAll('.preset-sizes button').forEach(btn => {
            btn.addEventListener('click', () => {
                const [width, height] = btn.dataset.size.split('x').map(Number);
                widthInput.value = width;
                heightInput.value = height;
            });
        });
        
        // 打开对话框
        resizeBtn.addEventListener('click', () => {
            modal.classList.add('show');
        });
        
        // 关闭对话框
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        // 确认调整
        confirmBtn.addEventListener('click', () => {
            const newWidth = parseInt(widthInput.value);
            const newHeight = parseInt(heightInput.value);
            
            if (this.resizeCanvas(newWidth, newHeight)) {
                modal.classList.remove('show');
            }
        });
    }

    /**
     * 调整画布大小
     * @param {number} newWidth 
     * @param {number} newHeight 
     * @returns {boolean}
     */
    resizeCanvas(newWidth, newHeight) {
        // 验证输入
        if (newWidth < 100 || newWidth > 4000 || 
            newHeight < 100 || newHeight > 4000) {
            alert('画布尺寸必须在 100px 到 4000px 之间');
            return false;
        }
        
        // 计算缩放比例
        const scaleX = newWidth / this.canvas.width;
        const scaleY = newHeight / this.canvas.height;
        
        // 保存当前画布内容
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // 调整画布大小
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // 调整所有图层的位置和大小
        this.layers.forEach(layer => {
            layer.x *= scaleX;
            layer.y *= scaleY;
            layer.width *= scaleX;
            layer.height *= scaleY;
        });
        
        this.render();
        return true;
    }

    /**
     * 初始化导出功能
     */
    initExportFunction() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCanvas();
            });
        }
    }

    /**
     * 导出画布为图片
     */
    exportCanvas() {
        try {
            // 创建临时画布以确保导出时不包含选择框和控制点
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 设置白色背景
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // 渲染所有图层，但不渲染选择框和控制点
            [...this.layers]
                .sort((a, b) => a.zIndex - b.zIndex)
                .forEach(layer => {
                    tempCtx.save();

                    // 应用变换
                    const centerX = layer.x + (layer.width * layer.scale) / 2;
                    const centerY = layer.y + (layer.height * layer.scale) / 2;

                    tempCtx.translate(centerX, centerY);
                    tempCtx.rotate(layer.rotation * Math.PI / 180);
                    tempCtx.translate(-centerX, -centerY);

                    // 绘制图像
                    tempCtx.drawImage(
                        layer.image,
                        layer.x,
                        layer.y,
                        layer.width * layer.scale,
                        layer.height * layer.scale
                    );

                    tempCtx.restore();
                });

            // 创建下载链接并触发下载
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `canvas-export-${timestamp}.png`;
            
            // 直接使用 toDataURL 来避免异步问题
            link.href = tempCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Export failed:', error);
            alert('导出失败，请重试');
        }
    }

    /**
     * 初始化生成按钮
     */
    initGenerateButton() {
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.addEventListener('click', () => {
            this.handleGenerate();
        });
    }

    /**
     * 保存画布内容为 blob
     * @returns {Promise<Blob>}
     */
    async getCanvasBlob() {
        try {
            // 创建临时画布
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // 设置白色背景
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

            // 为每个图层创建新的图片并等待加载
            for (const layer of [...this.layers].sort((a, b) => a.zIndex - b.zIndex)) {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        tempCtx.save();
                        const centerX = layer.x + (layer.width * layer.scale) / 2;
                        const centerY = layer.y + (layer.height * layer.scale) / 2;
                        tempCtx.translate(centerX, centerY);
                        tempCtx.rotate(layer.rotation * Math.PI / 180);
                        tempCtx.translate(-centerX, -centerY);
                        tempCtx.drawImage(
                            img,
                            layer.x,
                            layer.y,
                            layer.width * layer.scale,
                            layer.height * layer.scale
                        );
                        tempCtx.restore();
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = layer.image.src;
                });
            }

            // 将画布转换为 blob
            return new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
        } catch (error) {
            console.error('Failed to get canvas blob:', error);
            throw new Error('获取画布数据失败');
        }
    }

    /**
     * 显示错误提示框
     * @param {Object} error 错误对象
     */
    showErrorModal(error) {
        const modal = document.getElementById('errorModal');
        const messageEl = document.getElementById('errorMessage');
        
        let formattedMessage = '';
        
        if (error.type === 'GENERATION_ERROR') {
            // 处理生成错误
            const { node, type, message, stack } = error.details;
            formattedMessage = `
                <div class="error-section">
                    <div class="error-label">节点</div>
                    <div class="error-value">${node}</div>
                </div>
                <div class="error-section">
                    <div class="error-label">类型</div>
                    <div class="error-value">${type}</div>
                </div>
                <div class="error-section">
                    <div class="error-label">消息</div>
                    <div class="error-value">${message}</div>
                </div>
                <div class="error-section">
                    <div class="error-label">堆栈</div>
                    <div class="error-value stack-trace">${stack}</div>
                </div>
            `;
        } else {
            // 处理其他错误
            formattedMessage = `
                <div class="error-section">
                    <div class="error-label">错误信息</div>
                    <div class="error-value">${error.message || '未知错误'}</div>
                </div>
            `;
        }
        
        messageEl.innerHTML = formattedMessage;
        modal.classList.add('show');
        
        // 点击背景关闭
        const closeOnBackground = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        // 绑定关闭按钮事件
        const closeBtn = document.getElementById('closeErrorModal');
        const closeModal = () => {
            modal.classList.remove('show');
            closeBtn.removeEventListener('click', closeModal);
            modal.removeEventListener('click', closeOnBackground);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', closeOnBackground);
    }

    /**
     * 处理生成请求
     */
    async handleGenerate() {
        const generateBtn = document.getElementById('generateBtn');
        
        try {
            // 添加加载状态
            generateBtn.classList.add('loading');
            generateBtn.innerHTML = '<i class="fas fa-spinner"></i><span>生成中...</span>';

            // 获取画布数据
            const blob = await this.getCanvasBlob();
            
            // 调用API处理图片
            const outputFile = await apiService.processImage(blob);
            
            // 加载生成的图片
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // 使用 Promise 包装图片加载
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    // 计算适配画板的尺寸
                    const scale = Math.min(
                        this.canvas.width / img.width,
                        this.canvas.height / img.height
                    );
                    
                    // 创建新图层
                    const layer = {
                        id: `layer-${Date.now()}`,
                        image: img,
                        x: (this.canvas.width - img.width * scale) / 2,
                        y: (this.canvas.height - img.height * scale) / 2,
                        width: img.width * scale,
                        height: img.height * scale,
                        scale: 1,
                        rotation: 0,
                        naturalWidth: img.width,
                        naturalHeight: img.height,
                        zIndex: Math.max(...this.layers.map(l => l.zIndex), -1) + 1
                    };
                    
                    this.layers.push(layer);
                    this.selectedLayer = layer;
                    this.updateLayerList();
                    this.render();
                    resolve();
                };
                img.onerror = reject;
                img.src = outputFile;
            });

        } catch (error) {
            console.error('Generation failed:', error);
            // 使用错误提示框显示错误
            if (error.type === 'GENERATION_ERROR') {
                this.showErrorModal(error);
            } else {
                this.showErrorModal({
                    type: 'UNKNOWN_ERROR',
                    message: error.message || '未知错误，请重试'
                });
            }
        } finally {
            // 恢复按钮状态
            generateBtn.classList.remove('loading');
            generateBtn.innerHTML = '<i class="fas fa-magic"></i><span>生成</span>';
        }
    }

    /**
     * 选择图层
     * @param {string} layerId 要选择的图层ID
     */
    selectLayer(layerId) {
        const layer = this.layers.find(layer => layer.id === layerId);
        if (layer) {
            this.selectedLayer = layer;
            // 更新图层列表的选中状态
            this.updateLayerList();
            // 重新渲染画布
            this.render();
        }
    }

    /**
     * 初始化配置面板
     */
    initConfigPanel() {
        // 获取配置内容容器
        const configContent = document.getElementById('configContent');
        
        // 创建并添加配置UI
        const configUI = window.workflowConfig.createConfigUI();
        configContent.appendChild(configUI);
    }

    /**
     * 初始化快捷键
     */
    initShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 如果正在输入，不触发快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 按住 Ctrl/Command 键
            const isCtrlCmd = e.ctrlKey || e.metaKey;

            switch (e.key.toLowerCase()) {
                // Ctrl + G: 生成
                case 'g':
                    if (isCtrlCmd) {
                        e.preventDefault();
                        this.handleGenerate();
                    }
                    break;

                // Delete/Backspace: 删除选中图层
                case 'delete':
                case 'backspace':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.deleteLayer(this.selectedLayer.id);
                    }
                    break;

                // Ctrl + D: 复制选中图层
                case 'd':
                    if (isCtrlCmd && this.selectedLayer) {
                        e.preventDefault();
                        this.duplicateLayer(this.selectedLayer.id);
                    }
                    break;

                // Ctrl + Z: 撤销
                case 'z':
                    if (isCtrlCmd) {
                        e.preventDefault();
                        // TODO: 实现撤销功能
                        console.log('撤销功能待实现');
                    }
                    break;

                // Ctrl + Y: 重做
                case 'y':
                    if (isCtrlCmd) {
                        e.preventDefault();
                        // TODO: 实现重做功能
                        console.log('重做功能待实现');
                    }
                    break;

                // Space: 切换图层可见性
                case ' ':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.toggleLayerVisibility(this.selectedLayer.id);
                    }
                    break;

                // 方向键：移动选中图层
                case 'arrowleft':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.moveLayer(this.selectedLayer.id, -1, 0);
                    }
                    break;
                case 'arrowright':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.moveLayer(this.selectedLayer.id, 1, 0);
                    }
                    break;
                case 'arrowup':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.moveLayer(this.selectedLayer.id, 0, -1);
                    }
                    break;
                case 'arrowdown':
                    if (this.selectedLayer) {
                        e.preventDefault();
                        this.moveLayer(this.selectedLayer.id, 0, 1);
                    }
                    break;

                // Space: 重置视图
                case ' ':
                    if (!this.selectedLayer) { // 只在没有选中图层时触发
                        e.preventDefault();
                        this.resetView();
                    }
                    break;
            }
        });
    }

    /**
     * 切换图层可见性
     * @param {string} layerId 
     */
    toggleLayerVisibility(layerId) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = !layer.visible;
            this.updateLayerList();
            this.render();
        }
    }

    /**
     * 移动图层
     * @param {string} layerId 
     * @param {number} dx X轴移动距离
     * @param {number} dy Y轴移动距离
     */
    moveLayer(layerId, dx, dy) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            const speed = 1;
            if (event.shiftKey) {
                speed = 10; // 按住Shift键时移动速度更快
            }
            layer.x += dx * speed;
            layer.y += dy * speed;
            this.render();
        }
    }

    /**
     * 初始化缩放功能
     */
    initZoomControls() {
        // 缩放按钮
        const zoomInBtn = document.querySelector('.tool-btn[title="放大"]');
        const zoomOutBtn = document.querySelector('.tool-btn[title="缩小"]');
        const resetViewBtn = document.querySelector('.tool-btn[title="重置视图"]');
        
        // 缩放配置
        this.zoomLevel = 1;
        this.zoomStep = 0.1;
        this.minZoom = 0.1;
        this.maxZoom = 3;
        
        // 绑定缩放按钮事件
        zoomInBtn.addEventListener('click', () => this.zoom(1));
        zoomOutBtn.addEventListener('click', () => this.zoom(-1));
        
        // 绑定鼠标滚轮缩放
        const container = this.canvas.parentElement;
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const direction = e.deltaY < 0 ? 1 : -1;
                
                // 获取容器中心点
                const containerRect = container.getBoundingClientRect();
                const centerX = containerRect.width / 2;
                const centerY = containerRect.height / 2;
                
                this.zoom(direction, { x: centerX, y: centerY });
            }
        });
        
        // 初始化画布位置
        this.centerCanvas();
        this.updateZoomText();
        
        // 绑定重置按钮事件
        resetViewBtn.addEventListener('click', () => this.resetView());
    }

    /**
     * 执行缩放
     * @param {number} direction 缩放方向(1:放大, -1:缩小)
     * @param {Object} [point] 缩放中心点
     */
    zoom(direction, point) {
        const oldZoom = this.zoomLevel;
        
        // 计算新的缩放级别
        this.zoomLevel = Math.min(
            Math.max(
                this.zoomLevel + (direction * this.zoomStep),
                this.minZoom
            ),
            this.maxZoom
        );
        
        // 如果缩放没有变化，直接返回
        if (oldZoom === this.zoomLevel) return;
        
        // 更新画布显示
        this.updateCanvasScale();
        this.centerCanvas();
        this.updateZoomText();
    }

    /**
     * 更新画布缩放比例
     */
    updateCanvasScale() {
        // 应用缩放
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.canvas.style.transformOrigin = 'center';
        
        // 更新位置
        this.updateCanvasPosition();
    }

    /**
     * 更新画布位置
     */
    updateCanvasPosition() {
        const container = this.canvas.parentElement;
        
        // 计算画布的缩放后尺寸
        const scaledWidth = this.canvas.width * this.zoomLevel;
        const scaledHeight = this.canvas.height * this.zoomLevel;
        
        // 计算居中位置
        const left = Math.max(0, (container.clientWidth - this.canvas.width) / 2);
        const top = Math.max(0, (container.clientHeight - this.canvas.height) / 2);
        
        // 设置画布位置
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = `${left}px`;
        this.canvas.style.top = `${top}px`;
    }

    /**
     * 将画布居中显示
     */
    centerCanvas() {
        this.updateCanvasPosition();
    }

    /**
     * 更新缩放文本显示
     */
    updateZoomText() {
        const zoomText = document.querySelector('.zoom-text');
        if (zoomText) {
            zoomText.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }

    /**
     * 重置视图
     */
    resetView() {
        // 重置缩放级别
        this.zoomLevel = 1;
        
        // 更新画布显示
        this.updateCanvasScale();
        this.centerCanvas();
        this.updateZoomText();
        
        // 平滑滚动到中心位置
        const container = this.canvas.parentElement;
        const scrollX = (container.scrollWidth - container.clientWidth) / 2;
        const scrollY = (container.scrollHeight - container.clientHeight) / 2;
        
        container.scrollTo({
            left: scrollX,
            top: scrollY,
            behavior: 'smooth'
        });
    }
}

// 初始化画板
const canvasBoard = new CanvasBoard(); 