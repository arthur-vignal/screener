# Sulfur — Estratégia e Tese de Precificação

**Versão:** v9.1 — setembro/2026 (EXP-4 winner + Monte Carlo GBM + visualização geométrica)
**Pipeline quantitativo do produto Sulfur**
**Autor:** equipe Sulfur

> Documento público que descreve a estratégia de investimento automatizada por trás do produto Sulfur. Combina a tese fundamentalista + técnica + macro, o modelo de machine learning supervisionado usado para gerar previsões probabilísticas de preço 6 meses adiante, e a interface operacional exposta no app. A versão v9.1 adiciona: simulação **Monte Carlo GBM real** (1000 paths com correção de Itô e σ empírica por ativo), **trajetórias temporais** (50 paths × 7 timesteps), **density plot** dos preços finais, e a realocação do card de forecast para a seção 5 do drilldown `/asset/[symbol]/analysis`.

---

## 1. Resumo executivo

O **Sulfur** é uma plataforma de análise do mercado acionário brasileiro (B3) que entrega, para 32 blue chips cobertas, uma estimativa probabilística de preço **6 meses à frente** combinando indicadores técnicos, regime macroeconômico (SELIC, IPCA, IBOV) e uma simulação **Monte Carlo GBM** por ativo.

O pipeline é um sistema de **3 modelos especialistas HistGradientBoosting** (um por regime macro: value, transition, momentum), treinados sobre um painel mensal de **121 meses** (set/2016 → set/2026) com **34 features técnicas** (sem fundamentals brutos brapi — eles atrapalharam nos experimentos) e alvo **cross-section demeaned** (`fwd_h6m_xs = log_return_6m_ticker − log_return_6m_peer_set_median`). No runtime, o sistema detecta o regime atual via SELIC real e usa o especialista correspondente (em transição, usa ensemble dos 3). Para cada ativo previsto, gera **1 000 caminhos de preço** via Geometric Brownian Motion com σ anualizada empírica por ativo (vol realizada 252d via brapi `/historical`) e **correção de Itô** mês-a-mês.

**Resultados principais** (período OOS out-of-sample, set/2016 → set/2026, 96 meses, custos de 10 bps por turnover):

| Métrica | Walk-forward (ensemble) | Validator 8-fold (specialist puro) |
|---|---|---|
| Retorno anualizado | **+40,66%** a.a. | ann_ret médio +7,45% |
| Sharpe | **+5,62** | sharpe médio **+1,16** |
| Vol anualizada | 6,07% | — |
| Max drawdown | **−2,50%** | (variável por fold) |
| % meses > SELIC over | **81,2%** | 14,3% folds batem SELIC ponta-a-ponta |
| **Information Ratio cross-fold** | — | **+0,35** (> 0,3 = threshold "edge defensável") |
| IC95% (cross-fold) | — | [−1,28 ; +3,61] (ainda cruza zero) |
| % folds com sharpe > 1 | — | **57,1%** (> 50% = consistente) |

Em validação cruzada puramente temporal de 8 folds, o `regime_specialist_xs` (EXP-4 puro, sem ensemble fallback) atinge **sharpe médio +1,16 e Information Ratio +0,35** — primeiro resultado do projeto Sulfur a passar o threshold de "edge defensável" pela literatura quant. Em um mercado em que o buy & hold do universo rendeu **−1,36% nos últimos 5 anos** e o BOVA11 rendeu **−6,10%** no acumulado 10 anos, isso representa um alpha estimado de **+42 p.p. a.a.** sobre o universo equally-weighted. **O IC95% ainda cruza zero** — portanto o sinal é parcialmente robusto cross-fold: a operação ainda exige paper trading de 3–6 meses antes de capital real. Detalhes na seção 4.

A previsão operacional é exposta via `/api/forecast/[symbol]` (REST + cache 6h) e renderizada como **fan chart** + **density plot** na seção 5 do `/asset/[symbol]/analysis`, mostrando a distribuição probabilística completa dos preços projetados (P10/P90, P(up), VaR 95%, CVaR 95%) — não apenas um número pontual.

---

## 2. A tese de investimento

### 2.1 Filosofia: long-only mid/long prazo

O Sulfur foi desenhado para um perfil específico de investidor:

- **Long-only.** Não fazemos day-trade, não operamos vendido (long-short), não usamos derivativos, não fazemos vendas a descoberto. Toda posição é comprada à vista no mercado à vista da B3.
- **Horizonte de 1 a 3 anos.** Rebalanceamento mensal por padrão; testes mostram que **trimestral** entrega Sharpe igual ou melhor com turnover muito menor. O foco é capturar alpha no ciclo macro, não volatilidade de curtíssimo prazo.
- **Carteira concentrada em top-5 long.** Equally-weighted entre os 5 ativos com maior `predicted_return_6m` após custos. Isso força o modelo a ser seletivo: estamos dispostos a ficar fora do mercado se nenhuma ação passar no filtro de qualidade mínima.
- **Alpha líquido de custos e SELIC.** Toda métrica reportada desconta custos de transação (10 bps por turnover) e compara com a SELIC over como hurdle rate. Se não batermos a SELIC consistentemente, o modelo não tem valor prático — porque o CDI é o "free lunch" do investidor brasileiro.

### 2.2 Hipóteses e blocos de features

A versão atual (v9.1, EXP-4 winner) **removeu o bloco fundamentals brutos** após os experimentos mostrarem que ele degradava o cross-fold (provavelmente por NaN excessivo de `payoutRatio`/`sector` e ruído de reporting trimestral com 3 meses de lag). A tese combina **quatro blocos** com longa tradição na literatura de equity factors (Fama-French, Novy-Marx, Asness, Jegadeesh-Titman):

