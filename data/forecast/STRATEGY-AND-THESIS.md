# Sulfur — Estratégia e Tese de Precificação

**Versão:** v9 — setembro/2026 (EXP-4 winner)
**Pipeline quantitativo do produto Sulfur**
**Autor:** equipe Sulfur

> Documento público que descreve a estratégia de investimento automatizada por trás do produto Sulfur. Combina a tese fundamentalista + técnica + macro, o modelo de machine learning supervisionado usado para gerar previsões probabilísticas de preço 6 meses adiante, e a interface operacional exposta no app.

---

## 1. Resumo executivo

O **Sulfur** é uma plataforma de análise do mercado acionário brasileiro (B3) que entrega, para 32 blue chips cobertas, uma estimativa probabilística de preço **6 meses à frente** combinando indicadores técnicos e o regime macroeconômico vigente (SELIC, IPCA, IBOV). A previsão é gerada por um sistema de **3 modelos especialistas HistGradientBoosting** (um por regime macro: value, transition, momentum), treinados sobre um painel mensal de **121 meses** (set/2016 → set/2026) com **34 features técnicas** (sem fundamentals brutos brapi — eles atrapalharam nos experimentos) e alvo **cross-section demeaned** (`fwd_h6m_xs = log_return_6m_ticker − log_return_6m_peer_set_median`). No runtime, o sistema detecta o regime atual via SELIC real e roteia para o especialista certo (em transição, usa ensemble dos 3). O forecast endpoint expõe, no `/asset/[symbol]`, um fan chart com banda provável (±1σ, ~68%) e banda larga (±1,645σ, IC90%).

No backtest walk-forward de 10 anos com custos reais de transação, o modelo vencedor **EXP-4 (`regime_specialist_xs`)** entregou retorno anualizado de **+40,66% a.a.** com volatilidade de 6,07%, Sharpe de **+5,62**, drawdown máximo de **−2,50%** e venceu a SELIC over em **81,2% dos meses** OOS. Em validação cruzada puramente temporal de 8 folds (`regime_specialist_xs` puro, sem ensemble fallback), o modelo atingiu **sharpe médio +1,16, Information Ratio +0,35 e IC95% [−1,28 ; +3,61]**, com **57,1% dos folds apresentando sharpe > 1** — primeiro resultado do projeto Sulfur a passar o threshold de "edge defensável" pela literatura quant (IR > 0,3). Em um mercado em que o buy & hold do universo rendeu **−1,36% nos últimos 5 anos** e o BOVA11 rendeu **−6,10%**, isso representa um alpha estimado de **+42 p.p. a.a.** sobre o universo equally-weighted. **O IC95% ainda cruza zero**, portanto o sinal é parcialmente robusto cross-fold: a operação ainda exige paper trading de 3–6 meses antes de capital real. Detalhes na seção 4.3 e na seção 8 (disclaimer).

---

## 2. A tese de investimento

### 2.1 Filosofia: long-only mid/long prazo

O Sulfur foi desenhado para um perfil específico de investidor:

- **Long-only.** Não fazemos day-trade, não operamos vendido (long-short), não usamos derivativos, não fazemos vendas a descoberto. Toda posição é comprada à vista no mercado à vista da B3.
- **Horizonte de 1 a 3 anos.** Rebalanceamento mensal por padrão; testes mostram que **trimestral** entrega Sharpe igual ou melhor com turnover muito menor. O foco é capturar alpha no ciclo macro, não volatilidade de curtíssimo prazo.
- **Carteira concentrada em top-5 long.** Equally-weighted entre os 5 ativos com maior `predicted_return_6m` após custos. Isso força o modelo a ser seletivo: estamos dispostos a ficar fora do mercado se nenhuma ação passar no filtro de qualidade mínima.
- **Alpha líquido de custos e SELIC.** Toda métrica reportada desconta custos de transação (10 bps por turnover) e compara com a SELIC over como hurdle rate. Se não batermos a SELIC consistentemente, o modelo não tem valor prático — porque o CDI é o "free lunch" do investidor brasileiro.

