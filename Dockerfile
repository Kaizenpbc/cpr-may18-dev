# Multi-stage Docker build for CPR Training System
# Stage 1: Build stage
FROM node:18 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd backend && npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN cd backend && npm run build

# Stage 2: Production stage
FROM node:18 AS production

# Create app user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs cpr-app

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built application from builder stage
COPY --from=builder --chown=cpr-app:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=cpr-app:nodejs /app/backend/package*.json ./backend/
COPY --from=builder --chown=cpr-app:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=cpr-app:nodejs /app/package*.json ./
COPY --from=builder --chown=cpr-app:nodejs /app/node_modules ./node_modules

# Copy configuration files
COPY --chown=cpr-app:nodejs docker/entrypoint.sh /entrypoint.sh
COPY --chown=cpr-app:nodejs docker/healthcheck.sh /healthcheck.sh

# Make scripts executable
RUN chmod +x /entrypoint.sh /healthcheck.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/ssl /app/backups && \
    chown -R cpr-app:nodejs /app/logs /app/ssl /app/backups

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3001

# Switch to non-root user
USER cpr-app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Default command
CMD ["node", "backend/dist/index.js"]