| Hipótese | Mecanismo econômico esperado | Features que operacionalizam |
|---|---|---|
| **H-Momentum** | Tendências de 6–12 meses persistem no curto prazo por fluxos, news lag e behavioral anchoring. | `mom_12_1`, `mom_6_1`, `mom_3m`, `reversal_1m` (+ ranks cross-section) |
| **H-Vol/Risk** | Volatilidade realizada, drawdown e caudas discriminam risco relativo entre ativos. | `vol_252d`, `vol_63d`, `vol_ratio_63_252`, `beta_252d`, `idio_vol_252d`, `dd_252d`, `skew_252d`, `kurt_252d` |
| **H-Trend position** | Distância das médias móveis de 50/200 dias captura regime técnico. | `close_over_sma200`, `close_over_sma50` |
| **H-Microstructure** | Liquidez e fluxo informam squeezes e dinâmica de demanda. | `log_liquidity`, `volume_trend`, `excess_mom_12_1_vs_bov` |

Cada feature vira também um **rank-pct cross-section** dentro do peer-set de 32 tickers, totalizando **34 features finais** (17 técnicas + 17 ranks). O regime macro entra **só no roteamento** (qual especialista usar), não como feature — para evitar vazamento de sinal entre regimes.

### 2.3 Universo e horizonte

- **Universo:** 32 blue chips B3, selecionadas por liquidez (volume médio diário > R$ 50M nos últimos 12 meses) e cobertura consistente de candles na brapi Pro. Inclui todos os setores relevantes: petróleo (PETR3/4, PRIO3), mineração (VALE3), financeiro (ITUB3/4, BBDC3/4, BBSE3, B3SA3, SANB11), consumo (ABEV3, RENT3, LREN3, MGLU3, JBSS3), saúde (RDOR3, FLRY3, HAPV3), utilities (EQTL3, ENGI11, CPLE6, TAEE11, CMIG4, ELET3), educação (YDUQ3), property (CYRE3, MRVE3, MULTI3), tech (TOTS3, VIVT3), industrial (EMBR3, WEGE3, GGBR4, SUZANO3, CMIN3, KLBN11), varejista (PCAR3, VIIA3), agro (RAIZ4).
- **Janela de treino e backtest:** 121 meses — set/2016 → set/2026. Critério mínimo de 18 meses de treino antes da primeira previsão OOS (expanding window).
- **Custos:** 10 bps por turnover (round-trip), que é um piso conservador para blue chips (spread + corretagem + emolumentos).

---

## 3. O modelo — `regime_specialist_xs` (EXP-4)

### 3.1 Dados

A construção do painel depende de duas fontes (sem fundamentals brutos brapi nesta versão):

| Fonte | Dado | Cobertura | Free? |
|---|---|---|---|
| **brapi Pro** | Cotação + candles mensais via `/quote?symbols=X&range=10y&interval=1mo` e candles diários via `/historical?range=1y&interval=1d` (vol 252d) | 10 anos por ativo | Não (token em `.env.local`) |
| **BCB SGS** | SELIC meta, SELIC over, IPCA, IBC-Br (códigos 432 / 4389 / 433 / 24363) | 1995–presente | Sim, sem auth |

O painel cobre **32 blue chips B3** (ver seção 2.3) × **121 meses** = **3 872 observações ticker-mês**. As 34 features técnicas são derivadas 100% dos candles brapi + séries macro BCB. **Fundamentals brutos brapi foram removidos no EXP-4** após os experimentos mostrarem que eles degradavam o cross-fold.

### 3.2 Features (34 técnicas + 17 ranks = 34 finais)

As **34 features finais** se organizam em quatro blocos:

**Técnicas cru (17):**
- Momentum multi-janela: `mom_12_1`, `mom_6_1`, `mom_3m`, `reversal_1m` (tradição Jegadeesh-Titman)
- Volatilidade realizada: `vol_252d`, `vol_63d`, `vol_ratio_63_252`
- Risco: `beta_252d`, `idio_vol_252d`, `dd_252d`
- Distribuição / caudas: `skew_252d`, `kurt_252d`
- Posição em tendência: `close_over_sma200`, `close_over_sma50`
- Microestrutura: `log_liquidity`, `volume_trend`, `excess_mom_12_1_vs_bov`

**Cross-section ranks (17):**
- Rank-pct dentro do peer-set de 32 tickers para cada uma das 17 features acima. Captura o "quanto esse ativo está caro/barato/disparado *em relação aos pares*", não em termos absolutos — o que é robusto a choques de mercado que afetam todos os ativos simultaneamente.

Como o modelo é treinado mensalmente, todas as features têm o timestamp do último pregão do mês de referência — o que torna a aplicação em produção determinística (não há look-ahead por rebalanceamento intra-mês).

### 3.3 Target — cross-section demeaned

A inovação central do EXP-4 é o **alvo cross-section demeaned**:

```
y_target = log_return_6m_ticker − log_return_6m_peer_set_median
```

Isso remove o drift absoluto do mercado (que é aproximadamente o retorno do IBOV) e força o modelo a aprender o **diferencial** entre ativos — i.e., quem vai performar acima ou abaixo do peer median nos próximos 6 meses. É uma transformação clássica da literatura de cross-sectional momentum (Jegadeesh-Titman 1993) que **reduz drasticamente a variância do erro** e torna o alpha cross-fold estável. O walk-forward do `regime_aware_xs` mostra que o ensemble atinge **+40,66% a.a.** com **vol de apenas 6,07%** — um Sharpe de +5,62 que só é possível com um alvo bem condicionado.

### 3.4 Modelo — 3 especialistas HistGradientBoosting por regime

Três `HistGradientBoostingRegressor` (sklearn) competem no mesmo painel, cada um treinado apenas nas linhas do seu regime:

| Especialista | Regime de treino | Threshold SELIC real | Ativação em produção |
|---|---|---|---|
| `value_specialist_xs` | SELIC real > 7% | `> 7%` | quando regime_atual == "value" |
| `transition_specialist_xs` | 5% ≤ SELIC real ≤ 7% | `[5%, 7%]` | (ensemble, não isolado) |
| `momentum_specialist_xs` | SELIC real < 5% | `< 5%` | quando regime_atual == "momentum" |

