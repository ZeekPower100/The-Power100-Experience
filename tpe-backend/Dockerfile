# Multi-stage build for TPE Backend
# Stage 1: Base image with Node.js
FROM node:18-alpine AS base

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 tpeuser

# Copy production dependencies from deps stage
COPY --from=deps --chown=tpeuser:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=tpeuser:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R tpeuser:nodejs /app/logs && \
    chmod 755 /app/logs

# Switch to non-root user
USER tpeuser

# Expose backend port
EXPOSE 5000

# Health check using the existing /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "src/server.js"]
