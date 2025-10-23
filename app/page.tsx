"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Search,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";

/* =========================
   Types & Utilities
========================= */
type ChainPoint = { date: number; totalLiquidityUSD: number };

type RankingRow = {
  name: string;
  category?: string;
  symbol?: string;
  tvl?: number;
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
  fees24h?: number;    // revenue dihilangkan dari UI
  url?: string;
};

const fmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const fmtPct = (n?: number) =>
  typeof n === "number" && isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
const toDate = (ts: number) => new Date(ts * 1000);

const CATEGORY_OPTIONS = [
  { key: "All", label: "All" },
  { key: "Dexes", label: "DEX" },
  { key: "Lending", label: "Lending" },
  { key: "Liquid Staking", label: "LST / Staking" },
  { key: "Yield", label: "Yield" },
  { key: "Derivatives", label: "Perps" },
  { key: "Bridge", label: "Bridge" },
] as const;

/* =========================
   Page Component
========================= */
export default function Page() {
  // State
  const [chart, setChart] = useState<ChainPoint[] | null>(null);
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);
  const [protocolCount, setProtocolCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"tvl" | "change_1d" | "change_7d" | "fees24h">("tvl");

  /* ---------- helpers ---------- */
  async function fetchJson(url: string) {
    const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
    const text = await r.text();
    if (!r.ok) throw new Error(`${url} -> ${r.status} ${text.slice(0, 100)}`);
    return JSON.parse(text);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) TVL chart (server proxy)
        const chartJson = await fetchJson("/api/base-tvl");
        setChart(Array.isArray(chartJson) ? chartJson : []);

        // 2) Protocol ranking top-100 via server proxy
        const rankJson = await fetchJson("/api/base-ranking");
        setRanking(Array.isArray(rankJson) ? rankJson : []);

        // 3) Total protocols on Base (opsional)
        try {
          const allProt = await fetchJson("/api/base-protocols");
          setProtocolCount(Array.isArray(allProt) ? allProt.length : 0);
        } catch {
          setProtocolCount(Array.isArray(rankJson) ? rankJson.length : 0);
        }

        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "Failed to load data");
        setChart([]);
        setRanking([]);
        setProtocolCount(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- KPI calculations ---------- */
  const latestTVL = useMemo(
    () => (Array.isArray(chart) && chart.length ? chart[chart.length - 1].totalLiquidityUSD : 0),
    [chart]
  );
  const prevTVL = useMemo(
    () =>
      Array.isArray(chart) && chart.length > 7
        ? chart[chart.length - 8].totalLiquidityUSD
        : undefined,
    [chart]
  );
  const change7d = useMemo(
    () => (prevTVL ? ((latestTVL - prevTVL) / prevTVL) * 100 : undefined),
    [latestTVL, prevTVL]
  );

  /* ---------- Filter + Sort for ranking ---------- */
  const visibleRows = useMemo(() => {
    const list = Array.isArray(ranking) ? ranking : [];
    const q = search.toLowerCase().trim();

    let arr = list.filter((p) => {
      const inCat = category === "All" || p.category === category;
      const inSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.symbol || "").toLowerCase().includes(q);
      return inCat && inSearch;
    });

    arr = arr.sort((a, b) => {
      if (sortBy === "tvl") return (b.tvl || 0) - (a.tvl || 0);
      if (sortBy === "change_1d") return (b.change_1d || -Infinity) - (a.change_1d || -Infinity);
      if (sortBy === "change_7d") return (b.change_7d || -Infinity) - (a.change_7d || -Infinity);
      if (sortBy === "fees24h") return (b.fees24h || 0) - (a.fees24h || 0);
      return 0;
    });

    return arr;
  }, [ranking, search, category, sortBy]);

  // tampilkan kolom Fees hanya jika ada minimal satu baris dengan fees > 0
  const showFees = useMemo(
    () => visibleRows.some((p) => Number(p.fees24h || 0) > 0),
    [visibleRows]
  );

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
<header className="max-w-7xl mx-auto px-4 py-8">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Base Ecosystem — Showcase & Analytics
      </h1>
      <p className="text-neutral-300 mt-2">
        Created by <span className="font-semibold">TalonXBT</span>. Live TVL & protocol rankings.
      </p>
    </div>
    <a
      href="https://www.base.org/"
      target="_blank"
      className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
    >
      Visit Base <ExternalLink size={16} />
    </a>
  </div>
