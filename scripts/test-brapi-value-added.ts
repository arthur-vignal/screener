import { brapiValueAdded } from "../lib/brapi";

async function main() {
  // Inspect direct response
  const t = process.env.BRAPI_TOKEN ?? "";
  console.log("token len:", t.length);
  const url = `https://brapi.dev/api/v2/stocks/value-added?symbols=PETR4&period=annual&token=${encodeURIComponent(t)}`;
  const r = await fetch(url);
  const j = (await r.json()) as { results?: Array<Record<string, unknown>> };
  console.log("results.len:", j.results?.length);
  const item = j.results?.[0] as any;
  console.log("item keys:", Object.keys(item));
  console.log("item.changed:", item.changed);
  console.log("item.data type:", typeof item.data);
  console.log("item.data isArray:", Array.isArray(item.data));
  console.log("item.data len:", item.data?.length);

  console.log("--- agora via wrapper ---");
  const data = await brapiValueAdded({ symbol: "PETR4", period: "annual" });
  console.log("wrapper returned:", data.length, "rows");
  if (data.length > 0) console.log("first:", data[0].endDate, "→", data[0].grossAddedValue);
}

main().catch((e) => { console.error("FAIL", e); process.exit(1); });