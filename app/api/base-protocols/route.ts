import { NextResponse } from "next/server";

export const revalidate = 0;

async function fetchJson(url: string) {
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 120)}`);
  return JSON.parse(text);
}

export async function GET() {
  const candidates = [
    "https://api.llama.fi/protocols",
    "https://api.llama.fi/protocols?chain=Base", // sebagian env abaikan, tapi kita coba
  ];

  let lastErr: any = null;
  for (const u of candidates) {
    try {
      const all = await fetchJson(u);
      const base = Array.isArray(all)
        ? all.filter((p: any) => Array.isArray(p?.chains) && p.chains.includes("Base"))
        : [];
      return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      lastErr = e;
    }
  }
  return NextResponse.json(
    { error: "Unable to fetch Base protocols", detail: String(lastErr ?? "unknown") },
    { status: 502 }
  );
}
