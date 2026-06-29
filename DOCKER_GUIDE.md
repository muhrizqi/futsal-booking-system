# 🐳 Docker Deployment Guide

Panduan lengkap untuk deploy Futsal Booking System menggunakan Docker.

## Install Docker & Docker Compose di Raspberry Pi

### 1. Install Docker
```bash
# Download installer script
curl -fsSL https://get.docker.com -o get-docker.sh

# Jalankan installer
sudo sh get-docker.sh

# Tambah user ke docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker run hello-world
```

### 2. Install Docker Compose
```bash
# Install dari repository
sudo apt-get install -y docker-compose

# Atau install manual (untuk versi terbaru)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

## Setup Environment Variables

### 1. Copy dan Edit .env
```bash
cp .env.example .env

# Edit dengan nano atau editor favorit
nano .env
```

Pastikan isi:
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=futsal_booking
DB_USER=futsal_user
DB_PASSWORD=your_secure_password_here
PORT=3000
NODE_ENV=production

WHATSAPP_ADMIN_JOGO=6281234567890
WHATSAPP_ADMIN_4R=6281234567891

ADMIN_JOGO_PASSWORD=ubah_password_jogo
ADMIN_4R_PASSWORD=ubah_password_4r

# Untuk pgAdmin (opsional)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=admin_password
```

## Build & Deploy dengan Docker Compose

### Method 1: Full Docker Compose (Recommended)

```bash
# Clone/download proyek
git clone <url> futsal-system
cd futsal-system

# Build image
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Method 2: Docker Run Individual

```bash
# 1. Start PostgreSQL
docker run -d \
  --name futsal-postgres \
  -e POSTGRES_DB=futsal_booking \
  -e POSTGRES_USER=futsal_user \
  -e POSTGRES_PASSWORD=secure_password \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:13-alpine

# 2. Build aplikasi image
docker build -t futsal-booking:latest .

# 3. Run aplikasi
docker run -d \
  --name futsal-booking-app \
  -p 3000:3000 \
  -e DB_HOST=futsal-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=futsal_booking \
  -e DB_USER=futsal_user \
  -e DB_PASSWORD=secure_password \
  --link futsal-postgres \
  -v backups:/app/backups \
  futsal-booking:latest
```

## Basic Docker Commands

```bash
# List containers
docker ps
docker ps -a

# View logs
docker logs futsal-booking-app
docker logs -f futsal-booking-app  # Follow logs
docker logs --tail 100 futsal-booking-app  # Last 100 lines

# Enter container
docker exec -it futsal-booking-app /bin/sh

# Stop/start container
docker stop futsal-booking-app
docker start futsal-booking-app

# Restart
docker restart futsal-booking-app

# View resource usage
docker stats futsal-booking-app

# Remove container
docker rm futsal-booking-app

# Remove image
docker rmi futsal-booking:latest
```

## Useful Docker Compose Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up
docker-compose up -d  # Detached mode

# Stop services
docker-compose stop

# Down (stop & remove containers)
docker-compose down

# View logs
docker-compose logs
docker-compose logs -f app  # Follow app logs
docker-compose logs --tail 50 postgres  # Last 50 lines

# View status
docker-compose ps

# Execute command in container
docker-compose exec app node backup.js

# Rebuild and restart
docker-compose up -d --build

# View processes in container
docker-compose exec app ps aux

# Database operations
docker-compose exec postgres psql -U futsal_user -d futsal_booking
```

## Database Backup & Restore

### Backup Database

```bash
# Method 1: Via docker-compose
docker-compose exec postgres pg_dump -U futsal_user -d futsal_booking > backup.sql

# Method 2: Via docker exec
docker exec futsal-postgres pg_dump -U futsal_user -d futsal_booking > backup.sql

# Backup dengan compression
docker-compose exec postgres pg_dump -U futsal_user -d futsal_booking | gzip > backup.sql.gz
```

### Restore Database

```bash
# Method 1: Via file
docker exec -i futsal-postgres psql -U futsal_user -d futsal_booking < backup.sql

# Method 2: Via gunzip
gunzip -c backup.sql.gz | docker exec -i futsal-postgres psql -U futsal_user -d futsal_booking
```

## Production Setup

### 1. Use .env.production
```bash
cp .env .env.production
# Edit untuk production settings
```

### 2. Enable Auto-restart
Di docker-compose.yml sudah ada:
```yaml
restart: unless-stopped
```

### 3. Health Checks
Sudah konfigurasi di Dockerfile dan docker-compose.yml

### 4. Resource Limits
Edit docker-compose.yml untuk limit resources:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 5. Volumes & Backups
```yaml
volumes:
  - ./backups:/app/backups  # Local backup folder
  - ./logs:/app/logs         # Local logs folder
```

## Monitoring

### View Container Status
```bash
docker stats --no-stream futsal-booking-app
```

### Set Up Monitoring (Portainer - Optional)
```bash
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --restart unless-stopped \
  portainer/portainer-ce:latest
```

Akses: `http://localhost:9000`

## Nginx Reverse Proxy (Optional)

Buat file `nginx.conf`:
```nginx
upstream futsal_app {
    server app:3000;
}

server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://futsal_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Add to docker-compose.yml:
```yaml
  nginx:
    image: nginx:alpine
    container_name: futsal-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - app
    networks:
      - futsal-network
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs futsal-booking-app

# Check configurations
docker inspect futsal-booking-app

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Database connection failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs futsal-postgres

# Test connection
docker exec futsal-postgres psql -U futsal_user -d futsal_booking -c "SELECT 1"
```

### High memory usage
```bash
# Check memory usage
docker stats

# Limit memory in docker-compose.yml
# Restart containers
docker-compose restart
```

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000
netstat -tuln | grep 3000

# Kill process or change port in .env
```

## Clean Up

```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything (DANGEROUS!)
docker system prune -a

# Remove specific container
docker rm futsal-booking-app

# Remove specific image
docker rmi futsal-booking:latest
```

## Performance Tips

1. **Use Alpine images** - Lebih kecil dan cepat
2. **Multi-stage builds** - Reduce image size
3. **Limit resources** - Prevent memory leak
4. **Use health checks** - Auto-restart failed containers
5. **Enable restart policy** - `unless-stopped`
6. **Use named volumes** - Better performance
7. **Keep images updated** - Security patches

## Security Best Practices

1. **Change default passwords** - Di .env
2. **Use secrets** - Docker secrets untuk sensitive data
3. **Network isolation** - Use custom networks
4. **Regular backups** - Automated backup strategy
5. **Keep containers updated** - Pull latest images
6. **Don't run as root** - Add non-root user di Dockerfile
7. **Scan images** - `docker scan futsal-booking:latest`

## Logs Management

### Configure Log Driver
Di docker-compose.yml:
```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### View & Manage Logs
```bash
# View real-time logs
docker-compose logs -f

# Save logs to file
docker-compose logs > app_logs.txt

# Clear old logs
docker exec futsal-postgres rm /var/log/postgresql/*.log
```

## Further Reading

- Docker Documentation: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- Best Practices: https://docs.docker.com/develop/dev-best-practices

---

**Version:** 1.0.0  
**Last Updated:** 2024
