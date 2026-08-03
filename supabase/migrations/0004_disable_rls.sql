-- Disable RLS on all tables (we use service role key server-side)
-- Service role bypasses RLS automatically, but we keep it OFF to avoid surprises.

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.indices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolio_holdings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolio_history DISABLE ROW LEVEL SECURITY;