</header>


      {/* KPI Cards */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Chain TVL" value={`$${fmt.format(latestTVL || 0)}`} icon={<LineChart className="opacity-80" />} />
        <KpiCard title="7D Change" value={fmtPct(change7d)} trend={change7d} />
        <KpiCard title="Protocols on Base" value={`${protocolCount}`} />
        <KpiCard
          title="Build"
          value={
            <a className="underline decoration-dotted" href="https://www.base.org/ecosystem" target="_blank">
              Base Ecosystem
            </a>
          }
        />
      </section>

      {/* TVL Chart */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Base TVL (All-time)</h2>
            <span className="text-xs text-neutral-400">Source: DeFiLlama API</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  Array.isArray(chart)
                    ? chart.map((d) => ({
                        date: toDate(d.date).toLocaleDateString(),
                        tvl: d.totalLiquidityUSD,
                      }))
                    : []
                }
              >
                <defs>
                  <linearGradient id="tvl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" minTickGap={32} tick={{ fill: "#a1a1aa" }} />
                <YAxis tickFormatter={(v) => `$${fmt.format(v)}`} tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  formatter={(v: number) => `$${fmt.format(v)}`}
                  contentStyle={{ background: "#111", border: "1px solid #27272a" }}
                />
                <Area type="monotone" dataKey="tvl" stroke="#60A5FA" fill="url(#tvl)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search protocol (e.g., Aerodrome, Uniswap)"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2 pl-10 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-neutral-500" size={18} />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-2"
            >
              <option value="tvl">Sort: TVL</option>
              <option value="change_1d">Sort: 24h %</option>
              <option value="change_7d">Sort: 7d %</option>
              <option value="fees24h">Sort: Fees 24h</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-2xl border ${
                  category === c.key
                    ? "bg-blue-600 border-blue-500"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Protocol Rankings (Top 100 Base) — no Revenue; hide zero fees & no gaps */}
      <section className="max-w-7xl mx-auto px-4 mt-4 pb-16">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-3 text-sm text-neutral-400 border-b border-neutral-800">
            <div className={`${showFees ? "col-span-3" : "col-span-5"}`}>Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">TVL</div>
            <div className="col-span-1 text-right">1d</div>
            <div className="col-span-1 text-right">7d</div>
            {showFees ? <div className="col-span-2 text-right">Fees 24h</div> : null}
            <div className="col-span-1 text-center">Link</div>
          </div>

          {loading && <div className="p-6 text-neutral-400">Loading live data…</div>}
          {err && <div className="p-6 text-red-400 break-words">Error: {String(err)}</div>}

          {!loading && !err && (
            <div className="divide-y divide-neutral-800">
              {visibleRows.map((p, i) => {
                const feesVal = Number(p.fees24h || 0);
                return (
                  <div
                    key={`${p.name}-${i}`}
                    className="grid grid-cols-12 px-4 py-3 items-center hover:bg-neutral-800/30"
                  >
                    {/* Name melebar jika showFees = false */}
                    <div className={`${showFees ? "col-span-3" : "col-span-5"} font-semibold`}>
                      {i + 1}. {p.name}{" "}
                      {p.symbol ? <span className="text-neutral-400 font-normal">({p.symbol})</span> : null}
                    </div>

                    <div className="col-span-2 text-neutral-400 text-sm">{p.category || "—"}</div>

                    <div className="col-span-2 text-right font-medium">
                      {typeof p.tvl === "number" ? `$${fmt.format(p.tvl)}` : "—"}
                    </div>

                    <div
                      className={`col-span-1 text-right ${
                        Number(p.change_1d) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fmtPct(p.change_1d)}
                    </div>

                    <div
                      className={`col-span-1 text-right ${
                        Number(p.change_7d) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fmtPct(p.change_7d)}
                    </div>

                    {showFees ? (
                      <div className="col-span-2 text-right">
                        {feesVal > 0 ? `$${fmt.format(feesVal)}` : "—"}
                      </div>
                    ) : null}

                    <div className="col-span-1 text-center">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          className="inline-flex items-center justify-center text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleRows.length === 0 && (
                <div className="px-4 py-6 text-sm text-neutral-400">
                  No protocols found for this filter.
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-3 text-xs text-neutral-500 border-t border-neutral-800">
            Data courtesy of{" "}
            <a className="underline decoration-dotted" href="https://defillama.com/chain/base" target="_blank">
              DeFiLlama
            </a>. This is an independent community dashboard and not affiliated with Coinbase/Base.
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================
   Small Components
========================= */
function KpiCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-400">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className="opacity-70">{icon}</div>
      </div>
      {typeof trend === "number" && isFinite(trend) && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-sm ${
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {fmtPct(trend)}
        </div>
      )}
    </div>
  );
}
