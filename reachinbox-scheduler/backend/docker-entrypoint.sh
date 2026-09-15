#!/bin/sh
set -e

echo "[ENTRYPOINT] Applying database migrations..."
npx prisma migrate deploy

echo "[ENTRYPOINT] Starting application..."
exec "$@"
