# 🎯 Futsal Booking System - Dokumentasi

Sistem booking lapangan futsal berbasis web yang ringan dan efisien untuk Raspberry Pi dengan PostgreSQL.

## 📋 Daftar Isi
- [Fitur](#fitur)
- [Requirements](#requirements)
- [Instalasi](#instalasi)
- [Setup Database](#setup-database)
- [Konfigurasi](#konfigurasi)
- [Menjalankan Sistem](#menjalankan-sistem)
- [Backup Otomatis](#backup-otomatis)
- [Struktur Folder](#struktur-folder)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

## ✨ Fitur

### Untuk Pelanggan
- ✅ Melihat jadwal lapangan tersedia
- ✅ Booking lapangan via WhatsApp
- ✅ Melihat harga berdasarkan waktu
- ✅ Interface responsif mobile-friendly

### Untuk Admin
- ✅ Login terpisah untuk setiap lokasi
- ✅ Kelola jadwal lapangan
- ✅ Tambah/edit/hapus booking
- ✅ Laporan penjualan harian
- ✅ Dashboard dengan statistik

### Fitur Sistem
- ✅ Database PostgreSQL (scalable)
- ✅ Backup otomatis database dan file
- ✅ Ringan untuk Raspberry Pi
- ✅ API REST yang simple
- ✅ Zero dependencies untuk frontend

## 📦 Requirements

- Node.js >= 14.0.0
- PostgreSQL >= 12
- npm atau yarn
- Raspberry Pi (2GB RAM minimum)

## 🚀 Instalasi

### 1. Clone/Download Proyek
```bash
cd /home/pi
git clone <repository-url> futsal-system
cd futsal-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup PostgreSQL

#### Di Raspberry Pi:
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Enable auto-start
sudo update-rc.d postgresql enable
```

#### Buat Database dan User:
```bash
sudo -u postgres psql

# Di PostgreSQL prompt:
CREATE DATABASE futsal_booking;
CREATE USER futsal_user WITH PASSWORD 'secure_password_here';
ALTER ROLE futsal_user SET client_encoding TO 'utf8';
ALTER ROLE futsal_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE futsal_user SET default_transaction_deferrable TO on;
ALTER ROLE futsal_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE futsal_booking TO futsal_user;
\q
```

### 4. Konfigurasi Environment

Copy `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi Anda:
```env
# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=futsal_booking
DB_USER=futsal_user
DB_PASSWORD=secure_password_here

# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Configuration
WHATSAPP_ADMIN_JOGO=6281234567890
WHATSAPP_ADMIN_4R=6281234567891

# Admin Credentials (GANTI INI!)
ADMIN_JOGO_PASSWORD=ubah_password_ini
ADMIN_4R_PASSWORD=ubah_password_ini
```

## 📊 Setup Database

Database akan otomatis dibuat saat server pertama kali dijalankan. Sistem akan insert data awal:

**Jogokariyan Futsal:**
- 2 lapangan (Hijau, Biru)
- Pricing: 06.00-15.00 = Rp 115.000, 15.00-24.00 = Rp 150.000
- Admin: `admin_jogo` / `admin123`

**4R Futsal:**
- 2 lapangan (Hijau, Biru)
- Pricing: 06.00-12.00 = Rp 80.000, 12.00-16.00 = Rp 100.000, 16.00-24.00 = Rp 135.000
- Admin: `admin_4r` / `admin123`

**PENTING:** Ganti password default di `.env` setelah instalasi!

## ⚙️ Konfigurasi

### Mengubah Harga
Untuk mengubah harga lapangan, edit data di tabel `pricing` melalui PostgreSQL atau modifikasi data di `db.js`.

### Mengubah Jam Operasional
Edit waktu operasional di bagian `insertInitialData()` di `db.js`.

### Menambah Lapangan Baru
1. Login ke Admin Panel
2. Edit database langsung melalui PostgreSQL atau CLI

```bash
psql -h localhost -U futsal_user -d futsal_booking

INSERT INTO courts (venue_id, name, color) 
VALUES (1, 'Lapangan 3', 'Merah');
```

### Setup WhatsApp Admin
Update nomor WhatsApp di `.env`:
```env
WHATSAPP_ADMIN_JOGO=62812345678901
WHATSAPP_ADMIN_4R=62987654321098
```

## ▶️ Menjalankan Sistem

### Cara 1: Direct
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

### Cara 2: Dengan PM2 (Recommended untuk Production)
```bash
# Install PM2 global
npm install -g pm2

# Jalankan aplikasi
pm2 start server.js --name "futsal-booking"

# Set auto-start saat reboot
pm2 startup
pm2 save
```

Cek status:
```bash
pm2 list
pm2 logs futsal-booking
```

### Cara 3: Menggunakan systemd
Buat file `/etc/systemd/system/futsal-booking.service`:
```ini
[Unit]
Description=Futsal Booking System
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/futsal-system
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktifkan:
```bash
sudo systemctl daemon-reload
sudo systemctl enable futsal-booking
sudo systemctl start futsal-booking
sudo systemctl status futsal-booking
```

## 💾 Backup Otomatis

### Manual Backup
```bash
npm run backup
```

Atau:
```bash
node backup.js
```

Backup akan disimpan di folder `./backups/`

### Setup Backup Otomatis dengan Cron

Edit crontab:
```bash
crontab -e
```

Tambahkan baris berikut untuk backup setiap hari jam 02:00:
```cron
0 2 * * * cd /home/pi/futsal-system && npm run backup >> backup.log 2>&1
```

Atau setiap 6 jam:
```cron
0 */6 * * * cd /home/pi/futsal-system && npm run backup >> backup.log 2>&1
```

### Restore dari Backup

```bash
# List backup
ls -lh backups/

# Restore database
PGPASSWORD="your_password" psql -h localhost -U futsal_user -d futsal_booking < backups/futsal_backup_2024-01-15T10-30-45.sql

# Restore aplikasi
tar -xzf backups/futsal_app_backup_2024-01-15T10-30-45.tar.gz
```

## 📁 Struktur Folder

```
futsal-system/
├── server.js              # Backend utama Express
├── db.js                  # Setup & koneksi database
├── backup.js              # Script backup otomatis
├── package.json           # Dependencies
├── .env.example           # Contoh konfigurasi
├── .env                   # Konfigurasi aktif (git ignored)
├── backups/               # Folder backup otomatis
│   ├── futsal_backup_*.sql
│   └── futsal_app_backup_*.tar.gz
├── public/                # Frontend files
│   ├── index.html         # Halaman pelanggan
│   └── admin.html         # Panel admin
└── logs/                  # Log files (optional)
```

## 🔌 API Endpoints

### Public Endpoints

**GET** `/api/venues` - Daftar venue
```json
[
  {
    "id": 1,
    "name": "Jogokariyan Futsal",
    "location": "Jl. Jogokariyan, Yogyakarta"
  }
]
```

**GET** `/api/courts/:venueId` - Daftar lapangan
```json
[
  {
    "id": 1,
    "name": "Lapangan 1",
    "color": "Hijau"
  }
]
```

**GET** `/api/schedule/:venueId/:date` - Jadwal untuk tanggal tertentu
**GET** `/api/pricing/:venueId` - Harga lapangan
**GET** `/api/whatsapp/:venueId` - Nomor WhatsApp admin

### Admin Endpoints

**POST** `/api/admin/login` - Login admin
```json
{
  "username": "admin_jogo",
  "password": "admin123"
}
```

**POST** `/api/admin/bookings` - Tambah booking baru
**GET** `/api/admin/bookings/:venueId/:date` - Jadwal harian
**PUT** `/api/admin/bookings/:bookingId` - Update booking
**DELETE** `/api/admin/bookings/:bookingId` - Hapus booking
**GET** `/api/admin/report/:venueId/:startDate/:endDate` - Laporan

## 🌐 Akses Sistem

### Pelanggan
```
http://localhost:3000
atau
http://alamat-ip-raspberry:3000
```

### Admin
```
http://localhost:3000/admin
```

**Login Demo:**
- Jogo: `admin_jogo` / `admin123`
- 4R: `admin_4r` / `admin123`

## 🔒 Security Notes

1. **Ganti Password Default** - SANGAT PENTING
   - Edit di `.env` sebelum production
   - Minimal 12 karakter

2. **Setup HTTPS** (Recommended)
   - Gunakan Nginx/Apache sebagai reverse proxy
   - Install SSL certificate dengan Let's Encrypt

3. **Firewall**
   - Buka hanya port 3000 (atau port Anda)
   - Restrict akses admin dari IP tertentu jika perlu

4. **Database**
   - Backup password di tempat aman
   - Regular backup database

## 🔧 Troubleshooting

### Port sudah digunakan
```bash
# Kill process pada port 3000
sudo lsof -i :3000
sudo kill -9 <PID>

# Atau ubah port di .env
PORT=3001
```

### Koneksi database gagal
```bash
# Cek service PostgreSQL
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart

# Cek credentials di .env
```

### Backup gagal
```bash
# Cek apakah pg_dump terinstall
which pg_dump

# Install jika belum
sudo apt-get install postgresql-client-common
```

### Error memory Raspberry Pi
- Kurangi timeout
- Disable swap jika perlu
- Clear cache regular:
  ```bash
  sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
  ```

## 📈 Performance Tips

1. **Enable Redis untuk caching** (optional)
2. **Use Nginx reverse proxy** untuk production
3. **Setup log rotation** untuk file logs
4. **Monitor memory** dengan htop
5. **Cleanup old backups** regularly

## 🐛 Support & Issues

Untuk bantuan:
1. Check logs: `pm2 logs futsal-booking`
2. Check database: `psql -U futsal_user -d futsal_booking`
3. Test API: `curl http://localhost:3000/api/venues`

## 📝 License

MIT License

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Tested on:** Raspberry Pi 3B+, 4B
