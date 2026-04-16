-- Prithvix ERP - Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== USERS TABLE =====================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  phone TEXT,
  shop_name TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== FARMERS TABLE =====================
CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  mobile TEXT,
  loyalty_tier TEXT DEFAULT 'Bronze',
  crop_cycle TEXT,
  credit_status TEXT DEFAULT 'Clear',
  total_visits INTEGER DEFAULT 0,
  outstanding NUMERIC DEFAULT 0,
  avatar_idx INTEGER DEFAULT 0,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== FARMER VISITS =====================
CREATE TABLE IF NOT EXISTS farmer_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  type TEXT,
  notes TEXT,
  amount NUMERIC DEFAULT 0
);

-- ===================== FARMER NOTES =====================
CREATE TABLE IF NOT EXISTS farmer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== CREDITS =====================
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
  farmer_name TEXT,
  amount_due NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  days_overdue INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  date TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== PAYMENTS =====================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id TEXT,
  amount NUMERIC NOT NULL,
  mode TEXT,
  note TEXT,
  recorded_by TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== INVENTORY =====================
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Healthy',
  variants JSONB DEFAULT '[]'::jsonb
);

-- ===================== ACTIVITIES =====================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== SALES RECORDS =====================
CREATE TABLE IF NOT EXISTS sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMPTZ DEFAULT NOW(),
  revenue NUMERIC DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  category TEXT
);

-- ===================== FARMER GROWTH =====================
CREATE TABLE IF NOT EXISTS farmer_growth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month TEXT,
  count INTEGER DEFAULT 0
);

-- ===================== CHAT SESSIONS =====================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== CHAT MESSAGES =====================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== DISABLE RLS (for backend access) =====================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_growth DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_farmers_crop ON farmers(crop_cycle);
CREATE INDEX IF NOT EXISTS idx_farmers_loyalty ON farmers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_farmers_credit ON farmers(credit_status);
CREATE INDEX IF NOT EXISTS idx_credits_farmer ON credits(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credits_overdue ON credits(days_overdue);
CREATE INDEX IF NOT EXISTS idx_visits_farmer ON farmer_visits(farmer_id);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_activities_ts ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_records(date);
