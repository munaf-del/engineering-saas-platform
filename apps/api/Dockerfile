FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app ./
COPY . .
RUN pnpm --filter @eng/shared build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @eng/api build
RUN pnpm --filter @eng/api --prod deploy /app/deployed
# prisma CLI is a devDep so pnpm deploy --prod can't generate the client;
# copy the already-generated .prisma directory from the builder's pnpm store.
RUN set -e; \
    src="$(ls -d /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma)"; \
    dst="$(ls -d /app/deployed/node_modules/.pnpm/@prisma+client*/node_modules)"; \
    cp -rL "$src" "$dst/"

FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 appgroup && adduser --system --uid 1001 appuser
WORKDIR /app
COPY --from=builder /app/deployed ./
USER appuser
EXPOSE 4000
ENV PORT=4000
CMD ["node", "dist/main"]
