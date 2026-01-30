#!/usr/bin/env python3
"""
家庭深度对话卡牌游戏 - 后端服务
提供静态文件服务和大语言模型API代理
"""

import os
import json
import http.server
import socketserver
from urllib.parse import urlparse
import urllib.request
import ssl

# 配置
PORT = 7860
HOST = "0.0.0.0"
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

# 默认页面（可选 card-game.html 或 card-game-modular.html）
DEFAULT_PAGE = "/card-game-modular.html"

# ModelScope API 配置
MODELSCOPE_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions"
MODELSCOPE_API_KEY = "ms-cb781c90-9f17-40b1-ab90-9938ef0bed3f"


class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义请求处理器，处理API代理和静态文件服务"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    
    def do_GET(self):
        """处理GET请求"""
        parsed_path = urlparse(self.path)
        
        # 根路径重定向到默认页面
        if parsed_path.path == "/" or parsed_path.path == "":
            self.path = DEFAULT_PAGE
        
        # 设置正确的 Content-Type
        return super().do_GET()
    
    def guess_type(self, path):
        """确保CSS和JS文件有正确的MIME类型"""
        if path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)
    
    def do_POST(self):
        """处理POST请求 - API代理"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == "/api/chat":
            self.handle_chat_api()
        else:
            self.send_error(404, "Not Found")
    
    def handle_chat_api(self):
        """处理聊天API请求，代理到ModelScope"""
        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            request_body = self.rfile.read(content_length)
            request_data = json.loads(request_body.decode('utf-8'))
            
            # 准备发送到ModelScope的请求
            api_request_data = json.dumps(request_data).encode('utf-8')
            
            # 创建请求
            req = urllib.request.Request(
                MODELSCOPE_API_URL,
                data=api_request_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {MODELSCOPE_API_KEY}"
                },
                method="POST"
            )
            
            # 创建SSL上下文（用于HTTPS请求）
            # 注意：在生产环境中应该使用正确的证书验证
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # 发送请求并获取响应
            with urllib.request.urlopen(req, context=ssl_context, timeout=60) as response:
                response_data = response.read()
                response_json = json.loads(response_data.decode('utf-8'))
            
            # 返回响应
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response_json).encode('utf-8'))
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            print(f"ModelScope API错误: {e.code} - {error_body}")
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"API错误: {e.code}",
                "detail": error_body
            }).encode('utf-8'))
            
        except urllib.error.URLError as e:
            print(f"网络错误: {e.reason}")
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "网络错误",
                "detail": str(e.reason)
            }).encode('utf-8'))
            
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "请求格式错误",
                "detail": str(e)
            }).encode('utf-8'))
            
        except Exception as e:
            print(f"服务器错误: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "服务器内部错误",
                "detail": str(e)
            }).encode('utf-8'))
    
    def do_OPTIONS(self):
        """处理CORS预检请求"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def main():
    """主函数"""
    print("=" * 50)
    print("家庭深度对话卡牌游戏 - 服务器启动")
    print("=" * 50)
    print(f"静态文件目录: {STATIC_DIR}")
    print(f"默认页面: {DEFAULT_PAGE}")
    print(f"服务地址: http://{HOST}:{PORT}")
    print(f"本机访问: http://localhost:{PORT}")
    print("-" * 50)
    print("可用页面:")
    print(f"  模块化版本: http://localhost:{PORT}/card-game-modular.html")
    print(f"  单文件版本: http://localhost:{PORT}/card-game.html")
    print("=" * 50)
    print("按 Ctrl+C 停止服务器")
    print()
    
    # 允许端口复用
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer((HOST, PORT), GameRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")


if __name__ == "__main__":
    main()
