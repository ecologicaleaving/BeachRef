# Multi-stage build for VisConnect
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production && \
    npm ci --prefix frontend --only=production && \
    npm ci --prefix backend --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Build frontend and backend
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nextjs:nodejs /app/backend/package*.json ./backend/
COPY --from=deps --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/backend/ecosystem.config.js ./backend/

# Create logs directory
RUN mkdir -p ./backend/logs && chown nextjs:nodejs ./backend/logs

USER nextjs

EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:pm2", "--prefix", "backend"]