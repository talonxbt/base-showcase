"use client";

import Link from "next/link";

const categories = [
  { slug: "defi", label: "DeFi" },
  { slug: "infra", label: "Infrastructure" },
  { slug: "consumer", label: "Consumer" },
  { slug: "gaming", label: "Gaming" },
  { slug: "nft", label: "NFT & Metaverse" },
  { slug: "tools", label: "Tools & APIs" },
  { slug: "social", label: "Social & Community" },
];

export default function EcosystemHome() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <h1 className="text-4xl font-bold mb-8">Base Ecosystem Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {categories.map(cat => (
          <Link
            key={cat.slug}
            href={`/ecosystem/category/${cat.slug}`}
            className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 hover:border-blue-500 transition"
          >
            <h2 className="text-xl font-semibold mb-2">{cat.label}</h2>
            <p className="text-neutral-400">Explore projects in {cat.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
