#!/usr/bin/env python3
"""
Extract dominant brand colors from B3 ticker logos (icons.brapi.dev).

Strategy:
  1. Fetch SVG from https://icons.brapi.dev/icons/{SYMBOL}.svg
  2. Parse gradient stops + solid fills
  3. Pick the dominant color (covers most area)
  4. Filter out white/black/backgrounds
  5. Generate brand-colors.ts map
"""

import json
import re
import sys
import time
import urllib.request
import urllib.error
from xml.etree import ElementTree as ET

SVG_URL = "https://icons.brapi.dev/icons/{symbol}.svg"
NS = {"svg": "http://www.w3.org/2000/svg"}

# Colors to skip (backgrounds, whites, blacks)
SKIP_COLORS = {"#ffffff", "#fff", "#000000", "#000", "#f5f5f5", "#fafafa", "#e0e0e0"}


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def luminance(hex_color: str) -> float:
    r, g, b = hex_to_rgb(hex_color)
    r, g, b = r / 255, g / 255, b / 255
    lin = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def is_background(hex_color: str) -> bool:
    """True if the color is too light/generic to be a brand color.

    We keep dark saturated colors (deep blues, navies) since many brands
    use them (ITUB4=#01207B, B3SA3=#033678). We only filter:
      - Whites/near-whites (lum > 0.88)
      - Pure blacks (lum < 0.02)
      - Grays (low saturation)
    """
    h = hex_color.lower().replace("#", "")
    if f"#{h}" in SKIP_COLORS:
        return True
    r, g, b = hex_to_rgb(f"#{h}")
    lum = luminance(f"#{h}")
    # Very light → background
    if lum > 0.88:
        return True
    # Pure black → background
    if lum < 0.02:
        return True
    # Low-saturation dark grays (not brand colors)
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    saturation = (max_c - min_c) / max(max_c, 1)
    if lum < 0.08 and saturation < 0.15:
        return True
    return False


def extract_colors_from_svg(svg_text: str) -> list[str]:
    """Extract all non-background colors from an SVG."""
    colors = []

    # Find all stop-color values in gradients (XML attribute: stop-color="...")
    for match in re.finditer(r'stop-color\s*=\s*["\']?(#[0-9a-fA-F]{3,8})["\']?', svg_text):
        c = match.group(1).lower()
        if not is_background(c):
            colors.append(c)

    # Also check CSS-style stop-color (some inlined SVGs)
    for match in re.finditer(r'stop-color:\s*["\']?(#[0-9a-fA-F]{3,8})["\']?', svg_text):
        c = match.group(1).lower()
        if not is_background(c):
            colors.append(c)

    # Find all fill="..." that are hex colors (not url(#...))
    for match in re.finditer(r'(?:fill|stroke)\s*=\s*["\']?(#[0-9a-fA-F]{3,8})["\']?', svg_text):
        c = match.group(1).lower()
        if not is_background(c):
            colors.append(c)

    # Find inline styles with color values
    for match in re.finditer(r'(?:background(?:-color)?|color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,8})', svg_text):
        c = match.group(1).lower()
        if not is_background(c):
            colors.append(c)

    # If no colors found, try to extract ANY non-white, non-black fill
    # (logos with dark bg + white text still have a brand color in the bg)
    if not colors:
        all_fills = re.findall(r'(?:fill|stroke)\s*=\s*["\']?(#[0-9a-fA-F]{3,8})["\']?', svg_text)
        all_stops = re.findall(r'stop-color\s*=\s*["\']?(#[0-9a-fA-F]{3,8})["\']?', svg_text)
        candidates = all_fills + all_stops
        # Pick the most saturated non-white color
        best = None
        best_sat = -1
        for c in candidates:
            cl = c.lower()
            if cl in ("#ffffff", "#fff", "#000000", "#000"):
                continue
            r, g, b = hex_to_rgb(cl)
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            sat = (max_c - min_c) / max(max_c, 1)
            if sat > best_sat:
                best_sat = sat
                best = cl
        if best:
            colors.append(best)

    return colors


