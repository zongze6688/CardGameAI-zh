#!/bin/bash

echo "========================================"
echo "  家庭深度对话卡牌游戏 - 启动中..."
echo "========================================"
echo ""

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo "正在启动服务器..."
echo "服务器地址: http://localhost:7680"
echo ""
echo "按 Ctrl+C 可停止服务器"
echo "========================================"
echo ""

# 延迟2秒后打开浏览器
(sleep 2 && open "http://localhost:7680") &

# 启动Python服务器
python3 server.py
