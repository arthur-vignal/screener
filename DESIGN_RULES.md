# Design Rules — Sulfur

Contrato de design vivo pra o projeto **Sulfur**. Este arquivo é a **referência humana** — `DESIGN_RULES.md` é o que devs/PR reviewers leem. A versão automatizada (carregada em skill pelo Kibo) está em `~/.hermes/skills/sulfur-ui-rules/SKILL.md`.

> Última revisão: 2026-08-27 (após UI Audit)
> Audiado contra: `lib/`, `components/`, `app/`, `app/globals.css`
> Status: tokens travados, **não mexer em código existente fora da lista negra sem aprovação explícita**.

---

## Como usar este documento

1. Antes de adicionar UI nova, leia as seções relevantes (1 a 9).
2. Antes de commitar, marque o checklist da seção 10.
3. Se for mudar uma regra: abra PR explicando o motivo e o que quebra.
4. Se precisar quebrar uma regra (urgência, deadline): documente no commit por quê e abra follow-up.

---

## 1. Tokens travados

### 1.1 Cor

**Cores semânticas (USE estas, nunca hex inline):**

| Token | Hex | Uso |
|---|---|---|
| `--positive` | `#4dbe95` | Variação positiva de preço/métrica |
| `--positive-soft` | `rgba(77, 190, 149, 0.13)` | Fundo de chip/badge de variação + |
| `--negative` | `#d84f68` | Variação negativa |
| `--negative-soft` | `rgba(216, 79, 104, 0.13)` | Fundo de chip/badge de variação − |
| `--primary` | `#489ffa` | Ação primária (azul accent) |
| `--foreground` | `#eeeff1` | Texto primário (light mode dark theme) |
| `--background` | `#070709` | Canvas dark |
| `--muted-foreground` | `#9ba1a8` | Texto secundário |
| `--border` | `rgba(238, 239, 241, 0.10)` | Hairlines |

**Cor de marca (ticker):** use `BRAND_COLOR[symbol]` de `lib/brand-colors.ts` para tinting de fundo e chip de news. Não hardcode hex.

### 1.2 Radius

Escala fechada — use apenas:

| Token | Valor | Quando |
|---|---|---|
| `rounded-md` | 6px | Botões, chips, inputs |
| `rounded-lg` | 8px (default) | Cards pequenos, KPI tiles |
| `rounded-xl` | 12px | Cards médios |
| `rounded-2xl` | 16px | Containers principais, seções |
| `rounded-full` | 50% | **APENAS** avatares circulares (logos de ticker) e dots |

❌ Proibido: `rounded-[Xpx]` hardcoded, `rounded-sm`, `rounded-3xl`.

### 1.3 Tipografia

Escala fechada — use apenas:

| px | Quando |
|---|---|
| 10px | Label uppercase tracking-wide |
| 11px | Label minúsculo, eyebrow |
| 12px | Body small, metadata |
| 14px | Body default, parágrafos |
| 16px | Subtítulos pequenos |
| 20px | Subtítulos |
| 24px | Títulos de seção |
| 32px | Headlines de página |
| 48px+ | Display / hero |

❌ Proibido: 9.5, 10.5, 11.5, 12.5, 13.5, 13 (não múltiplo de 2 da escala). Se precisar de meio-pixel, use `rem` em vez de px.

Fonte: `--font-manrope` (já carregada). Não adicione nova fonte.

### 1.4 Spacing

Múltiplos de 4. Escala Tailwind padrão (`gap-2`, `p-4`, `mt-8`, etc).

❌ Proibido: `p-[13px]`, `mt-[7px]`, qualquer valor que não seja `0/1/2/3/4/6/8/12/16/20/24` em unidades Tailwind.

---

## 2. Ícones

**Use exclusivamente `lucide-react`.**

```tsx
import { ChevronLeft, ArrowUp, ArrowDown } from "lucide-react";
```

**Tamanhos por contexto:**
| Contexto | size | classe Tailwind |
|---|---|---|
| Inline em texto | 14px | `h-3.5 w-3.5` |
| Botão | 16px | `h-4 w-4` |
| Botão grande | 20px | `h-5 w-5` |
| Standalone (header) | 24px | `h-6 w-6` |

**stroke-width:** default (2). Reduzir para 1.5 só em ícones inline muito pequenos.

❌ Proibido: emoji, react-icons, heroicons, phosphor, SVGs inline (exceto logos de ticker).

---

## 3. Variações positivas/negativas (daltonismo)

**Sempre sinal redundante.** Cor sozinha não basta — daltonismo afeta ~8% dos homens.

```tsx
// ✅ CERTO — seta + cor + sinal de +/−
<span className="text-[var(--positive)] flex items-center gap-1">
  <ArrowUp className="h-3 w-3" />+2,4%
</span>

// ✅ CERTO — cor + sinal explícito
<span className="text-[var(--positive)]">+R$ 1.234,56</span>

// ❌ ERRADO — só cor
<span className="text-emerald-300">2,4%</span>

// ❌ ERRADO — sinal sozinho sem cor (não acessível)
<span>+2,4%</span>
```

