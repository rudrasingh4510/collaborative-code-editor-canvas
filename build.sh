#!/bin/bash

echo "🚀 Building for production..."

# Build the React app
echo "📦 Building React app..."
cd client
npm run build
cd ..

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo "✅ Build complete!"
echo "📁 React build is in: client/build/"
echo "🚀 Start server with: cd server && npm start"
echo "🌐 Server will serve both API and React app on the same port"
