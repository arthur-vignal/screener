# Implementation Plan: Portfolio detail workspace

## Overview
Reorganizar `/portfolio/[slug]` para um workspace em container grande com quatro quadrantes: gráfico de variação no canto superior esquerdo, composição por setor/ticker no inferior esquerdo, lista de ativos no superior direito e calendário econômico no inferior direito.

## Architecture decisions
- Reaproveitar `PortfolioValueChart` como base visual do gráfico principal; adaptar somente dimensões e opções de período.
- Criar um componente de composição em pizza com dados reais já calculados no endpoint de stats e seletor setor/ticker.
- Expandir o bundle de portfolio com nome da empresa e calendário real de dividendos; não inventar earnings quando a Brapi não fornecer esse campo.
- Manter `AddHoldingDialog`, autenticação, link para estatísticas e dock existentes.

## Task list
- [ ] Inspecionar contratos atuais e confirmar dados disponíveis para o calendário.
- [ ] Implementar o layout do workspace e a lista de ativos em destaque.
- [ ] Implementar composição em pizza com dropdown setor/ticker.
- [ ] Implementar calendário econômico compacto com dados reais disponíveis.
- [ ] Remover a coluna News e controles sem função nessa tela.
- [ ] Rodar lint/build e validar visualmente a rota.

## Verification
- TypeScript/lint sem erros.
- `npm run build` passa.
- Rota mantém estados loading, empty e error.
- Nenhum mock, `Math.random` ou placeholder de dado financeiro.
- Layout responsivo sem overflow horizontal.
