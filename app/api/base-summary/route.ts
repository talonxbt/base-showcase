import { NextResponse } from "next/server";

export const revalidate = 180; // refresh every 3 minutes

export async function GET() {
  try {
    // Ambil semua chain summary
    const r = await fetch("https://api.llama.fi/v2/chains", { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "llama summary", detail: text }, { status: r.status });
    }

    const data = await r.json(); // array of { name, tvl, ... }

    // Cari Base
    const base = Array.isArray(data)
      ? data.find((c: any) => c.name?.toLowerCase() === "base")
      : null;

    if (!base) {
      return NextResponse.json({ error: "Base chain not found" }, { status: 404 });
    }

    return NextResponse.json({ tvl: base.tvl ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
