#!/bin/bash

# Navigate to the project directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "✈️  Starting Swedavia FIDS System..."

# 1. Start FastAPI Backend in background
echo "🟢 Starting FastAPI Backend on http://localhost:8000..."
./.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Start Vite Frontend in background
echo "🟢 Starting Frontend on http://localhost:5173..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# 3. Wait 2 seconds and open the browser automatically
sleep 2
echo "🌐 Opening Swedavia FIDS in your browser..."
open "http://localhost:5173"

# Handle graceful shutdown when closing the terminal or pressing Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Shutting down Swedavia FIDS..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Keep script running
wait
