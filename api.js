/**
 * API服务类
 */
class ApiService {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:8000/api';
        this.outputDir = './'; 
        this.outputPrefix = 'outp_';
        this.outputSuffix = '_.png';
        this.clientId = 'web_' + Math.random().toString(36).substr(2, 9);
        console.log('ApiService initialized:', {
            baseUrl: this.baseUrl,
            clientId: this.clientId
        });
    }

    /**
     * 读取工作流配置文件
     * @returns {Promise<Object>}
     */
    async loadWorkflow() {
        try {
            console.log('Loading workflow...');
            if (!window.comfyWorkflow) {
                throw new Error('Workflow configuration not found');
            }
            const workflow = window.comfyWorkflow;
            console.log('Workflow loaded successfully:', workflow);
            return workflow;
        } catch (error) {
            console.error('Failed to load workflow:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('加载工作流配置失败');
        }
    }

    /**
     * 提交生成任务
     * @param {string} inputPath 
     * @returns {Promise<string>} 返回任务ID
     */
    async submitGenerateTask() {
        try {
            console.log('Loading workflow for task submission...');
            // 使用配置管理器获取工作流
            const workflow = window.workflowConfig.getWorkflow();
            
            const requestBody = {
                client_id: this.clientId,
                prompt: workflow
            };
            console.log('Submitting task with request:', {
                url: `${this.baseUrl}/prompt`,
                method: 'POST',
                body: requestBody
            });

            const response = await fetch(`${this.baseUrl}/prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
            }

            const data = JSON.parse(responseText);
            console.log('Task submitted successfully:', data);
            return data.prompt_id;

        } catch (error) {
            console.error('Submit task failed:', {
                error: error.message,
                stack: error.stack
            });
            throw new Error('提交生成任务失败');
        }
    }

    /**
     * 检查任务状态
     * @param {string} promptId 
     * @returns {Promise<{success: boolean, error?: {message: string, type: string, node: string, stack: string}}>}
     */
    async checkTaskStatus(promptId) {
        try {
            console.log(`Checking status for prompt ID: ${promptId}`);
            const response = await fetch(`${this.baseUrl}/history/${promptId}`);
            
            console.log('Status check response:', response.status);
            const responseText = await response.text();
            console.log('Status check response text:', responseText);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
            }

            const data = JSON.parse(responseText);
            const promptData = data[promptId];
            const status = promptData?.status?.status_str;
            
            console.log('Task status:', {
                promptId,
                status,
                fullResponse: data
            });

            // 处理错误状态
            if (status === 'error') {
                // 查找错误消息
                const errorMessage = promptData.status.messages.find(msg => msg[0] === 'execution_error');
                if (errorMessage) {
                    const errorData = errorMessage[1];
                    return {
                        success: false,
                        error: {
                            message: errorData.exception_message,
                            type: errorData.exception_type,
                            node: `${errorData.node_type} (ID: ${errorData.node_id})`,
                            stack: errorData.traceback.join('\n')
                        }
                    };
                }
            }
            
            return { success: status === 'success' };

        } catch (error) {
            console.error('Check status failed:', {
                promptId,
                error: error.message,
                stack: error.stack
            });
            throw new Error('检查任务状态失败');
        }
    }

    /**
     * 等待任务完成
     * @param {string} promptId 
     * @returns {Promise<void>}
     */
    async waitForTaskComplete(promptId) {
        console.log(`Starting to wait for task completion: ${promptId}`);
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkInterval = setInterval(async () => {
                attempts++;
                console.log(`Checking attempt ${attempts} for prompt ID: ${promptId}`);
                
                try {
                    const result = await this.checkTaskStatus(promptId);
                    if (!result.success && result.error) {
                        clearInterval(checkInterval);
                        // 使用结构化的错误对象
                        reject({
                            type: 'GENERATION_ERROR',
                            details: result.error
                        });
                        return;
                    }
                    
                    if (result.success) {
                        console.log(`Task completed successfully: ${promptId}`);
                        clearInterval(checkInterval);
                        resolve();
                    }
                } catch (error) {
                    console.error(`Task check failed on attempt ${attempts}:`, {
                        promptId,
                        error: error.message
                    });
                    clearInterval(checkInterval);
                    reject({
                        type: 'CHECK_ERROR',
                        message: error.message
                    });
                }
            }, 1000);
        });
    }

    /**
     * 上传图片数据
     * @param {Blob} imageData - 图片数据
     * @returns {Promise<void>}
     */
    async uploadImage(imageData) {
        console.log('Uploading image data:', {
            size: imageData.size,
            type: imageData.type
        });
        
        const response = await fetch(`${this.baseUrl}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'image/png'
            },
            body: imageData
        });

        if (!response.ok) {
            throw {
                type: 'UPLOAD_ERROR',
                message: `Upload failed: ${response.status} ${response.statusText}`
            };
        }
    }

    /**
     * 处理图像生成
     * @param {Blob} imageData - 图片数据
     * @returns {Promise<string>} 返回生成的图片路径
     */
    async processImage(imageData) {
        try {
            console.log('Starting image processing...');
            
            // 上传图片
            await this.uploadImage(imageData);
            
            // 提交生成任务
            const promptId = await this.submitGenerateTask();
            console.log('Task submitted with prompt ID:', promptId);
            
            try {
                // 等待任务完成
                await this.waitForTaskComplete(promptId);
                console.log('Task processing completed');
                
                // 获取输出图片
                const outputFile = await this.getLatestOutputFile();
                console.log('Output file found:', outputFile);
                
                return outputFile;
            } catch (error) {
                // 直接传递错误对象
                throw error;
            }

        } catch (error) {
            console.error('Image processing failed:', error);
            
            // 如果错误已经是结构化的，直接传递
            if (error.type) {
                throw error;
            }
            
            // 包装其他错误
            throw {
                type: 'PROCESS_ERROR',
                message: error.message || '图片生成失败'
            };
        }
    }

    /**
     * 获取最新的输出文件
     * @returns {Promise<string>} 返回最新的输出文件路径
     */
    async getLatestOutputFile() {
        console.log('Getting latest output file from server');
        try {
            const response = await fetch(`${this.baseUrl}/latest_image`);
            if (!response.ok) {
                throw new Error(`Failed to get latest image: ${response.status}`);
            }

            const data = await response.json();
            const imageUrl = `http://127.0.0.1:8000${data.url}`;
            console.log('Latest image URL:', imageUrl);
            
            return imageUrl;
        } catch (error) {
            console.error('Failed to get latest image:', error);
            throw new Error('获取输出文件失败');
        }
    }
}

// 创建全局API服务实例
window.apiService = new ApiService(); 