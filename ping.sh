#!/bin/bash
# Auto-ping script for Koyeb free tier
APP_URL=$1

if [ -z "$APP_URL" ]; then
  echo "Usage: ./ping.sh <APP_URL>"
  exit 1
fi

while true; do
  echo "Pinging $APP_URL at $(date)"
  curl -s $APP_URL/health > /dev/null
  sleep 1800 # 30 minutes
done
