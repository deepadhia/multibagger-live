#!/bin/bash
# =================================================================
# 🚀 Multibagger Live — 1-Click Oracle Server Code Updater
# Pulls latest code from main, updates dependencies, and reloads PM2.
# =================================================================

set -e

echo "================================================================"
echo "🔄 Updating Multibagger Live Daemon on Oracle Server..."
echo "================================================================"

# Navigate to project directory
cd "$(dirname "$0")/.."

# 1. Pull latest code from GitHub
echo "Pulling latest code from origin main..."
git pull origin main

# 2. Install any new npm packages
echo "Installing dependencies..."
npm install

# 3. Reload PM2 daemon zero-downtime
echo "Reloading PM2 daemon..."
pm2 reload multibagger-scanner || pm2 restart multibagger-scanner

# 4. Save PM2 state
pm2 save

echo "================================================================"
echo "✅ Multibagger Live Daemon successfully updated!"
echo "   Monitor logs with: pm2 logs multibagger-scanner"
echo "================================================================"