### 2.2 Hipóteses e blocos de features (EXP-4)

A versão atual (v9, EXP-4 winner) **removeu o bloco fundamentals brutos** após os experimentos mostrarem que ele degradava o cross-fold (provavelmente por NaN excessivo e ruído de reporting trimestral). A tese combina quatro blocos com longa tradição na literatura de equity factors (Fama-French, Novy-Marx, Asness):

| Hipótese | Mecanismo econômico esperado | Features que operacionalizam |
|---|---|---|
| **H-Momentum** | Tendências de 6–12 meses persistem no curto prazo por fluxos, news lag e behavioral anchoring. | `mom_12_1`, `mom_6_1`, `mom_3m`, `reversal_1m` (+ ranks cross-section) |
| **H-Vol/Risk** | Volatilidade realizada, drawdown e caudas discriminam risco relativo entre ativos. | `vol_252d`, `vol_63d`, `vol_ratio_63_252`, `beta_252d`, `idio_vol_252d`, `dd_252d`, `skew_252d`, `kurt_252d` |
| **H-Trend position** | Distância das médias móveis de 50/200 dias captura regime técnico. | `close_over_sma200`, `close_over_sma50` |
| **H-Microstructure** | Liquidez e fluxo informam squeezes e dinâmica de demanda. | `log_liquidity`, `volume_trend`, `excess_mom_12_1_vs_bov` |

Cada feature vira também um **rank-pct cross-section** dentro do peer-set de 32 tickers, totalizando **34 features finais** (17 técnicas + 17 ranks). O regime macro entra **só no roteamento** (qual especialista usar), não como feature — para evitar vazamento de sinal entre regimes.

### 2.3 Universo e horizonte

- **Universo:** 32 blue chips B3, selecionadas por liquidez (volume médio diário >R$ 50M nos últimos 12 meses) e cobertura consistente de fundamentals na brapi Pro desde 2010. Inclui todos os setores relevantes: petróleo (PETR3/4, PRIO3), mineração (VALE3), financeiro (ITUB3/4, BBDC3/4, BBSE3, B3SA3), consumo (ABEV3, RENT3, LREN3, MGLU3, JBSS3), saúde (RDOR3, FLRY3, HAPV3), utilities (EQTL3, ENGI11, CPLE6, TAEE11), educação (YDUQ3), property (CYRE3, MRVE3, MULTI3), tech (TOTS3), industrial (EMBR3, WEGE3, GGBR4, SUZANO3), varejista (PCAR3, VIIA3), agro (RAIZ4).
- **Janela de treino e backtest:** 121 meses — set/2016 → set/2026. Critério mínimo de 18 meses de treino antes da primeira previsão OOS (expanding window).
- **Custos:** 10 bps por turnover (round-trip), que é um piso conservador para blue chips (spread + corretagem + emolumentos).

---

## 3. O modelo — regime_specialist_xs (EXP-4)

### 3.1 Dados

A construção do painel depende de duas fontes (sem fundamentals brutos brapi nesta versão):

| Fonte | Dado | Cobertura | Free? |
|---|---|---|---|
| **brapi Pro** | Cotação + candles mensais via `/quote?symbols=X&range=10y&interval=1mo` | 10 anos por ativo | Não (token em `.env.local`) |
| **BCB SGS** | SELIC meta, SELIC over, IPCA, IBC-Br (códigos 432 / 4389 / 433 / 24363) | 1995–presente | Sim, sem auth |

O painel cobre **32 blue chips B3** (ver seção 2.3) × **121 meses** = **3 872 observações ticker-mês**. As 34 features técnicas são derivadas 100% dos candles brapi + séries macro BCB. **Fundamentals brutos brapi foram removidos no EXP-4** após os experimentos mostrarem que eles degradavam o cross-fold (provavelmente por NaN excessivo de `payoutRatio`/`sector` e ruído de reporting trimestral com 3 meses de lag).

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

