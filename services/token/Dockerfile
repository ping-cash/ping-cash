FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/utils/package.json ./packages/utils/
COPY services/token/package.json ./services/token/
RUN pnpm install --frozen-lockfile
COPY packages/types ./packages/types
COPY packages/config ./packages/config
COPY packages/utils ./packages/utils
COPY services/token ./services/token
RUN pnpm --filter @ping/types build
RUN pnpm --filter @ping/config build
RUN pnpm --filter @ping/utils build
RUN pnpm --filter @ping/token-service build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 ping
USER ping
COPY --from=builder --chown=ping:nodejs /app/services/token/dist ./dist
COPY --from=builder --chown=ping:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ping:nodejs /app/packages/config/dist ./node_modules/@ping/config/dist
COPY --from=builder --chown=ping:nodejs /app/packages/types/dist ./node_modules/@ping/types/dist
COPY --from=builder --chown=ping:nodejs /app/packages/utils/dist ./node_modules/@ping/utils/dist

ENV NODE_ENV=production
ENV PORT=3010
EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/healthz || exit 1

CMD ["node", "dist/index.js"]