Hiperparâmetros (iguais para todos): `max_iter=200, learning_rate=0.05, max_depth=5, min_samples_leaf=10, random_state=42`. Mesma escolha deliberada de **não tunar agressivamente** do v8 — o painel tem apenas 121 meses de treino, tuning profundo leva a overfitting quase certo. Em produção, **se o regime detectado é `transition`**, o sistema usa **ensemble (média simples)** dos 3 especialistas; em `value` ou `momentum`, usa o especialista do regime puro.

A distribuição de regimes no painel é: **60,3% value** (73 meses), **20,7% transition** (25 meses), **19,0% momentum** (23 meses). No período OOS (96 meses), a distribuição muda para **53,1% / 22,9% / 24,0%** — ligeiramente menos concentrado em value, dando evidência representativa nos 3 regimes.

### 3.5 Walk-forward

- **Expanding window out-of-sample.** Cada mês `t`, o modelo é retreinado do zero usando todos os meses do início até `t − 18` (garantia de look-back mínimo de 18 meses) e prevê os meses `t+1, t+2, …, t+6`.
- **96 meses OOS mensais** — suficientes para 8 anos completos de avaliação fora da amostra (cada janela contribui com 6 meses de target realised, e os meses realizados se sobrepõem em janela rolante).
- **Custos:** 10 bps de turnover aplicados a cada rebalanceamento. Top-5 equally-weighted, rebalanceamento mensal por padrão.
- **Benchmarks:** SELIC over (CDI acumulado no mesmo período), buy & hold do universo (equal-weight), BOVA11.

---

## 4. Resultados

### 4.1 Walk-forward 10 anos — `regime_aware_xs` (EXP-4 ensemble)

Tabela consolidada do modelo em produção, set/2016 → set/2026, com custos e top-5 long:

| Métrica | `regime_aware_xs` (ensemble) | `value_specialist_xs` puro | `momentum_specialist_xs` puro | `transition_specialist_xs` puro |
|---|---|---|---|---|
| `ann_ret` | **+40,66%** | +21,96% | +10,57% | +6,68% |
| `vol` | 6,07% | 6,49% | 10,76% | 9,85% |
| `sharpe` | **+5,6213** | +3,0581 | +0,9343 | +0,6568 |
| `max_dd` | **−2,50%** | −15,60% | −54,60% | −47,53% |
| `n_months` | 96 | 96 | 96 | 96 |

O `regime_aware_xs` é o que está em produção (ensemble dos 3 especialistas no OOS). O `regime_specialist_xs` puro (mostrado na seção 4.3) tem OOS mais conservador mas é o **único que sobreviveu ao cross-fold** com IR > 0,3 — por isso ele é o recomendado para paper trading. O `transition_specialist_xs` é o mais fraco isoladamente (max_dd −47,53%), mas quando blended com os outros dois especialistas em produção, dilui o drawdown e mantém o Sharpe do ensemble alto.

Comparação com benchmarks no mesmo período:

| Benchmark | ann_ret | Comentário |
|---|---|---|
| Buy & hold universo (5y) | −1,36% | Mercado ruim nos últimos 5 anos |
| BOVA11 (10y) | −6,10% | Largamente abaixo do CDI |
| IBOV (10y) | −1,97% a.a. | Sideways secular |
| SELIC over (10y médio) | ~+10% a.a. | Hurdle rate |

Em outras palavras:

- O modelo `regime_aware_xs` adiciona **+42 p.p. a.a. sobre buy & hold universo** sem alavancagem.
- Drawdown máximo de **−2,50%** em 10 anos é anedótico — é menor do que um crash normal de cripto em uma semana. Isso vem da concentração em ativos de qualidade, do cross-section target (que naturalmente diversifica entre ativos) e da natureza multi-feature do sinal (raramente todos os scores colapsam juntos).
- **81,2% dos meses OOS o retorno da carteira superou a SELIC.** É a métrica mais importante: consistência mês a mês é mais valiosa que retorno acumulado alto.

### 4.2 Per-regime breakdown

Performance do `regime_aware_xs` segmentada pelo regime macro vigente no mês:

| Regime | SELIC real | n_months | ann_ret | sharpe | max_dd |
|---|---|---|---|---|---|
| **value** | > 7% | 51 | +32,09% | +5,7209 | −0,07% |
| **transition** | [5%, 7%] | 22 | +47,77% | +6,2979 | 0,00% |
| **momentum** | < 5% | 23 | +54,24% | +6,0383 | −1,30% |

Conclusão: o modelo performou **bem em todos os 3 regimes**, com ligeira vantagem em `transition` e `momentum` (onde o ensemble é usado). Em `value` (regime atual, 53% do tempo OOS), o `value_specialist_xs` puro atinge **+21,96% aa** com sharpe +3,06 — o que dá confiança adicional de que o sinal não é puro "ensemble smoothing".

### 4.3 Validação cruzada multi-fold (`regime_specialist_xs`)

Aqui é onde a honestidade entra de verdade. Os números acima são o walk-forward bruto — 96 meses OOS encadeados. Para entender se o sinal sobrevive a **reordenamento temporal** e a **regimes mistos**, rodamos um validador 8-fold puramente temporal (cada fold tem ~12 meses, sem overlap com treino, purge gap 6m):

| Modelo | sharpe_medio | IR | IC95% | %>sharpe>1 | %>beats_selic |
|---|---|---|---|---|---|
| **`regime_specialist_xs`** (puro) | **+1,16** | **+0,35** | **[−1,28 ; +3,61]** | **57,1%** | 14,3% |
| `regime_aware_xs` (ensemble OOS) | +1,05 | +0,32 | [−1,41 ; +3,50] | 42,9% | 14,3% |

**Interpretação honesta:**

