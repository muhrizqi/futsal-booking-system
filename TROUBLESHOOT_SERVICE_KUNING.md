# 🔴 TROUBLESHOOTING SERVICE APP KUNING

Service kuning = container gagal start/build. Mari kita debug step-by-step.

---

## 🔍 STEP 1: CEK BUILD LOGS

Di Easy Panel:

```
Services → futsal-app → "Build Logs" atau "Logs"
```

Cari error message. Common errors:

### Error 1: npm install failed
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution**: Update package.json dependencies

### Error 2: Database connection failed
```
Error: connect ECONNREFUSED futsal-postgres:5432
```

**Solution**: PostgreSQL service belum fully ready saat app start

### Error 3: Dockerfile error
```
Error: COPY failed
Error: RUN failed
```

**Solution**: Check Dockerfile path benar

---

## 🛠️ STEP 2: FIX - Update Dockerfile

Edit `Dockerfile` di repository dan push:

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install dependencies - WITH RETRY
RUN npm install --legacy-peer-deps || npm install

# Copy app files
COPY . .

# Create required directories
RUN mkdir -p backups logs

EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3006/api/venues', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

ENTRYPOINT ["/sbin/dumb-init", "--"]

CMD ["npm", "start"]
```

**Key changes:**
- `--legacy-peer-deps` untuk npm compatibility
- `start-period=15s` lebih lama (wait for DB)
- `retries=5` lebih toleran

---

## 🛠️ STEP 3: FIX - Update server.js

Edit `server.js` dan tambahkan retry logic saat start:

```javascript
// Di bagian akhir server.js, ganti startServer function:

