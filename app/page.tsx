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
  fees24h?: number;
  url?: string;
};

const fmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});
const fmtPct = (n?: number) =>
  typeof n === "number" && isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
const toDate = (ts: number) => new Date(ts * 1000);

/* =========================
   Component
========================= */
export default function Page() {
  const [chart, setChart] = useState<ChainPoint[] | null>(null);
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);
  const [protocolCount, setProtocolCount] = useState<number>(0);
  const [currentTvl, setCurrentTvl] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"tvl" | "change_1d" | "change_7d" | "fees24h">("tvl");

  async function fetchJson(url: string) {
    const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
    const text = await r.text();
    if (!r.ok) throw new Error(`${url} -> ${r.status} ${text.slice(0, 120)}`);
    return JSON.parse(text);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 0. Current TVL
        const summary = await fetchJson("/api/base-summary");
        setCurrentTvl(Number(summary?.tvl || 0));

        // 1. Chart
        const chartJson = await fetchJson("/api/base-tvl");
        setChart(Array.isArray(chartJson) ? chartJson : []);

        // 2. Ranking
        const rankJson = await fetchJson("/api/base-ranking");
        setRanking(Array.isArray(rankJson) ? rankJson : []);

        // 3. Protocol count
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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const prevTVL = useMemo(
    () =>
      Array.isArray(chart) && chart.length > 7
        ? chart[chart.length - 8].totalLiquidityUSD
        : undefined,
    [chart]
  );
  const change7d = useMemo(
    () => (prevTVL ? ((currentTvl - prevTVL) / prevTVL) * 100 : undefined),
    [currentTvl, prevTVL]
  );

  const visibleRows = useMemo(() => {
    const list = Array.isArray(ranking) ? ranking : [];
    const q = search.toLowerCase().trim();

    let arr = list.filter((p) => {
      const inCat = category === "All" || p.category === category;
      const inSearch =
        !q || p.name.toLowerCase().includes(q) || (p.symbol || "").toLowerCase().includes(q);
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

  const showFees = useMemo(
    () => visibleRows.some((p) => Number(p.fees24h || 0) > 0),
    [visibleRows]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto px-4 py-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Base Intelligence Dashboard</h1>
          <p className="text-neutral-300 mt-2">
            Created by <span className="font-semibold">TalonXBT</span>. Live TVL & protocol rankings.
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href="https://x.com/TalonXBT"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 hover:border-blue-500 text-sm"
          >
            <XIcon className="w-4 h-4" /> <span className="hidden sm:inline">X</span>
          </a>
          <a
            href="https://discord.gg/buildonbase"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 hover:border-indigo-500 text-sm"
          >
            <DiscordIcon className="w-4 h-4" /> <span className="hidden sm:inline">Discord</span>
          </a>
          <a
            href="https://www.base.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
          >
            Visit Base <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* KPI */}
      <section className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Chain TVL" value={`$${fmt.format(currentTvl || 0)}`} icon={<LineChart />} />
        <KpiCard title="7D Change" value={fmtPct(change7d)} trend={change7d} />
        <KpiCard title="Protocols on Base" value={`${protocolCount}`} />
        <KpiCard
          title="Build"
          value={
            <a
              href="https://www.base.org/ecosystem"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted"
            >
              Base Ecosystem
            </a>
          }
        />
      </section>

      {/* TVL CHART */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3">Base TVL (All-time)</h2>
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
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa" }} />
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

      {/* TABLE */}
      <section className="max-w-7xl mx-auto px-4 mt-8 pb-16">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-3 text-sm text-neutral-400 border-b border-neutral-800">
            <div className={`${showFees ? "col-span-3" : "col-span-5"}`}>Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">TVL</div>
            <div className="col-span-1 text-right">1d</div>
            <div className="col-span-1 text-right">7d</div>
            {showFees && <div className="col-span-2 text-right">Fees 24h</div>}
            <div className="col-span-1 text-center">Link</div>
          </div>

          {!loading && !err && (
            <div className="divide-y divide-neutral-800">
              {visibleRows.map((p, i) => {
                const feesVal = Number(p.fees24h || 0);
                return (
                  <div
                    key={`${p.name}-${i}`}
                    className="grid grid-cols-12 px-4 py-3 items-center hover:bg-neutral-800/30"
                  >
                    <div className={`${showFees ? "col-span-3" : "col-span-5"} font-semibold`}>
                      {i + 1}. {p.name}{" "}
                      {p.symbol && <span className="text-neutral-400 font-normal">({p.symbol})</span>}
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
                    {showFees && (
                      <div className="col-span-2 text-right">
                        {feesVal > 0 ? `$${fmt.format(feesVal)}` : <span className="text-neutral-500">—</span>}
                      </div>
                    )}
                    <div className="col-span-1 text-center">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
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
            </div>
          )}

          {loading && <div className="p-6 text-neutral-400">Loading data…</div>}
          {err && <div className="p-6 text-red-400">Error: {err}</div>}

          <div className="px-4 py-3 text-xs text-neutral-500 border-t border-neutral-800">
            Data courtesy of{" "}
            <a href="https://defillama.com/chain/base" target="_blank" className="underline decoration-dotted">
              DeFiLlama
            </a>. Not affiliated with Coinbase/Base.
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================
   Small Components
========================= */
function KpiCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-400">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        {icon && <div className="opacity-70">{icon}</div>}
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

/* =========================
   Icons
========================= */
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2H21l-7.97 9.13L22 22h-6.02l-4.7-5.5L5.02 22H2l8.58-9.83L2.5 2h6.1l4.21 4.93L18.244 2z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.369A18.152 18.152 0 0016.8 3.2l-.2.4a16.3 16.3 0 00-4.6 0l-.2-.4a18.18 18.18 0 00-3.52 1.169C5.
