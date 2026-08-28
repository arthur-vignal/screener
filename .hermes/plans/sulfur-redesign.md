# Sulfur — Redesign visual e arquitetural

**Autor:** Kibo (Kibo CLI)
**Data:** 2026-08-27
**Status:** proposta — aguardando aprovação do Arthur antes de codar
**Escopo:** UI/UX, gráfico, navegação. NÃO mexe em lógica de cálculo, API routes, ou auth.

---

## 0. Princípios e referências

### 0.1 Referência visual nº 1 — prints do Fey UI Kit

Os prints enviados pelo Arthur em 2026-08-27 (overview 1/2/3 + screen analysis/preferences/payments/pricing) são a **referência nº 1** para densidade informacional, hierarquia visual e composição de cards. O Sulfur **NÃO copia o visual** — copia o **nível de riqueza por cm²** e a sobriedade cromática.

**O que extrair dos prints:**
- **Gráfico de preço principal**: linha fina + área com gradient MUITO sutil + grid horizontal quase invisível + eixos com labels muted + tabs de período no canto + toggle BRL/USD + data/hora + estado "Mercado fechado" discreto embaixo
- **Tabs de período**: pills horizontais com item ativo destacado em pill preenchida sutil
- **Cards de listagem de ativos** (cotação): colunas bem definidas (ATIVO / SETOR / 24h / 7D / 30D / VOL / MKT CAP), nome do ticker em bold + nome longo em muted abaixo, separador horizontal fino entre linhas, hover suave
- **Cards de notícia**: avatar/letra colorida do ticker + headline + fonte + timestamp + link externo no canto
- **Header de página**: título bold + ação pill à direita (ex: "ANALYZE")
- **Dock de navegação inferior centralizado** (não sidebar à esquerda), 6 ícones
- **Modal**: X no canto superior esquerdo (não direito), título bold + subtítulo muted
- **Empty state**: ilustração sutil + texto + ação
- **Paywall**: card grande com preço grande, copy curta, CTA pill

### 0.2 Princípios transversais (skills travadas)

Todas as decisões abaixo são **não-negociáveis**. Vindas das skills `sulfur-ui-rules`, `sulfur-chart-theme` e `sulfur-design-hardening`:

| Tema | Regra |
|---|---|
| Radius | escala fechada: md(6) / lg(8) / xl(12) / 2xl(16) / full(apenas avatares circulares). **Proibido** `rounded-[Xpx]` hardcoded |
| Font size | escala fechada: 10 / 11 / 12 / 14 / 16 / 20 / 24 / 32 px. **Proibido** 9.5, 10.5, 11.5, 12.5, 13.5, 13 |
| Spacing | múltiplos de 4 (escala Tailwind padrão) |
| Cores | só tokens semânticos: `--positive` (#4dbe95), `--negative` (#d84f68), `--primary` (#489ffa), `--foreground` (#eeeff1), `--background` (#070709), `--muted-foreground` (#9ba1a8), `--border` (rgba(238,239,241,0.10)). **Proibido** hex inline em componente novo |
| Ícones | só `lucide-react`. **Proibido** emoji, react-icons, heroicons |
| Variações ± | sinal redundante obrigatório (cor + seta + `+`/`−`) |
| Botões | 1 primário (`variant="default"`) por tela no máximo |
| Estados | 3 estados por lista/gráfico: loading skeleton (forma do conteúdo final), empty com explicação + ação, error com retry |
| Charts | `type="monotone"`, stroke 1.5px (linha) / 1.25px (filled), `connectNulls={false}`, gridlines sutis (rgba 0.05), tooltip em `#15151a` |
| Contraste sobre `#101116` | nunca `text-muted-foreground/50`, `/60` ou `/70` para texto crítico. Mínimo `/80` ou `/85` |
| Idioma | "Carteira" (não "portfólio"), "ativo" (não "papel"), sentence case em tudo |
| Drilldowns existentes | `/asset/[symbol]/{about,cashflow,dividends,profitability,return,risk,score,seasonality,valuation,value}` |

---

## 1. Arquitetura de informação

### 1.1 Modelo de navegação (3 camadas)

```
/home                              (raiz do site)
├─ Carteira                        → /portfolio
├─ Lista de cotações (ATIVO|SETOR|24h|7D|30D|VOL|MKT CAP)
└─ Feed de notícias (B3 verificadas)

/asset/[symbol]                    (raiz do ticker — "Quanto custa e como está hoje?")
├─ Gráfico de preço full-width topo
├─ Widgets de preview (1 por grupo estatístico) — clica → drilldown
│   ├─ Valuation: P/L, EV/EBITDA, P/VP, Dividend Yield
│   ├─ Profitability: ROIC, ROE, margem líquida
│   ├─ Risk: Beta, D/E, Current Ratio
│   ├─ Dividends: yield, payout, frequência
│   ├─ Cashflow: FCF, conversão de caixa
│   └─ Score: nota agregada (placeholder até ter modelo)
└─ Lista de métricas detalhadas (table style — igual print /asset do AGRO3)

/asset/[symbol]/<grupo>            (drilldown — "poucos gráficos RICOS")
├─ 3 a 6 gráficos grandes
├─ Explicação textual do que o gráfico mostra
└─ Botão "Todos os dados" → /asset/[symbol]/<grupo>/data

/asset/[symbol]/<grupo>/data       (dados crus + export CSV)
├─ Tabela estilo excel (header sticky, filtros, paginação)
└─ Botão "Exportar CSV"
```

### 1.1.1 Rotas que o site vai ter no final

**Rotas públicas:**
- `/` (landing) — marketing, conversão
- `/login`
- `/home` — dashboard (carteira + cotações + notícias)

**Rotas de ativo:**
- `/asset/[symbol]` — raiz do ticker
- `/asset/[symbol]/about` — sobre a empresa
- `/asset/[symbol]/valuation` — múltiplos + banda P/L
- `/asset/[symbol]/profitability` — ROIC, ROE, margens
- `/asset/[symbol]/risk` — beta, volatilidade, dívida
- `/asset/[symbol]/dividends` — histórico de proventos
- `/asset/[symbol]/cashflow` — FCF, conversão
- `/asset/[symbol]/return` — decomposição do retorno
- `/asset/[symbol]/value` — DVA, stakeholders
- `/asset/[symbol]/seasonality` — padrões mensais
- `/asset/[symbol]/score` — nota agregada
- `/asset/[symbol]/<grupo>/data` — tabela crua + CSV pra cada grupo

**Rotas de portfolio:**
- `/portfolio` — visão geral
- `/portfolio/[id]` — carteira específica
- `/portfolio/[id]/transactions` — aportes/retiradas
- `/portfolio/[id]/performance` — gráfico de evolução

### 1.1.2 Rotas auxiliares
- `/analysis` — **compilado macro + mercado BR** (3 tabs: Economics, Markets, Insider trading — só Economics e Markets no MVP)
- `/screener` — filtro avançado (setor, market cap, múltiplos)
- `/watchlist` — acompanhamento
- `/news` — feed geral de notícias B3
- `/news/[id]` — notícia expandida
- `/compare` — comparação entre 2+ tickers

### 1.1.3 Fontes de dados da rota `/analysis` (MVP)
- **Brapi v2** — Ibovespa, ações B3, `/api/macro/*` (IPCA já existe)
- **BCB API (SGS)** — SELIC meta + over, IPCA completo, câmbio USD/BRL, EUR/BRL, NTN-B real (juro real 5y, 10y, 30y), risco país (CDS), dívida/PIB — **grátis, sem token**
- **NÃO inclui no MVP**: índices internacionais (S&P 500, Dow, DAX), insider trading (CVM)

### 1.2 Dock inferior (6 ícones)

A dock tem **6 ícones por limitação visual** (mais que isso polui). Acesso ao resto é por search global + breadcrumb nas drilldowns.

| Pos | Ícone | Destino | Conteúdo |
|---|---|---|---|
| 1 | Home | `/home` | Dashboard (carteira + cotações + notícias) |
| 2 | Analysis | `/analysis` | Compilado macro + markets BR |
| 3 | Portfolio | `/portfolio` | Carteiras |
| 4 | News | `/news` | Feed de notícias B3 |
| 5 | Notifications | `/notifications` | Alertas (preço, earnings, dividendos) |
| 6 | Search | `/search` | Busca global (ticker, empresa, notícia) |

### 1.3 Regra dos 3 (reforço)

Toda rota nova responde **uma pergunta em uma frase**:
- `/asset/[symbol]/valuation` — "Está caro ou barato?"
- `/asset/[symbol]/profitability` — "Quão lucrativa é?"
- `/asset/[symbol]/risk` — "Quão volátil e arriscada é?"
- `/asset/[symbol]/dividends` — "Paga dividendos? Quanto?"
- `/asset/[symbol]/cashflow` — "Gera caixa de verdade?"
- `/asset/[symbol]/seasonality` — "Tem padrão sazonal?"
- `/asset/[symbol]/return` — "De onde vem o retorno?"
- `/asset/[symbol]/value` — "Quem fica com o valor gerado?"
- `/asset/[symbol]/score` — "Qual a nota agregada?"
- `/asset/[symbol]/about` — "O que essa empresa faz?"

---

## 2. Mapa de páginas — wireframe textual

### 2.1 `/home` (3 colunas)

**Coluna esquerda (~280px, sticky):**
- Card "Boa noite, Arthur — seu portfólio valorizou +0,00% hoje" (hero do portfolio)
- Sub-card "Você ainda não tem um portfólio" com CTA "Criar portfólio"
- CTA "Acessar portfólio" (variant outline, full-width)
- Card "Data do dia" + "Status Invest" com headline da notícia do dia

**Coluna central (flex, principal):**
- Header: "Cotações oficiais" + search box + toggle "Ações | FIIs | ETFs | BDRs" (filter chips)
- Tabela de ativos:
  - Colunas: ATIVO / SETOR / 24h / 7D / 30D / VOL / MKT CAP
  - Linha: TICKER (bold, clicável) + nome longo muted abaixo + setor + 3 variações coloridas com seta + volume + market cap
  - Hover: bg `[rgba(255,255,255,0.02)]`
  - Linhas com dados faltantes: muted, sem sinal
- Status bar inferior: "Mercado fechado · 20:54" + data

**Coluna direita (~340px, scroll independente):**
- Header "Notícias da B3 de portais verificados"
- Lista vertical de cards de notícia:
  - Avatar circular colorido com inicial do ticker
  - Headline (14px, 2 linhas max truncate)
  - SOURCE • timestamp (muted, 11px)
  - Link externo (ícone sutil no canto)

**Dock inferior centralizado** (fixed, 6 ícones) — ver §1.2:
- Home / Analysis / Portfolio / News / Notifications / Search
- Item ativo: pill com `bg-white/[0.04] border border-white/10`
- Ícone + texto em muted, ativo em foreground

### 2.2 `/asset/[symbol]` (raiz do ticker)

**Header:**
- Voltar (ChevronLeft em pill circular, canto esquerdo)
- Logo circular ticker + TICKER (bold 32px) + nome longo muted abaixo
- Toggle BRL/USD (pílula canto superior direito)
- Botão "ANALYZE" (variant default, único primário da tela)

**Gráfico de preço full-width:**
- Tabs de período (1D | 7D | 30D | 1Y | Max)
- Linha `monotone` com gradient embaixo (fill `rgba(255,255,255,0.06) → 0`)
- Grid horizontal sutil
- Eixo Y à direita com labels em `axisTick`
- Eixo X com datas sob ticks (muted)
- Tooltip rico: data + preço + variação do dia + volume no candle
- Estado vazio: "Mercado fechado" discreto + última cotação conhecida
- Spinner substituído por skeleton da forma do gráfico

**Bloco de widgets de preview** (4 colunas em grid, 1 linha):
- Cada widget = card com:
  - Eyebrow uppercase 11px muted ("VALUATION")
  - Label + valor + delta (ex: "P/L · 4.1x · −1.2σ")
  - Mini-gráfico (sparkline ou barra) à direita
  - Cursor pointer + hover sutil
- Layout:
  ```
  [P/L] [EV/EBITDA] [P/VP] [Dividend Yield]
  [ROIC] [ROE]     [ROA] [Margem Líquida]
  [Beta] [D/E]     [Vol] [Current Ratio]
  [Yield] [Payout] [Freq] [Último Provento]
  ```
  Cada widget clicável → drilldown correspondente.

**Tabela de métricas detalhadas** (igual print do AGRO3):
- Header sticky com search box + toggle "BRL/USD vs Percent"
- Linhas agrupadas por categoria (VALUATION, RENTABILIDADE, ENDIVIDAMENTO, LIQUIDEZ, etc)
- Coluna METRICA + coluna valor + coluna delta
- Linhas expansíveis (caret à direita) com sparkline + min/max/período

### 2.3 `/asset/[symbol]/<grupo>` (drilldown)

**Header padrão** (reutiliza `AssetSubheader` com botão de voltar à esquerda).

**Título da página** (24px, bold) + pergunta-resposta em uma frase:
> "Está caro ou barato?"
> Comparação de múltiplos atuais contra a média histórica e o setor.

**Grid de gráficos** (3 colunas em desktop, 2 em tablet, 1 em mobile):
- Cada card `rounded-xl bg-[#101116] border border-white/10 p-4`
- Header do card: título 12px uppercase tracking-wide + stats inline (μ, σ, atual) à direita
- Gráfico: `h-[280px]` Recharts
- Footer do card: explicação textual curta (1-2 linhas, 12px muted)

**Botão "Todos os dados"** (variant outline, canto inferior direito do último card):
- Leva para `/asset/[symbol]/<grupo>/data`

**Lista de gráficos por drilldown** (proposta inicial):

#### `/valuation`
1. **Banda P/L** — linha + média + ±1σ/±2σ, lacunas hachuradas em anos negativos
2. **P/L trailing vs CAPE deflacionado** — duas linhas, gap destacado
3. **EV/EBITDA vs setor** — scatter com quadrantes (caro/barato × boa/ruim qualidade)
4. **Earnings yield vs NTN-B real** — duas linhas (yield real da ação vs juro real título), com banda de "prêmio"
5. **P/VP vs ROIC** — scatter (qualidade × preço)
6. **Histórico de dividendos pagos** — bar chart, agrupado por ano

#### `/profitability`
1. **ROIC vs WACC** — duas linhas, com banda de "destruição de valor"
2. **Decomposição DuPont** — stacked area: margem líquida × giro × alavancagem
3. **Margens ao longo do tempo** — multi-line (bruta, operacional, líquida)
4. **ROE vs ROA vs ROIC** — 3 linhas, gap entre ROE e ROIC revela alavancagem

#### `/risk`
1. **Beta rolling 12 meses** — line chart
2. **Volatilidade realizada** — área chart (30d, 60d, 90d)
3. **Drawdown histórico** — área chart negativa
4. **Dívida/EBITDA e Dívida/PL** — multi-line
5. **Cobertura de juros** — line chart com threshold em 1.5x destacado

#### `/dividends`
1. **Histórico de proventos** — bar chart por data, agrupado por tipo (dividendo, JCP, etc)
2. **Dividend yield 12m rolling** — line chart
3. **Payout ratio** — line chart com banda saudável (30-60%)
4. **Yield on cost vs yield atual** — 2 linhas

#### `/cashflow`
1. **FCF e conversão de caixa** — bar chart (FCF) + line (FCF/EBITDA %)
2. **CAPEX vs D&A** — multi-line (CAPEX cor negativa, D&A cor primária)
3. **Working capital** — stacked bar (recebíveis, estoques, fornecedores)

#### `/seasonality`
1. **Retorno médio por mês** — bar chart 12 barras
2. **Heatmap ano × mês** — performance mensal color-coded
3. **Distribuição de retornos mensais** — histograma

#### `/return`
1. **Decomposição do retorno** — waterfall: dividend yield + variação preço + variação múltiplo
2. **Retorno total vs Ibovespa** — 2 linhas, gap colorido
3. **CAGR vs volatilidade** — scatter (todos ativos)

#### `/value` (DVA — quem fica com o valor gerado)
1. **Distribuição do valor adicionado** — donut: governo, funcionários, financiadores, reinvestimento, acionistas
2. **Evolução dos stakeholders** — stacked area ao longo do tempo

#### `/score`
1. **Radar de notas** — radar chart 6 eixos (valuation, profitability, risk, dividends, growth, momentum)
2. **Score ao longo do tempo** — line chart

### 2.4 `/analysis`

**Header:**
- Logo + título "Analysis" à esquerda (mesmo padrão do /asset/[symbol])
- Segmented control canto direito: `Economics | Markets` (Markets ativo por padrão — pill filled)
- Sem botão primário (a página é informativa, não tem CTA principal)

**Tab Economics (indicadores macro BR):**
- Card topo full-width: "Indicadores principais" — grid 4×2 de KPI tiles
  - SELIC meta | SELIC over | IPCA 12m | Câmbio USD/BRL
  - IGP-M | NTN-B 5y real | NTN-B 10y real | Risco país (CDS 5y)
- Card "Curva DI futura" full-width: line chart multi-série (1y, 2y, 5y, 10y) com tabs de período (1M | 3M | 6M | 1Y | 5Y)
- Card "Spread 2y vs 10y" (igual print Fey): line chart com gradient verde acima do zero + vermelho abaixo, tabs Spread/Volatility, sub-tabs 5Y/10Y/All, legenda "Current +0.23% · Avg +0.18%"
- Card "Histórico SELIC meta vs IPCA": 2 linhas, banda neutra entre elas, explica ganho/perda real
- Card "Histórico USD/BRL": line chart com tabs (1M | 3M | 6M | 1Y | 5Y | Max)

**Tab Markets (mercado BR):**
- **Faixa topo** (2 colunas):
  - Card 1 — "Top indices YTD": lista de 5 índices (logo circular do índice + ticker + país muted + variação YTD + delta + pill tag "Volatile"/"Stable"). Sem gráfico. **Critério da pill: β vs IBOV > 1.2 = Volatile, senão Stable**. Ações B3 entram como índice complementar ("Ibovespa Brasil")
  - Card 2 — "Spread 2y vs 10y" (mesmo do Economics, mas versão mais curta sem tabs Spread/Volatility)
- **Faixa "Mercado BR"** (lista agrupada por tipo — sem emoji, logo do índice):
  - Header sticky com agrupamento: Ações | FIIs | ETFs | BDRs (tabelas separadas, não mistura)
  - Colunas: logo do ativo + nome/bandeira | YTD Return (pill colorido) | P/L | Div yield | Mkt cap | Volume | sparkline 2-day | Preço | Daily performance (pill)
  - Linhas com hover sutil
  - Tabela densa, divider sutil entre linhas
  - Logo circular via `<IndexLogo>` (SVG/PNG do índice) com fallback pra letra — **NUNCA emoji**

**Estados:**
- Loading: skeleton com forma da tabela (linhas com altura de YTD + nome + sparkline)
- Empty: "Sem dados macro disponíveis" + CTA "Recarregar"
- Error: mensagem específica + retry

### 2.5 `/asset/[symbol]/<grupo>/data`

- Header com nome do grupo + ticker + contagem de linhas
- Search box (filtro por métrica)
- Toggle "BRL/USD vs Percent vs Múltiplo"
- Tabela estilo excel:
  - Header sticky com filtros por coluna
  - Linhas com zebra NONE, divider `border-border/40`
  - Numéricos à direita, `tabular-nums`
  - Truncate nome em 200px
- Botão "Exportar CSV" (variant outline) canto superior direito

---

## 3. Sistema visual — referência cruzada com prints Fey

### 3.1 Tipografia

```
display    32px bold     → preço do ativo na raiz
title      24px bold     → título de drilldown
subtitle   20px medium   → subtítulo de seção
body       14px regular  → texto padrão
small      12px regular  → body secundário, valor de métrica
label      11px regular  → eyebrow uppercase tracking-wide
eyebrow    10px uppercase tracking-[0.18em] muted
```

### 3.2 Cores

```css
--background:    #070709
--surface:       #101116   /* cards de chart */
--surface-2:     #15151a   /* cards elevados, tooltip */
--foreground:    #eeeff1
--muted:         #9ba1a8   /* texto secundário */
--muted-strong:  rgba(155,161,168,0.85)   /* labels críticos */
--positive:      #4dbe95
--negative:      #d84f68
--primary:       #489ffa   /* ação primária, accent em gráficos */
--border:        rgba(238,239,241,0.10)
```

**Identidade Sulfur** (não-Fey):
- Linha de preço principal: `var(--foreground)` (off-white)
- Acentos: `var(--primary)` (azul #489ffa) — **diferente** do Fey (que usa laranja)
- Positivo/Negativo: mesmo verde/vermelho muted (compatível com daltonismo)
- Sem laranja (reservado para alertas de "dado pendente")

### 3.3 Componentes

#### Cards
- `rounded-xl` (12px) para cards de chart
- `rounded-2xl` (16px) para containers principais
- `bg-[#101116]` surface / `bg-[#15151a]` elevated
- `border border-white/10`
- Padding `p-4` (16px) para charts, `p-5` (20px) para cards principais

#### Botões
- Primário: `bg-[var(--primary)] text-white rounded-md px-4 h-9`
- Secundário: `bg-white/[0.04] border border-white/10 text-foreground rounded-md`
- Ghost: `text-muted-foreground hover:bg-white/[0.04] rounded-md`
- Pills de filtro: `rounded-md px-3 py-1 text-[12px]` (não `rounded-full` exceto avatares)

#### Tabs de período
- Container: `inline-flex bg-white/[0.02] rounded-md p-0.5 border border-white/10`
- Item: `px-3 py-1 rounded text-[12px] text-muted-foreground`
- Ativo: `bg-white/[0.06] text-foreground`

#### Lista de cotações (células numéricas)
- ATIVO bold + nome muted abaixo (12px)
- Variações: cor + seta + sinal
- Separador horizontal `border-border/40` entre linhas
- Hover: `bg-white/[0.02]`

#### Card de notícia
- Avatar circular com inicial do ticker (cor de brand)
- Headline 14px, 2 linhas max truncate
- `SOURCE • timestamp` em 11px muted
- Link externo no canto (ícone sutil)

#### Dock inferior
- Container: `fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#101116]/95 backdrop-blur border border-white/10 rounded-2xl px-2 py-1.5`
- Item: `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-muted-foreground`
- Ativo: `bg-white/[0.04] text-foreground`

### 3.4 Estados de chart (3 obrigatórios)

#### Loading
- Skeleton com a forma do gráfico: `bg-white/[0.02] rounded-xl animate-pulse` com altura igual ao chart final
- Header do card também skeletonizado (linhas com altura de label)

#### Empty
```
[Ícone discreto]
Sem dados de [métrica] para este ativo.
[Possível causa: empresa sem política de proventos / IPO recente]
```

#### Error
```
Falha ao carregar [métrica].
[Tente recarregar. Se persistir, o dado pode não estar disponível na Brapi.]
[Botão outline: Recarregar]
```

#### Diferenciação
- **Sem dado do período**: empty (ex: histórico curto demais)
- **Erro de API**: error com retry
- **Zero real**: empty com explicação específica ("ITSA4 não paga dividendos desde 2018")

---

## 4. Padrão de widget de preview (drilldown root → drilldown page)

Cada widget em `/asset/[symbol]` segue o mesmo template:

```tsx
<Link href={`/asset/${symbol}/${grupo}`} className="block group">
  <div className="rounded-xl bg-[#101116] border border-white/10 p-4
                  transition-colors hover:border-white/20">
    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {grupoEyebrow}
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-foreground">
          {label}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[20px] font-semibold tabular-nums text-foreground">
            {valor}
          </span>
          {delta != null && (
            <Delta value={delta} /> {/* seta + cor + sinal */}
          )}
        </div>
      </div>
      <Sparkline data={sparklineData} positive={delta >= 0} />
    </div>
  </div>
</Link>
```

**Hover**: `border-white/20` + cursor pointer (Link cuida do resto).

---

## 5. Roteiro de implementação (em fases)

### Fase 1 — Fundação visual (1-2 sessões)
- [ ] Criar tokens em `app/globals.css` se faltarem
- [ ] Reutilizar `lib/chart-theme.ts` (já existe)
- [ ] Audit de cores hex inline remanescentes em componentes novos (lista negra tem 47)
- [ ] Criar `<DashboardDock>` (dock inferior centralizado)
- [ ] Criar `<PreviewWidget>` (template da seção 4)
- [ ] Criar `<PeriodTabs>` (componente de tabs de período reutilizável)
- [ ] Criar `<BrandLetter>` (avatar circular de ticker com cor de brand)
- [ ] Criar `<MetricRow>` (linha da tabela de métricas do AGRO3)

### Fase 2 — `/home` (1-2 sessões)
- [ ] Layout 3 colunas (sticky left, central, scroll independente right)
- [ ] Tabela de cotações com colunas estilo Fey
- [ ] Card "Boa noite, Arthur" do portfolio (com skeleton se vazio)
- [ ] Feed de notícias com `<BrandLetter>` + headline + source
- [ ] Status bar inferior "Mercado fechado · HH:MM"
- [ ] Dock inferior (6 ícones)

### Fase 3 — `/asset/[symbol]` raiz (1-2 sessões)
- [ ] Header com toggle BRL/USD + botão ANALYZE
- [ ] Gráfico de preço full-width com tabs de período + skeleton
- [ ] Grid 4 colunas de `<PreviewWidget>` agrupados por categoria
- [ ] Tabela detalhada (estilo print AGRO3) com header sticky + search + toggle BRL/%
- [ ] Sparklines nos widgets

### Fase 4 — Drilldowns ricos (1 sessão por grupo)
- [ ] `/valuation` (já tem base, refinar com 6 gráficos)
- [ ] `/profitability`
- [ ] `/risk`
- [ ] `/dividends`
- [ ] `/cashflow`
- [ ] `/return`
- [ ] `/value` (DVA)
- [ ] `/seasonality`
- [ ] `/score`

### Fase 5 — `/analysis` (1-2 sessões)
- [ ] Endpoint `/api/macro/selic`, `/api/macro/ipca` (já existe), `/api/macro/cambio`, `/api/macro/ntnb`, `/api/macro/risco-pais` consumindo BCB SGS
- [ ] Endpoint `/api/analysis/indices-br` com 5 principais índices + IBOV (curva de ytd + pill Volatile/Stable baseado em volatilidade)
- [ ] Endpoint `/api/analysis/markets-br` agrupado por Ações/FIIs/ETFs/BDRs
- [ ] Componente `<SegmentedControl>` (Economics | Markets) reutilizável
- [ ] Página `/analysis` com header + segmented + tabs (2 implementados, Insider trading fica como "Em breve")
- [ ] Tab Economics: 4 KPI tiles + 3 gráficos (curva DI, spread 2y/10y, SELIC vs IPCA, USD/BRL)
- [ ] Tab Markets: 2 cards topo (top indices YTD + spread) + tabela agrupada

### Fase 6 — Páginas de dados crus (1 sessão)
- [ ] Componente `<DataTable>` reutilizável (header sticky + search + filtros)
- [ ] Página `/asset/[symbol]/<grupo>/data` para cada grupo
- [ ] Botão "Exportar CSV" usando `lib/export-csv.ts`

---

## 6. Não-objetivos (fora deste redesign)

- Lógica de cálculo de métricas (`lib/analytics/`)
- API routes (`app/api/`)
- Auth, schema de DB
- Refatoração da lista negra de cores hex inline (47 ocorrências)
- Remoção do `aurora-background` da landing (leva dedicada)
- Substituição de spinners "Carregando…" por skeleton (leva dedicada)

---

## 7. Critérios de aceite

Antes de cada PR:
- [ ] Todos os componentes novos usam tokens semânticos (zero hex inline)
- [ ] Radius da escala fechada (md/lg/xl/2xl/full apenas)
- [ ] Font size da escala fechada
- [ ] 3 estados por lista/gráfico (loading skeleton / empty / error)
- [ ] Variações ± com sinal redundante
- [ ] 1 botão primário por tela no máximo
- [ ] Lucide como única lib de ícones
- [ ] Sentence case, "Carteira" (não "portfólio"), "ativo" (não "papel")
- [ ] Contraste mínimo WCAG AA em texto crítico
- [ ] Tabular-nums em colunas numéricas
- [ ] Header sticky em tabelas longas

---

## 8. Próximo passo

**Aprovação do Arthur** → começar pela **Fase 1** (fundação visual). Cada fase gera 1 PR com commit message semântico (`feat(foundation): ...`, `feat(home): ...`, `feat(asset-root): ...`, `feat(drilldown-valuation): ...`, `feat(analysis): ...`).

Ordem sugerida das fases: **1 → 2 → 3 → 5 → 4 → 6** (analysis antes dos drilldowns porque consome muitos componentes da Fase 1).

Railway auto-deploya a cada push na `main`.
