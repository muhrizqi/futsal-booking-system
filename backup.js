import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = promisify(exec);

const BACKUP_DIR = './backups';
const MAX_BACKUP_FILES = 7; // Simpan 7 backup terakhir (1 minggu)

// Pastikan folder backup ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('Backup directory created');
}

async function backupDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `futsal_backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const backupCommand = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > "${filepath}"`;

    console.log(`Starting database backup: ${filename}`);
    
    await execPromise(backupCommand);

    const stats = fs.statSync(filepath);
    console.log(`✅ Database backup successful: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Hapus backup lama
    await cleanOldBackups();

    return true;
  } catch (error) {
    console.error('❌ Database backup failed:', error.message);
    return false;
  }
}

async function backupApplicationFiles() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `futsal_app_backup_${timestamp}.tar.gz`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Backup folder public, db.js, server.js, .env
    const backupCommand = `tar -czf "${filepath}" public/ db.js server.js .env package.json 2>/dev/null || true`;

    console.log(`Starting application files backup: ${filename}`);
    
    await execPromise(backupCommand);

    const stats = fs.statSync(filepath);
    console.log(`✅ Application backup successful: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

    return true;
  } catch (error) {
    console.error('❌ Application backup failed:', error.message);
    return false;
  }
}

async function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('futsal_backup_'))
      .sort()
      .reverse();

    // Hapus backup lama yang melebihi MAX_BACKUP_FILES
    if (files.length > MAX_BACKUP_FILES) {
      const filesToDelete = files.slice(MAX_BACKUP_FILES);
      
      filesToDelete.forEach(file => {
        const filepath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filepath);
        console.log(`🗑️  Deleted old backup: ${file}`);
      });
    }

    // Bersihkan file aplikasi backup lama juga
    const appFiles = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('futsal_app_backup_'))
      .sort()
      .reverse();

    if (appFiles.length > MAX_BACKUP_FILES) {
      const appFilesToDelete = appFiles.slice(MAX_BACKUP_FILES);
      
      appFilesToDelete.forEach(file => {
        const filepath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filepath);
        console.log(`🗑️  Deleted old app backup: ${file}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error.message);
  }
}

async function runFullBackup() {
  console.log('\n📦 Starting Full Backup Process...');
  console.log(`Time: ${new Date().toLocaleString()}\n`);

  const dbBackupSuccess = await backupDatabase();
  const appBackupSuccess = await backupApplicationFiles();

  if (dbBackupSuccess && appBackupSuccess) {
    console.log('\n✅ All backups completed successfully!');
    
    // Tampilkan daftar backup
    listBackups();
  } else {
    console.log('\n⚠️  Some backups failed!');
  }
}

function listBackups() {
  console.log('\n📋 Available Backups:');
  try {
    const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
    
    if (files.length === 0) {
      console.log('No backups found');
      return;
    }

    files.slice(0, 10).forEach((file, index) => {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      const size = (stats.size / 1024).toFixed(2);
      const date = new Date(stats.mtime).toLocaleString();
      
      console.log(`${index + 1}. ${file} (${size} KB) - ${date}`);
    });
  } catch (error) {
    console.error('Error listing backups:', error.message);
  }
}

// Jalankan backup jika file ini dijalankan langsung
if (process.argv[1].endsWith('backup.js')) {
  runFullBackup().catch(console.error);
}

export { backupDatabase, backupApplicationFiles, runFullBackup, listBackups };
