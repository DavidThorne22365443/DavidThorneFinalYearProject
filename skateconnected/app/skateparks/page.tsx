"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Park = {
    id: string;
    name: string;
    city: string | null;
    county: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
};

export default function SkateparksPage() {
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/park-state", { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                setParks(Array.isArray(data.parks) ? data.parks : []);
            })
            .catch(() => setError("Failed to load skateparks"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header */}
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
                <Link
                    href="/map"
                    className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                    ← Map
                </Link>
                <h1 className="text-lg font-semibold">Skateparks</h1>
                <span className="text-zinc-500 text-sm ml-auto">
                    {!loading && !error ? `${parks.length} park${parks.length !== 1 ? 's' : ''}` : ''}
                </span>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-6">
                {loading && <p className="text-zinc-400">Loading...</p>}
                {error && <p className="text-red-400">{error}</p>}

                {!loading && !error && parks.length === 0 && (
                    <p className="text-zinc-500">No skateparks listed yet.</p>
                )}

                <div className="space-y-3">
                    {parks.map(p => (
                        <div
                            key={p.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4"
                        >
                            <div className="font-medium text-zinc-100">{p.name}</div>
                            <div className="text-sm text-zinc-400 mt-0.5">
                                {[p.city, p.county].filter(Boolean).join(", ") || "Location unknown"}
                            </div>
                            {p.latitude && p.longitude && (
                                <div className="text-xs text-zinc-600 mt-1">
                                    {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}