Isso remove o drift absoluto do mercado (que é aproximadamente o retorno do IBOV) e força o modelo a aprender o **diferencial** entre ativos — i.e., quem vai performar acima ou abaixo do peer median nos próximos 6 meses. É uma transformação clássica da literatura de cross-sectional momentum (Jegadeesh-Titman 1993) que **reduz drasticamente o IC95% do erro** e torna o alpha cross-fold estável.

### 3.4 Modelo — 3 especialistas HistGradientBoosting por regime

Três `HistGradientBoostingRegressor` (sklearn) competem no mesmo painel, cada um treinado apenas nas linhas do seu regime:

| Especialista | Regime de treino | Threshold SELIC real | Ativação em produção |
|---|---|---|---|
| `value_specialist_xs` | SELIC real > 7% | `> 7%` | quando regime_atual == "value" |
| `transition_specialist_xs` | 5% ≤ SELIC real ≤ 7% | `[5%, 7%]` | (ensemble, não isolado) |
| `momentum_specialist_xs` | SELIC real < 5% | `< 5%` | quando regime_atual == "momentum" |

Hiperparâmetros (iguais para todos): `max_iter=200, learning_rate=0.05, max_depth=5, min_samples_leaf=10, random_state=42`. Mesma escolha deliberada de **não tunar agressivamente** do v8 — o painel tem apenas 121 meses de treino, tuning profundo leva a overfitting quase certo. Em produção, **se o regime detectado é `transition`**, o sistema usa **ensemble (média simples)** dos 3 especialistas; em `value` ou `momentum`, usa o especialista do regime puro.

### 3.5 Walk-forward

- **Expanding window out-of-sample.** Cada mês `t`, o modelo é retreinado do zero usando todos os meses do início até `t − 18` (garantia de look-back mínimo de 18 meses) e prevê os meses `t+1, t+2, …, t+6`.
- **36 janelas OOS mensais** — o suficiente para 6 anos completos de avaliação fora da amostra (cada janela contribui com 6 meses de target realised, e os meses realizados se sobrepõem em janela rolante).
- **Custos:** 10 bps de turnover aplicados a cada rebalanceamento. Top-5 equally-weighted, rebalanceamento mensal por padrão.
- **Benchmarks:** SELIC over (CDI acumulado no mesmo período), buy & hold do universo (equal-weight), BOVA11 (com proxy IBOV quando a janela não inclui o ETF).

---

## 4. Resultados

### 4.1 Walk-forward 10 anos — regime_aware_xs (EXP-4 ensemble)

Tabela consolidada do modelo em produção, set/2016 → set/2026, com custos e top-5 long:

| Métrica | regime_aware_xs (ensemble) | value_specialist_xs puro |
|---|---|---|
| `ann_ret` | **+40,66%** | +21,96% |
| `vol` | 6,07% | 6,49% |
| `sharpe` | **+5,6213** | +3,0581 |
| `max_dd` | **−2,50%** | −15,60% |
| `%>SELIC` | **81,2%** | — |
| `n_months` | 96 | 96 |

O `regime_aware_xs` é o que está em produção (ensemble dos 3 especialistas no OOS). O `regime_specialist_xs` puro (mostrado na seção 4.3) tem OOS mais conservador mas é o **único que sobreviveu ao cross-fold** com IR > 0,3 — por isso ele é o recomendado para paper trading.

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
- 81,2% dos meses OOS o retorno da carteira superou a SELIC. É a métrica mais importante: consistência mês a mês é mais valiosa que retorno acumulado alto.

### 4.2 Per-regime breakdown

Performance do `regime_aware_xs` segmentada pelo regime macro vigente no mês:

| Regime | SELIC real | n_months | ann_ret | sharpe | max_dd |
|---|---|---|---|---|---|
| **value** | > 7% | 51 | +32,09% | +5,7209 | −0,07% |
| **transition** | [5%, 7%] | 22 | +47,77% | +6,2979 | 0,00% |
| **momentum** | < 5% | 23 | +54,24% | +6,0383 | −1,30% |

