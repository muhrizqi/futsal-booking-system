# 📤 PUSH UPDATE & REDEPLOY (Fix Service Kuning)

Saya sudah update 3 file penting untuk fix service kuning. Ikuti langkah ini:

---

## 📋 FILE YANG SUDAH DIUPDATE

1. ✅ **Dockerfile** - Added retry logic & curl
2. ✅ **server.js** - Added database retry connection (15 attempts)
3. ✅ **db.js** - Added connection pooling & error handling

---

## 🔄 STEP 1: DOWNLOAD/COPY FILE YANG SUDAH UPDATE

Versi terbaru sudah di: `/home/claude/futsal-system/`

Copy ke folder project Anda:
- `Dockerfile`
- `server.js`
- `db.js`

---

## 📝 STEP 2: PUSH KE GITHUB

Di folder futsal-system di Raspberry Pi:

```bash
cd ~/futsal-system

# 1. Add changes
git add Dockerfile server.js db.js

# 2. Commit
git commit -m "Fix: Add connection retry logic & improved health checks for Easy Panel"

# 3. Push ke GitHub
git push origin main
```

**Verifikasi di GitHub:**
- Buka: https://github.com/muhrizqi/futsal-booking-system
- Check 3 file sudah ter-update

---

## 🔄 STEP 3: REBUILD DI EASY PANEL

Di Easy Panel:

```
Services → futsal-app → [Tombol "Rebuild" atau "Redeploy"]
```

**Atau click di ikon refresh/restart service**

**Settings:**
- ✅ Build from source: ON
- ✅ Clear cache: ON
- ✅ Branch: main

**Click "Deploy" atau "Rebuild"**

⏳ Tunggu proses build... (biasanya 2-5 menit)

---

## 📊 STEP 4: MONITOR BUILD LOGS

Saat rebuilding, click **"Logs"** untuk melihat progress:

```
Expected output akan terlihat seperti:
---

Step 1/10 : FROM node:16-alpine
Step 2/10 : WORKDIR /app
...
Step 10/10 : CMD npm start

Successfully built <image-id>
✓ Build successful

Starting container...
[2024-01-15T10:30:45.123Z] Creating PostgreSQL connection pool...
[2024-01-15T10:30:45.456Z] Attempting to initialize database (attempt 1/15)...
[2024-01-15T10:30:46.789Z] ✓ Database initialized successfully
[2024-01-15T10:30:47.012Z] ✅ SERVER STARTED SUCCESSFULLY
[2024-01-15T10:30:47.345Z] 🚀 Futsal Booking System running on http://localhost:3006
```

---

## ✅ STEP 5: VERIFY STATUS HIJAU

Tunggu hingga status berubah:

```
❌ Kuning → 🟨 Building → ✅ Hijau (Running)
```

Saat sudah **hijau**, service siap diakses!

---

## 🧪 STEP 6: TEST APLIKASI

### Test 1: Check Status di Easy Panel

```
Services → futsal-app → Status
→ Should show: ✓ Running
```

### Test 2: Check Logs Tidak Ada Error

```
Services → futsal-app → Logs (tail 50 lines)

Harus terlihat:
✅ SERVER STARTED SUCCESSFULLY
🚀 Futsal Booking System running on http://localhost:3006
```

### Test 3: Access dari Browser

```
http://<RASPBERRY-IP>:3006
http://<RASPBERRY-IP>:3006/admin
```

Login dengan:
- Username: `admin_jogo`
- Password: `jogopass`

### Test 4: Test API

Di Terminal:
```bash
curl http://localhost:3006/api/venues
```

Expected response:
```json
[
  {"id": 1, "name": "Jogokariyan Futsal", ...},
  {"id": 2, "name": "4R Futsal", ...}
]
```

---

## 🔍 JIKA MASIH KUNING SETELAH REBUILD

Jika masih kuning setelah rebuild, ada beberapa kemungkinan:

### Debug 1: Check Build Logs

```
Services → futsal-app → "Build Logs"
```

Cari error message dan catat apa errornya.

### Debug 2: Check Network

```
Services → futsal-app → Settings → Network

Verify:
□ Network: futsal-network (atau default bridge)
□ Linked Services: futsal-postgres
□ Port: 3006:3006
```

### Debug 3: Verify PostgreSQL

PostgreSQL harus sudah **HIJAU** sebelum app bisa start:

```
Services → futsal-postgres → Status
→ Should show: ✓ Running (Hijau)
```

### Debug 4: Test Database Connection Manually

Di Easy Panel → Terminal:

```bash
# Test koneksi database
psql -h futsal-postgres -U futsal_user -d futsal_booking -c "SELECT 1;"

# Jika output: 1 → database OK
# Jika error: cek password & settings
```

### Debug 5: Check Environment Variables

Di Easy Panel → futsal-app → Settings:

Pastikan semua ada:
```
✓ PORT=3006
✓ NODE_ENV=production
✓ DB_HOST=futsal-postgres
✓ DB_PORT=5432
✓ DB_NAME=futsal_booking
✓ DB_USER=futsal_user
✓ DB_PASSWORD=futsal_password
```

---

## 💡 COMMON ISSUES & FIXES

| Error | Fix |
|-------|-----|
| `ECONNREFUSED futsal-postgres:5432` | PostgreSQL belum running, atau DB_HOST salah |
| `npm ERR! code ERESOLVE` | Dockerfile sudah punya `--legacy-peer-deps` |
| `No running containers found` | Build gagal, check Build Logs |
| `Connection timeout` | Increase health check delay ke 20 seconds |
| `Out of memory` | Increase memory limit di Settings |

---

## 📞 JIKA MASIH TIDAK JALAN

Share dengan saya:

1. **Build Logs** penuh (copy dari Easy Panel)
2. **Container Logs** (last 50 lines)
3. **Environment Variables** yang di-set
4. **Network configuration** screenshot
5. **PostgreSQL Status** (hijau/merah)

---

## ✅ EXPECTED TIMELINE

```
Sebelum:  ❌ Service Kuning (no containers)
↓
Step 1-2: Selama ~1 menit (Git push)
↓
Step 3-4: Selama ~3-5 menit (Build)
↓
Sesudah:  ✅ Service Hijau (Running)
```

---

## 🎉 SELESAI!

Setelah service hijau:

✅ Aplikasi bisa diakses
✅ Database terkoneksi
✅ Admin panel working
✅ API responding

**Silahkan akses:**
```
Pelanggan: http://<RASPBERRY-IP>:3006
Admin:     http://<RASPBERRY-IP>:3006/admin
```

**Happy booking! 🎯⚽**
