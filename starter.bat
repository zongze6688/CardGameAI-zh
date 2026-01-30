@echo off
chcp 65001 >nul
title 家庭深度对话卡牌游戏

echo ========================================
echo   家庭深度对话卡牌游戏 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

echo 正在启动服务器...
echo 服务器地址: http://localhost:7680
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:8000

python server.py

pause
