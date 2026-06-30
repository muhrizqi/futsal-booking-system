# 🔴 FIX: Container Crash (No Running Containers)

Container sudah crash atau error. Mari kita fix step-by-step.

---

## 🔍 STEP 1: CEK STATUS CONTAINER

SSH ke Raspberry Pi atau buka Terminal:

```bash
# List semua container termasuk yang stopped
docker ps -a

# Cari futsal-app
```

Lihat output seperti ini:

```
CONTAINER ID   IMAGE     COMMAND          STATUS
abc123def...   node:16   "npm start"      Exited (1) 2 minutes ago
```

Jika `Exited` → container crash.

---

## 🔍 STEP 2: LIHAT ERROR MESSAGE

```bash
# Lihat logs dari container yang crash
docker logs futsal-app

# Lihat last 100 lines
docker logs --tail 100 futsal-app
```

**Catat:** Error message apa yang keluar?

---

## 🔧 KEMUNGKINAN ERRORS & FIXES

### Error 1: `npm ERR! code ENOENT`

**Meaning:** File atau folder tidak ditemukan

**Fix:**
```bash
# Rebuild fresh
docker build --no-cache -t futsal-app:latest .
docker run -d --name futsal-app ...
```

---

### Error 2: `Cannot find module 'express'`

**Meaning:** npm install tidak berhasil

**Fix:**
```bash
# Delete node_modules
rm -rf node_modules
npm install

# Rebuild Docker
docker build --no-cache -t futsal_booking_system/futsal-app:latest .
```

---

### Error 3: `listen EADDRINUSE`

**Meaning:** Port sudah digunakan

**Fix:**
```bash
# Kill process on port 3006
lsof -i :3006
kill -9 <PID>

# Atau ganti port ke 3007
docker run -e PORT=3007 ...
```

---

### Error 4: `Cannot connect to database`

**Meaning:** PostgreSQL tidak bisa diakses

**Fix:**
```bash
# Verify PostgreSQL running
docker ps | grep postgres

# Test connection
docker exec futsal-postgres psql -U futsal_user -d futsal_booking -c "SELECT 1;"

# Verify DB_HOST=futsal-postgres (bukan localhost!)
```

---

## 🛠️ SIMPLE FIX - RESTART CONTAINER

```bash
# 1. Stop container
docker stop futsal-app

# 2. Remove container
docker rm futsal-app

# 3. Check image exist
docker images | grep futsal-app

# 4. Run container baru
docker run -d \
  --name futsal-app \
  -p 3006:3006 \
  -e PORT=3006 \
  -e NODE_ENV=production \
  -e DB_HOST=futsal-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=futsal_booking \
  -e DB_USER=futsal_user \
  -e DB_PASSWORD=futsal_password \
  -e WHATSAPP_ADMIN_JOGO=6281578073129 \
  -e WHATSAPP_ADMIN_4R=6285878603556 \
  -e ADMIN_JOGO_PASSWORD=jogopass \
  -e ADMIN_4R_PASSWORD=empatrpass \
  --network futsal-network \
  futsal_booking_system/futsal-app:latest

# 5. Check logs
docker logs -f futsal-app
```

---

## 🎯 MOST LIKELY FIX

Masalah paling sering: **node_modules tidak ter-install atau corrupt**

**Solution:**

```bash
# 1. Delete node_modules locally
cd ~/futsal-system
rm -rf node_modules package-lock.json

# 2. Fresh install
npm install

# 3. Rebuild Docker without cache
docker build --no-cache -t futsal_booking_system/futsal-app:latest .

# 4. Go back to Easy Panel, click Rebuild
```

---

## 💡 ALTERNATIVE - FIX DOCKERFILE

Dockerfile saat ini might be terlalu kompleks. Coba simplify:

**Buat file Dockerfile baru** (simpler version):

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm packages
RUN npm install

# Copy app files
COPY . .

# Create directories
RUN mkdir -p backups logs

EXPOSE 3006

# Start app
CMD ["npm", "start"]
```

Hapus:
- `dumb-init`
- Health check
- Curl
- Legacy peer deps flags

**Ini version paling stable untuk troubleshooting.**

---

## 🚀 STEP-BY-STEP FIX

### Option A: Via Easy Panel (Easiest)

1. Easy Panel → futsal-app → Settings
2. Change Dockerfile to simple version (above)
3. Click "Rebuild"
4. Wait for build complete
5. Check logs

### Option B: Via Command Line

```bash
cd ~/futsal-system

# 1. Clean npm
rm -rf node_modules package-lock.json
npm install

# 2. Replace Dockerfile dengan simple version
# (copy the simplified Dockerfile above)

# 3. Rebuild
docker build -t futsal_booking_system/futsal-app:latest .

# 4. Stop & remove old container
docker stop futsal-app
docker rm futsal-app

# 5. Run new container
docker run -d \
  --name futsal-app \
  -p 3006:3006 \
  -e PORT=3006 \
  -e NODE_ENV=production \
  -e DB_HOST=futsal-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=futsal_booking \
  -e DB_USER=futsal_user \
  -e DB_PASSWORD=futsal_password \
  -e WHATSAPP_ADMIN_JOGO=6281578073129 \
  -e WHATSAPP_ADMIN_4R=6285878603556 \
  -e ADMIN_JOGO_PASSWORD=jogopass \
  -e ADMIN_4R_PASSWORD=empatrpass \
  --network futsal-network \
  futsal_booking_system/futsal-app:latest

# 6. Check logs
docker logs -f futsal-app
```

---

## ✅ VERIFY BERHASIL

Jika fix berhasil, logs harusnya:

```
> futsal-booking-system@1.0.0 start
> npm start

[timestamp] Creating PostgreSQL connection pool...
[timestamp] Attempting to initialize database...
[timestamp] ✓ Database connection successful
[timestamp] ✅ SERVER STARTED SUCCESSFULLY
[timestamp] 🚀 Futsal Booking System running on http://localhost:3006
```

---

## 📊 TROUBLESHOOTING CHECKLIST

```
□ docker ps -a → cek status container
□ docker logs futsal-app → lihat error message
□ docker ps | grep postgres → verify PostgreSQL running
□ node_modules ada di folder?
□ package.json ada?
□ npm install pernah dijalankan?
□ Dockerfile syntax benar?
```

---

## 🎯 MOST IMPORTANT

**Share dengan saya:**

1. Output dari `docker logs futsal-app`
2. Output dari `docker ps -a`
3. Screenshot dari Easy Panel environment variables

Dengan ini saya bisa kasih fix yang paling tepat! 🔍

---

**Saya siap bantu debug lebih detail! 💪⚽**
