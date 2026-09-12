/**
 * sector-map.ts — fallback estático de sector pra ações B3.
 *
 * Por que existe: a brapi tem buraco em ~15% dos tickers ativos no
 * `/v2/stocks/profile` (KLBN4, SANB4, RENT4, BPAC5, ENGI4, AXIA7, CGAS7
 * etc retornam `data: {}`). O `/v2/tickers` cobre 781 dos 782 ativos
 * B3 com sector. Esse JSON é gerado a partir de uma varredura da
 * brapi + tabela de tradução EN→PT (B3 usa PT no site oficial).
 *
 * Cadeia de fallback (no /api/assets/quote):
 *   b.sector (brapi quote) → IBOV_BY_SYMBOL → SECTOR_BY_SYMBOL → "—"
 *
 * Atualizar: rodar `node scripts/map-sectors.js`, mover o JSON pra
 * lib/sectors.json, commit.
 */
import sectorsData from "./sectors.json";

export type SectorEntry = {
  /** Setor B3 canônico em PT-BR (ex: "Financeiro", "Utilidades Públicas"). */
  sector: string;
  /** Subsetor brapi em inglês (mantido como granular — brapi é fraco em PT subsetor). */
  subsectorEn: string;
  /** Setor original brapi em inglês (mantido pra auditoria). */
  sectorEn: string;
};

const SECTOR_BY_SYMBOL = sectorsData as Record<string, SectorEntry>;

export { SECTOR_BY_SYMBOL };
