import { NextResponse } from "next/server";

export const revalidate = 0;

// -------- helpers --------
async function fetchJson(url: string) {
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 120)}`);
  return JSON.parse(text);
}
const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Ambil TVL khusus chain Base dari beberapa kemungkinan bentuk data
function extractBaseTvl(p: any): number {
  const ct = p?.chainTvls || {};
  const cands = [ct.Base, ct.base, ct["Base"], ct["BASE"]];
  for (const s of cands) {
    if (s == null) continue;
    if (typeof s === "number") return toNum(s, 0);
    if (Array.isArray(s) && s.length) {
      const last = s[s.length - 1];
      return toNum(
        last?.tvl ?? last?.tvlUsd ?? last?.totalLiquidityUSD ?? last?.totalLiquidity,
        0
      );
    }
    if (typeof s === "object") {
      return toNum(s.tvl ?? s.tvlUsd ?? s.totalLiquidityUSD ?? s.totalLiquidity, 0);
    }
  }
  // fallback kalau tidak ada chainTvls khusus Base
  return toNum(p?.tvl, 0);
}

export async function GET() {
  try {
    // 1) Sumber utama: semua protokol
    const protocols: any[] = await fetchJson("https://api.llama.fi/protocols");

    // 2) (opsional) fees & revenue overview — boleh gagal
    let feesOverview: any[] = [];
    let revenueOverview: any[] = [];

    const feesCandidates = [
      "https://api.llama.fi/overview/fees?excludeTotalDataChart=true&dataType=daily",
      "https://api.llama.fi/overview/fees?excludeTotalDataChart=true",
    ];
    for (const u of feesCandidates) {
      try {
        const j = await fetchJson(u);
        if (Array.isArray(j?.protocols)) { feesOverview = j.protocols; break; }
      } catch {}
    }

    const revCandidates = [
      "https://api.llama.fi/overview/revenue?excludeTotalDataChart=true&dataType=daily",
      "https://api.llama.fi/overview/revenue?excludeTotalDataChart=true",
    ];
    for (const u of revCandidates) {
      try {
        const j = await fetchJson(u);
        if (Array.isArray(j?.protocols)) { revenueOverview = j.protocols; break; }
      } catch {}
    }

    const findByName = (arr: any[], name: string) => {
      const key = (name || "").toLowerCase();
      return (
        arr.find((x) => (x?.name || "").toLowerCase() === key) ||
        arr.find((x) => (x?.displayName || "").toLowerCase() === key)
      );
    };

    // 3) Filter: hanya yang ada di chain "Base", dan buang kategori CEX
    const baseAllNoCex = protocols.filter((p) => {
      const onBase = Array.isArray(p?.chains) && p.chains.includes("Base");
      if (!onBase) return false;
      const cat = (p?.category || "").toLowerCase();
      const isCex = cat.includes("cex") || /exchange/i.test(cat); // berjaga-jaga
      return !isCex;
    });

    // 4) Gabungkan & gunakan BASE TVL untuk ranking (seperti DeFiLlama)
    const merged = baseAllNoCex
      .map((p) => {
        const baseTvl = extractBaseTvl(p);
        const fees = findByName(feesOverview, p.name) || {};
        const rev  = findByName(revenueOverview, p.name) || {};
        return {
          name: p.name,
          symbol: p.symbol,
          category: p.category,
          tvl: toNum(baseTvl, 0),          // TVL khusus Base
          change_1d: toNum(p.change_1d, 0),
          change_7d: toNum(p.change_7d, 0),
          change_1m: toNum(p.change_1m, 0),
          fees24h: toNum(fees.total24h ?? fees.value24h, 0),
          revenue24h: toNum(rev.total24h ?? rev.value24h, 0),
          fees7d: toNum(fees.total7d, 0),
          revenue7d: toNum(rev.total7d, 0),
          url: p.url,
        };
      })
      .sort((a, b) => (b.tvl - a.tvl) || (b.revenue24h - a.revenue24h) || a.name.localeCompare(b.name))
      .slice(0, 100);

    return NextResponse.json(merged, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // kalau upstream error, balas array kosong agar UI tetap jalan
    return NextResponse.json([], { status: 200 });
  }
}
