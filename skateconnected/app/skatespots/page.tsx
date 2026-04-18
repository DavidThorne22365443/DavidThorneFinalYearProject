'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

type Skatespot = {
    id: string;
    name: string;
    nearby: string | null;
    latitude: number;
    longitude: number;
};

function SpotViewMap({ spot }: { spot: Skatespot }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lat = Number(spot.latitude);
    const lng = Number(spot.longitude);

    useEffect(() => {
        if (!containerRef.current) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: 15,
            interactive: true,
        });

        map.on('load', () => {
            map.resize();
            map.jumpTo({ center: [lng, lat], zoom: 15 });

            const el = document.createElement('div');
            el.style.cssText = `
                width: 28px; height: 28px;
                background: #f97316;
                border: 2.5px solid #fff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
            `;
            const inner = document.createElement('div');
            inner.style.cssText = 'transform: rotate(45deg); font-size: 12px; line-height: 1;';
            inner.textContent = '📍';
            el.appendChild(inner);

            new mapboxgl.Marker({ element: el, anchor: 'bottom-left' })
                .setLngLat([lng, lat])
                .addTo(map);
        });

        return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spot.id]);

    return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}

export default function SkateSpotsPage() {
    const [spots, setSpots] = useState<Skatespot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedSpot = useMemo(() => spots.find((s) => s.id === selectedId) ?? null, [spots, selectedId]);

    const filteredSpots = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return spots;
        return spots.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            (s.nearby ?? '').toLowerCase().includes(q)
        );
    }, [spots, searchQuery]);

    useEffect(() => {
        fetch('/api/skatespot', { cache: 'no-store' })
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setSpots(Array.isArray(data) ? data.sort((a: Skatespot, b: Skatespot) => a.name.localeCompare(b.name)) : []))
            .catch(() => setError('Failed to load skate spots'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 md:px-6 md:py-5 bg-white border-b border-zinc-200 flex items-center gap-3">
                <Link href="/map" className="text-zinc-400 hover:text-zinc-700 text-sm shrink-0">← Back</Link>
                <h1 className="text-lg md:text-xl font-bold text-zinc-900">Skate Spots</h1>
                <span className="text-xs text-zinc-400">({filteredSpots.length}{searchQuery ? ` of ${spots.length}` : ''} spots)</span>
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* List */}
                <div className="w-full md:w-80 shrink-0 overflow-hidden border-b md:border-b-0 md:border-r border-zinc-200 bg-white flex flex-col max-h-[40vh] md:max-h-none">
                    <div className="p-3 border-b border-zinc-100 shrink-0">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skate spots…"
                            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-zinc-50"
                        />
                    </div>
                    {loading && <p className="p-4 text-sm text-zinc-400">Loading…</p>}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {filteredSpots.map((spot) => (
                            <button
                                key={spot.id}
                                onClick={() => setSelectedId(spot.id)}
                                className={`w-full text-left px-4 py-3 border-b border-zinc-100 transition-colors ${selectedId === spot.id ? 'bg-orange-50 border-l-2 border-l-orange-400' : 'hover:bg-zinc-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                    <p className="font-medium text-zinc-900 text-sm truncate">{spot.name}</p>
                                </div>
                                {spot.nearby && (
                                    <p className="text-xs text-zinc-400 mt-0.5 pl-4 truncate">{spot.nearby}</p>
                                )}
                            </button>
                        ))}
                        {!loading && filteredSpots.length === 0 && spots.length > 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No spots match your search.</p>
                        )}
                        {!loading && spots.length === 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No spots listed yet.</p>
                        )}
                    </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative overflow-hidden bg-zinc-100 min-h-[40vh] md:min-h-0">
                    {selectedSpot ? (
                        <>
                            <SpotViewMap key={selectedSpot.id} spot={selectedSpot} />

                            {/* Info card overlay */}
                            <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-3 max-w-xs">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                    <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Skate Spot</span>
                                </div>
                                <p className="font-semibold text-zinc-900 text-sm">{selectedSpot.name}</p>
                                {selectedSpot.nearby && (
                                    <div className="flex gap-1.5 mt-2">
                                        <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <p className="text-xs text-zinc-600">{selectedSpot.nearby}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-zinc-400">Select a spot to see its location</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
