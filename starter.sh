#!/bin/bash

echo "========================================"
echo "  Deep Conversation Card Game - Starting..."
echo "========================================"
echo ""

# Move to script directory
cd "$(dirname "$0")"

echo "Starting server..."
echo "Server URL: http://localhost:7680"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Open browser after 2 seconds
(sleep 2 && open "http://localhost:7680") &

# Start Python server
python3 server.py
