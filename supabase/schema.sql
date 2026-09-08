-- =======================================================
-- B-202 Skyra Residency Supabase Setup Script
-- Run this in your Supabase Project -> SQL Editor -> Run
-- =======================================================

-- 1. Create Flat State Table for B-202 with JSONB & Realtime Support
CREATE TABLE IF NOT EXISTS public.flat_state (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.flat_state ENABLE ROW LEVEL SECURITY;

-- 3. Create Public Read & Write Policies for Flat B-202 State
CREATE POLICY "Allow public read for flat state"
ON public.flat_state
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public update for flat state"
ON public.flat_state
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public insert for flat state"
ON public.flat_state
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4. Enable Realtime Replication for instant multi-device live synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.flat_state;

-- =======================================================
-- Setup complete! The B-202 app will now sync live in the cloud.
-- =======================================================
