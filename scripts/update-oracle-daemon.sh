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

# 3. Restart PM2 daemon with updated schedule
echo "Restarting PM2 daemon with 5-minute (8 AM - 11 PM) schedule..."
pm2 delete multibagger-scanner || true
pm2 start backend/scripts/scan-announcements-action.js \
  --name "multibagger-scanner" \
  --node-args="--max-old-space-size=512" \
  --cron "*/5 8-23 * * *" \
  --no-autorestart

# 4. Save PM2 state
pm2 save

echo "================================================================"
echo "✅ Multibagger Live Daemon successfully updated!"
echo "   Monitor logs with: pm2 logs multibagger-scanner"
echo "================================================================"
