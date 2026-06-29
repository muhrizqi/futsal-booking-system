# 🎛️ Integrasi dengan Easy Panel

Panduan setup Futsal Booking System dengan Easy Panel di Raspberry Pi.

## Apa itu Easy Panel?

Easy Panel adalah panel kontrol web untuk Raspberry Pi yang memudahkan:
- Instalasi dan manajemen aplikasi
- Monitoring system resources
- File management
- Database management
- Service management

Website: https://easypanel.io

## Instalasi Easy Panel

### 1. Install Easy Panel
```bash
# Masuk ke folder home
cd ~

# Download Easy Panel
curl -fsSL https://get.easypanel.io/install.sh | bash

# Atau manual
wget https://get.easypanel.io/install.sh
chmod +x install.sh
sudo ./install.sh
```

### 2. Akses Easy Panel
Buka browser:
```
http://localhost:3000
atau
http://<alamat-ip-raspberry>:3000
```

Ikuti setup wizard untuk membuat user admin.

## Setup Futsal Booking System di Easy Panel

### Opsi 1: Deploy dengan Docker (Recommended)

#### Create Dockerfile
Buat file `Dockerfile` di folder futsal-system:

```dockerfile
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy aplikasi
COPY . .

# Create backup directory
RUN mkdir -p backups

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

#### Create Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  futsal-app:
    image: futsal-booking:latest
    container_name: futsal-booking
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=futsal-db
      - DB_PORT=5432
      - DB_NAME=futsal_booking
      - DB_USER=futsal_user
      - DB_PASSWORD=your_secure_password
      - NODE_ENV=production
      - WHATSAPP_ADMIN_JOGO=6281234567890
      - WHATSAPP_ADMIN_4R=6281234567891
      - ADMIN_JOGO_PASSWORD=ubah_password_ini
      - ADMIN_4R_PASSWORD=ubah_password_ini
    depends_on:
      - futsal-db
    volumes:
      - ./backups:/app/backups
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - futsal-network

  futsal-db:
    image: postgres:13-alpine
    container_name: futsal-postgres
    environment:
      - POSTGRES_DB=futsal_booking
      - POSTGRES_USER=futsal_user
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - ./db_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - futsal-network

networks:
  futsal-network:
    driver: bridge

volumes:
  db_data:
```

#### Deploy via Easy Panel
1. Masuk ke Easy Panel Dashboard
2. Go to "Services" → "Add Service"
3. Pilih "Docker Compose"
4. Copy isi docker-compose.yml
5. Deploy

### Opsi 2: Deploy Native (Tanpa Docker)

#### Melalui Easy Panel GUI
1. **File Management**
   - Upload folder futsal-system ke `/home/pi/`
   - Set permissions ke 755

2. **Terminal**
   - Buka terminal di Easy Panel
   - Run: `cd /home/pi/futsal-system && npm install`

3. **Process Manager**
   - Add process baru
   - Name: `futsal-booking`
   - Command: `cd /home/pi/futsal-system && npm start`
   - Start at boot: ON
   - Auto restart: ON

#### Environment Variables
Via Easy Panel:
1. Go to "Settings" → "Environment Variables"
2. Add variables:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=futsal_booking
DB_USER=futsal_user
DB_PASSWORD=secure_password
PORT=3000
NODE_ENV=production
WHATSAPP_ADMIN_JOGO=6281234567890
WHATSAPP_ADMIN_4R=6281234567891
ADMIN_JOGO_PASSWORD=ubah_password_ini
ADMIN_4R_PASSWORD=ubah_password_ini
```

## Monitoring dengan Easy Panel

### 1. System Resources
- CPU, Memory, Disk usage
- Network monitoring
- Temperature monitoring

### 2. Process Management
```
Services → futsal-booking
- Status
- Restart
- Stop/Start
- View logs in real-time
```

### 3. Database Management
Easy Panel bisa manage PostgreSQL:
1. Services → PostgreSQL
2. Backup/Restore database
3. User management
4. Database monitoring

### 4. Log Viewer
View logs real-time:
```
Services → futsal-booking → Logs
```

## Reverse Proxy dengan Easy Panel

### Setup Nginx di Easy Panel

1. Go to "Reverse Proxy" → "Add"
2. Configure:
```
Domain: futsal.yourdomain.com
Service: futsal-booking:3000
Protocol: HTTP
Port: 3000
```

3. Optional: Enable SSL
```
Let's Encrypt: ON
Auto-renew: ON
```

Akses: `https://futsal.yourdomain.com`

