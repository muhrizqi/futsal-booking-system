# ⚡ Quick Start Guide

Setup Futsal Booking System dalam 5 menit!

## Option 1: Native Installation (Recommended untuk Pemula)

### Step 1: Setup Dependencies
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo service postgresql start
```

### Step 2: Clone Project
```bash
cd /home/pi
git clone <repository-url> futsal-system
cd futsal-system
```

### Step 3: Setup Database
```bash
# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE futsal_booking;
CREATE USER futsal_user WITH PASSWORD 'your_secure_password';
ALTER ROLE futsal_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE futsal_booking TO futsal_user;
\q
EOF
```

### Step 4: Configure & Install
```bash
# Copy env file
cp .env.example .env

# Edit .env dengan password yang Anda set
nano .env

# Install npm dependencies
npm install

# Run setup script
chmod +x setup.sh
./setup.sh
```

### Step 5: Run Application
```bash
# Test run
npm start

# Akses di browser
# Pelanggan: http://localhost:3000
# Admin: http://localhost:3000/admin
# Login: admin_jogo / admin123
```

### Step 6: Production Setup (dengan PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start dengan PM2
pm2 start server.js --name futsal-booking

# Auto-start saat reboot
pm2 startup
pm2 save

# View status
pm2 list
```

---

## Option 2: Docker Installation (Recommended untuk Advanced Users)

### Step 1: Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt-get install -y docker-compose
```

### Step 2: Setup Project
```bash
cd /home/pi
git clone <repository-url> futsal-system
cd futsal-system

# Copy dan edit .env
cp .env.example .env
nano .env  # Pastikan credentials benar
```

### Step 3: Build & Run
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Step 4: Access Application
```
Pelanggan: http://localhost:3000
Admin: http://localhost:3000/admin
Login: admin_jogo / admin123
```

---

## 🔑 Important Security Steps

**SEBELUM PRODUCTION, GANTI INI:**

### Edit .env
```bash
nano .env
```

Ubah:
```env
# GANTI PASSWORD INI!
ADMIN_JOGO_PASSWORD=ubah_password_jogo_anda
ADMIN_4R_PASSWORD=ubah_password_4r_anda

# GANTI NOMOR WHATSAPP INI!
WHATSAPP_ADMIN_JOGO=nomor_hp_admin_jogo
WHATSAPP_ADMIN_4R=nomor_hp_admin_4r

# GANTI PASSWORD DB INI!
DB_PASSWORD=password_database_yang_aman
```

---

## 📝 Data yang Sudah Dikonfigurasi

### Jogokariyan Futsal
- ✓ 2 lapangan (Hijau, Biru)
- ✓ Jam 06:00-15:00 = Rp 115.000/jam
- ✓ Jam 15:00-24:00 = Rp 150.000/jam
- ✓ Admin: `admin_jogo`

### 4R Futsal
- ✓ 2 lapangan (Hijau, Biru)
- ✓ Jam 06:00-12:00 = Rp 80.000/jam
- ✓ Jam 12:00-16:00 = Rp 100.000/jam
- ✓ Jam 16:00-24:00 = Rp 135.000/jam
- ✓ Admin: `admin_4r`

---

## 🔗 Akses Sistem

```
Customer Page:
http://localhost:3000
http://<IP-RASPBERRY>:3000

Admin Panel:
http://localhost:3000/admin
http://<IP-RASPBERRY>:3000/admin

Default Login:
Username: admin_jogo  OR  admin_4r
Password: admin123

API Documentation:
http://localhost:3000/api/venues
```

---

## 💾 Backup (Wajib!)

### Manual Backup
```bash
# Native
npm run backup

# Docker
docker-compose exec app npm run backup
```

### Auto Backup dengan Cron
```bash
# Edit crontab
crontab -e

# Add line ini (backup setiap hari jam 2 pagi):
0 2 * * * cd /home/pi/futsal-system && npm run backup
```

---

## 🔧 Troubleshooting

### Aplikasi tidak jalan
```bash
# Check Node.js version
node --version  # Harus >= 14

# Check PostgreSQL status
sudo service postgresql status

# View error logs
npm start  # Jika PM2, gunakan: pm2 logs futsal-booking
```

### Port 3000 sudah digunakan
```bash
# Edit .env
nano .env
# Ubah: PORT=3001

# Atau kill process
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Database connection error
```bash
# Test koneksi
psql -h localhost -U futsal_user -d futsal_booking

# Jika error, cek .env credentials
cat .env | grep DB_
```

---

## 📚 File Penting

| File | Fungsi |
|------|--------|
| `server.js` | Backend utama |
| `db.js` | Database setup |
| `backup.js` | Sistem backup |
| `.env` | Konfigurasi (JANGAN push ke git!) |
| `public/index.html` | Halaman pelanggan |
| `public/admin.html` | Panel admin |
| `README.md` | Dokumentasi lengkap |

---

## 📖 Dokumentasi Lengkap

- **Setup Lengkap**: Baca `README.md`
- **Easy Panel Integration**: Baca `EASY_PANEL_GUIDE.md`
- **Docker Setup**: Baca `DOCKER_GUIDE.md`

---

## ✅ Checklist Production

- [ ] Ganti semua password di `.env`
- [ ] Update nomor WhatsApp admin
- [ ] Setup backup otomatis (cron)
- [ ] Test restore backup
- [ ] Setup SSL/HTTPS (jika needed)
- [ ] Configure firewall
- [ ] Monitor resource usage
- [ ] Setup monitoring/alerting
- [ ] Create admin user baru (optional)
- [ ] Test dari mobile

---

## 🆘 Need Help?

```bash
# View logs
npm start                          # Native
pm2 logs futsal-booking           # PM2
docker-compose logs -f app        # Docker

# Check database
psql -U futsal_user -d futsal_booking

# Test API
curl http://localhost:3000/api/venues

# Test connection
curl http://localhost:3000
```

---

## 🎉 Congratulations!

Sistem sudah siap digunakan. Mulai dengan:

1. **Buka pelanggan**: http://localhost:3000
2. **Login admin**: http://localhost:3000/admin
   - Username: `admin_jogo` atau `admin_4r`
   - Password: `admin123`
3. **Tambah booking** dari admin panel
4. **Test booking** dari customer page

---

**Questions?** Baca dokumentasi lengkap atau hubungi developer.

Happy Booking! ⚽🎯
