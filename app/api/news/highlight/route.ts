/**
 * /api/news/highlight — Notícia do dia pra /home.
 *
 * Algoritmo (commit 2 — 2026-09-06):
 *   1. Pega top N notícias B3 do dia (BRT 00:00 → agora).
 *   2. Extrai tickers mencionados (campo `ticker` que `news-aggregator`
 *      já calcula server-side via regex + `COMPANY_TICKERS` keywords).
 *   3. Busca cotação dos IBOVESPA em batch (78 tickers, ~4 requests
 *      brapi de 19). Ordena por volume desc — pega o ticker com
 *      MAIOR volume que aparece nas notícias de hoje.
 *   4. Retorna essa notícia + ticker + volume.
 *
 * Edge cases:
 *   - Sem notícia do dia → `null` (UI mostra "Sem destaque do dia").
 *   - Sem match de ticker → tenta próxima notícia (segundo maior
 *     volume match). Se nenhuma bater, retorna null.
 *   - Domingo/feriado: feed pode ter parado sexta — usa notícias das
 *     últimas 36h pra não ficar vazio.
 */

import { NextResponse } from "next/server";

import { fetchB3ActionsNews } from "@/lib/news-aggregator";
import { IBOV } from "@/lib/ibovespa";
import { getBrapiQuoteBatchLight } from "@/lib/brapi-quote-batch";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function GET(): Promise<NextResponse> {
  // 1) Notícias: usa TODAS do feed (sem filtro de janela). O card "Notícia
  //    do dia" aceita manchete de "ontem" / "sexta" em fim de semana
  //    quando o feed parou — usuário prefere ver UM destaque do que
  //    um card vazio. Volume negociado é sempre do dia corrente,
  //    então se a manchete é de sexta, o "top volume" continua sendo
  //    o ticker de hoje (que pode não bater com a manchete).
  const newsRaw = await fetchB3ActionsNews(40);

  if (newsRaw.length === 0) {
    return NextResponse.json({ highlight: null });
  }

  // 2) Tickers únicos mencionados nas notícias.
  const mentioned = new Set<string>();
  for (const n of newsRaw) {
    if (n.ticker) mentioned.add(n.ticker.toUpperCase());
  }

  if (mentioned.size === 0) {
    return NextResponse.json({ highlight: null });
  }

  // 3) Cotações dos IBOVESPA. Filtra só os mencionados pra economizar
  //    chamadas — se um ticker não tá no IBOV, cai pro fallback
  //    (notícia sem volume confirmado).
  const ibovSymbols = IBOV.map((i) => i.symbol);
  const candidates = [...mentioned].filter((s) => ibovSymbols.includes(s));

  if (candidates.length === 0) {
    // Sem candidato na lista IBOV — pega a notícia mais recente mesmo.
    const top = newsRaw[0]!;
    return NextResponse.json({
      highlight: {
        ticker: top.ticker ?? null,
        headline: top.title,
        source: top.source,
        url: top.url,
        publishedAt: top.publishedAt,
        volume: null,
      },
    });
  }

  const quoteMap = await getBrapiQuoteBatchLight(candidates);

  // 4) Ranking: maior volume negociado.
  const ranked = candidates
    .map((sym) => {
      const q = quoteMap.get(sym);
      return {
        symbol: sym,
        volume: q?.volume ?? 0,
        longName: q?.longName ?? null,
      };
    })
    .sort((a, b) => b.volume - a.volume);

  // 5) Pega notícia cujo ticker é o top-volume. Se a notícia
  //    específica não estiver em `todays` (ex: ticker veio de keyword
  //    matching mas a notícia usada outro nome), pega a próxima.
  for (const r of ranked) {
    const match = newsRaw.find(
      (n) => n.ticker?.toUpperCase() === r.symbol,
    );
    if (match) {
      return NextResponse.json({
        highlight: {
          ticker: r.symbol,
          longName: r.longName,
          headline: match.title,
          source: match.source,
          url: match.url,
          publishedAt: match.publishedAt,
          volume: r.volume,
        },
      });
    }
  }

  // Nenhuma match exata → primeira notícia do feed mesmo.
  const top = newsRaw[0]!;
  return NextResponse.json({
    highlight: {
      ticker: top.ticker ?? null,
      headline: top.title,
      source: top.source,
      url: top.url,
      publishedAt: top.publishedAt,
      volume: ranked[0]?.volume ?? null,
    },
  });
}