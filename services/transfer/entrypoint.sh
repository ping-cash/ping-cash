#!/bin/sh
# transfer-service entrypoint — applies Prisma migrations before starting the
# Node process. Per #63: target-state product pattern (no kubectl-cp-and-exec
# workarounds; the image owns its own schema lifecycle).
#
# Migrations are idempotent: `prisma migrate deploy` is a no-op when the
# database is already at the target schema, so this is safe to run on every
# pod startup (including readiness-probe restarts).
set -e

echo "[entrypoint] Applying Prisma migrations..."
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
echo "[entrypoint] Migrations applied. Starting service."

exec node /app/dist/index.js