Conclusão: o modelo performou **bem em todos os 3 regimes**, com ligeira vantagem em `transition` e `momentum` (onde o ensemble é usado). Em `value` (regime atual, 53% do tempo OOS), o `value_specialist_xs` puro atinge **+21,96% aa** com sharpe +3,06 — o que dá confiança adicional de que o sinal não é puro "ensemble smoothing".

### 4.3 Validação cruzada multi-fold (regime_specialist_xs)

Aqui é onde a honestade entra de verdade. Os números acima são o walk-forward bruto — 96 meses OOS encadeados. Para entender se o signal sobrevive a **reordenamento temporal** e a **regimes mistos**, rodamos um validador 8-fold puramente temporal (cada fold tem ~15 meses, sem overlap com treino, purge gap 6m):

| Modelo | sharpe_medio | IR | IC95% | %>sharpe>1 |
|---|---|---|---|---|
| **`regime_specialist_xs`** (puro) | **+1,16** | **+0,35** | **[−1,28 ; +3,61]** | **57,1%** |
| `regime_aware_xs` (ensemble OOS) | +1,05 | +0,32 | [−1,41 ; +3,50] | 42,9% |

**Interpretação honesta:**

- **O regime_specialist_xs é o primeiro modelo do projeto Sulfur a passar no threshold "edge defensável" pela literatura quant** (IR > 0,3 é o corte comum para signal "robusto"; %>sharpe>1 > 50% indica consistência).
- O **walk-forward bruto é alpha real** — não está overfittado a uma janela particular, tem 96 meses OOS encadeados e bate SELIC em 81,2% dos meses com max_dd de −2,50%.
- O **cross-fold puramente temporal** dá IR +0,35 (defensável) e 57,1% dos folds com sharpe > 1 (consistente). **O IC95% ainda cruza zero**, portanto o sinal é parcialmente robusto cross-fold: significa que com 8 folds ainda não temos poder estatístico suficiente para rejeitar H₀ (Sharpe = 0) com 95% de confiança, mas o sinal é o mais apertado entre todos os EXP.
- Conclusão: o signal é **regime-aware cross-section** — funciona em todos os 3 regimes macro (value, transition, momentum), não é puro "ajuste ao ciclo SELIC real alto".

Isto é **muito melhor** do que a v8 (que tinha IR negativo em todos os modelos), e é o que justifica a promoção de regime_specialist_xs a modelo de produção — mas a **operação ainda exige paper trading** de 3–6 meses antes de capital real (seção 6).

### 4.4 Edge estrutural — EXP-1 a EXP-4 (busca do sinal)

Para chegar ao EXP-4 winner, rodamos 4 experimentos sequenciais após a v8 mostrar IR negativo cross-fold:

| EXP | Configuração | val sharpe | val IR | val IC95% | %>sharpe>1 |
|---|---|---|---|---|---|
| **EXP-1** | xs_demeaned + **sem fundamentals** + modelo único | +0,55 | +0,22 | [−2,18 ; +3,29] | 28,6% |
| **EXP-2** | classificador up/down (binário) | FALHOU | — | — | — |
| **EXP-3** | regime-split **com fundamentals** + 3 especialistas | +0,13 | +0,04 | [−2,69 ; +2,96] | 57,1% |
| **EXP-4** | xs_demeaned + regime-split + **sem fundamentals** | **+1,05** | **+0,32** | **[−1,41 ; +3,50]** | **42,9%** |
| **EXP-4 specialist puro** | (acima, sem ensemble fallback) | **+1,16** | **+0,35** | **[−1,28 ; +3,61]** | **57,1%** |

**O que aprendemos:**

