
-- Service role bypass para tudo
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public indices are visible to all" ON public.indices;
DROP POLICY IF EXISTS "Public portfolios are visible to all" ON public.portfolios;
DROP POLICY IF EXISTS "Holdings visible with portfolio" ON public.portfolio_holdings;
DROP POLICY IF EXISTS "sessions_owner" ON public.sessions;

-- Service role ja bypassa RLS por padrao (e na verdade nao precisa de policy)
-- mas precisamos adicionar policies pra operacoes via anon key

-- Profiles: anon pode ler tudo (leitura publica)
CREATE POLICY "Public profiles are visible to all" ON public.profiles FOR SELECT USING (true);

-- Indices: anon ve publicos
CREATE POLICY "Public indices visible" ON public.indices FOR SELECT USING (is_public = TRUE);

-- Portfolios: anon ve publicos  
CREATE POLICY "Public portfolios visible" ON public.portfolios FOR SELECT USING (is_public = TRUE);

-- Portfolio holdings: anon ve se portfolio publico
CREATE POLICY "Public holdings visible" ON public.portfolio_holdings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.portfolios p WHERE p.id = portfolio_holdings.portfolio_id AND p.is_public = TRUE));

-- Sessões: precisa de auth.uid() = user_id pra ler (so pra usuario logado)
-- Mas como usamos exec_sql pra tudo, nao precisamos de policy direta aqui
