// app/api/base-fees/route.ts
import { NextResponse } from "next/server";
export const revalidate = 0;

async function get(url: string) {
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text.slice(0,120)}`);
  return JSON.parse(text);
}

export async function GET() {
  // Kandidat endpoint fees/revenue untuk chain
  const candidates = [
    "https://api.llama.fi/summary/fees/Base?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
    "https://api.llama.fi/summary/fees/base?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
    "https://api.llama.fi/overview/fees?chain=Base",
    "https://api.llama.fi/overview/fees?chain=base",
  ];

  let lastErr: any = null;
  for (const u of candidates) {
    try {
      const json = await get(u);

      // Normalisasi — kita buat dictionary by name (lowercase)
      const dict: Record<string, any> = {};

      const push = (name: string, v: any) => {
        const key = (name || "").toLowerCase();
        dict[key] = { ...(dict[key] || {}), ...v };
      };

      if (Array.isArray(json?.protocols)) {
        // format mirip summary/fees/chain
        for (const p of json.protocols) {
          push(p.name, {
            fees24h: p.fees24h ?? p.fees_24h,
            revenue24h: p.revenue24h ?? p.revenue_24h,
            fees7d: p.fees7d ?? p.fees_7d,
            revenue7d: p.revenue7d ?? p.revenue_7d,
            fees30d: p.fees30d ?? p.fees_30d,
            revenue30d: p.revenue30d ?? p.revenue_30d,
            holdersRevenue24h: p.holdersRevenue24h ?? p.holders_revenue_24h,
            incentives24h: p.incentives24h ?? p.incentives_24h,
          });
        }
      } else if (Array.isArray(json)) {
        // format overview
        for (const p of json) {
          push(p.name, {
            fees24h: p.fees24h ?? p.fees_24h,
            revenue24h: p.revenue24h ?? p.revenue_24h,
            fees7d: p.fees7d ?? p.fees_7d,
            revenue7d: p.revenue7d ?? p.revenue_7d,
            fees30d: p.fees30d ?? p.fees_30d,
            revenue30d: p.revenue30d ?? p.revenue_30d,
          });
        }
      } else if (json?.protocols?.data) {
        // kemungkinan struktur lain
        for (const p of json.protocols.data) {
          push(p.name, {
            fees24h: p.fees24h ?? p.fees_24h,
            revenue24h: p.revenue24h ?? p.revenue_24h,
          });
        }
      }

      return NextResponse.json(dict, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      lastErr = e;
    }
  }

  return NextResponse.json(
    { error: "Unable to fetch fees/revenue for Base", detail: String(lastErr ?? "unknown") },
    { status: 502 }
  );
}