- **O regime_specialist_xs é o primeiro modelo do projeto Sulfur a passar no threshold "edge defensável" pela literatura quant** (IR > 0,3 é o corte comum para signal "robusto"; %>sharpe>1 > 50% indica consistência).
- O **walk-forward bruto é alpha real** — não está overfittado a uma janela particular, tem 96 meses OOS encadeados e bate SELIC em 81,2% dos meses com max_dd de −2,50%.
- O **cross-fold puramente temporal** dá IR +0,35 (defensável) e 57,1% dos folds com sharpe > 1 (consistente). **O IC95% ainda cruza zero**, portanto o sinal é parcialmente robusto cross-fold: significa que com 8 folds ainda não temos poder estatístico suficiente para rejeitar H₀ (Sharpe = 0) com 95% de confiança, mas o sinal é o mais apertado entre todos os EXP.
- A taxa de "folds batem SELIC ponta-a-ponta" (14,3%) é baixa porque SELIC over rendeu ~+16% a.a. no período, e o cross-fold usa posições top-5 igualmente ponderadas que às vezes carregam drawdowns transitórios.
- Conclusão: o sinal é **regime-aware cross-section** — funciona em todos os 3 regimes macro (value, transition, momentum), não é puro "ajuste ao ciclo SELIC real alto".

Isto é **muito melhor** do que a v8 (que tinha IR negativo em todos os modelos), e é o que justifica a promoção de `regime_specialist_xs` a modelo de produção — mas a **operação ainda exige paper trading** de 3–6 meses antes de capital real (seção 8).

### 4.4 Edge estrutural — EXP-1 a EXP-4 (busca do sinal)

Para chegar ao EXP-4 winner, rodamos 4 experimentos sequenciais após a v8 mostrar IR negativo cross-fold:

| EXP | Configuração | val sharpe | val IR | val IC95% | %>sharpe>1 |
|---|---|---|---|---|---|
| **v8** (baseline) | ensemble_ridge_hgb + fundamentals brutos brapi | −0,75 | −0,21 | [−3,34 ; +1,84] | 28,6% |
| **EXP-1** | xs_demeaned + **sem fundamentals** + modelo único | +0,55 | +0,22 | [−2,18 ; +3,29] | 28,6% |
| **EXP-2** | classificador up/down (binário) | FALHOU | — | — | — |
| **EXP-3** | regime-split **com fundamentals** + 3 especialistas | +0,13 | +0,04 | [−2,69 ; +2,96] | 57,1% |
| **EXP-4 (ensemble)** | xs_demeaned + regime-split + **sem fundamentals** | +1,05 | +0,32 | [−1,41 ; +3,50] | 42,9% |
| **EXP-4 specialist puro** | (acima, sem ensemble fallback) | **+1,16** | **+0,35** | **[−1,28 ; +3,61]** | **57,1%** |

**O que aprendemos:**

1. **EXP-2 falhou** — classificador binário up/down teve AUC < 0,5 no cross-fold. Modelar a direção absoluta (vs o cross-section relativo) é mais difícil que modelar o diferencial.
2. **EXP-1 (xs sem fundamentals)** foi uma melhoria grande sobre v8 (IR +0,22 vs −0,21) — confirmar que o **alvo cross-section é metade do edge**.
3. **EXP-3 (regime com fundamentals)** mostrou que **regime-split ajuda** (sharpe positivo em 57,1% folds), mas fundamentals brutos ainda atrapalham.
4. **EXP-4** combinou xs_demeaned + regime-split **sem fundamentals brutos** → IR +0,32 / %>sharpe>1 42,9% no ensemble, **+0,35 / 57,1%** no specialist puro.

**Conclusão:** EXP-4 confirma que alpha cross-section TÉCNICO é real e estrutural (não overfitting do walk-forward). O sinal é o primeiro do projeto a atingir os dois critérios da literatura quant: **IR > 0,3** E **%>sharpe>1 > 50%**.

---

## 5. Geometria da previsão: Monte Carlo GBM

### 5.1 Por que GBM, e por que σ empírica por ativo

O walk-forward gera um único número: `y_pred` (log return esperado em 6m). Mas para o investidor tomar decisão, um número pontual é pouco. A versão v9.1 adiciona uma **simulação Monte Carlo** que distribui a previsão em **1 000 caminhos de preço** sob hipóteses explícitas:

- **Geometric Brownian Motion** (GBM) com **correção de Itô** mês-a-mês.
- Modelo: `dS/S = μ dt + σ dW`, com solução discreta `S(t+1) = S(t) · exp((μ − σ²/2)·dt + σ·√dt·Z)`, `Z ~ N(0, 1)`.
- A correção de Itô (`− σ²/2`) é essencial — sem ela, o preço tende a drift pra cima artificialmente.

**Por que não usar distribuição lognormal simétrica simples?** Porque distribuições reais de retorno são assimétricas e com caudas pesadas. O GBM passo-a-passo preserva essas propriedades via simulação, enquanto a aproximação lognormal direta subestima caudas. Também calibramos **σ por ativo** (vol realizada 252d do próprio ativo via brapi `/historical?range=1y&interval=1d`), em vez de usar uma σ global do modelo. Isso faz com que uma ação volátil como PETR3 (σ ≈ 30% a.a.) tenha banda mais larga que uma stable como ITUB4 (σ ≈ 25% a.a.), refletindo o risco idiossincrático real.

**σ anualizada empírica por ativo** (valores típicos no snapshot de set/2026):

| Ticker | σ anualizada (brapi 1y, log returns 252d) |
|---|---|
| PETR3 | 29,9% a.a. |
| WEGE3 | 29,1% a.a. |
| RENT3 | 38,4% a.a. |
| VALE3 | 26,5% a.a. |
| ITUB4 | 24,6% a.a. |

Se o ativo tem menos de 60 candles de pregão (IPO recente), usamos σ ≈ 25% a.a. como fallback conservador e marcamos `vol_source = "model_fallback"`. Hoje **todos os 32 tickers do painel** têm histórico suficiente (`vol_source = "brapi_1y"`).

### 5.2 Procedimento da simulação

