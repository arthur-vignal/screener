# Especificação de gráficos — Screener v2

Documento de referência para implementação dos gráficos de análise de ativos, usando a série histórica dos dados de fundamentals/valuation/técnico já coletados (Yahoo Finance + Finnhub). Cada seção descreve: o que o gráfico mostra, por que é útil, quais campos ele consome, e o tipo de visualização recomendado (Recharts).

Prioridade sugerida de implementação: **P1** (essencial pra tela de detalhe do ativo) → **P3** (nice-to-have).

---

## P1 — Essenciais

### 1. Banda de valuation histórico (P/E, EV/EBITDA, P/S)

**O que mostra:** a evolução do múltiplo de valuation ao longo do tempo (ex: últimos 36 meses), com uma faixa (min–max) do próprio histórico do ativo e a posição atual destacada como percentil.

**Por que importa:** um múltiplo de 15x não diz nada sozinho — mas "P/E está no percentil 20 dos últimos 3 anos" diz se o ativo está caro ou barato *relativo a si mesmo*, o que é mais robusto do que comparar com a média do setor (que muda de composição). É o gráfico com maior poder de decisão do conjunto.

**Campos usados:** `P/E`, `EV/EBITDA`, ou `P/S` histórico (snapshot mensal ou trimestral é suficiente).

**Cálculo adicional:** percentil do valor atual em relação à série (`percentileRank`), min/max/mediana da janela.

**Visualização:** `AreaChart` com faixa sombreada (min-max) + `Line` do valor pontual + `ReferenceDot` no ponto atual, colorido por percentil (verde <30, âmbar 30-70, vermelho >70).

---

### 2. Crescimento (EPS/Sales Y/Y) + margens no mesmo painel

**O que mostra:** crescimento trimestral de EPS e receita (barras) sobreposto às margens (bruta, operacional, líquida) como linhas, no mesmo eixo de tempo.

**Por que importa:** crescimento sem contexto de margem pode ser ilusório — uma empresa pode crescer receita "comprando" market share com margem em queda. Ver os dois juntos mostra se o crescimento é saudável (margem estável/subindo) ou não.

**Campos usados:** `EPS Y/Y TTM`, `Sales Y/Y TTM` (ou por trimestre via `EPS Q/Q`, `Sales Q/Q`), `Gross Margin`, `Oper. Margin`, `Profit Margin`.

**Visualização:** `ComposedChart` com `Bar` (crescimento, eixo Y esquerdo, %) + `Line` (margens, eixo Y direito, %). Dois eixos Y são necessários pois as escalas são diferentes.

---

### 3. Preço com médias móveis + RSI

**O que mostra:** o gráfico técnico clássico — preço com SMA20/50/200 sobrepostas, e um painel auxiliar abaixo com RSI(14) e linhas de referência em 30/70 (sobrevenda/sobrecompra).

**Por que importa:** é o gráfico que todo usuário de screener espera ver primeiro. As médias móveis indicam tendência (cruzamentos de SMA50/200 = golden/death cross), e o RSI sinaliza excesso de compra ou venda de curto prazo.

**Campos usados:** `Price` histórico (série diária), `SMA20`, `SMA50`, `SMA200`, `RSI (14)`.

**Visualização:** `ComposedChart` (preço + SMAs) empilhado com um segundo `ComposedChart` menor (RSI) compartilhando o eixo X. Se possível, sincronizar o `Brush`/zoom entre os dois.

---

## P2 — Alto valor para comparação entre ativos

### 4. Scatter Qualidade vs. Valor (múltiplos ativos)

**O que mostra:** um gráfico de dispersão com P/E (ou EV/EBITDA) no eixo X e ROIC (ou ROE) no eixo Y, com o tamanho da bolha representando o Market Cap. Cada bolha é um ativo da watchlist/carteira do usuário.

**Por que importa:** permite comparar dezenas de ativos de uma vez e identificar rapidamente o quadrante "barato + alta qualidade" (canto inferior-direito: baixo P/E, alto ROIC) — a essência de um screener de value investing. Diferente dos outros gráficos, este **não é uma série temporal**, é um corte transversal (snapshot atual de vários ativos).

**Campos usados:** `P/E`, `ROIC` (ou `ROE`), `Market Cap` — todos como valor atual (não histórico) de cada ativo da lista.

**Visualização:** `ScatterChart` com `ZAxis` para o tamanho da bolha, `ReferenceLine` nas médias (X e Y) para dividir os 4 quadrantes, cor por quadrante.

---

### 5. Régua de performance multi-período

**O que mostra:** barras horizontais mostrando o retorno do ativo em cada janela de tempo — 1 semana, 1 mês, 3 meses, 6 meses, YTD, 1 ano, 3 anos, 5 anos, 10 anos — coloridas por sinal (verde/vermelho).

