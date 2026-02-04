#!/usr/bin/env python3
"""
Deep Conversation Card Game - Backend Service
Provides static file hosting and a language model API proxy.
"""

import os
import json
import http.server
import socketserver
from urllib.parse import urlparse
import urllib.request
import ssl

# Config
PORT = 7860
HOST = "0.0.0.0"
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

# Default page (card-game.html or card-game-modular.html)
DEFAULT_PAGE = "/card-game-modular.html"

# ModelScope API config
MODELSCOPE_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions"
MODELSCOPE_API_KEY = "ms-cb781c90-9f17-40b1-ab90-9938ef0bed3f"


class GameRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for API proxying and static file serving."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        
        # Redirect root to default page
        if parsed_path.path == "/" or parsed_path.path == "":
            self.path = DEFAULT_PAGE
        
        # Ensure correct Content-Type
        return super().do_GET()
    
    def guess_type(self, path):
        """Ensure correct MIME types for CSS/JS."""
        if path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)
    
    def do_POST(self):
        """Handle POST requests - API proxy."""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == "/api/chat":
            self.handle_chat_api()
        else:
            self.send_error(404, "Not Found")
    
    def handle_chat_api(self):
        """Proxy chat API requests to ModelScope."""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            request_body = self.rfile.read(content_length)
            request_data = json.loads(request_body.decode('utf-8'))
            
            # Build ModelScope request
            api_request_data = json.dumps(request_data).encode('utf-8')
            
            # Create request
            req = urllib.request.Request(
                MODELSCOPE_API_URL,
                data=api_request_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {MODELSCOPE_API_KEY}"
                },
                method="POST"
            )
            
            # Create SSL context for HTTPS
            # Note: use proper certificate verification in production
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Send request and read response
            with urllib.request.urlopen(req, context=ssl_context, timeout=60) as response:
                response_data = response.read()
                response_json = json.loads(response_data.decode('utf-8'))
            
            # Return response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(response_json).encode('utf-8'))
            
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            print(f"ModelScope API error: {e.code} - {error_body}")
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"API error: {e.code}",
                "detail": error_body
            }).encode('utf-8'))
            
        except urllib.error.URLError as e:
            print(f"Network error: {e.reason}")
            self.send_response(503)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Network error",
                "detail": str(e.reason)
            }).encode('utf-8'))
            
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Invalid request format",
                "detail": str(e)
            }).encode('utf-8'))
            
        except Exception as e:
            print(f"Server error: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Internal server error",
                "detail": str(e)
            }).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom log format."""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def main():
    """Main entry point."""
    print("=" * 50)
    print("Deep Conversation Card Game - Server Starting")
    print("=" * 50)
    print(f"Static directory: {STATIC_DIR}")
    print(f"Default page: {DEFAULT_PAGE}")
    print(f"Server URL: http://{HOST}:{PORT}")
    print(f"Local URL: http://localhost:{PORT}")
    print("-" * 50)
    print("Available pages:")
    print(f"  Modular version: http://localhost:{PORT}/card-game-modular.html")
    print(f"  Single-file version: http://localhost:{PORT}/card-game.html")
    print("=" * 50)
    print("Press Ctrl+C to stop the server")
    print()
    
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer((HOST, PORT), GameRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")


if __name__ == "__main__":
    main()
