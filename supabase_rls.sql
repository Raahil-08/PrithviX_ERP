-- Prithvix ERP - Enable RLS Policies for Production Security
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
--
-- Strategy: Enable RLS on all tables. The backend uses the service_role key
-- which ALWAYS bypasses RLS. This means:
-- 1. Backend operations continue working exactly as before
-- 2. Direct access via the anon key is fully blocked
-- 3. Even if someone discovers your Supabase URL + anon key, they can't read/write data

-- ===================== ENABLE RLS ON ALL TABLES =====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ===================== FORCE RLS FOR TABLE OWNERS TOO =====================
-- By default, table owners (postgres role) bypass RLS.
-- FORCE ensures RLS applies even to the table owner, except service_role.
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE farmers FORCE ROW LEVEL SECURITY;
ALTER TABLE farmer_visits FORCE ROW LEVEL SECURITY;
ALTER TABLE farmer_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE credits FORCE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE activities FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_records FORCE ROW LEVEL SECURITY;
ALTER TABLE farmer_growth FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;

-- ===================== POLICIES: SERVICE ROLE FULL ACCESS =====================
-- service_role bypasses RLS automatically, so no explicit policy needed.
-- We create NO anon policies = anon key has zero access. This is intentional.

-- ===================== DONE =====================
-- Your data is now locked down. Only the backend (via service_role key) can access it.