**Por que importa:** dá uma leitura instantânea de momentum de curto prazo vs. consistência de longo prazo. Um ativo pode estar caindo no mês mas com retorno de 10 anos excelente — esse gráfico mostra os dois ao mesmo tempo, coisa que um único número não faz.

**Campos usados:** `Perf Week`, `Perf Month`, `Perf Quarter`, `Perf Half Y`, `Perf YTD`, `Perf Year`, `Perf 3Y`, `Perf 5Y`, `Perf 10Y`.

**Visualização:** `BarChart` horizontal (`layout="vertical"`), `ReferenceLine` no zero, cor condicional por valor.

---

## P3 — Complementares

### 6. Radar de perfil do ativo

**O que mostra:** um radar/spider chart com 5–6 eixos normalizados (0–100), por exemplo: Valuation, Growth, Quality/Margin, Momentum, Liquidez, Dividend. Cada eixo é um score relativo (percentil dentro do universo de ativos do screener).

**Por que importa:** dá uma "impressão digital" visual do ativo em um único gráfico — útil para comparar rapidamente dois ativos lado a lado (dois radares sobrepostos) sem ler uma tabela de 60 campos.

**Campos usados:** agregação de vários campos por categoria (ex: Valuation = média normalizada de P/E, P/S, EV/EBITDA invertidos; Quality = ROIC, ROE, margens; Momentum = Perf 3M/6M/1Y; etc). Requer lógica de normalização/scoring no backend.

**Visualização:** `RadarChart` do Recharts (`PolarGrid`, `PolarAngleAxis`, `Radar`).

---

### 7. Saúde financeira (alavancagem e liquidez)

**O que mostra:** evolução de `Debt/Eq`, `LT Debt/Eq`, `Current Ratio` e `Quick Ratio` ao longo do tempo.

**Por que importa:** sinaliza se a empresa está se alavancando ou desalavancando, e se mantém capacidade de honrar obrigações de curto prazo. Relevante principalmente em teses de risco/crédito ou setores cíclicos.

**Campos usados:** `Debt/Eq`, `LT Debt/Eq`, `Current Ratio`, `Quick Ratio` (série histórica trimestral).

**Visualização:** `ComposedChart` com dois eixos Y (alavancagem em um lado, liquidez no outro).

---

### 8. Ownership (insiders e institucionais)

**O que mostra:** evolução de `Inst Own` e `Insider Own` ao longo do tempo, com `Insider Trans` e `Inst Trans` (variação recente) destacados.

**Por que importa:** acumulação crescente de institucionais ou compras de insiders costuma ser lida como sinal de confiança; movimento oposto, como alerta.

**Campos usados:** `Insider Own`, `Insider Trans`, `Inst Own`, `Inst Trans`.

**Visualização:** `AreaChart` (ownership % ao longo do tempo) com anotações (`ReferenceDot` ou ícone) nos pontos de transação relevante.

---

### 9. Dividendos: yield vs. payout

**O que mostra:** `Dividend Yield (TTM)` e `Payout` ao longo do tempo, mais `Dividend Gr. 3/5Y` como referência.

**Por que importa:** um yield alto com payout também muito alto (>80–90%) é um sinal de alerta de sustentabilidade do dividendo — o gráfico combinado deixa isso visualmente óbvio.

**Campos usados:** `Dividend Est.`/`Dividend TTM`, `Payout`, `Dividend Gr. 3/5Y`.

**Visualização:** `ComposedChart`, yield como linha, payout como área, com `ReferenceLine` em 80–90% como zona de alerta.

---

## Resumo de priorização

| # | Gráfico | Tipo de dado | Prioridade |
|---|---------|--------------|------------|
| 1 | Banda de valuation histórico | série temporal (1 ativo) | P1 |
| 2 | Crescimento + margens | série temporal (1 ativo) | P1 |
| 3 | Preço + SMA + RSI | série temporal (1 ativo) | P1 |
| 4 | Scatter Qualidade vs. Valor | snapshot (N ativos) | P2 |
| 5 | Régua de performance | snapshot (1 ativo, N períodos) | P2 |
| 6 | Radar de perfil | snapshot normalizado (1-2 ativos) | P3 |
| 7 | Saúde financeira | série temporal (1 ativo) | P3 |
| 8 | Ownership | série temporal (1 ativo) | P3 |
| 9 | Dividendos | série temporal (1 ativo) | P3 |

Os gráficos 1, 2, 3, 7, 8 e 9 pertencem naturalmente à **tela de detalhe do ativo** (uma coluna, empilhados ou em abas). Os gráficos 4 e 5 fazem mais sentido na **tela de watchlist/carteira**, onde o usuário está comparando vários ativos. O gráfico 6 pode aparecer em ambos os contextos.

Todos os componentes de referência (mockups em React/Recharts com dados placeholder) já foram implementados em `components/charts/` — este documento serve como especificação do *porquê* de cada um, para orientar a integração com a série histórica real do banco.
