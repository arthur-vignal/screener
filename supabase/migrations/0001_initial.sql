-- Supabase schema for screener-v2
-- Run this in Supabase SQL Editor (Database → SQL Editor → New query)

-- ============================================
-- 1. profiles (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profile will be created explicitly by our app (with username)
  -- This trigger is a fallback for any users created via Supabase Auth UI directly
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, 'user_' || substring(NEW.id::text, 1, 8))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. sessions (JWT tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions(expires_at);

-- ============================================
-- 3. indices (user-created)
-- ============================================
CREATE TABLE IF NOT EXISTS public.indices (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  universe TEXT NOT NULL DEFAULT 'sp500',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  ranking TEXT NOT NULL DEFAULT 'momentum-12-1',
  top_n INTEGER NOT NULL DEFAULT 30,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_indices_owner ON public.indices(owner_id);
CREATE INDEX IF NOT EXISTS idx_indices_public ON public.indices(is_public) WHERE is_public = TRUE;

-- ============================================
-- 4. portfolios
-- ============================================
CREATE TABLE IF NOT EXISTS public.portfolios (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  initial_value DOUBLE PRECISION NOT NULL DEFAULT 10000,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_portfolios_owner ON public.portfolios(owner_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_public ON public.portfolios(is_public) WHERE is_public = TRUE;

-- ============================================
-- 5. portfolio_holdings
-- ============================================
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  portfolio_id BIGINT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (portfolio_id, symbol)
);

-- ============================================
-- 6. portfolio_history (snapshots)
-- ============================================
CREATE TABLE IF NOT EXISTS public.portfolio_history (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  recorded_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  total_value DOUBLE PRECISION NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_portfolio_history_pid ON public.portfolio_history(portfolio_id);

-- ============================================
-- 7. RPC function: generic query/exec
-- ============================================
CREATE OR REPLACE FUNCTION public.exec_sql(sql_text TEXT, sql_args JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  sql_with_args TEXT;
  arg_count INT;
  i INT;
  arg_value TEXT;
BEGIN
  sql_with_args := sql_text;
  arg_count := jsonb_array_length(sql_args);

  -- Iterate backwards from N to 1 (replace $N first, then $N-1, etc.)
  FOR i IN REVERSE arg_count .. 1 LOOP
    arg_value := jsonb_extract_path_text(sql_args, i::text);

    -- If key has spaces or special chars, look up by numeric string
    IF arg_value IS NULL AND jsonb_typeof(sql_args -> (i - 1)::text) IS NOT NULL THEN
      arg_value := jsonb_extract_path_text(sql_args, (i - 1)::text);
    END IF;

    IF arg_value IS NULL OR arg_value = '' THEN
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, 'NULL');
    ELSIF arg_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, arg_value);
    ELSE
      sql_with_args := REPLACE(sql_with_args, '$' || i::text, '''' || REPLACE(arg_value, '''', '''''') || '''');
    END IF;
  END LOOP;

  -- Run query and return as JSONB array
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_with_args || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;

-- ============================================
-- 8. RLS (Row Level Security)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; we use it for all server-side queries.

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Public indices are visible to everyone
CREATE POLICY "Public indices are visible to all"
  ON public.indices FOR SELECT
  USING (is_public = TRUE OR auth.uid() = owner_id);

-- Public portfolios are visible to everyone
CREATE POLICY "Public portfolios are visible to all"
  ON public.portfolios FOR SELECT
  USING (is_public = TRUE OR auth.uid() = owner_id);

-- Portfolio holdings: visible if portfolio is visible
CREATE POLICY "Holdings visible with portfolio"
  ON public.portfolio_holdings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = portfolio_holdings.portfolio_id
      AND (p.is_public = TRUE OR auth.uid() = p.owner_id)
    )
  );
