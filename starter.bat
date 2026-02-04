@echo off
chcp 65001 >nul
title Deep Conversation Card Game

echo ========================================
echo   Deep Conversation Card Game - Starting...
echo ========================================
echo.

cd /d "%~dp0"

echo Starting server...
echo Server URL: http://localhost:7680
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:8000

python server.py

pause
