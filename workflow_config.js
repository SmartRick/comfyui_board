/**
 * 工作流配置管理类
 */
class WorkflowConfig {
    constructor() {
        // 基础工作流配置
        this.baseWorkflow = window.comfyWorkflow;
        
        // 可配置参数定义
        this.configParams = {
            prompt: {
                nodeId: "6",
                path: "inputs.text",
                type: "textarea",
                label: "提示词",
                default: "1girl",
                placeholder: "输入提示词，每行一个关键词",
                rows: 4
            },
            seed: {
                nodeId: "3",
                path: "inputs.seed",
                type: "number",
                label: "随机种子",
                default: 333749729950966,
                min: 0,
                max: Number.MAX_SAFE_INTEGER
            },
            steps: {
                nodeId: "3",
                path: "inputs.steps",
                type: "number",
                label: "步数",
                default: 20,
                min: 1,
                max: 100
            },
            cfg: {
                nodeId: "3",
                path: "inputs.cfg",
                type: "number",
                label: "CFG Scale",
                default: 7,
                min: 1,
                max: 20,
                step: 0.5
            },
            denoise: {
                nodeId: "3",
                path: "inputs.denoise",
                type: "number",
                label: "去噪强度",
                default: 0.5,
                min: 0,
                max: 1,
                step: 0.05
            }
        };
        
        // 当前配置值
        this.currentConfig = this.getDefaultConfig();
    }

    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        const config = {};
        Object.entries(this.configParams).forEach(([key, param]) => {
            config[key] = param.default;
        });
        return config;
    }

    /**
     * 更新配置值
     * @param {string} key - 配置键
     * @param {any} value - 配置值
     */
    updateConfig(key, value) {
        if (key in this.configParams) {
            this.currentConfig[key] = value;
        }
    }

    /**
     * 获取完整的工作流配置
     * @returns {Object} 完整的工作流配置
     */
    getWorkflow() {
        // 深拷贝基础工作流
        const workflow = JSON.parse(JSON.stringify(this.baseWorkflow));
        
        // 应用当前配置
        Object.entries(this.currentConfig).forEach(([key, value]) => {
            const param = this.configParams[key];
            const node = workflow[param.nodeId];
            if (node) {
                // 使用路径设置值
                const pathParts = param.path.split('.');
                let current = node;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    current = current[pathParts[i]];
                }
                current[pathParts[pathParts.length - 1]] = value;
            }
        });
        
        return workflow;
    }

    /**
     * 创建配置UI
     * @returns {HTMLElement} 配置面板元素
     */
    createConfigUI() {
        const container = document.createElement('div');
        container.className = 'workflow-config';
        
        Object.entries(this.configParams).forEach(([key, param]) => {
            const group = document.createElement('div');
            group.className = 'config-group';
            
            const label = document.createElement('label');
            label.textContent = param.label;
            
            let input;
            if (param.type === 'textarea') {
                input = document.createElement('textarea');
                input.placeholder = param.placeholder;
                input.rows = param.rows || 4;
            } else if (param.type === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                if ('min' in param) input.min = param.min;
                if ('max' in param) input.max = param.max;
                if ('step' in param) input.step = param.step;
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.placeholder = param.placeholder;
            }
            
            input.value = this.currentConfig[key];
            input.addEventListener('change', (e) => {
                let value = e.target.value;
                if (param.type === 'number') {
                    value = Number(value);
                }
                this.updateConfig(key, value);
            });
            
            // 为 textarea 添加自动调整高度
            if (param.type === 'textarea') {
                input.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
            }
            
            group.appendChild(label);
            group.appendChild(input);
            container.appendChild(group);
        });
        
        return container;
    }
}

// 创建全局配置实例
window.workflowConfig = new WorkflowConfig(); 