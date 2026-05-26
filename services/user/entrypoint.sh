#!/bin/sh
# user-service entrypoint — applies Prisma migrations before starting the
# Node process. Per #63: target-state product pattern (no kubectl-cp-and-exec
# workarounds; the image owns its own schema lifecycle).
set -e

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
echo "[entrypoint] Migrations applied. Starting service."

exec node /app/dist/index.js