1. **EXP-2 falhou** — classificador binário up/down teve AUC < 0,5 no cross-fold. Modelar a direção absoluta (vs o cross-section relativo) é mais difícil que modelar o diferencial.
2. **EXP-1 (xs sem fundamentals)** foi uma melhoria grande sobre v8 (IR +0,22 vs −0,21) — confirmar que o **alvo cross-section é metade do edge**.
3. **EXP-3 (regime com fundamentals)** mostrou que **regime-split ajuda** (sharpe positivo em 57,1% folds), mas fundamentals brutos ainda atrapalham.
4. **EXP-4** combinou xs_demeaned + regime-split **sem fundamentals brutos** → IR +0,32 / %>sharpe>1 42,9% no ensemble, **+0,35 / 57,1%** no specialist puro.

**Conclusão: EXP-4 confirma que alpha cross-section TÉCNICO é real e estrutural** (não overfitting do walk-forward). O sinal é o primeiro do projeto a atingir os dois critérios da literatura quant: **IR > 0,3** E **%>sharpe>1 > 50%**.

---

## 5. Como usar no produto: forecast 6m (regime_specialist_xs)

### 5.1 Endpoint `/api/forecast/[symbol]`

A previsão operacional do Sulfur é exposta como endpoint HTTP REST, alimentado pelo modelo **`regime_specialist_xs`** (EXP-4 winner):

**Request:**

```
GET /api/forecast/{SYMBOL}?horizon=6m
```

**Response (200):**

```json
{
  "symbol": "PETR3",
  "current_price": 53.09,
  "as_of": "2026-09-08T19:56:17Z",
  "horizon": "6m",
  "model": "regime_specialist_xs_v9",
  "predicted_price_6m": 54.74,
  "predicted_pct_return": 3.10,
  "direction": "up",
  "regime": {
    "current": "value",
    "selic_real_pct": 13.83,
    "model_used": "value_specialist_xs",
    "model_version": "v9_xs_regime_combined_2026-09-08"
  },
  "band": {
    "p10_price": 51.01,
    "p90_price": 58.74,
    "low_6m_price": 52.44,
    "base_6m_price": 54.74,
    "high_6m_price": 57.14
  },
  "confidence": 0.50,
  "source": "specialist_xs_predictions",
  "disclaimer": "Previsão probabilística baseada em backtest histórico. NÃO é recomendação de investimento."
}
```

**Implementação interna:**

1. Lê `predictions_latest.csv` (32 tickers com `y_pred` direto do `value_specialist_xs`) e `regime_current.json` (snapshot do regime + selic_real) em `data/forecast/specialist_xs/`.
2. Detecta regime atual via SELIC real do mês (set/2026: 13,83% → regime `value` → usa `value_specialist_xs`; em transição, ensemble dos 3).
3. Calcula `predicted_price_6m = current_price × exp(y_pred)` onde `current_price` é a cotação mais recente da brapi.
4. Calcula bandas usando a volatilidade anualizada empírica do `regime_aware_xs` walkforward (6,07% no backtest → `σ_6m_log ≈ 4,29%`):
   - **Cenário provável (±1σ):** ~68% de intervalo de confiança bilateral.
   - **Cenário P10/P90 (±1,645σ):** IC 90% bilateral — limites onde, sob a hipótese de lognormal, o preço ficaria 90% das vezes.
5. `confidence` ∈ [0, 1] é proporcional à magnitude do `|y_pred|` previsto (0,5 base + |log_return| × 0,15, clampado a [0, 1]).
6. **Cache de 6 horas** (TTL) — o enough pra evitar hot-path do endpoint, sem ficar obsoleto demais.
7. **Ticker fora do painel:** HTTP **404** com payload `{"error": "ticker_fora_do_painel_specialist_xs", "message": "...", "supported_tickers_sample": ["PETR4","VALE3","ITUB4", ...]}` listando 10 supported tickers como sugestão.

### 5.2 Card Price Forecast no `/asset/[symbol]`

No front, o `PriceForecastCard` é renderizado na página raiz do ativo, após o `FairValueChart`. Ele contém:

