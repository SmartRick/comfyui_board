//项目路径
const projectPath = "G:\\project\\test2";

// 定义工作流配置
const workflow = {
    "3": {
      "inputs": {
        "seed": 333749729950966,
        "steps": 20,
        "cfg": 7,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 0.5,
        "model": [
          "4",
          0
        ],
        "positive": [
          "6",
          0
        ],
        "negative": [
          "7",
          0
        ],
        "latent_image": [
          "11",
          0
        ]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "K采样器"
      }
    },
    "4": {
      "inputs": {
        "ckpt_name": "SD1.5\\majicMIX realistic 麦橘写实_v7.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Checkpoint加载器(简易)"
      }
    },
    "6": {
      "inputs": {
        "text": "1girl",
        "clip": [
          "4",
          1
        ]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP文本编码器"
      }
    },
    "7": {
      "inputs": {
        "text": "(Nsfw:1.3),(worst quality:1.65),(low quality:1.2),(normal quality:1.2),low resolution,watermark,(EasyNegative:1.2),(badhandv4-AnimeIllustDiffusion_badhandv4:1.2),signature,lowres,bad anatomy,bad hands,text,error,missing fingers,extra digit,fewer digits,cropped,worst quality,low quality,normal quality,jpeg artifacts,signature,watermark,username,blurry,",
        "clip": [
          "4",
          1
        ]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP文本编码器"
      }
    },
    "8": {
      "inputs": {
        "samples": [
          "3",
          0
        ],
        "vae": [
          "4",
          2
        ]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE解码"
      }
    },
    "11": {
      "inputs": {
        "pixels": [
          "12",
          0
        ],
        "vae": [
          "4",
          2
        ]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE编码"
      }
    },
    "12": {
      "inputs": {
        "directory": projectPath + "\\input",
        "image_load_cap": 1,
        "start_index": 0,
        "load_always": true
      },
      "class_type": "LoadImagesFromDir //Inspire",
      "_meta": {
        "title": "加载图像(路径)"
      }
    },
    "13": {
      "inputs": {
        "file_path": projectPath + "\\output_tmp\\output.png",
        "images": [
          "8",
          0
        ]
      },
      "class_type": "SaveImageToLocal",
      "_meta": {
        "title": "保存图像到本地"
      }
    },
    "14": {
      "inputs": {
        "images": [
          "8",
          0
        ]
      },
      "class_type": "PreviewImage",
      "_meta": {
        "title": "预览图像"
      }
    }
};

// 导出为全局变量
window.comfyWorkflow = workflow;