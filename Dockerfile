# Stage 1: Dependencies Cache Stage
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY prisma/schema.prisma ./prisma/

RUN npm ci && npm --prefix client ci

# Stage 2: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma Client & build artifacts from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Security: Ensure non-root ownership and user context
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app

USER node

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