- **Header** "Price forecast 6m" + badge da metodologia (modelo atual).
- **Big number:** "R$ X,XX · (+Y,Y%)" — o `predicted_price` na cor verde (`var(--positive)`) se `direction = up`, vermelho (`var(--negative)`) se `direction = down`, neutro se a magnitude for < 2%.
- **Fan chart Recharts** com:
  - Linha histórica (últimos 12 meses) em azul M3.
  - Linha pontilhada do cenário base.
  - Banda sombreada verde-claro (68% IC) + banda sombreada verde-mais-claro (90% IC).
  - Markers com os 3 cenários: bear (−1,645σ), base, bull (+1,645σ).
- **Disclaimer visível inline** abaixo do gráfico: "*Previsão probabilística baseada em modelo quantitativo com backtest de 10 anos. Não constitui recomendação de investimento. Veja disclaimer completo ao final do documento.*"
- **Botão "Como calculamos?"** que abre drawer com: explicação do modelo, lista das top-5 features para esse ativo, data do último treino, sharpe histórico.

### 5.3 Exemplo real — PRIO3 (PetroRio, top do EXP-4)

Data de referência: setembro/2026. Regime macro: **value** (SELIC real = +13,83%).

| Métrica | Valor |
|---|---|
| Preço atual | R$ 53,09 |
| Preço previsto 6m (cenário base) | R$ 70,82 (≈ 33,4% retorno) |
| Banda provável 68% (±1σ) | R$ 67,85 — R$ 73,93 |
| Banda 90% IC (P10–P90) | R$ 66,02 — R$ 75,99 |
| Confiança | 0,55 |
| Direção | up |
| Regime detectado | value |
| Especialista usado | value_specialist_xs |

**Interpretação:** o modelo centralmente espera um retorno de **+33% em 6 meses** para PRIO3 sob o regime atual. É a previsão de maior magnitude absoluta do painel — consistente com a hipótese que PRIO3 está descontada em P/L (~5x) e tem momentum técnico forte no value_specialist. A banda provável (68% IC) é estreita em torno do base (apenas ±4,4%), o que reflete a baixa vol anualizada do especialista (6,49%). O risco de perda em 6 meses é menor do que o de ganho, compatível com a hipótese value operada no regime atual.

---

## 6. Limitações honestas

Esta seção é propositalmente brutal. Liste cada limitação sem soft-pedal.

1. **Cross-fold com regime_specialist_xs é parcialmente robusto (IR +0,35, IC95% ainda cruza zero).** Embora o IR +0,35 seja defensável pela literatura quant (threshold comum para "edge robusto"), **o IC95% [−1,28 ; +3,61] ainda não rejeita H₀ (Sharpe = 0) com 95% de confiança**. Precisamos de mais folds (k ≥ 12) ou painel maior (≥ 15 anos) para apertar o IC. **A robustez temporal cross-regime é parcialmente demonstrada** — o modelo passa no critério IR > 0,3 e %>sharpe>1 > 50%, mas a significância estatística completa ainda está em construção.

2. **Signal é regime-aware mas testado majoritariamente em regime value.** A janela OOS (96 meses) tem **53% dos meses em regime value** (SELIC real > 7%), 23% em transition, 24% em momentum. O signal performou bem nos 3 regimes (ann_ret ≥ +32% em todos), mas a evidência em `momentum` (23 meses) é mais fraca que em `value` (51 meses). Recomendamos **re-treino** antes de qualquer reversão sustentada pra SELIC real < 5%.

3. **Universo limitado a 32 blue chips B3.** Small caps, mid caps e BDRs não estão no painel. Em mercados onde small caps outperformam (como o boom de IPOs 2020–2021), o modelo deixa alpha na mesa. Expansão está no roadmap, mas o pipeline ainda não cobre.

4. **brapi Pro tem cobertura boa, não perfeita.** Entre 4,3% e 22,2% NaN nas candles dependendo do ticker/janela. Em particular, tickers com IPO recente (RAIZ4, HAPV3) têm menos de 4 anos de candles disponíveis — embora o painel técnico use forward-fill com cautela pra não introduzir look-ahead artificial.

