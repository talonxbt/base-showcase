import { NextResponse } from "next/server";

export const revalidate = 180; // refresh every 3 minutes

export async function GET() {
  try {
    const r = await fetch("https://api.llama.fi/v2/chain/Base", { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "llama summary", detail: text }, { status: r.status });
    }

    const data = await r.json(); // { name, tvl, ... }
    return NextResponse.json({ tvl: data?.tvl ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}