**Regras:**
- Positivo: cor `--positive` + `ArrowUp` (ou seta customizada) + `+` antes do número
- Negativo: cor `--negative` + `ArrowDown` (ou seta customizada) + sem `+` ou com `−`
- Zero: cinza `--muted-foreground`, sem seta, sem `+`/`−`

---

## 4. Hierarquia de ação

Por tela / grupo de botões:

| Tipo | Visual | Variante shadcn | Quando |
|---|---|---|---|
| Primária | Preenchida azul `--primary` | `variant="default"` | 1 por tela, ação principal |
| Secundária | Outline `border-white/10` `bg-white/[0.04]` | `variant="outline"` | Até 2-3 por tela |
| Terciária | Ghost transparente | `variant="ghost"` | Ações frequentes, baixa ênfase |
| Destrutiva | Vermelho outline | `variant="destructive"` | Excluir, remover |

❌ Proibido: dois botões `variant="default"` na mesma tela. Exceção: se um estiver disabled.

---

## 5. Estados reais

Toda lista, tabela, gráfico, KPI tile e rota com dado deve ter **3 estados explícitos**:

### 5.1 Loading
Use `<Skeleton>` de `components/ui/skeleton.tsx`. Skeleton com a **forma do conteúdo final** — mesma altura/largura, mesma posição. NUNCA spinner centralizado em página de dados.

```tsx
// ✅ CERTO — 3 linhas com altura de KPI tile
<div className="space-y-2">
  <Skeleton className="h-3 w-20" />
  <Skeleton className="h-8 w-32" />
</div>

// ❌ ERRADO
<div className="flex items-center justify-center py-12">
  <Loader2 className="h-6 w-6 animate-spin" />
  Carregando…
</div>
```

### 5.2 Empty
Quando `data === null`, `data === []`, ou filtro retorna vazio. **Sempre com ação de saída.**

```tsx
{data?.length === 0 && (
  <div className="py-12 text-center space-y-3">
    <p className="text-[14px] text-muted-foreground">
      Sem histórico de dividendos para este ativo.
    </p>
    <p className="text-[12px] text-muted-foreground/60">
      Pode ser uma empresa nova na B3 ou sem política de proventos.
    </p>
  </div>
)}
```

❌ Proibido: `null` retornado pelo componente, `—` único sem contexto.

### 5.3 Error
Diz **o que falhou** e **o que fazer**. Sem "Ops!", sem "Desculpe". Tom direto.

```tsx
// ✅ CERTO
<div className="py-12 text-center space-y-2">
  <p className="text-[14px]">Falha ao carregar histórico de dividendos.</p>
  <p className="text-[12px] text-muted-foreground">
    Tente recarregar a página. Se persistir, o dado pode não estar disponível na Brapi.
  </p>
  <button onClick={retry} className="...">Recarregar</button>
</div>

// ❌ ERRADO
<p>Erro</p>
```

### 5.4 Diferenciação
Três estados distintos, não um só:
- **Sem dado para o período** (ex: histórico curto demais) → empty state com explicação
- **Erro de API** (timeout, 5xx) → error state com retry
- **Zero real** (ex: empresa nunca pagou dividendos) → empty state com explicação

---

## 6. Tabelas de dado financeiro

| Regra | Implementação |
|---|---|
| Numéricos à direita + tabular-nums | `<td className="text-right tabular-nums">` |
| Header sticky em tabela longa | `<thead className="sticky top-0 bg-background">` |
| Casas decimais | 2 para moeda, 1 para percentual, 2 para múltiplos. Decida e mantenha |
| Zebra OU divider (não os dois) | Só divider `border-border/40` em `<tr>` |
| Truncamento de nome | `<td className="max-w-[200px] truncate" title={full}>...` |

**Formatadores centralizados** (NÃO invente local):
- Moeda: `compactBRL(value)` de `lib/format.ts` (se não existir, crie em `lib/format.ts` primeiro)
- Percentual: `formatPercent(value, { decimals: 1 })`
- Múltiplo: `formatMultiple(value)` → `"12,4x"`
- Data: `formatDate(value)` PT-BR

---

## 7. Vocabulário travado

### 7.1 Verbos (escolha UM por ação)

| Ação | Verbo |
|---|---|
| Criar | `Criar` |
| Editar/Atualizar | `Editar` |
| Excluir | `Excluir` (NÃO "Remover" ou "Deletar") |
| Entrar | `Entrar` |
| Sair | `Sair` |
| Confirmar | `Confirmar` |

❌ Proibido: misturar "Criar"/"Adicionar"/"Novo". "Salvar" → `Criar` ou `Editar` conforme contexto.

