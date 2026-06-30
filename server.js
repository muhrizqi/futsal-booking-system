import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pool, { initializeDatabase } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(join(__dirname, 'public')));

// ==================== ROUTES API ====================

// 1. GET - Ambil jadwal untuk halaman pelanggan
app.get('/api/venues', async (req, res) => {
  try {
    const venues = await pool.query('SELECT id, name, location FROM venues');
    res.json(venues.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. GET - Jadwal lapangan berdasarkan venue dan tanggal
app.get('/api/schedule/:venueId/:date', async (req, res) => {
  try {
    const { venueId, date } = req.params;

    const result = await pool.query(`
      SELECT 
        c.id as court_id,
        c.name as court_name,
        c.color,
        b.start_time,
        b.end_time,
        b.status,
        b.customer_name,
        p.price
      FROM courts c
      LEFT JOIN bookings b ON c.id = b.court_id AND b.booking_date = $1
      LEFT JOIN pricing p ON c.venue_id = p.venue_id 
        AND b.start_time >= p.start_time 
        AND b.start_time < p.end_time
      WHERE c.venue_id = $2
      ORDER BY c.id, b.start_time
    `, [date, venueId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. GET - Pricing untuk venue
app.get('/api/pricing/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    
    const result = await pool.query(`
      SELECT start_time, end_time, price 
      FROM pricing 
      WHERE venue_id = $1 
      ORDER BY start_time
    `, [venueId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. GET - Lapangan berdasarkan venue
app.get('/api/courts/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    
    const result = await pool.query(`
      SELECT id, name, color 
      FROM courts 
      WHERE venue_id = $1 
      ORDER BY id
    `, [venueId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. GET - WhatsApp Admin
app.get('/api/whatsapp/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
    
    const result = await pool.query(`
      SELECT whatsapp_admin FROM venues WHERE id = $1
    `, [venueId]);

    if (result.rows.length > 0) {
      res.json({ whatsapp: result.rows[0].whatsapp_admin });
    } else {
      res.status(404).json({ error: 'Venue not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== ADMIN ROUTES ====================

// 6. POST - Login Admin
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(`
      SELECT id, name, admin_username 
      FROM venues 
      WHERE admin_username = $1 AND admin_password = $2
    `, [username, password]);

    if (result.rows.length > 0) {
      const venue = result.rows[0];
      res.json({ 
        success: true, 
        venueId: venue.id, 
        venueName: venue.name,
        username: venue.admin_username
      });
    } else {
      res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 7. POST - Tambah booking baru (dari admin)
app.post('/api/admin/bookings', async (req, res) => {
  try {
    const { courtId, venueId, bookingDate, startTime, endTime, customerName, customerPhone, notes } = req.body;

    // Cek konflik jadwal
    const conflict = await pool.query(`
      SELECT id FROM bookings 
      WHERE court_id = $1 
      AND booking_date = $2
      AND (
        (start_time, end_time) OVERLAPS ($3::time, $4::time)
      )
      AND status != 'cancelled'
    `, [courtId, bookingDate, startTime, endTime]);

    if (conflict.rows.length > 0) {
      return res.status(400).json({ error: 'Jadwal sudah terpesan' });
    }

    // Hitung harga
    const pricing = await pool.query(`
      SELECT price FROM pricing 
      WHERE venue_id = $1 
      AND start_time <= $2::time 
      AND end_time > $2::time
      LIMIT 1
    `, [venueId, startTime]);

    const price = pricing.rows[0]?.price || 0;

    const result = await pool.query(`
      INSERT INTO bookings 
      (court_id, venue_id, booking_date, start_time, end_time, customer_name, customer_phone, notes, price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'booked')
      RETURNING *
    `, [courtId, venueId, bookingDate, startTime, endTime, customerName, customerPhone, notes, price]);

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (venue_id, action, details)
      VALUES ($1, 'CREATE_BOOKING', $2)
    `, [venueId, JSON.stringify(result.rows[0])]);

    res.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 8. GET - Jadwal lengkap untuk admin
app.get('/api/admin/bookings/:venueId/:date', async (req, res) => {
  try {
    const { venueId, date } = req.params;

    const result = await pool.query(`
      SELECT 
        b.id,
        c.id as court_id,
        c.name as court_name,
        c.color,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.customer_name,
        b.customer_phone,
        b.notes,
        b.price,
        b.status,
        b.created_at
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE b.venue_id = $1 AND b.booking_date = $2
      ORDER BY b.start_time
    `, [venueId, date]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 9. PUT - Update booking
app.put('/api/admin/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { startTime, endTime, customerName, customerPhone, notes, status } = req.body;

    const result = await pool.query(`
      UPDATE bookings 
      SET start_time = COALESCE($1::time, start_time),
          end_time = COALESCE($2::time, end_time),
          customer_name = COALESCE($3, customer_name),
          customer_phone = COALESCE($4, customer_phone),
          notes = COALESCE($5, notes),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [startTime, endTime, customerName, customerPhone, notes, status, bookingId]);

    res.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 10. DELETE - Hapus booking
app.delete('/api/admin/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 11. GET - Ringkasan laporan untuk admin
app.get('/api/admin/report/:venueId/:startDate/:endDate', async (req, res) => {
  try {
    const { venueId, startDate, endDate } = req.params;

    const result = await pool.query(`
      SELECT 
        DATE(booking_date) as date,
        COUNT(*) as total_bookings,
        SUM(price) as total_revenue,
        COUNT(DISTINCT court_id) as courts_used
      FROM bookings
      WHERE venue_id = $1 
      AND booking_date BETWEEN $2 AND $3
      AND status = 'booked'
      GROUP BY DATE(booking_date)
      ORDER BY date DESC
    `, [venueId, startDate, endDate]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ==================== SERVE INDEX ====================
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'admin.html'));
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ==================== START SERVER ====================
async function startServer() {
  let retries = 0;
  const maxRetries = 10;
  
  async function connect() {
    try {
      console.log(`\n[${new Date().toISOString()}] Attempt ${retries + 1}/${maxRetries}: Initializing database...`);
      
      await initializeDatabase();
      
      app.listen(PORT, () => {
        console.log(`\n✅ SUCCESS! Server started on port ${PORT}\n`);
        console.log(`📱 Customer: http://localhost:${PORT}`);
        console.log(`👤 Admin: http://localhost:${PORT}/admin`);
        console.log(`🔗 API: http://localhost:${PORT}/api/venues\n`);
      });
    } catch (error) {
      retries++;
      console.error(`❌ Error: ${error.message}`);
      
      if (retries >= maxRetries) {
        console.error(`\n💥 FATAL: Max retries (${maxRetries}) reached. Exiting.\n`);
        process.exit(1);
      }
      
      const delay = 2000;
      console.log(`⏳ Retrying in ${delay/1000}s...\n`);
      setTimeout(connect, delay);
    }
  }
  
  connect();
}

startServer();

// ===== BOOKING UPDATES =====
 
// 12. PUT - Update booking status (attended, payment, etc)
app.put('/api/admin/bookings/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { attended, paymentStatus, paymentMethod, bankAccount, notesAdmin, cancelled, cancelReason } = req.body;
 
    const result = await pool.query(`
      UPDATE bookings 
      SET attended = COALESCE($1, attended),
          payment_status = COALESCE($2, payment_status),
          payment_method = COALESCE($3, payment_method),
          bank_account = COALESCE($4, bank_account),
          notes_admin = COALESCE($5, notes_admin),
          cancelled = COALESCE($6, cancelled),
          cancel_reason = COALESCE($7, cancel_reason),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [attended, paymentStatus, paymentMethod, bankAccount, notesAdmin, cancelled, cancelReason, bookingId]);
 
    if (result.rows.length > 0) {
      res.json({ success: true, booking: result.rows[0] });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});
 
// ===== CUSTOMER MANAGEMENT =====
 
// 13. GET - List semua pelanggan di venue
app.get('/api/admin/customers/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
 
    const result = await pool.query(`
      SELECT 
        id,
        phone,
        name,
        email,
        total_bookings,
        total_attended,
        total_cancelled,
        total_noshow,
        total_spent,
        last_booking_date,
        ROUND(CAST(total_attended AS FLOAT) / NULLIF(total_bookings, 0) * 100, 1) as attendance_rate
      FROM customers
      WHERE venue_id = $1
      ORDER BY last_booking_date DESC NULLS LAST
    `, [venueId]);
 
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});
 
// 14. GET - Detail pelanggan dengan booking history
app.get('/api/admin/customers/:venueId/:customerId', async (req, res) => {
  try {
    const { venueId, customerId } = req.params;
 
    // Get customer detail
    const customerResult = await pool.query(`
      SELECT 
        id,
        phone,
        name,
        email,
        total_bookings,
        total_attended,
        total_cancelled,
        total_noshow,
        total_spent,
        ROUND(CAST(total_attended AS FLOAT) / NULLIF(total_bookings, 0) * 100, 1) as attendance_rate
      FROM customers
      WHERE id = $1 AND venue_id = $2
    `, [customerId, venueId]);
 
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
 
    const customer = customerResult.rows[0];
 
    // Get booking history
    const historyResult = await pool.query(`
      SELECT 
        b.id,
        b.booking_date,
        c.name as court_name,
        c.color,
        b.start_time,
        b.end_time,
        b.price,
        b.attended,
        b.payment_status,
        b.payment_method,
        b.cancelled,
        b.cancel_reason,
        b.notes_admin,
        TO_CHAR(b.booking_date, 'Day') as day_name
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE b.customer_phone = $1 AND b.venue_id = $2
      ORDER BY b.booking_date DESC
      LIMIT 50
    `, [customer.phone, venueId]);
 
    // Get booking patterns
    const patternResult = await pool.query(`
      SELECT 
        TO_CHAR(booking_date, 'Day') as day_name,
        EXTRACT(ISODOW FROM booking_date) as day_of_week,
        COUNT(*) as count,
        ROUND(AVG(EXTRACT(HOUR FROM start_time)), 0)::INT as avg_hour
      FROM bookings
      WHERE customer_phone = $1 AND venue_id = $2
      GROUP BY TO_CHAR(booking_date, 'Day'), EXTRACT(ISODOW FROM booking_date)
      ORDER BY EXTRACT(ISODOW FROM booking_date)
    `, [customer.phone, venueId]);
 
    res.json({
      customer,
      history: historyResult.rows,
      patterns: patternResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});
 
// 15. GET - Customer analytics / insights
app.get('/api/admin/customers/:venueId/analytics', async (req, res) => {
  try {
    const { venueId } = req.params;
 
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.total_bookings,
        c.total_attended,
        c.total_cancelled,
        c.total_noshow,
        c.total_spent,
        ROUND(CAST(c.total_attended AS FLOAT) / NULLIF(c.total_bookings, 0) * 100, 1) as attendance_rate,
        ROUND(CAST(c.total_cancelled AS FLOAT) / NULLIF(c.total_bookings, 0) * 100, 1) as cancel_rate,
        ROUND(CAST(c.total_noshow AS FLOAT) / NULLIF(c.total_bookings - c.total_cancelled, 0) * 100, 1) as noshow_rate,
        c.last_booking_date,
        CASE 
          WHEN c.total_bookings > 10 THEN 'VIP'
          WHEN c.total_bookings > 5 THEN 'Regular'
          ELSE 'New'
        END as customer_type
      FROM customers c
      WHERE c.venue_id = $1
      ORDER BY c.total_bookings DESC
    `, [venueId]);
 
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});
 
// 16. GET - Bank accounts untuk venue
app.get('/api/admin/bank-accounts/:venueId', async (req, res) => {
  try {
    const { venueId } = req.params;
 
    const result = await pool.query(`
      SELECT 
        id,
        bank_name,
        account_number,
        account_holder,
        is_active
      FROM bank_accounts
      WHERE venue_id = $1 AND is_active = TRUE
      ORDER BY id
    `, [venueId]);
 
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});
 
// 17. GET - Booking details untuk modal edit
app.get('/api/admin/bookings/:bookingId/detail', async (req, res) => {
  try {
    const { bookingId } = req.params;
 
    const result = await pool.query(`
      SELECT 
        b.*,
        c.name as court_name,
        v.id as venue_id
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN venues v ON b.venue_id = v.id
      WHERE b.id = $1
    `, [bookingId]);
 
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default app;