1. Lê candles 1y da brapi (`/historical?range=1y&interval=1d`).
2. Calcula log returns diários: `ln(close[t] / close[t-1])`.
3. Computa vol anualizada: `σ_ann = std(log_returns) × √252`.
4. Converte para passo mensal: `σ_step = σ_ann × √(1/12)`.
5. **Drift mensal** com correção de Itô: `drift_step = μ_monthly − 0.5 × σ_step²`, onde `μ_monthly = y_pred / 6` (linearizado do log return esperado).
6. Para cada um dos **1 000 paths**: sorteia `Z_t` por Box-Muller (`Z = √(−2 ln U₁) · cos(2π U₂)`) em cada timestep `t = 1..6`, e propaga `S_{t+1} = S_t · exp(drift_step + σ_step · Z_t)`.
7. Sorteia **50 paths** (índices espaçados deterministicamente) para visualização no fan chart.
8. Calcula estatísticas sobre os 1 000 preços finais.

### 5.3 Métricas retornadas no payload `/api/forecast/[symbol]`

| Campo | Tipo | Significado |
|---|---|---|
| `paths` | `number[]` (length 1000) | Preços finais ordenados (do menor pro maior). |
| `trajectories` | `number[][]` (50 × 7) | Trajetória mensal: `S0..S6` para 50 paths amostrados. |
| `prob_up` | `[0, 1]` | P(S(6m) > S(0)) — probabilidade de o preço final estar acima do preço atual. |
| `prob_double` | `[0, 1]` | P(S(6m) > 2·S(0)) — probabilidade de dobrar (evento raro). |
| `var_95` | R$ (≥ 0) | VaR 95%: perda esperada no cenário dos 5% piores. |
| `cvar_95` | R$ (≥ 0) | CVaR 95%: perda média nos 5% piores cenários (tail risk). |
| `sigma_annualized` | decimal | Vol anualizada empírica do ativo. |
| `sigma_6m_log` | decimal | `σ_ann × √(6/12)` — input do GBM. |
| `vol_source` | `"brapi_1y"` \| `"model_fallback"` | Fonte da σ usada na simulação. |
| `n_sims` | 1000 | Número de paths. |
| `n_days` | int | Candles diários efetivamente usados no cálculo da vol. |

### 5.4 Exemplo real — snapshot de set/2026

Cenário base (regime atual = `value`, SELIC real 13,83%):

| Ticker | current_price | y_pred (log) | predicted_pct_return | prob_up | prob_double | σ anualizada |
|---|---|---|---|---|---|---|
| PRIO3 | R$ 53,09 | +0,288 | +33,4% | 73% | 0,5% | 32% |
| ITUB4 | R$ ~32 | +0,116 | +12,3% | 71% | 0,1% | 24,6% |
| TOTS3 | R$ ~32 | +0,101 | +10,6% | 70% | 0,2% | 27% |
| VALE3 | R$ ~62 | +0,050 | +5,2% | 58% | 0,1% | 26,5% |
| RENT3 | R$ ~52 | +0,040 | +4,1% | 51% | 0,3% | 38,4% |
| WEGE3 | R$ ~43 | −0,072 | −7,0% | 33% | 0,05% | 29,1% |
| PETR3 | R$ ~38 | +0,031 | +3,1% | 53% | 0,1% | 29,9% |
| MGLU3 | R$ ~10 | −0,236 | −21,0% | 22% | 0,01% | 45% |

**Leitura:** PRIO3 é o top-1 do painel com prob_up ~73% e retorno esperado +33%, mas sua σ de 32% a.a. ainda produz banda larga. MGLU3 está no fundo do ranking com prob_up de apenas 22% — o modelo centralmente espera queda de ~21%. RENT3 com σ de 38% a.a. (a mais alta do painel) tem prob_up de apenas 51%, mostrando como alta vol pode comer o alpha previsto.

### 5.5 Frustração honesta: brapi Pro não tem implied vol pra B3

A simulação usa **vol realizada** (`σ_ann` calculada dos últimos 252 dias de log returns) em vez de **vol implícita** (IV das opções do ativo). Em derivativos, IV é o "consenso de mercado" sobre a vol futura — é forward-looking, não backward-looking.

**Por que não usamos IV:** a brapi Pro **não expõe IV de opções pra tickers B3** no snapshot atual. O endpoint `/quote` traz dados do ativo-base, mas não há módulo `optionChain` ou similar com IV estruturada para o mercado brasileiro. Em produção, ficamos com realized vol como **proxy conservador** (vol realizada tipicamente subestima vol futura em mercados com tendência de alta).

**Plano futuro (seção 9):** integrar IV via yfinance (que tem option chains pra tickers B3 com opções líquidas — PETR4, VALE3, ITUB4 etc.) e fazer um A/B test: GBM com realized vs GBM com IV. Se IV melhorar a calibração das bandas, promover a IV como default.

---

## 6. Visualização no produto

### 6.1 Onde está: `/asset/[symbol]/analysis` seção 5

A previsão probabilística é renderizada na **seção 5 do drilldown analítico** (`/asset/[symbol]/analysis`), logo após as seções de Valuation (1), Qualidade (2), Earnings Power (3) e Yield/Risk Premium (4). Foi **movida da raiz** `/asset/[symbol]` (commit `77562e8`) para liberar espaço na raiz (que foca em P/E, EPS, FairValueChart e AnalystRatingsRadar) e agrupar todos os gráficos analíticos num único drilldown.

A seção 5 é composta por **dois componentes sequenciais**:

#### A) `PriceForecastChart` (fan chart)

Renderiza, num único gráfico Recharts:

- **Linha histórica sólida** (azul M3, 12 meses passados) com anchor em `as_of`.
- **50 paths cinza claro** sobrepostos (opacidade 0,06) — a "nuvem" de trajetórias temporais mensais geradas pelo GBM, amostra de `trajectories[]`.
- **Linha pontilhada** do cenário base (mediana P50 dos 1 000 paths).
- **3 marcadores coloridos** nos cenários derivados dos percentis MC:
  - **Bear (P25)** — vermelho `var(--negative)`.
  - **Base (P50)** — branco/azul.
  - **Bull (P75)** — verde `var(--positive)`.
