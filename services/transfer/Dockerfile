FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.json .npmrc* ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY packages/kyc-client/package.json ./packages/kyc-client/
COPY services/transfer/package.json ./services/transfer/
RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY packages/kyc-client ./packages/kyc-client
COPY services/transfer ./services/transfer

RUN pnpm --filter @ping/types build
RUN pnpm --filter @ping/config build
RUN pnpm --filter @ping/utils build
RUN pnpm --filter @ping/kyc-client build
RUN pnpm --filter @ping/transfer-service db:generate
RUN pnpm --filter @ping/transfer-service build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --ingroup nodejs ping \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl wget ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g prisma@5.22.0 \
  && chown -R ping:nodejs /app
USER ping

# Service code (tsup-bundled, self-contained)
COPY --from=builder --chown=ping:nodejs /app/services/transfer/dist ./dist
# Generated prisma client (output-dir per schema.prisma)
COPY --from=builder --chown=ping:nodejs /app/services/transfer/node_modules/.prisma ./node_modules/.prisma
# Schema + migration files (per #63 target-state-product pattern). The
# entrypoint runs `prisma migrate deploy --schema=prisma/schema.prisma` so
# the pod's startup brings the DB to the target schema before serving
# traffic — no kubectl-cp workaround.
COPY --from=builder --chown=ping:nodejs /app/services/transfer/prisma ./prisma
COPY --from=builder --chown=ping:nodejs /app/services/transfer/entrypoint.sh ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["/bin/sh", "/app/entrypoint.sh"]
