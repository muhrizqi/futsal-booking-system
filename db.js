import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

console.log(`[${new Date().toISOString()}] Creating PostgreSQL connection pool...`);
console.log(`DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || 5432}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'futsal_booking'}`);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'futsal_booking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Connection pool settings
  connectionTimeoutMillis: 10000,  // 10 seconds timeout
  idleTimeoutMillis: 30000,
  max: 20,  // max connections
  min: 2,   // min connections
  
  // Retry settings
  maxRetries: 5,
  retryDelayBase: 1000,
});

// Error handling
pool.on('error', (err, client) => {
  console.error(`[${new Date().toISOString()}] ❌ Unexpected error on idle client:`, err);
});

pool.on('connect', () => {
  console.log(`[${new Date().toISOString()}] ✓ New client connected to database`);
});

// Setup database dan tabel
export async function initializeDatabase() {
  try {
    console.log(`[${new Date().toISOString()}] Initializing database...`);

    // Tabel untuk venue/lokasi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS venues (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        admin_username VARCHAR(50) NOT NULL UNIQUE,
        admin_password VARCHAR(255) NOT NULL,
        whatsapp_admin VARCHAR(20) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel untuk lapangan
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courts (
        id SERIAL PRIMARY KEY,
        venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel untuk jadwal/booking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
        venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20),
        notes TEXT,
        price DECIMAL(10, 2),
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index untuk query cepat
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date_time 
      ON bookings(booking_date, start_time, end_time)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_court 
      ON bookings(court_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_venue 
      ON bookings(venue_id)
    `);

    // Tabel untuk pricing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel untuk audit log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');

    // Insert data awal jika belum ada
    await insertInitialData();

  } catch (error) {
    console.error('Database initialization error:', error.message);
    process.exit(1);
  }
}

async function insertInitialData() {
  try {
    // Cek apakah data sudah ada
    const result = await pool.query('SELECT COUNT(*) FROM venues');
    
    if (result.rows[0].count === 0) {
      console.log('Inserting initial data...');

      // Insert Jogokariyan Futsal
      const jogo = await pool.query(`
        INSERT INTO venues (name, admin_username, admin_password, whatsapp_admin, location)
        VALUES ('Jogokariyan Futsal', 'admin_jogo', 'admin123', $1, 'Jl. Jogokariyan, Yogyakarta')
        RETURNING id
      `, [process.env.WHATSAPP_ADMIN_JOGO || '6281234567890']);

      // Insert lapangan Jogokariyan
      await pool.query(`
        INSERT INTO courts (venue_id, name, color) VALUES 
        ($1, 'Lapangan 1', 'Hijau'),
        ($1, 'Lapangan 2', 'Biru')
      `, [jogo.rows[0].id]);

      // Insert pricing Jogokariyan
      await pool.query(`
        INSERT INTO pricing (venue_id, start_time, end_time, price) VALUES
        ($1, '06:00', '15:00', 115000),
        ($1, '15:00', '24:00', 150000)
      `, [jogo.rows[0].id]);

      // Insert 4R Futsal
      const fourr = await pool.query(`
        INSERT INTO venues (name, admin_username, admin_password, whatsapp_admin, location)
        VALUES ('4R Futsal', 'admin_4r', 'admin123', $1, 'Jl. 4R, Yogyakarta')
        RETURNING id
      `, [process.env.WHATSAPP_ADMIN_4R || '6281234567891']);

      // Insert lapangan 4R
      await pool.query(`
        INSERT INTO courts (venue_id, name, color) VALUES 
        ($1, 'Lapangan 1', 'Hijau'),
        ($1, 'Lapangan 2', 'Biru')
      `, [fourr.rows[0].id]);

      // Insert pricing 4R
      await pool.query(`
        INSERT INTO pricing (venue_id, start_time, end_time, price) VALUES
        ($1, '06:00', '12:00', 80000),
        ($1, '12:00', '16:00', 100000),
        ($1, '16:00', '24:00', 135000)
      `, [fourr.rows[0].id]);

      console.log('Initial data inserted successfully');
    }
  } catch (error) {
    console.error('Error inserting initial data:', error.message);
  }
}

export default pool;