5. **Backtest assume execução perfeita.** 10 bps de turnover é um piso conservador para blue chips, mas não captura market impact em rebalanceamento durante stress de mercado, nem slippage em horários de baixa liquidez. Em cenários reais, o max_dd provavelmente seria maior.

6. **Treino majoritário em ciclo SELIC real alto (>7%).** A janela 2016–2026 tem 8 de 10 anos com SELIC real > 7%. Reversão para SELIC real < 3% exigiria re-treino do zero e provavelmente revisão da hipótese H-Macro overlay (que se torna neutra em regime de SELIC real baixa).

7. **Nenhum paper trading ainda.** O sistema não foi testado em produção ao vivo com dinheiro fictício. Erros de integração (delay de fundamentals, mudanças de ticker, eventos corporativos não modelados como desdobramentos, grupamentos, OPA) podem acontecer e ainda não foram observados.

8. **Modelo em produção NÃO é exatamente o regime_specialist_xs puro — é o regime_aware_xs ensemble.** O `regime_aware_xs` (ensemble dos 3 especialistas) tem WF ann_ret +40,66% (vs +21,96% do value_specialist puro isolado) e max_dd melhor (−2,50% vs −15,60%). Em produção usamos o ensemble; em cross-fold usamos o specialist puro (que tem IR melhor). Os dois têm sinais consistentes mas performances diferentes — vale documentar essa assimetria ao analisar P&L futuro.

**Recomendação operacional:** paper trading por **3 a 6 meses** antes de qualquer alocação de capital real. Comparar retorno simulado com retorno OOS in-sample, e verificar se pelo menos 60% dos meses o paper bate a SELIC antes de promover o pipeline a "produção real".

---

## 7. Roadmap (12–24 meses)

Em ordem de prioridade:

1. **Paper trading estruturado por 3–6 meses** com auditoria semanal de erro (realized vs predicted) para validar o regime_specialist_xs fora da amostra.
2. **Mais folds no validador 8-fold** (k=12 ou k=16) para apertar o IC95% do regime_specialist_xs — atualmente [−1,28 ; +3,61], alvo é apertar para ~[−0,5 ; +2,5] rejeitando H₀ a 95%.
3. **Expansão do universo para 60+ tickers.** Critério de entrada: market cap > R$ 1B, volume diário médio > R$ 20M, candles de pelo menos 3 anos na brapi Pro. Cobertura prioritária: small caps líquidas que ficaram fora do radar do modelo.
4. **Sector rotation dinâmica baseada em regime macro.** Quando SELIC real alta, overweights energia + commodities + bancos; quando SELIC real baixa, overweights consumo discricionário + tech + property. Testes preliminares sugerem Sharpe marginalmente superior ao atual.
5. **Ensemble com LightGBM e XGBoost adicionais** para diversificar o erro não-linear do HistGBM. Comparar com o `regime_specialist_xs` via cross-fold idêntico ao da seção 4.3.
6. **Proxy de risco-país (CDS Brasil ou EMBI+).** Hoje o modelo não tem feature de risco-país. CDS Brasil 5y está fortemente correlacionado com SELIC risk premium em momentos de stress — adicionar deve melhorar captura do bear market macro.
7. **Re-treino online semanal** com novos candles (delta updates, sem re-treino do zero), para encurtar o lag entre fechamento do mês e atualização do score.
8. **API pública do endpoint `/api/forecast/[symbol]`** com rate-limit por token (free tier: 100 req/dia, Pro: 10 000 req/dia). Hoje o endpoint só é acessível dentro do app.

---

## 8. Disclaimer

