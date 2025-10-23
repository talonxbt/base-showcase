import { NextResponse } from "next/server";

export const revalidate = 0; // disable ISR cache (always fetch fresh)

export async function GET() {
  try {
    const r = await fetch("https://api.llama.fi/v2/historicalChainTvl/Base", {
      cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "llama tvl", detail: text }, { status: r.status });
    }

    const data = await r.json(); // array of { date, tvl }
    const out = Array.isArray(data)
      ? data.map((d: any) => ({
          date: d.date,
          totalLiquidityUSD: d.tvl ?? 0,
        }))
      : [];

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
