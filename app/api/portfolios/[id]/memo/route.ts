import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cached } from "@/lib/cache";
import { SP500 } from "@/lib/snp500";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Strategy memo: explains WHY each holding was chosen.
 * Returns:
 *  - spec: { category, riskLevel, thesis, criteria, risks, expectedBehavior }
 *  - sectorExposure: { sector: weight } - portfolio composition
 *  - perHoldingRationale: { symbol: { sector, industry, rationale } }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);

  // Load portfolio
  const rows = await query<{
    name: string;
    description: string;
    initial_value: number;
    is_public: boolean;
    symbol: string | null;
    weight: number | null;
  }>(
    `SELECT p.name, p.description, p.initial_value, p.is_public, ph.symbol, ph.weight
     FROM portfolios p
     LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
     WHERE p.slug = $1 OR p.id = $2`,
    [id, numericId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const portfolio = rows[0];
  const holdings = rows
    .filter((r) => r.symbol && r.weight != null)
    .map((r) => ({ symbol: r.symbol!, weight: r.weight! }));

  if (holdings.length === 0) {
    return NextResponse.json({
      spec: getDefaultSpec(portfolio.name),
      sectorExposure: {},
      perHoldingRationale: {},
    });
  }

  // Compute sector exposure
  const sectorExposure: Record<string, number> = {};
  const perHolding: Record<string, { sector: string; industry?: string; rationale: string }> = {};

  for (const h of holdings) {
    const sector = SP500.find((s) => s.symbol === h.symbol)?.sector ?? "Other";
    sectorExposure[sector] = (sectorExposure[sector] ?? 0) + h.weight;
    perHolding[h.symbol] = {
      sector,
      industry: undefined,
      rationale: `Mantida com peso ${(h.weight * 100).toFixed(1)}%. ${rationaleFor(sector, h.weight)}`,
    };
  }

  // Detect portfolio category & risk from composition
  const totalConcentration = Object.values(sectorExposure).sort((a, b) => b - a);
  const topSectorShare = totalConcentration[0] ?? 0;
  const diversification = 1 - totalConcentration.reduce((a, b) => a + b * b, 0); // 0..1

  // Pick category heuristically
  const spec = getSpecFor(
    portfolio.name,
    portfolio.description,
    holdings,
    sectorExposure,
    topSectorShare,
    diversification,
  );

  return NextResponse.json({
    spec,
    sectorExposure,
    perHoldingRationale: perHolding,
  });
}

function rationaleFor(sector: string, weight: number): string {
  const pct = (weight * 100).toFixed(1);
  const heavy = weight > 0.2 ? "Posição significativa" : "Posição complementar";
  return `${heavy} em ${sector} (${pct}% do portfolio).`;
}

function getSpecFor(
  name: string,
  description: string,
  holdings: { symbol: string; weight: number }[],
  sectors: Record<string, number>,
  topSectorShare: number,
  diversification: number,
) {
  const lower = (name + " " + description).toLowerCase();

  // Heuristics by name/description
  if (lower.includes("tech") || lower.includes("growth")) {
    return {
      category: "growth" as const,
      riskLevel: "aggressive" as const,
      thesis:
        "Foco em empresas de tecnologia e crescimento, com potencial de valorização acima da média em ciclos longos de mercado.",
      criteria: [
        "Setor predominantemente Tech + Communication Services",
        "Market cap médio acima de USD 100B para reduzir risco idiosyncratic",
        "Receita YoY > 15% (tração comprovada)",
        "ROE > 15% (capital efficiency)",
      ],
      risks: [
        "Sensível a mudanças em juros longos (afeta múltiplos de growth)",
        "Concentração setorial aumenta drawdown em correções de tech",
        "Valuation elevado torna o portfolio sensível a earnings misses",
      ],
      expectedBehavior:
        "Em ciclos de baixa de juros: outperform. Em recessões: drawdown maior que o mercado. Volatilidade esperada > 20% annualized.",
    };
  }
  if (lower.includes("income") || lower.includes("yield") || lower.includes("dividend")) {
    return {
      category: "income" as const,
      riskLevel: "conservative" as const,
      thesis:
        "Geração de renda passiva com sustentabilidade, combinando ações pagadoras de dividendo com bonds de qualidade.",
      criteria: [
        "Dividend yield > 3% em ações",
        "Payout ratio < 70% (sustentabilidade do dividendo)",
        "ROE > 10% (empresas lucrativas)",
        "Mix de bonds de qualidade (BND/TLT) reduz volatilidade",
      ],
      risks: [
        "Queda de taxa de juros reduz yield agregado",
        "Empresas com payout alto podem cortar dividendo em recessão",
        "Bonds longos (TLT) perdem valor em cenário de inflação alta",
      ],
      expectedBehavior:
        "Em ambientes de juros estáveis: retorno estável + yield corrente. Em quedas de juros: bonds disparam, ações têm múltiplos pressionados.",
    };
  }
  if (lower.includes("balanced") || lower.includes("60/40")) {
    return {
      category: "blend" as const,
      riskLevel: "moderate" as const,
      thesis:
        "Estratégia clássica de alocação balanceada, otimizando o trade-off entre retorno e risco através de diversificação entre equity e bonds.",
      criteria: [
        "60% ações (S&P 500) + 40% bonds (BND) — pesos fixos",
        "Rebalanceamento trimestral automático",
        "Diversificação implícita via exposição ao mercado americano",
        "Bonds de alta qualidade creditícia",
      ],
      risks: [
        "Em ambiente de inflação persistente, ambos os lados podem cair simultaneamente (correlação negativa quebra)",
        "Rebalanceamento em bear market (compra na queda) é psicologicamente difícil",
      ],
      expectedBehavior:
        "Volatilidade esperada ~10% annualized. Drawdown típico -15% a -25% em crises. Bom pra horizonte longo.",
    };
  }
  if (lower.includes("value") || lower.includes("deep value")) {
    return {
      category: "value" as const,
      riskLevel: "moderate" as const,
      thesis:
        "Compra de empresas descontadas com fundamentos sólidos (Piotroski F-Score alto), esperando que o mercado reconheça seu valor intrínseco.",
      criteria: [
        "P/VP < 1.5 (desconto sobre valor patrimonial)",
        "P/L < 12 (valuation atrativo)",
        "P/FCF > 8% (gera caixa real)",
        "Piotroski F-Score >= 7 (saúde financeira)",
      ],
      risks: [
        "Value traps — empresas baratas podem ficar mais baratas",
        "Subperformance em mercados de growth (tendência secular)",
        "Necessita paciência: pode levar anos pra mean-reversion",
      ],
      expectedBehavior:
        "Ciclos de value rotation: outperform. Mercados de growth: pode underperform. Outperformance vem em crises.",
    };
  }
  if (lower.includes("small cap") || lower.includes("small-cap")) {
    return {
      category: "thematic" as const,
      riskLevel: "aggressive" as const,
      thesis:
        "Exposição a small caps com fundamentos sólidos — empresas menores têm mais espaço pra crescer, mas com risco elevado.",
      criteria: [
        "Market cap entre USD 2-15B",
        "ROIC > 12% (eficiência de capital)",
        "Dívida/EBITDA < 2x (saúde financeira)",
        "ROE > 15% (qualidade operacional)",
      ],
      risks: [
        "Liquidez reduzida — vendas em pânico amplificam queda",
        "Maior risco de falência em recessões",
        "Análise de small caps é menos coberta por analistas",
      ],
      expectedBehavior:
        "Em ciclos de bull: outperform mercado. Em recessões: drawdown severo. Volatilidade esperada > 25%.",
    };
  }
  // Default: heuristic from composition
  return {
    category: topSectorShare > 0.5 ? ("thematic" as const) : ("blend" as const),
    riskLevel: diversification < 0.5 ? ("aggressive" as const) : ("moderate" as const),
    thesis: `${holdings.length} ativos com exposição diversificada entre ${Object.keys(sectors).length} setores. ` +
      `Concentração no maior setor: ${(topSectorShare * 100).toFixed(1)}%. ` +
      `Diversificação estimada: ${(diversification * 100).toFixed(0)}% (escala 0-100%).`,
    criteria: [
      `${holdings.length} holdings selecionados via critério customizado`,
      `Exposição a ${Object.keys(sectors).length} setores GICS`,
      `Peso máximo por ativo: ${(Math.max(...holdings.map((h) => h.weight)) * 100).toFixed(1)}%`,
      "Rebalanceamento manual pelo criador",
    ],
    risks: [
      `Top 3 setores concentram ${(((Object.values(sectors).sort((a, b) => b - a)[0] ?? 0) + (Object.values(sectors).sort((a, b) => b - a)[1] ?? 0) + (Object.values(sectors).sort((a, b) => b - a)[2] ?? 0)) * 100).toFixed(0)}% do portfolio`,
      "Performance depende da qualidade das escolhas individuais",
      "Sem sinal sistemático de rebalanceamento — risco de drift",
    ],
    expectedBehavior:
      "Performance atrelada à qualidade das escolhas. Diversificação protege contra eventos idiossincráticos mas não contra eventos setoriais.",
  };
}

function getDefaultSpec(name: string) {
  return {
    category: "blend" as const,
    riskLevel: "moderate" as const,
    thesis: `Portfolio ${name}. Configure os critérios de seleção para gerar uma tese detalhada.`,
    criteria: ["Critérios a definir"],
    risks: ["Riscos a definir"],
    expectedBehavior: "Comportamento esperado a definir.",
  };
}