def pick_dominant(colors: list[str]) -> str | None:
    """Pick the most dominant color from a list of SVG colors.

    Heuristic: gradient stops at higher offset cover more area.
    For solid fills, any non-background color works.
    """
    if not colors:
        return None

    # Dedupe while preserving order
    seen = set()
    unique = []
    for c in colors:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    if len(unique) == 1:
        return unique[0]

    # For gradients, later stops (higher offset) typically cover more area.
    # Since we extract stops in order, the LAST unique color is likely dominant.
    # Exception: if there's a very saturated color vs a neutral, prefer saturated.
    return unique[-1]


def fetch_svg(symbol: str) -> str | None:
    url = SVG_URL.format(symbol=symbol)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=8)
        data = resp.read().decode("utf-8", errors="replace")
        if "<svg" in data:
            return data
        return None
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, Exception):
        return None


def main():
    # Read all symbols from b3-tickers.ts
    with open("C:/Users/vigna/Projects/sulfur/lib/b3-tickers.ts") as f:
        content = f.read()

    all_symbols = re.findall(r'symbol:\s*"([A-Z0-9]+)"', content)
    seen = set()
    symbols = []
    for s in all_symbols:
        if s not in seen:
            seen.add(s)
            symbols.append(s)

    print(f"Processing {len(symbols)} tickers...")

    # Hand-curated entries (preserved exactly, never overwritten by auto-gen)
    hand_curated = {
        "PETR4", "PRIO3", "VALE3", "GGBR4", "ITUB4", "BBDC4", "BBSE3",
        "ABEV3", "LREN3", "MGLU3", "RENT3", "WEGE3", "EMBR3", "B3SA3", "SUZB3",
    }

    results = {}
    errors = []
    batch_size = 20

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i : i + batch_size]
        for sym in batch:
            # Skip if hand-curated (already in output)
            if sym in hand_curated:
                continue

            svg = fetch_svg(sym)
            if svg is None:
                errors.append(sym)
                continue

            colors = extract_colors_from_svg(svg)
            dominant = pick_dominant(colors)
            if dominant:
                results[sym] = dominant
            else:
                errors.append(sym)

        pct = min(100, int((i + len(batch)) / len(symbols) * 100))
        print(f"  {pct}% — {len(results)} colors extracted, {len(errors)} errors", file=sys.stderr)

        # Small delay between batches to be polite
        if i + batch_size < len(symbols):
            time.sleep(0.3)

    # Generate TypeScript output
    # Group by sector-ish (just alphabetically for now)
    lines = []
    lines.append('/**')
    lines.append(' * brand-colors.ts — cor dominante (hex) por ticker B3.')
    lines.append(' *')
    lines.append(' * Extraída automaticamente das logos oficiais em icons.brapi.dev.')
    lines.append(f' * {len(results)} tickers mapeados (de {len(symbols)} tentados).')
    lines.append(' *')
    lines.append(' * Fallback: ticker fora do mapa usa cinza neutro (#475569 — slate-600).')
    lines.append(' */')
    lines.append('export const BRAND_COLOR: Record<string, string> = {')
    lines.append('  // ── petrolíferas ──')
    lines.append('  PETR4: "#008542", // verde Petrobras')
    lines.append('  PRIO3: "#01D2C4", // teal PRIO')
    lines.append('  // ── mineração/siderurgia ──')
    lines.append('  VALE3: "#00939A", // teal Vale')
    lines.append('  GGBR4: "#004A8F", // azul Gerdau')
    lines.append('  // ── bancos ──')
    lines.append('  ITUB4: "#01207B", // azul Itaú')
    lines.append('  BBDC4: "#E22245", // vermelho Bradesco')
    lines.append('  BBSE3: "#2360A5", // azul BB Seguridade')
    lines.append('  // ── bebidas ──')
    lines.append('  ABEV3: "#00448C", // azul Ambev')
    lines.append('  // ── varejo ──')
    lines.append('  LREN3: "#D61F27", // vermelho Renner')
    lines.append('  MGLU3: "#0086FF", // azul Magalu')
    lines.append('  RENT3: "#00984A", // verde Localiza')
    lines.append('  // ── industrial ──')
    lines.append('  WEGE3: "#005DA4", // azul WEG')
    lines.append('  EMBR3: "#0067B1", // azul Embraer')
    lines.append('  // ── outros ──')
    lines.append('  B3SA3: "#033678", // azul-marinho B3')
    lines.append('  SUZB3: "#00B35A", // verde Suzano')

    # Write auto-generated entries (everything not hand-curated)
    auto_generated = sorted([(k, v) for k, v in results.items() if k not in hand_curated])

    if auto_generated:
        lines.append('')
        lines.append('  // ── auto-generated (from logo SVGs) ──')
        for sym, color in auto_generated:
            lines.append(f'  {sym}: "{color}",')

    lines.append('};')
    lines.append('')
    lines.append('export const BRAND_COLOR_FALLBACK = "#475569"; // slate-600')
    lines.append('')
    lines.append('/**')
    lines.append(' * Resolve cor dominante de um ticker B3.')
    lines.append(' *')
    lines.append(' * Estratégia de busca (em ordem):')
    lines.append(' *   1. Match exato (PETR4 → verde Petrobras)')
    lines.append(' *   2. Fallback pra mesma empresa com classe diferente (PETR3 → PETR4,')
    lines.append(' *      BBDC3 → BBDC4, ITUB3 → ITUB4) quando a ação tem classe ON/PN')
    lines.append(' *      e só uma das classes está mapeada. Cobertura de "1 mapa cobre')
    lines.append(' *      empresa toda" — funciona pra Petrobras, Vale, Itaú, Bradesco,')
    lines.append(' *      BB Seguridade, Ambev, Renner, Localiza, WEG, Embraer, Suzano,')
    lines.append(' *      etc.')
    lines.append(' *   3. Ticker X3 → X4 fallback (convenção B3: maioria de empresas')
    lines.append(' *      tem PN como classe mais líquida).')
    lines.append(' *   4. Fallback cinza neutro se nenhuma regra casa.')
    lines.append(' */')
    lines.append('export function getBrandColor(symbol: string): string {')
    lines.append('  const key = symbol.toUpperCase().replace(/\\.SA$/, "");')
    lines.append('')
    lines.append('  // 1. Match exato')
    lines.append('  if (BRAND_COLOR[key]) return BRAND_COLOR[key]!;')
    lines.append('')
    lines.append('  // 2. Tenta mesma base ticker trocando 3↔4 (PETR3 → PETR4)')
    lines.append('  if (key.endsWith("3")) {')
    lines.append('    const swap4 = `${key.slice(0, -1)}4`;')
    lines.append('    if (BRAND_COLOR[swap4]) return BRAND_COLOR[swap4]!;')
    lines.append('  } else if (key.endsWith("4")) {')
    lines.append('    const swap3 = `${key.slice(0, -1)}3`;')
    lines.append('    if (BRAND_COLOR[swap3]) return BRAND_COLOR[swap3]!;')
    lines.append('  }')
    lines.append('')
    lines.append('  // 3. Tenta mesma base trocando 5↔6 (BBDC5 → BBDC4 não, mas')
    lines.append('  //    ITUB3 → ITUB4 e ITUB5 → ITUB4 são úteis)')
    lines.append('  if (key.endsWith("5")) {')
    lines.append('    const swap4 = `${key.slice(0, -1)}4`;')
    lines.append('    if (BRAND_COLOR[swap4]) return BRAND_COLOR[swap4]!;')
    lines.append('  } else if (key.endsWith("6")) {')
    lines.append('    const swap3 = `${key.slice(0, -1)}3`;')
    lines.append('    if (BRAND_COLOR[swap3]) return BRAND_COLOR[swap3]!;')
    lines.append('  }')
    lines.append('')
    lines.append('  // 4. Tenta strip total do último dígito (caso unit/itUB11 etc.)')
    lines.append('  const baseTicker = key.replace(/\\d+$/, "");')
    lines.append('  if (BRAND_COLOR[baseTicker]) return BRAND_COLOR[baseTicker]!;')
    lines.append('')
    lines.append('  return BRAND_COLOR_FALLBACK;')
    lines.append('}')

    output = "\n".join(lines) + "\n"

    # Write output
    out_path = "C:/Users/vigna/Projects/sulfur/lib/brand-colors.ts"
    with open(out_path, "w") as f:
        f.write(output)

    print(f"\nDone! {len(results)} colors written to {out_path}", file=sys.stderr)
    if errors:
        print(f"  {len(errors)} tickers had no extractable color: {errors[:20]}...", file=sys.stderr)

    # Summary
    print(json.dumps({
        "total": len(symbols),
        "mapped": len(results),
        "errors": len(errors),
        "hand_curated": len(hand_curated),
        "auto_generated": len(auto_generated),
    }))


if __name__ == "__main__":
    main()
