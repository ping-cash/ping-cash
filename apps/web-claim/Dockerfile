FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web-claim/package.json ./apps/web-claim/

RUN pnpm install --frozen-lockfile

COPY apps/web-claim ./apps/web-claim

WORKDIR /app/apps/web-claim
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web-claim/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-claim/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-claim/public ./public

USER nextjs

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/ || exit 1

CMD ["node", "server.js"]
