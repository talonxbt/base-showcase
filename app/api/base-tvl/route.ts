import { NextResponse } from "next/server";

// Jangan cache (biar realtime saat dev)
export const revalidate = 0;

async function fetchJson(url: string) {
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

export async function GET() {
  const candidates = [
    // urutan percobaan; beberapa env memerlukan lowercase
   "https://api.llama.fi/charts/Base",     // ✅ endpoint baru yang aktif
   "https://api.llama.fi/charts/base",
   "https://api.llama.fi/v2/historicalChainTvl/Base",
   "https://api.llama.fi/v2/historicalChainTvl/base"
  ];

  let lastErr: any = null;
  for (const u of candidates) {
    try {
      const json = await fetchJson(u);
      // pastikan bentuk array agar front-end aman
      return NextResponse.json(Array.isArray(json) ? json : [], {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      lastErr = e;
    }
  }
  return NextResponse.json(
    { error: "Unable to fetch Base TVL", detail: String(lastErr ?? "unknown") },
    { status: 502 }
  );
}
