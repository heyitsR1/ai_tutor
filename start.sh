#!/bin/bash
export PATH=$PATH:/usr/local/bin

# AI Tutor - Startup Script
# This script will wait for Docker to be ready and then start the application

echo "🚀 AI Tutor Startup Script"
echo "=========================="
echo ""

# Check if Docker Desktop is running
if ! pgrep -q "Docker Desktop"; then
    echo "❌ Docker Desktop is not running"
    echo "   Please start Docker Desktop and run this script again"
    exit 1
fi

echo "✅ Docker Desktop is running"
echo "⏳ Waiting for Docker daemon to be ready..."

# Wait for Docker daemon
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker ps > /dev/null 2>&1; then
        echo "✅ Docker daemon is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Docker daemon did not start in time"
    echo "   Please check Docker Desktop and try again"
    exit 1
fi

echo ""
echo "🧹 Cleaning up old containers..."
docker-compose down -v 2>/dev/null || true

echo ""
echo "🏗️  Building application..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🚀 Starting services..."
echo ""
echo "Services will be available at:"
echo "  • Frontend: http://localhost:5173"
echo "  • Backend:  http://localhost:8000"
echo "  • Database: localhost:5432"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

docker-compose up
