FROM node:16-alpine

# Set working directory
WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p backups logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/venues', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