## Backup & Restore

### Automatic Backup via Easy Panel

1. Go to "Backup"
2. Add backup schedule:
   - Application files: `/home/pi/futsal-system`
   - Database: `futsal_booking`
   - Schedule: Daily 02:00

### Manual Backup
Dalam Easy Panel Terminal:
```bash
cd /home/pi/futsal-system
npm run backup
```

### Restore
1. Go to "Backup" → Select backup
2. Click "Restore"
3. Confirm

## SSL/TLS dengan Easy Panel

### Auto SSL (Recommended)

1. Go to "Reverse Proxy"
2. Select futsal service
3. Click "Enable SSL"
4. Choose "Let's Encrypt"
5. Auto-renews setiap 90 hari

### Manual SSL
1. Upload certificate files
2. Configure in Reverse Proxy settings
3. Restart service

## Security Setup di Easy Panel

### 1. Firewall
Go to "Security" → "Firewall"
- Allow: Port 80 (HTTP)
- Allow: Port 443 (HTTPS)
- Allow: Port 22 (SSH - optional)
- Block: Port 3000 (jika behind proxy)

### 2. SSL/TLS
- Enable HSTS
- Min TLS version: 1.2

### 3. Admin Panel Security
- Change Easy Panel password
- Enable 2FA if available
- Whitelist admin IPs

## Performance Optimization

### 1. Database Optimization
```bash
# Dalam Easy Panel Terminal
psql -U futsal_user -d futsal_booking

# Optimize tables
VACUUM ANALYZE;
```

### 2. Nginx Caching
Di Reverse Proxy settings:
```
Cache: ON
Cache time: 3600
```

### 3. Node.js Settings
Environment variables:
```
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=256
```

### 4. PostgreSQL Optimization
Edit `/etc/postgresql/13/main/postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB
maintenance_work_mem = 64MB
```

Restart service di Easy Panel.

## Troubleshooting

### Service tidak start
1. Check logs: Services → futsal-booking → Logs
2. Check error messages
3. Restart service

### Database connection error
1. Check PostgreSQL status
2. Verify environment variables
3. Check `/home/pi/futsal-system/.env`

### Port sudah digunakan
1. Go to Services
2. Pilih service lain yang pakai port 3000
3. Stop atau ubah portnya

### Memory leak
1. Monitor memory di Dashboard
2. Restart service jika needed
3. Check Node.js processes: `pm2 list`

## Update Aplikasi via Easy Panel

### Method 1: Git Pull
```bash
# Terminal di Easy Panel
cd /home/pi/futsal-system
git pull origin main
npm install
pm2 restart futsal-booking
```

### Method 2: Upload Files
1. Download update files
2. Use File Manager → Upload
3. Replace files
4. Restart service

## Automation dengan Easy Panel

### Scheduled Backup
Buat cron job:
```bash
# Terminal
crontab -e

# Tambah:
0 2 * * * cd /home/pi/futsal-system && npm run backup
```

### Scheduled Restart
```bash
# Restart aplikasi setiap minggu
0 3 * * 0 pm2 restart futsal-booking
```

## Support & Community

- Easy Panel Docs: https://docs.easypanel.io
- GitHub: https://github.com/easypanel-io/easypanel
- Forum: https://community.easypanel.io

---

**Tips:**
- Backup regular sangat penting!
- Monitor resource usage setiap hari
- Keep Easy Panel dan aplikasi updated
- Test restore backup secara berkala

