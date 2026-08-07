/**
 * IBOVESPA constituent list.
 * Source: B3 "IBOV - Carteira do Dia 07/08/26" (carteira teórica vigente em 2026-08-07).
 * Refreshed quarterly on B3 rebalanceamento. Update IBOV_AS_OF when refreshing.
 *
 * Setor follows B3 sector classification (PT-BR). Total: 78 constituintes.
 */

export type IbovEntry = {
  symbol: string;     // ticker without ".SA" suffix (e.g. "PETR4")
  yahoo: string;       // ticker with ".SA" suffix for Yahoo/Brapi (e.g. "PETR4.SA")
  name: string;        // short corporate name
  sector: string;      // B3 sector in PT-BR
};

export const IBOV_AS_OF = "2026-08-07";

export const IBOV: readonly IbovEntry[] = [
  { symbol: "ABEV3", yahoo: "ABEV3.SA", name: "Ambev S/A", sector: "Consumo Não Cíclico" },
  { symbol: "ALOS3", yahoo: "ALOS3.SA", name: "Allos", sector: "Imobiliário" },
  { symbol: "ASAI3", yahoo: "ASAI3.SA", name: "Assaí", sector: "Consumo Não Cíclico" },
  { symbol: "AURE3", yahoo: "AURE3.SA", name: "Auren Energia", sector: "Utilidades Públicas" },
  { symbol: "AXIA3", yahoo: "AXIA3.SA", name: "Axia Energia", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "AZZA3", yahoo: "AZZA3.SA", name: "Azzas 2154", sector: "Comércio" },
  { symbol: "B3SA3", yahoo: "B3SA3.SA", name: "B3", sector: "Financeiro" },
  { symbol: "BBAS3", yahoo: "BBAS3.SA", name: "Banco do Brasil", sector: "Financeiro" },
  { symbol: "BBDC3", yahoo: "BBDC3.SA", name: "Bradesco ON", sector: "Financeiro" },
  { symbol: "BBDC4", yahoo: "BBDC4.SA", name: "Bradesco PN", sector: "Financeiro" },
  { symbol: "BBSE3", yahoo: "BBSE3.SA", name: "BB Seguridade", sector: "Financeiro" },
  { symbol: "BEEF3", yahoo: "BEEF3.SA", name: "Minerva", sector: "Consumo Não Cíclico" },
  { symbol: "BPAC11", yahoo: "BPAC11.SA", name: "BTG Pactual", sector: "Financeiro" },
  { symbol: "BRAP4", yahoo: "BRAP4.SA", name: "Bradespar", sector: "Materiais Básicos" },
  { symbol: "BRAV3", yahoo: "BRAV3.SA", name: "Brava", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "BRKM5", yahoo: "BRKM5.SA", name: "Braskem", sector: "Materiais Básicos" },
  { symbol: "CEAB3", yahoo: "CEAB3.SA", name: "C&A Modas", sector: "Comércio" },
  { symbol: "CMIG4", yahoo: "CMIG4.SA", name: "Cemig", sector: "Utilidades Públicas" },
  { symbol: "CMIN3", yahoo: "CMIN3.SA", name: "CSN Mineração", sector: "Materiais Básicos" },
  { symbol: "COGN3", yahoo: "COGN3.SA", name: "Cogna Educação", sector: "Consumo Não Cíclico" },
  { symbol: "CPFE3", yahoo: "CPFE3.SA", name: "CPFL Energia", sector: "Utilidades Públicas" },
  { symbol: "CPLE3", yahoo: "CPLE3.SA", name: "Copel", sector: "Utilidades Públicas" },
  { symbol: "CSAN3", yahoo: "CSAN3.SA", name: "Cosan", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "CSMG3", yahoo: "CSMG3.SA", name: "Copasa", sector: "Utilidades Públicas" },
  { symbol: "CSNA3", yahoo: "CSNA3.SA", name: "Siderúrgica Nacional", sector: "Materiais Básicos" },
  { symbol: "CURY3", yahoo: "CURY3.SA", name: "Cury", sector: "Consumo Cíclico" },
  { symbol: "CXSE3", yahoo: "CXSE3.SA", name: "Caixa Seguridade", sector: "Financeiro" },
  { symbol: "CYRE3", yahoo: "CYRE3.SA", name: "Cyrela Realty", sector: "Consumo Cíclico" },
  { symbol: "DIRR3", yahoo: "DIRR3.SA", name: "Direcional", sector: "Consumo Cíclico" },
  { symbol: "EGIE3", yahoo: "EGIE3.SA", name: "Engie Brasil", sector: "Utilidades Públicas" },
  { symbol: "EMBJ3", yahoo: "EMBJ3.SA", name: "Embraer", sector: "Bens Industriais" },
  { symbol: "ENEV3", yahoo: "ENEV3.SA", name: "Eneva", sector: "Utilidades Públicas" },
  { symbol: "ENGI11", yahoo: "ENGI11.SA", name: "Energisa", sector: "Utilidades Públicas" },
  { symbol: "EQTL3", yahoo: "EQTL3.SA", name: "Equatorial", sector: "Utilidades Públicas" },
  { symbol: "FLRY3", yahoo: "FLRY3.SA", name: "Fleury", sector: "Saúde" },
  { symbol: "GGBR4", yahoo: "GGBR4.SA", name: "Gerdau", sector: "Materiais Básicos" },
  { symbol: "GOAU4", yahoo: "GOAU4.SA", name: "Gerdau Met", sector: "Materiais Básicos" },
  { symbol: "HAPV3", yahoo: "HAPV3.SA", name: "Hapvida", sector: "Saúde" },
  { symbol: "HYPE3", yahoo: "HYPE3.SA", name: "Hypera", sector: "Saúde" },
  { symbol: "IGTI11", yahoo: "IGTI11.SA", name: "Iguatemi", sector: "Imobiliário" },
  { symbol: "ISAE4", yahoo: "ISAE4.SA", name: "ISA Energia", sector: "Utilidades Públicas" },
  { symbol: "ITSA4", yahoo: "ITSA4.SA", name: "Itausa", sector: "Financeiro" },
  { symbol: "ITUB4", yahoo: "ITUB4.SA", name: "Itaú Unibanco", sector: "Financeiro" },
  { symbol: "KLBN11", yahoo: "KLBN11.SA", name: "Klabin", sector: "Materiais Básicos" },
  { symbol: "LREN3", yahoo: "LREN3.SA", name: "Lojas Renner", sector: "Comércio" },
  { symbol: "MBRF3", yahoo: "MBRF3.SA", name: "Marfrig", sector: "Consumo Não Cíclico" },
  { symbol: "MGLU3", yahoo: "MGLU3.SA", name: "Magazine Luiza", sector: "Comércio" },
  { symbol: "MOTV3", yahoo: "MOTV3.SA", name: "Motiva", sector: "Bens Industriais" },
  { symbol: "MRVE3", yahoo: "MRVE3.SA", name: "MRV", sector: "Consumo Cíclico" },
  { symbol: "MULT3", yahoo: "MULT3.SA", name: "Multiplan", sector: "Imobiliário" },
  { symbol: "NATU3", yahoo: "NATU3.SA", name: "Natura", sector: "Consumo Não Cíclico" },
  { symbol: "PETR3", yahoo: "PETR3.SA", name: "Petrobras ON", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "PETR4", yahoo: "PETR4.SA", name: "Petrobras PN", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "POMO4", yahoo: "POMO4.SA", name: "Marcopolo", sector: "Bens Industriais" },
  { symbol: "PRIO3", yahoo: "PRIO3.SA", name: "PRIO", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "PSSA3", yahoo: "PSSA3.SA", name: "Porto Seguro", sector: "Financeiro" },
  { symbol: "RADL3", yahoo: "RADL3.SA", name: "Raia Drogasil", sector: "Saúde" },
  { symbol: "RAIL3", yahoo: "RAIL3.SA", name: "Rumo", sector: "Bens Industriais" },
  { symbol: "RDOR3", yahoo: "RDOR3.SA", name: "Rede D'Or", sector: "Saúde" },
  { symbol: "RECV3", yahoo: "RECV3.SA", name: "PetroReconcavo", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "RENT3", yahoo: "RENT3.SA", name: "Localiza", sector: "Consumo Cíclico" },
  { symbol: "SANB11", yahoo: "SANB11.SA", name: "Santander Brasil", sector: "Financeiro" },
  { symbol: "SBSP3", yahoo: "SBSP3.SA", name: "Sabesp", sector: "Utilidades Públicas" },
  { symbol: "SLCE3", yahoo: "SLCE3.SA", name: "SLC Agrícola", sector: "Consumo Não Cíclico" },
  { symbol: "SMFT3", yahoo: "SMFT3.SA", name: "Smart Fit", sector: "Consumo Cíclico" },
  { symbol: "SUZB3", yahoo: "SUZB3.SA", name: "Suzano", sector: "Materiais Básicos" },
  { symbol: "TAEE11", yahoo: "TAEE11.SA", name: "Taesa", sector: "Utilidades Públicas" },
  { symbol: "TIMS3", yahoo: "TIMS3.SA", name: "TIM", sector: "Comunicações" },
  { symbol: "TOTS3", yahoo: "TOTS3.SA", name: "Totvs", sector: "Tecnologia da Informação" },
  { symbol: "UGPA3", yahoo: "UGPA3.SA", name: "Ultrapar", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "USIM5", yahoo: "USIM5.SA", name: "Usiminas", sector: "Materiais Básicos" },
  { symbol: "VALE3", yahoo: "VALE3.SA", name: "Vale", sector: "Materiais Básicos" },
  { symbol: "VAMO3", yahoo: "VAMO3.SA", name: "Vamos", sector: "Bens Industriais" },
  { symbol: "VBBR3", yahoo: "VBBR3.SA", name: "Vibra", sector: "Petróleo, Gás e Biocombustíveis" },
  { symbol: "VIVA3", yahoo: "VIVA3.SA", name: "Vivara", sector: "Consumo Cíclico" },
  { symbol: "VIVT3", yahoo: "VIVT3.SA", name: "Telefônica Brasil", sector: "Comunicações" },
  { symbol: "WEGE3", yahoo: "WEGE3.SA", name: "WEG", sector: "Bens Industriais" },
  { symbol: "YDUQ3", yahoo: "YDUQ3.SA", name: "Yduqs", sector: "Consumo Não Cíclico" },
];

export const IBOV_BY_SYMBOL: Record<string, IbovEntry> = Object.fromEntries(
  IBOV.map((e) => [e.symbol, e]),
);

export const IBOV_SECTORS: readonly string[] = Array.from(
  new Set(IBOV.map((e) => e.sector)),
).sort();

export const IBOV_BY_SECTOR: Record<string, IbovEntry[]> = IBOV_SECTORS.reduce(
  (acc, s) => {
    acc[s] = IBOV.filter((e) => e.sector === s);
    return acc;
  },
  {} as Record<string, IbovEntry[]>,
);
