-- Migration: Add booking status, payment, and customer management features
-- File ini berisi SQL untuk update database dengan fitur baru

-- 1. ALTER bookings table - tambah payment fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'; -- unpaid, paid
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20); -- cash, transfer
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bank_account VARCHAR(100); -- nama bank / rekening jika transfer
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes_admin TEXT; -- catatan admin
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. CREATE customers table (dari bookings, normalized)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  total_bookings INTEGER DEFAULT 0,
  total_attended INTEGER DEFAULT 0,
  total_cancelled INTEGER DEFAULT 0,
  total_noshow INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  last_booking_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(venue_id, phone)
);

-- 3. CREATE customer_history table (untuk tracking pattern)
CREATE TABLE IF NOT EXISTS customer_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  day_of_week VARCHAR(10), -- Monday, Tuesday, etc
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20), -- attended, cancelled, noshow
  payment_method VARCHAR(20),
  amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREATE bank_accounts table (untuk kelola rekening transfer)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CREATE booking_stats table (untuk cache statistics)
CREATE TABLE IF NOT EXISTS booking_stats (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  venue_id INTEGER NOT NULL,
  most_common_day VARCHAR(10),
  most_common_time TIME,
  booking_frequency VARCHAR(50), -- daily, weekly, monthly
  attendance_rate DECIMAL(5, 2),
  cancel_rate DECIMAL(5, 2),
  noshow_rate DECIMAL(5, 2),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Add indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_attended ON bookings(attended, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_payment ON bookings(payment_status, payment_method);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_venue ON customers(venue_id);
CREATE INDEX IF NOT EXISTS idx_customer_history_customer ON customer_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_history_date ON customer_history(booking_date);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_venue ON bank_accounts(venue_id);

-- 7. Create function untuk auto-update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customers table
  UPDATE customers SET 
    total_bookings = (SELECT COUNT(*) FROM bookings WHERE customer_phone = NEW.customer_phone AND venue_id = NEW.venue_id),
    total_attended = (SELECT COUNT(*) FROM bookings WHERE customer_phone = NEW.customer_phone AND venue_id = NEW.venue_id AND attended = TRUE),
    total_cancelled = (SELECT COUNT(*) FROM bookings WHERE customer_phone = NEW.customer_phone AND venue_id = NEW.venue_id AND cancelled = TRUE),
    total_noshow = (SELECT COUNT(*) FROM bookings WHERE customer_phone = NEW.customer_phone AND venue_id = NEW.venue_id AND attended = FALSE AND cancelled = FALSE AND booking_date < CURRENT_DATE),
    total_spent = (SELECT COALESCE(SUM(price), 0) FROM bookings WHERE customer_phone = NEW.customer_phone AND venue_id = NEW.venue_id AND attended = TRUE),
    last_booking_date = NEW.booking_date,
    updated_at = CURRENT_TIMESTAMP
  WHERE phone = NEW.customer_phone AND venue_id = NEW.venue_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger untuk auto-update stats
DROP TRIGGER IF EXISTS trg_update_customer_stats ON bookings;
CREATE TRIGGER trg_update_customer_stats
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- Insert sample bank accounts untuk demo
INSERT INTO bank_accounts (venue_id, bank_name, account_number, account_holder, is_active)
SELECT 1, 'BCA', '1234567890', 'Jogokariyan Futsal', TRUE
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts WHERE venue_id = 1);

INSERT INTO bank_accounts (venue_id, bank_name, account_number, account_holder, is_active)
SELECT 2, 'Mandiri', '0987654321', '4R Futsal', TRUE
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts WHERE venue_id = 2);

-- Migrate existing bookings ke customers table
INSERT INTO customers (venue_id, phone, name, total_bookings, created_at)
SELECT DISTINCT 
  venue_id, 
  customer_phone, 
  COALESCE(customer_name, 'Guest'), 
  COUNT(*),
  CURRENT_TIMESTAMP
FROM bookings
WHERE customer_phone IS NOT NULL
GROUP BY venue_id, customer_phone, customer_name
ON CONFLICT (venue_id, phone) DO NOTHING;

-- Update customer stats dengan data lama
UPDATE customers c SET
  total_bookings = (SELECT COUNT(*) FROM bookings WHERE customer_phone = c.phone AND venue_id = c.venue_id),
  total_attended = (SELECT COUNT(*) FROM bookings WHERE customer_phone = c.phone AND venue_id = c.venue_id AND attended = TRUE),
  total_cancelled = (SELECT COUNT(*) FROM bookings WHERE customer_phone = c.phone AND venue_id = c.venue_id AND cancelled = TRUE),
  total_spent = (SELECT COALESCE(SUM(price), 0) FROM bookings WHERE customer_phone = c.phone AND venue_id = c.venue_id AND attended = TRUE)
WHERE EXISTS (SELECT 1 FROM bookings WHERE customer_phone = c.phone);

-- Verify migration
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as customers_count FROM customers;
SELECT COUNT(*) as bank_accounts FROM bank_accounts;