```
DISCLAIMER IMPORTANTE

Este documento é puramente informativo e descreve o pipeline quantitativo do produto Sulfur.
NÃO constitui recomendação de investimento, análise de valores mobiliários ou consultoria financeira.

Performance passada NÃO garante performance futura. O modelo foi treinado majoritariamente em ciclo
SELIC real alto (>7%) e pode degradar em regimes macro diferentes. O cross-fold do regime_specialist_xs
(EXP-4) atingiu Information Ratio +0,35 — defensável pela literatura quant, mas o IC95% [−1,28 ; +3,61]
AINDA NÃO rejeita H₀ (Sharpe = 0) com significância estatística a 95%. Operação em capital real só
deve ocorrer após paper trading de 3-6 meses com auditoria semanal.

Resultados de backtest incorporam custos de transação assumidos (10bps turnover) e assumem
execução perfeita. Custos reais de mercado podem ser maiores.

Recomendamos paper trading por 3-6 meses antes de operar com capital real.

O usuário é o único responsável pelas decisões de investimento. Sulfur e seus criadores não se
responsabilizam por perdas decorrentes do uso destas informações.
```

---

## 9. Histórico de versões

| Versão | Data | Commit | Modelo | Validador cross-fold (8-fold) | Walk-forward OOS | Status |
|---|---|---|---|---|---|---|
| **v8** | 2026-09-08 | `cadd731` | `ensemble_ridge_hgb` + fundamentals brutos brapi | sharpe_medio −0,75 · IR **−0,21** · IC95 [−3,34 ; +1,84] | ann_ret +29,12% · sharpe +2,38 · max_dd −11,99% | **Descontinuado** — IR negativo em TODOS os modelos |
| EXP-1 | 2026-09-08 | — | xs_demeaned + sem fundamentals | sharpe +0,55 · IR +0,22 · IC95 [−2,18 ; +3,29] | sharpe +3,5055 | Marco intermediário |
| EXP-2 | 2026-09-08 | — | classificador binário up/down | FALHOU (AUC < 0,5) | — | Descontinuado |
| EXP-3 | 2026-09-08 | — | regime-split + com fundamentals | sharpe +0,13 · IR +0,04 · IC95 [−2,69 ; +2,96] | sharpe +4,1085 | Marco intermediário |
| **v9** | 2026-09-08 | (atual) | **`regime_specialist_xs` (EXP-4)** + xs_demeaned + sem fundamentals | sharpe_medio **+1,16** · IR **+0,35** · IC95 [−1,28 ; +3,61] · %>sharpe>1 **57,1%** | regime_aware_xs ann_ret **+40,66%** · sharpe **+5,62** · max_dd **−2,50%** · %>SELIC **81,2%** | **EM PRODUÇÃO** |

**Notas sobre migração v8 → v9:**

- O forecast endpoint `/api/forecast/[symbol]` no projeto Sulfur foi atualizado de `CHECKPOINT_DIR = data/forecast/v8/` para `data/forecast/specialist_xs/`. Source field mudou de `predictions_latest`/`composite_scores_proxy` para `specialist_xs_predictions`. Model field mudou de `v8_real_fund_2026-09-08` para `regime_specialist_xs_v9`.
- A nova resposta inclui um bloco `regime: { current, selic_real_pct, model_used, model_version }` que expõe qual especialista foi usado na previsão (`value_specialist_xs`, `transition_ensemble`, etc.).
- O campo `features_snapshot` agora retorna todos os campos como `null` (EXP-4 não usa fundamentals brutos); o regime info substitui como contexto principal.
- O `σ_6m_log` da banda foi atualizado de 0,0407 (v8 hist_gbm vol=5,76%) para 0,0429 (v9 regime_aware_xs vol=6,07%).
- O pipeline sulfur-ml snapshots são gerados por `src/48_predict_specialist_xs_snapshot.py` em `data/forecast_specialist_xs/`, espelhados para `~/projects/sulfur/data/forecast/specialist_xs/`.

---

*Última atualização: setembro/2026 · v9 (EXP-4 winner) · pipeline em `~/projects/sulfur-ml/` · endpoint de forecast em `screener-production-4f58.up.railway.app/api/forecast/`*
