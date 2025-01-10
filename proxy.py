from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.request import urlopen, Request
import json
from functools import partial
import os
import sys
import glob

class CORSRequestHandler(SimpleHTTPRequestHandler):
    # 当前项目路径
    project_path = os.path.dirname(os.path.abspath(__file__))
    # 定义类变量
    input_dir = os.path.join(project_path, "input")  # 修改为你的实际输出目录
    output_dir = os.path.join(project_path, "output_tmp")  # 修改为你的实际输出目录

    def __init__(self, *args, **kwargs):
        # 正确调用父类的初始化
        super(CORSRequestHandler, self).__init__(*args, **kwargs)

    def log_message(self, format, *args):
        """重写日志方法，输出到控制台"""
        print(f"\033[94m[{self.log_date_time_string()}] {format%args}\033[0m")

    def log_error(self, format, *args):
        """重写错误日志方法，输出到控制台"""
        print(f"\033[91m[{self.log_date_time_string()}] ERROR: {format%args}\033[0m", file=sys.stderr)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # 处理静态文件请求
        if self.path.startswith('/static/'):
            try:
                file_path = self.path[1:]  # 移除开头的 /
                with open(file_path, 'rb') as f:
                    self.send_response(200)
                    if file_path.endswith('.png'):
                        self.send_header('Content-Type', 'image/png')
                    self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
                    self.end_headers()
                    self.wfile.write(f.read())
                return
            except Exception as e:
                self.log_error(f"Failed to serve static file: {str(e)}")
                self.send_error(404)
                return

        if self.path.startswith('/api/latest_image'):
            try:
                pattern = os.path.join(self.output_dir, 'output_*_.png')
                self.log_message(f"Looking for images in: {pattern}")
                
                files = glob.glob(pattern)
                self.log_message(f"Found files: {files}")
                
                if not files:
                    self.log_error("No output images found")
                    self.send_error(404, "No output images found")
                    return

                # 按文件名排序并获取最新的
                latest_file = max(files)
                
                # 创建一个符号链接或复制文件到静态目录
                static_dir = 'static'
                if not os.path.exists(static_dir):
                    os.makedirs(static_dir)
                    
                static_file = os.path.join(static_dir, 'latest.png')
                # 如果文件已存在，先删除
                if os.path.exists(static_file):
                    os.remove(static_file)
                    
                # 复制文件
                import shutil
                shutil.copy2(latest_file, static_file)
                
                # 重定向到静态文件
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'url': '/static/latest.png'}).encode())

            except Exception as e:
                self.log_error(f"Failed to get latest image: {str(e)}")
                self.log_error(f"Exception details: {type(e).__name__}")
                self.send_error(500, str(e))
                return
            
        elif self.path.startswith('/api/'):
            target_url = f'http://127.0.0.1:8188{self.path[4:]}'
            self.log_message(f"Forwarding GET request to: {target_url}")
            
            try:
                response = urlopen(target_url)
                response_data = response.read()
                
                self.log_message(f"Response received: {len(response_data)} bytes")
                self.send_response(200)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(response_data)
                
            except Exception as e:
                self.log_error(f"GET request failed: {str(e)}")
                self.send_error(500, str(e))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/upload'):
            try:
                # 获取 Content-Type
                content_type = self.headers['Content-Type']
                
                # 读取原始数据
                content_length = int(self.headers['Content-Length'])
                image_data = self.rfile.read(content_length)
                
                # 确保目录存在
                if not os.path.exists(self.input_dir):
                    os.makedirs(self.input_dir)
                
                # 保存文件
                input_file = os.path.join(self.input_dir, 'input.png')
                with open(input_file, 'wb') as f:
                    f.write(image_data)
                
                self.log_message(f"File saved successfully: {input_file} ({len(image_data)} bytes)")
                
                # 返回成功响应
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode())
                
            except Exception as e:
                self.log_error(f"Upload failed: {str(e)}")
                self.log_error(f"Exception type: {type(e).__name__}")
                import traceback
                self.log_error(f"Traceback: {traceback.format_exc()}")
                self.send_error(500, str(e))
                return
            
        elif self.path.startswith('/api/'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                self.log_message(f"Received POST request with content length: {content_length}")
                
                post_data = self.rfile.read(content_length)
                self.log_message(f"Request body: {post_data.decode('utf-8')}")
                
                target_url = f'http://127.0.0.1:8188{self.path[4:]}'
                self.log_message(f"Forwarding POST request to: {target_url}")
                
                req = Request(target_url, data=post_data, method='POST')
                req.add_header('Content-Type', 'application/json')
                
                try:
                    response = urlopen(req)
                    response_data = response.read()
                    
                    self.log_message(f"Response received: {response_data.decode('utf-8')}")
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data)
                    
                except Exception as e:
                    self.log_error(f"Failed to forward request: {str(e)}")
                    self.send_error(500, str(e))
                    
            except Exception as e:
                self.log_error(f"POST request processing failed: {str(e)}")
                self.send_error(500, str(e))
        else:
            super().do_POST()

def run_server(port=8000):
    try:
        # 检查输出目录是否存在
        if not os.path.exists(CORSRequestHandler.output_dir):
            print(f"\033[91mWarning: Output directory does not exist: {CORSRequestHandler.output_dir}\033[0m")
            
        server_address = ('', port)
        httpd = HTTPServer(server_address, CORSRequestHandler)
        print(f"\033[92mServer started on port {port}\033[0m")
        print(f"\033[92mWatching for images in: {CORSRequestHandler.output_dir}\033[0m")
        print(f"\033[92mForwarding requests to ComfyUI at http://127.0.0.1:8188\033[0m")
        httpd.serve_forever()
    except Exception as e:
        print(f"\033[91mServer failed to start: {str(e)}\033[0m")
        sys.exit(1)

if __name__ == '__main__':
    run_server(8000) 