async function startServer() {
  let retries = 0;
  const maxRetries = 10;
  
  async function tryConnect() {
    try {
      console.log(`[${new Date().toISOString()}] Attempting to initialize database... (attempt ${retries + 1}/${maxRetries})`);
      
      await initializeDatabase();
      
      app.listen(PORT, () => {
        console.log(`🚀 Futsal Booking System running on http://localhost:${PORT}`);
        console.log(`📱 Customer View: http://localhost:${PORT}`);
        console.log(`👤 Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`✓ Database connected successfully`);
      });
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries) {
        console.error(`❌ Failed to connect after ${maxRetries} attempts:`, error.message);
        process.exit(1);
      }
      
      console.warn(`⚠️ Database connection failed, retrying in 5 seconds...`);
      console.warn(`Error: ${error.message}`);
      
      setTimeout(tryConnect, 5000);
    }
  }
  
  tryConnect();
}

startServer();
```

---

## 🛠️ STEP 4: FIX - Update db.js

Edit `db.js` dan tambahkan connection retry:

```javascript
// Di bagian awal db.js, setelah Pool creation:

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'futsal_booking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Add these for better connection handling
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  min: 2,
});

// Test connection immediately
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Connect test
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Host:', process.env.DB_HOST);
    console.error('Port:', process.env.DB_PORT);
    console.error('Database:', process.env.DB_NAME);
    console.error('User:', process.env.DB_USER);
  } else {
    console.log('✓ Database connection successful');
  }
});
```

---

## 📝 STEP 5: PUSH KE GITHUB

```bash
cd futsal-system

# Update files
git add Dockerfile server.js db.js
git commit -m "Fix: Add connection retry logic for Easy Panel deployment"
git push origin main
```

---

## 🔄 STEP 6: REBUILD DI EASY PANEL

Di Easy Panel:

```
Services → futsal-app → "Rebuild" atau "Redeploy"
```

**Pilih opsi:**
- Build from source: ON
- Clear cache: ON
- Branch: main

**Click "Deploy"**

⏳ Tunggu proses build selesai...

---

## 🔍 STEP 7: CEK LOGS LAGI

Setelah rebuild, check logs:

```
Services → futsal-app → "Logs"
```

Lihat output:
```
✓ Database connection successful
✓ Database initialized successfully
🚀 Futsal Booking System running on http://localhost:3006
```

Jika masih error, lihat message error yang muncul.

---

## 🔧 ALTERNATIVE: MANUAL DEBUG VIA TERMINAL

Jika masih kuning, coba debug dengan SSH ke Raspberry:

```bash
# 1. SSH ke Raspberry
ssh pi@<RASPBERRY-IP>

# 2. Check Docker containers
docker ps -a

# 3. Check logs
docker logs <container-name>

# 4. Coba run manual test
docker run -it --rm \
  -e DB_HOST=futsal-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=futsal_booking \
  -e DB_USER=futsal_user \
  -e DB_PASSWORD=futsal_password \
  -e PORT=3006 \
  -e NODE_ENV=production \
  --network easypanel \
  node:16-alpine \
  sh -c "cd /app && npm start"
```

---

## 🎯 QUICK FIXES (TRY THESE)

### Fix 1: Clear Easy Panel Cache & Rebuild

Di Easy Panel:
```
Services → futsal-app → Settings → Rebuild
- Select "Clear build cache"
- Click "Rebuild"
```

### Fix 2: Verify PostgreSQL Connection dari App

Di Easy Panel Terminal:

```bash
# Test network connection
ping futsal-postgres

# Jika tidak bisa ping, berarti network issue
# Check network: Services → futsal-app → Network
```

### Fix 3: Check Network Setting

Di Easy Panel → futsal-app:

```
Settings → Network

Verify:
- Network Mode: bridge
- Linked Services: futsal-postgres
- Port Mapping: 3006:3006
```

### Fix 4: Increase Start Timeout

Di Easy Panel → futsal-app:

```
Settings → Advanced

- Startup timeout: 60 seconds (ganti dari 30)
- Health check delay: 20 seconds
- Restart on failure: ON
```

---

## 📋 DEBUGGING CHECKLIST

```
□ PostgreSQL service running (status hijau)
□ Check Build Logs untuk error message
□ Verify environment variables semua terisi
□ Check network linked ke futsal-postgres
□ Verify PORT=3006 di environment
□ Check DB_HOST=futsal-postgres (bukan localhost)
□ Verify GitHub repository public
□ Check Dockerfile ada di root folder
□ Try rebuild dengan clear cache
```

---

## 🆘 JIKA MASIH ERROR - DETAILED LOGS

Untuk debug lebih detail, di Terminal Easy Panel:

```bash
# 1. Check PostgreSQL sudah running
psql -h futsal-postgres -U futsal_user -d futsal_booking -c "SELECT 1;"

# Output harus: 1 (jika berhasil)

# 2. Check DNS resolution
nslookup futsal-postgres

# 3. Check Docker logs lebih detail
docker logs --tail 100 <app-container-name>

# 4. Check environment variables di container
docker exec <app-container-name> env

# 5. Try manual npm install
docker exec <app-container-name> npm install
```

---

## ⚡ QUICK COMMAND REFERENCE

### View real-time logs
```bash
docker logs -f futsal-app
```

### View last 50 lines
```bash
docker logs --tail 50 futsal-app
```

### Restart container
```bash
docker restart futsal-app
```

### Check container status
```bash
docker ps | grep futsal-app
```

### Stop & remove container
```bash
docker stop futsal-app
docker rm futsal-app
```

---

## 🚀 EXPECTED OUTPUT WHEN WORKING

Saat service berhasil, logs harusnya:

```
> futsal-booking-system@1.0.0 start
> node server.js

Initializing database...
✓ Database initialized successfully
✓ Data sudah ada, skip initial insert
📝 Audit log untuk venue 1: CREATE_BOOKING
🚀 Futsal Booking System running on http://localhost:3006
📱 Customer View: http://localhost:3006
👤 Admin Panel: http://localhost:3006/admin
```

---

## ✅ SETELAH BERHASIL (Status Hijau)

Saat service sudah hijau:

### 1. Test dari browser
```
http://<RASPBERRY-IP>:3006
http://<RASPBERRY-IP>:3006/admin
```

### 2. Test API
```bash
curl http://<RASPBERRY-IP>:3006/api/venues
```

Expected:
```json
[
  {"id": 1, "name": "Jogokariyan Futsal", ...},
  {"id": 2, "name": "4R Futsal", ...}
]
```

### 3. Test Admin Login
- Username: `admin_jogo`
- Password: `jogopass`

### 4. Test Database
```bash
psql -h futsal-postgres -U futsal_user -d futsal_booking

# Di database:
SELECT COUNT(*) FROM courts;  # Should return 4
SELECT COUNT(*) FROM venues;  # Should return 2
```

---

## 📞 RINGKASAN SOLUSI

| Gejala | Kemungkinan | Fix |
|--------|------------|-----|
| Kuning, no containers | Build error | Check Build Logs |
| Connection refused | DB tidak ready | Add retry logic |
| npm install failed | Dependencies issue | Use --legacy-peer-deps |
| DNS failed | Network tidak linked | Check linked services |
| Out of memory | App crash | Increase memory limit |

---

## 🎯 NEXT STEPS

1. **Update files** (Dockerfile, server.js, db.js)
2. **Push ke GitHub**
3. **Rebuild di Easy Panel**
4. **Check logs**
5. **Verify status hijau**

Jika masih kuning setelah ini, **share build logs** untuk debug lebih lanjut!

**Good luck! 🚀⚽**