### 7.2 Objetos

| Objeto | Nome na UI |
|---|---|
| Portfolio | `Carteira` |
| Watchlist | `Acompanhamento` |
| Ticker | `<SYM>` ou "ativo" (evitar "papel") |

❌ Proibido: alternar "carteira" / "portfólio" / "portfolio".

### 7.3 Case

- Sentence case em tudo: "Criar carteira" (NÃO "Criar Carteira")
- Labels uppercase só com `tracking-wide` (eyebrow)
- Botões: verbo em sentence case

### 7.4 Termos técnicos

Manter siglas inglesas quando é convenção de mercado:
- `P/L`, `P/VP`, `EV/EBITDA`, `ROIC`, `ROE`, `DY`, `FCF`, `WACC`
- Verbos: "Receita líquida" (NÃO "Net revenue")

---

## 8. Animação

**Permitido:**
- Fade de skeleton (`animate-pulse` no `<Skeleton>`)
- Transição de estado (cor, opacity)
- Hover micro-interaction (`transition-colors`, `transition-transform`)
- Page fade no `<PageFade>` (já configurado)

**Proibido:**
- Gradientes animados em loop (ex: `aurora-background`) — já removido da home, não reintroduzir
- Parallax, scroll-jacking
- Entrada de elementos pelas bordas (slide-in lateral)
- Count-up em KPI crítico sem propósito (já existe `AnimatedNumber` mas use com parcimônia)

**Respeitar** `prefers-reduced-motion` — globals.css já desabilita para usuários com essa preferência.

---

## 9. Composição de página

**Regra dos 3:** cada rota nova deve responder **uma pergunta** em uma frase. Componentes que não servem a essa pergunta não devem estar na rota.

**Drill-down do ticker (regras atuais):**
- `/asset/[symbol]` — "Quanto custa e como está o ativo hoje?"
- `/asset/[symbol]/about` — "O que essa empresa faz?"
- `/asset/[symbol]/profitability` — "Quão lucrativa é?"
- `/asset/[symbol]/valuation` — "Está caro ou barato?"
- `/asset/[symbol]/risk` — "Quão volátil e arriscado é?"
- `/asset/[symbol]/cashflow` — "Gera caixa de verdade?"
- `/asset/[symbol]/dividends` — "Paga dividendos? Quanto?"
- `/asset/[symbol]/return` — "De onde vem o retorno?"
- `/asset/[symbol]/score` — "Qual a nota agregada?"
- `/asset/[symbol]/value` — "Quem fica com o valor gerado?"
- `/asset/[symbol]/seasonality` — "Tem padrão sazonal?"

Antes de adicionar uma nova rota ou widget, escreva a frase-pergunta primeiro. Se a frase for "e também..." ou "além disso...", não faça.

---

## 10. Workflow ao adicionar UI

Antes de commitar uma mudança de UI nova:

- [ ] Usei só Lucide como ícone?
- [ ] Não tem emoji em lugar nenhum?
- [ ] Todas as cores hex são de tokens (`var(--positive)`, `var(--foreground)`, etc) — sem hex inline?
- [ ] Radius é da escala fechada (md/lg/xl/2xl/full apenas)?
- [ ] Font size é da escala fechada (10/11/12/14/16/20/24/32)?
- [ ] Spacing é múltiplo de 4 (Tailwind scale)?
- [ ] Tem os 3 estados (loading skeleton / empty explicativo / error com ação)?
- [ ] Variações +/− têm sinal redundante (seta OU `+`/`−`) além da cor?
- [ ] Sem dois botões `variant="default"` na mesma tela?
- [ ] Verbo único (Criar/Editar/Excluir, nunca misturar com Adicionar/Salvar/Remover)?
- [ ] Tabular-nums em colunas numéricas de tabela?
- [ ] Header sticky em tabela com scroll?
- [ ] Sentence case em todos os textos?

---

## 11. Lista negra (não mexer sem aprovação)

Código existente que viola o audit mas **não tocar** sem aprovação explícita:

- 47 cores hex inline espalhadas em 11 arquivos (especialmente `chart-card.tsx`, `news-card.tsx`, `metrics-table.tsx`) — refatoração cara, fazer em leva dedicada
- `rounded-full` em 58 lugares que NÃO são avatares — alguns são pills de filtro legítimos
- Tile components duplicados entre drill-downs (ROE em profitability + valuation) — mover leva dedicada
- `aurora-background` na landing — remover em leva dedicada
- Spinners "Carregando…" texto — substituir por skeleton em leva dedicada

Quando for mexer num arquivo da lista negra pra mudança pequena, **não** arrume os outros itens da lista negra junto. Mantenha o PR focado.

---

## Histórico

| Data | Mudança |
|---|---|
| 2026-08-27 | Auditoria inicial. Tokens travados. Skill `sulfur-ui-rules` criada. `DESIGN_RULES.md` publicado. |