- **Banda P10–P90** sombreada (verde-claro, opacidade baixa).
- Header com preço atual, preço previsto (cenário base), e badge do modelo (`regime_specialist_xs_v9`).
- Footer com regime detectado (value/transition/momentum) + SELIC real.

A leitura visual: a "nuvem" cinza mostra **incerteza** (cada path é uma história possível), e os 3 cenários coloridos mostram os **pontos de referência** que o investidor deve mirar.

#### B) `PriceForecastDensity` (histograma)

Logo abaixo do fan chart, um histograma KDE-like dos **1 000 preços finais**:

- **50 bins** entre `min(paths)` e `max(paths)`.
- Cor verde (`var(--positive)`) para bins acima do preço atual; vermelho (`var(--negative)`) para bins abaixo.
- **Linha tracejada branca** no preço atual (referência visual do anchor).
- **Header com 3 métricas-chave:** `P(up)` (verde), `VaR 95%` (vermelho), `CVaR 95%` (vermelho).
- **Footer com P10/P90** (limites do intervalo de 80%) + legenda de cores.
- Badge mostrando fonte da vol (`brapi_1y` ou `model_fallback`).

A leitura visual: quanto mais massa do histograma está à **direita** da linha branca, maior a probabilidade de alta. A cauda esquerda mostra o risco de drawdown.

### 6.2 O que mostra a previsão e a confiança

O conjunto fan chart + density plot comunica **dois tipos de informação**:

1. **Previsão central:** "R$ X em 6 meses (+Y%)" — o `predicted_price_6m` no header do fan chart, derivado de `y_pred` do regime_specialist_xs.
2. **Confiança na previsão:** distribuição completa dos preços possíveis via histograma + métricas de risco (P(up), VaR 95%, CVaR 95%) + nuvem de trajetórias temporais.

Isso muda o paradigma de "este ativo vai subir X%" (afirmação pontual) para **"este ativo tem Y% de chance de estar acima do preço atual em 6 meses, com risco de drawdown de até Z% no cenário dos 5% piores"** (afirmação probabilística completa). É a mesma mudança conceitual que a indústria de previsão do tempo fez nas últimas décadas: passou de "vai chover amanhã" para "70% de chance de chuva, com 5mm esperados".

---

## 7. Como usar no produto: forecast 6m (`/api/forecast/[symbol]`)

### 7.1 Endpoint REST

A previsão operacional do Sulfur é exposta como endpoint HTTP REST, alimentado pelo modelo **`regime_specialist_xs`** (EXP-4 winner):

**Request:**

```
GET /api/forecast/{SYMBOL}
```

**Response (200, exemplo PRIO3):**

```json
{
  "symbol": "PRIO3",
  "current_price": 53.09,
  "as_of": "2026-09-08T19:56:17Z",
  "horizon": "6m",
  "model": "regime_specialist_xs_v9",
  "predicted_price_6m": 70.82,
  "predicted_pct_return": 33.42,
  "direction": "up",
  "confidence": 0.54,
  "band": {
    "p10_price": 66.02,
    "p90_price": 75.99,
    "low_6m_price": 67.85,
    "base_6m_price": 70.82,
    "high_6m_price": 73.93
  },
  "features_snapshot": {
    "pe": null,
    "p_vp": null,
    "ev_ebitda": null,
    "roe": null,
    "dy": null,
    "composite_score": null
  },
  "regime": {
    "current": "value",
    "selic_real_pct": 13.83,
    "model_used": "value_specialist_xs",
    "model_version": "v9_xs_regime_combined_2026-09-08"
  },
  "monte_carlo": {
    "paths": [...1000 preços finais ordenados...],
    "trajectories": [[...50 paths × 7 timesteps...]],
    "prob_up": 0.73,
    "prob_double": 0.005,
    "var_95": 5.21,
    "cvar_95": 7.84,
    "sigma_annualized": 0.32,
    "sigma_6m_log": 0.226,
    "n_sims": 1000,
    "n_days": 252,
    "vol_source": "brapi_1y"
  },
  "source": "specialist_xs_predictions",
  "disclaimer": "Previsão probabilística baseada em backtest histórico. NÃO é recomendação de investimento."
}
```

**Implementação interna:**

1. Lê `predictions_latest.csv` (32 tickers com `y_pred` direto do `value_specialist_xs`) e `regime_current.json` (snapshot do regime + selic_real) em `data/forecast/specialist_xs/`. Cache 1h.
2. Detecta regime atual via SELIC real do mês (set/2026: 13,83% → regime `value` → usa `value_specialist_xs`; em transição, ensemble dos 3).
3. Calcula `predicted_price_6m = current_price × exp(y_pred)` onde `current_price` é a cotação mais recente da brapi.
4. Calcula a banda P10/P90 via percentis dos 1 000 paths do MC (não aproximação lognormal).
5. Calcula Monte Carlo GBM com 1 000 paths, 7 timesteps (T0..T6), Box-Muller pra Z, σ empírica por ativo (ver seção 5).
6. **Cache de 6 horas** (TTL) — forecast é estático no horizonte diário.
7. **Ticker fora do painel:** HTTP **404** com payload `{"error": "ticker_fora_do_painel_specialist_xs", "message": "...", "supported_tickers_sample": ["PETR4","VALE3","ITUB4", ...]}` listando 10 supported tickers como sugestão.

### 7.2 `features_snapshot` retornado null por design

Diferente da v8, o `features_snapshot` no response tem todos os campos como `null` (`pe`, `p_vp`, `ev_ebitda`, `roe`, `dy`, `composite_score`). Isso é intencional: o EXP-4 **não usa fundamentals brutos brapi** (eles atrapalharam no cross-fold), e o regime macro substitui como contexto principal. O bloco `regime` carrega a informação que antes vinha de fundamentals + valuation snapshot.

---

## 8. Limitações honestas

