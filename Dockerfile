FROM node:16-alpine

# Set working directory
WORKDIR /app

# Install dumb-init & curl
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install dependencies with retry logic for Easy Panel
RUN npm install --legacy-peer-deps 2>/dev/null || npm install || true

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p backups logs

# Expose port (flexible for PORT env var)
EXPOSE 3000 3006

# Health check - more tolerant for startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
    CMD curl -f http://localhost:${PORT:-3000}/api/venues || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["npm", "start"]
