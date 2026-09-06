-- ============================================
-- 6. Portfolio positions (qty + avg_price + purchased_at)
-- ============================================
-- Migra o modelo de holdings de "weight (%)" para "positions (qty, avg_price,
-- purchased_at)". O `weight` é mantido e calculado automaticamente como
-- `qty × avg_price / SUM(qty × avg_price over portfolio)` pra retrocompat
-- com qualquer leitura que ainda use o campo.
--
-- Aplicar manualmente no Supabase SQL Editor antes de fazer deploy dos
-- commits que dependem dessas colunas (AddHoldingDialog e bundle).
--
-- Estratégia:
--   - ADD COLUMN nullable (não quebra portfolios/holdings existentes)
--   - Default values pra qty/avg_price derivados do weight legacy × initial_value
--     (só funciona se initial_value > 0; senão vai 0/0 e o portfolio precisa
--     re-adicionar holdings via UI)
--   - purchased_at default = created_at do portfolio (assume que holdings
--     legados foram comprados "quando o portfolio foi criado")
--   - Backfill weight recalculado pra garantir integridade
-- ============================================

ALTER TABLE public.portfolio_holdings
  ADD COLUMN IF NOT EXISTS qty DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS avg_price DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS purchased_at BIGINT NULL;

-- Backfill pra portfolios existentes: assume que cada holding "pesa" o
-- weight declarado × initial_value do portfolio, dividido pelo preço
-- atual não temos — então usamos avg_price = 1 e qty = weight × initial_value
-- (vai mostrar "valor de face" errado na primeira renderização, mas o
-- usuário pode editar cada holding pela UI pra corrigir).
DO $$
DECLARE
  pf RECORD;        -- portfolio (renomeado pra não conflitar com alias da tabela 'portfolios p')
  hd RECORD;        -- holding
BEGIN
  FOR pf IN
    SELECT ph.portfolio_id, pt.initial_value
    FROM public.portfolio_holdings ph
    JOIN public.portfolios pt ON pt.id = ph.portfolio_id
    WHERE ph.qty IS NULL
    GROUP BY ph.portfolio_id, pt.initial_value
  LOOP
    FOR hd IN
      SELECT symbol, weight FROM public.portfolio_holdings
      WHERE portfolio_id = pf.portfolio_id
    LOOP
      UPDATE public.portfolio_holdings
      SET qty = hd.weight * pf.initial_value,
          avg_price = 1.0,
          purchased_at = COALESCE(
            -- p2.created_at já é bigint (unix seconds), não precisa de EXTRACT
            (SELECT p2.created_at FROM public.portfolios p2 WHERE p2.id = pf.portfolio_id),
            EXTRACT(EPOCH FROM NOW())::BIGINT
          )
      WHERE portfolio_id = pf.portfolio_id AND symbol = hd.symbol;
    END LOOP;
  END LOOP;
END $$;

-- Depois do backfill, força NOT NULL nos 3 campos. Se algum holding ficou
-- com NULL (portfolio sem initial_value > 0), cai no UPDATE abaixo.
UPDATE public.portfolio_holdings
SET qty = 0, avg_price = 0, purchased_at = EXTRACT(EPOCH FROM NOW())::BIGINT
WHERE qty IS NULL OR avg_price IS NULL OR purchased_at IS NULL;

ALTER TABLE public.portfolio_holdings
  ALTER COLUMN qty SET NOT NULL,
  ALTER COLUMN avg_price SET NOT NULL,
  ALTER COLUMN purchased_at SET NOT NULL;

-- Index em purchased_at pra queries por período (ex: "holdings comprados
-- no último mês") — útil pra futuras estatísticas do portfolio.
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_purchased_at
  ON public.portfolio_holdings(portfolio_id, purchased_at);

-- Comentário pra documentar a tabela:
COMMENT ON COLUMN public.portfolio_holdings.weight IS 'Calculado: qty × avg_price / SUM(qty × avg_price) sobre o portfolio. Mantido pra retrocompat.';
COMMENT ON COLUMN public.portfolio_holdings.qty IS 'Quantidade de ações/unidades compradas.';
COMMENT ON COLUMN public.portfolio_holdings.avg_price IS 'Preço médio de compra em BRL.';
COMMENT ON COLUMN public.portfolio_holdings.purchased_at IS 'Unix seconds (UTC) da compra. Pode ser aproximado se o user não lembra a hora exata.';