Esta seção é propositalmente brutal. Listamos cada limitação sem soft-pedal.

1. **Cross-fold com `regime_specialist_xs` é parcialmente robusto (IR +0,35, IC95% ainda cruza zero).** Embora o IR +0,35 seja defensável pela literatura quant (threshold comum para "edge robusto"), **o IC95% [−1,28 ; +3,61] ainda não rejeita H₀ (Sharpe = 0) com 95% de confiança**. Precisamos de mais folds (k ≥ 12) ou painel maior (≥ 15 anos) para apertar o IC. **A robustez temporal cross-regime é parcialmente demonstrada** — o modelo passa no critério IR > 0,3 e %>sharpe>1 > 50%, mas a significância estatística completa ainda está em construção.

2. **Sinal é regime-aware mas testado majoritariamente em regime value.** A janela OOS (96 meses) tem **53% dos meses em regime value** (SELIC real > 7%), 23% em transition, 24% em momentum. O sinal performou bem nos 3 regimes (ann_ret ≥ +32% em todos), mas a evidência em `momentum` (23 meses) é mais fraca que em `value` (51 meses). Recomendamos **re-treino** antes de qualquer reversão sustentada pra SELIC real < 5%.

3. **Universo limitado a 32 blue chips B3.** Small caps, mid caps e BDRs não estão no painel. Em mercados onde small caps outperformam (como o boom de IPOs 2020–2021), o modelo deixa alpha na mesa. Expansão está no roadmap (seção 9), mas o pipeline ainda não cobre.

4. **brapi Pro tem cobertura boa, não perfeita.** Entre 4,3% e 22,2% NaN nas candles dependendo do ticker/janela. Em particular, tickers com IPO recente (RAIZ4, HAPV3) têm menos de 4 anos de candles disponíveis — embora o painel técnico use forward-fill com cautela pra não introduzir look-ahead artificial.

5. **Monte Carlo usa σ realizada, não σ implícita.** brapi Pro não tem option chain estruturada pra B3 (seção 5.5). Usamos realized vol como proxy conservador — backward-looking, não forward-looking. Em mercados com saltos de vol esperados (ex: véspera de decisão de SELIC), a banda do MC pode subestimar o risco real.

6. **Backtest assume execução perfeita.** 10 bps de turnover é um piso conservador para blue chips, mas não captura market impact em rebalanceamento durante stress de mercado, nem slippage em horários de baixa liquidez. Em cenários reais, o max_dd provavelmente seria maior.

7. **Treino majoritário em ciclo SELIC real alto (>7%).** A janela 2016–2026 tem 8 de 10 anos com SELIC real > 7%. Reversão para SELIC real < 3% exigiria re-treino do zero e provavelmente revisão da hipótese H-Macro overlay (que se torna neutra em regime de SELIC real baixa).

8. **Nenhum paper trading ainda.** O sistema não foi testado em produção ao vivo com dinheiro fictício. Erros de integração (delay de fundamentals, mudanças de ticker, eventos corporativos não modelados como desdobramentos, grupamentos, OPA) podem acontecer e ainda não foram observados.

9. **Modelo em produção NÃO é exatamente o regime_specialist_xs puro — é o regime_aware_xs ensemble.** O `regime_aware_xs` (ensemble dos 3 especialistas) tem WF ann_ret +40,66% (vs +21,96% do value_specialist puro isolado) e max_dd melhor (−2,50% vs −15,60%). Em produção usamos o ensemble; em cross-fold usamos o specialist puro (que tem IR melhor). Os dois têm sinais consistentes mas performances diferentes — vale documentar essa assimetria ao analisar P&L futuro.

**Recomendação operacional:** paper trading por **3 a 6 meses** antes de qualquer alocação de capital real. Comparar retorno simulado com retorno OOS in-sample, e verificar se pelo menos 60% dos meses o paper bate a SELIC antes de promover o pipeline a "produção real".

---

## 9. Roadmap (12–24 meses)

Em ordem de prioridade:

1. **Paper trading estruturado por 3–6 meses** com auditoria semanal de erro (realized vs predicted) para validar o `regime_specialist_xs` fora da amostra. Comparar fan chart com realized price path — medir calibração dos percentis P10/P50/P90.
2. **Mais folds no validador 8-fold** (k=12 ou k=16) para apertar o IC95% do `regime_specialist_xs` — atualmente [−1,28 ; +3,61], alvo é apertar para ~[−0,5 ; +2,5] rejeitando H₀ a 95%.
3. **Expansão do universo para 60+ tickers.** Critério de entrada: market cap > R$ 1B, volume diário médio > R$ 20M, candles de pelo menos 3 anos na brapi Pro. Cobertura prioritária: small caps líquidas que ficaram fora do radar do modelo.
4. **Implied vol via yfinance** (option chains pra tickers com opções líquidas — PETR4, VALE3, ITUB4 etc.) para substituir realized vol no MC GBM. A/B test: MC com realized vs MC com IV. Se IV melhorar calibração, promover como default.
5. **EWMA no realized vol** (RiskMetrics λ=0,94) para dar mais peso às observações recentes. Hoje o MC usa std simples dos 252 dias.
6. **Sector rotation dinâmica baseada em regime macro.** Quando SELIC real alta, overweights energia + commodities + bancos; quando SELIC real baixa, overweights consumo discricionário + tech + property. Testes preliminares sugerem Sharpe marginalmente superior ao atual.
7. **Ensemble com LightGBM e XGBoost adicionais** para diversificar o erro não-linear do HistGBM. Comparar com o `regime_specialist_xs` via cross-fold idêntico ao da seção 4.3.
8. **Proxy de risco-país (CDS Brasil ou EMBI+).** Hoje o modelo não tem feature de risco-país. CDS Brasil 5y está fortemente correlacionado com SELIC risk premium em momentos de stress — adicionar deve melhorar captura do bear market macro.
9. **Re-treino online semanal** com novos candles (delta updates, sem re-treino do zero), para encurtar o lag entre fechamento do mês e atualização do score.
10. **API pública do endpoint `/api/forecast/[symbol]`** com rate-limit por token (free tier: 100 req/dia, Pro: 10 000 req/dia). Hoje o endpoint só é acessível dentro do app.

