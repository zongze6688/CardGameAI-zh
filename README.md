# CardGame

这是一个基于浏览器的卡牌小游戏（前端 + 简单后端）。

包含文件：
- `card-game.html`：主页面（单文件静态版）。
- `card-game-modular.html`：模块化页面（可作为 SPA 入口）。
- `card-game.js`：前端交互脚本。
- `card-game.css`：样式表。
- `server.py`：可选的后端示例，用于本地运行（Flask/simple HTTP）。
- `Dockerfile`：用于构建容器镜像（可选）。

快速运行（静态文件）：
1. 直接在浏览器中打开 `card-game.html`。

快速运行（使用 Python 后端）：
```bash
cd CardGame
python3 server.py
# 然后打开 http://localhost:8080 （或 server.py 中指定的端口）
```

使用 Docker（可选）：
```bash
cd CardGame
docker build -t cardgame .
docker run -p 8080:8080 cardgame
```

liscence：MIT

