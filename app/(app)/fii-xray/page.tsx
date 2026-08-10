"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  symbol: string;
  name: string | null;
  class: string;
  price: number | null;
  ttmDividendsPerShare: number;
  yieldAnnual: number | null;
  consecutivePayments: number;
};

const BR = "\u{1F1E7}\u{1F1F7}";

export default function FiiXRayPage() {
  return (
    <Suspense fallback={<XRayFallback />}>
      <XRayInner />
    </Suspense>
  );
}

function XRayFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-64" />
    </div>
  );
}

function XRayInner() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/fii-xray")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => setRows([]));
  }, []);

  const byClass = useMemo(() => {
    if (!rows) return null;
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.class, (map.get(r.class) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Início
      </Link>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Raio-X de FIIs {BR}
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Comparação dos FIIs mais líquidos: classe do imóvel, dividend
            yield anual e consistência dos pagamentos mensais. Vacância,
            localização geográfica e histórico de imóveis precisam do
            <code className="text-[11px] bg-surface-elevated px-1.5 py-0.5 ml-1">/fii/&#123;symbol&#125;/properties</code>
            que a Brapi bloqueia por anti-bot.
          </p>
        </div>
      </div>

      {!rows ? (
        <Skeleton className="h-64 my-4" />
      ) : (
        <>
          {byClass && (
            <section className="mb-6">
              <h2 className="font-display text-[18px] text-ink tracking-[-0.02em] mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-deep" />
                Distribuição por classe de imóvel
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {byClass.map(([cls, count]) => (
                  <div
                    key={cls}
                    className="border border-hairline-strong bg-surface-elevated p-3"
                  >
                    <div className="text-[10.5px] uppercase tracking-widest text-muted">
                      {cls}
                    </div>
                    <div className="num text-[18px] text-ink mt-1">{count}</div>
                    <div className="text-[10.5px] text-faint mt-0.5">
                      {((count / rows.length) * 100).toFixed(0)}% da amostra
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-display text-[18px] text-ink tracking-[-0.02em] mb-3">
              Detalhamento por FII
            </h2>
            <div className="border border-hairline-strong overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                    <th className="text-left py-2 px-3 font-medium">Ticker</th>
                    <th className="text-left py-2 px-3 font-medium">Classe</th>
                    <th className="text-right py-2 px-3 font-medium">Preço</th>
                    <th className="text-right py-2 px-3 font-medium">TTM div/sh</th>
                    <th className="text-right py-2 px-3 font-medium">Yield anual</th>
                    <th className="text-right py-2 px-3 font-medium">Meses seguidos</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.symbol}
                      className={cn(
                        "border-b border-hairline last:border-0 hover-row",
                        i % 2 === 0 ? "bg-canvas" : "bg-surface-elevated",
                      )}
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/asset/${encodeURIComponent(r.symbol)}`}
                          className="num font-medium text-ink hover:text-brand-deep"
                        >
                          {r.symbol}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-[11.5px] text-ink">{r.class}</td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.price != null ? `R$${r.price.toFixed(2)}` : "\u2014"}
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {r.ttmDividendsPerShare > 0
                          ? `R$${r.ttmDividendsPerShare.toFixed(2)}`
                          : "\u2014"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          r.yieldAnnual == null
                            ? "text-faint"
                            : r.yieldAnnual >= 10
                              ? "text-positive"
                              : r.yieldAnnual >= 7
                                ? "text-warning"
                                : "text-ink",
                        )}
                      >
                        {r.yieldAnnual != null
                          ? formatPercent(r.yieldAnnual)
                          : "\u2014"}
                      </td>
                      <td className="py-2 px-3 num text-right text-muted">
                        {r.consecutivePayments > 0
                          ? `${r.consecutivePayments}`
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted mt-3 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Vacância e endereço dos imóveis requerem acesso a /fii/&lt;ticker&gt;/properties (bloqueado).
              Atualize para Brapi Pro com permissão de imóveis quando disponível.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
