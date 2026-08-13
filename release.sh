#!/bin/bash
# release.sh - husariabeats_com production release
# Run from local dev machine. Merges dev -> main, tags, and deploys to your server.
set -e

NODE_HOST="<YOUR_SERVER_HOST_OR_IP>"
NODE_USER="<YOUR_SSH_USER>"
TARGET_DIR="/srv/husariabeats_com"
INTEGRATION_BRANCH="dev"
DB_CONTAINER="husariabeats-db"
DB_NAME="husariabeats"
DB_USER="postgres"
KUMA_PUSH_URL=""  # Optional: paste your Uptime Kuma push URL here

echo "[1/5] Merging $INTEGRATION_BRANCH -> main..."
git checkout main && git pull origin main
git merge "$INTEGRATION_BRANCH" --no-edit
VERSION="v$(date +%Y.%m.%d-%H%M)"
git tag -a "$VERSION" -m "Release $VERSION"
git push origin main --tags
git checkout "$INTEGRATION_BRANCH"
echo "Tagged $VERSION"

echo "[2/5] Connecting to $NODE_USER@$NODE_HOST..."
ssh "$NODE_USER@$NODE_HOST" bash << ENDSSH
set -e
cd "$TARGET_DIR"

echo "[3/5] Backing up postgres..."
mkdir -p ./backups
if docker ps -q -f name="$DB_CONTAINER" | grep -q .; then
  docker compose exec -T "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" \
    > ./backups/backup_\$(date +%Y%m%d_%H%M%S).sql
  echo "Backup saved."
else
  echo "WARNING: DB container not running, skipping backup."
fi

echo "[4/5] Pulling code..."
git fetch --tags && git checkout main && git pull origin main

echo "[5/5] Rebuilding containers..."
docker compose down && docker compose up -d --build
echo "Done."
ENDSSH

if [ -n "$KUMA_PUSH_URL" ]; then
  curl -s "${KUMA_PUSH_URL}?status=up&msg=${VERSION}&ping=" > /dev/null
  echo "Kuma notified."
fi

echo ""
echo "husariabeats_com $VERSION deployed."