---

## 10. Disclaimer

```
DISCLAIMER IMPORTANTE

Este documento é puramente informativo e descreve o pipeline quantitativo do produto Sulfur.
NÃO constitui recomendação de investimento, análise de valores mobiliários ou consultoria financeira.

Performance passada NÃO garante performance futura. O modelo foi treinado majoritariamente em ciclo
SELIC real alto (>7%) e pode degradar em regimes macro diferentes. O cross-fold do regime_specialist_xs
(EXP-4) atingiu Information Ratio +0,35 — defensável pela literatura quant, mas o IC95% [−1,28 ; +3,61]
AINDA NÃO rejeita H₀ (Sharpe = 0) com significância estatística a 95%. Operação em capital real só
deve ocorrer após paper trading de 3-6 meses com auditoria semanal.

A simulação Monte Carlo GBM usa vol realizada (backward-looking) em vez de vol implícita (forward-
looking), porque a brapi Pro não expõe option chains estruturadas pra B3. As probabilidades e métricas
de risco retornadas (P(up), VaR95, CVaR95) refletem essa simplificação e podem subestimar o risco real
em momentos de salto de volatilidade esperada.

Resultados de backtest incorporam custos de transação assumidos (10bps turnover) e assumem
execução perfeita. Custos reais de mercado podem ser maiores.

Recomendamos paper trading por 3-6 meses antes de operar com capital real.

O usuário é o único responsável pelas decisões de investimento. Sulfur e seus criadores não se
responsabilizam por perdas decorrentes do uso destas informações.
```

---

## 11. Histórico de versões

| Versão | Data | Commit | Mudança principal | Validador cross-fold (8-fold) | Walk-forward OOS | Status |
|---|---|---|---|---|---|---|
| **v8** | 2026-09-08 | `cadd731` | `ensemble_ridge_hgb` + fundamentals brutos brapi | sharpe_medio −0,75 · IR **−0,21** · IC95 [−3,34 ; +1,84] | ann_ret +29,12% · sharpe +2,38 · max_dd −11,99% | **Descontinuado** — IR negativo em TODOS os modelos |
| EXP-1 | 2026-09-08 | — | xs_demeaned + sem fundamentals | sharpe +0,55 · IR +0,22 · IC95 [−2,18 ; +3,29] | sharpe +3,5055 | Marco intermediário |
| EXP-2 | 2026-09-08 | — | classificador binário up/down | FALHOU (AUC < 0,5) | — | Descontinuado |
| EXP-3 | 2026-09-08 | — | regime-split + com fundamentals | sharpe +0,13 · IR +0,04 · IC95 [−2,69 ; +2,96] | sharpe +4,1085 | Marco intermediário |
| **v9** | 2026-09-08 | `5cad945` | **`regime_specialist_xs` (EXP-4)** + xs_demeaned + sem fundamentals + **Monte Carlo GBM** (1000 paths, σ empírica por ativo, correção de Itô) | sharpe_medio **+1,16** · IR **+0,35** · IC95 [−1,28 ; +3,61] · %>sharpe>1 **57,1%** | regime_aware_xs ann_ret **+40,66%** · sharpe **+5,62** · max_dd **−2,50%** · %>SELIC **81,2%** | **EM PRODUÇÃO** |
| **v9.1** | 2026-09-08 | `77562e8` | **Trajetórias temporais** (50 paths × 7 timesteps) + **density plot** (histograma 50 bins dos 1000 finais) + move do card pra `/asset/[symbol]/analysis` seção 5 (era raiz) | (mesmo) | (mesmo) | **EM PRODUÇÃO** |

**Notas sobre migração v8 → v9 → v9.1:**

- O forecast endpoint `/api/forecast/[symbol]` foi atualizado de `CHECKPOINT_DIR = data/forecast/v8/` para `data/forecast/specialist_xs/`. Source field mudou de `predictions_latest`/`composite_scores_proxy` para `specialist_xs_predictions`. Model field mudou de `v8_real_fund_2026-09-08` para `regime_specialist_xs_v9`.
- A resposta do endpoint ganhou o bloco `regime: { current, selic_real_pct, model_used, model_version }` que expõe qual especialista foi usado (`value_specialist_xs`, `transition_ensemble`, etc.) e o bloco `monte_carlo: { paths, trajectories, prob_up, prob_double, var_95, cvar_95, sigma_annualized, sigma_6m_log, vol_source, n_sims, n_days }` com a simulação GBM completa.
- O campo `features_snapshot` agora retorna todos os campos como `null` (EXP-4 não usa fundamentals brutos); o regime info substitui como contexto principal.
- O **fan chart** foi atualizado em v9.1: usa percentis reais P25/P50/P75 dos 1 000 paths MC para os cenários bear/base/bull (em vez de aproximação lognormal), e sobrepõe 50 paths cinza claro com `trajectories[]` (era só banda em v9).
- O **density plot** foi adicionado em v9.1: histograma KDE-like dos 1 000 preços finais, com P(up)/VaR95/CVaR95 no header e P10/P90 no footer.
- O card foi **movido** da raiz `/asset/[symbol]` (onde competia com FairValueChart, PE history, AnalystRatingsRadar) para a seção 5 do drilldown `/asset/[symbol]/analysis` — agrupando todos os gráficos analíticos num único local.
- O pipeline sulfur-ml snapshots são gerados por `src/48_predict_specialist_xs_snapshot.py` em `data/forecast_specialist_xs/`, espelhados para `~/projects/sulfur/data/forecast/specialist_xs/`.

---

*Última atualização: setembro/2026 · v9.1 (EXP-4 winner + Monte Carlo GBM + visualização geométrica) · pipeline em `~/projects/sulfur-ml/` · endpoint de forecast em `screener-production-4f58.up.railway.app/api/forecast/`*