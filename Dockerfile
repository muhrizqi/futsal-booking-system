FROM node:16-alpine

WORKDIR /app

# Install curl untuk health check
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Create directories
RUN mkdir -p backups logs

EXPOSE 3006

# Simple health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3006/api/venues || exit 1

# Start app
CMD ["npm", "start"]
