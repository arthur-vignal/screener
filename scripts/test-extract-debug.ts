async function main() {
  const t = process.env.BRAPI_TOKEN ?? "";
  console.log("token len:", t.length);
  const url = `https://brapi.dev/api/v2/stocks/value-added?symbols=PETR4&period=annual&token=${encodeURIComponent(t)}`;
  const r = await fetch(url);
  const j = (await r.json()) as any;

  function extractData(results: unknown): Record<string, unknown> | null {
    if (!Array.isArray(results) || results.length === 0) return null;
    const item = results[0] as Record<string, unknown>;
    if (item.changed === true) {
      console.log("CHANGED warning");
    }
    const data = item.data;
    if (data == null || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  }

  const item = extractData(j.results);
  console.log("item.data type:", typeof item?.data);
  console.log("item.data isArray:", Array.isArray(item?.data));
  console.log("item.data len:", (item?.data as any)?.length);

  const data = item?.data;
  console.log("data isArray after item?.data:", Array.isArray(data));
  console.log("data len:", (data as any)?.length);
}
main();