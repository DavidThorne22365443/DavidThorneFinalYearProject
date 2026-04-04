'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

type Park = {
    id: string;
    name: string;
    city: string | null;
    county: string | null;
    address: string | null;
    openingHours: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
};

function ParkViewMap({ park }: { park: Park }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lat = Number(park.latitude);
    const lng = Number(park.longitude);

    useEffect(() => {
        if (!containerRef.current) return;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: 15,
            interactive: true,
        });

        map.on('load', () => {
            const el = document.createElement('div');
            el.style.cssText = `
                width: 32px; height: 32px;
                background: #18181b;
                border: 2.5px solid #fff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                display: flex; align-items: center; justify-content: center;
            `;
            const inner = document.createElement('div');
            inner.style.cssText = 'transform: rotate(45deg); font-size: 13px; line-height: 1;';
            inner.textContent = '🛹';
            el.appendChild(inner);

            new mapboxgl.Marker({ element: el, anchor: 'bottom-left' })
                .setLngLat([lng, lat])
                .addTo(map);
        });

        return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [park.id]);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-100">
                <p className="text-sm text-zinc-400">No location set for this park.</p>
            </div>
        );
    }

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function SkateparksPage() {
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedPark = useMemo(() => parks.find((p) => p.id === selectedId) ?? null, [parks, selectedId]);

    const filteredParks = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return parks;
        return parks.filter((p) =>
            p.name.toLowerCase().includes(q) ||
            (p.city ?? '').toLowerCase().includes(q) ||
            (p.county ?? '').toLowerCase().includes(q)
        );
    }, [parks, searchQuery]);

    useEffect(() => {
        fetch('/api/park', { cache: 'no-store' })
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setParks(Array.isArray(data) ? data.sort((a: Park, b: Park) => a.name.localeCompare(b.name)) : []))
            .catch(() => setError('Failed to load skateparks'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-zinc-200 flex items-center gap-4">
                <Link href="/map" className="text-zinc-400 hover:text-zinc-700 text-sm">← Back to map</Link>
                <h1 className="text-xl font-bold text-zinc-900">Skateparks</h1>
                <span className="text-xs text-zinc-400">({filteredParks.length}{searchQuery ? ` of ${parks.length}` : ''} parks)</span>
            </div>

            <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
                {/* Left: list */}
                <div className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white flex flex-col">
                    <div className="p-3 border-b border-zinc-100">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skateparks…"
                            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-zinc-50"
                        />
                    </div>
                    {loading && <p className="p-4 text-sm text-zinc-400">Loading…</p>}
                    {error && <p className="p-4 text-sm text-red-600">{error}</p>}

                    <div className="flex-1 overflow-y-auto">
                        {filteredParks.map((park) => (
                            <button
                                key={park.id}
                                onClick={() => setSelectedId(park.id)}
                                className={`w-full text-left px-4 py-3 border-b border-zinc-100 transition-colors ${selectedId === park.id ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
                            >
                                <p className="font-medium text-zinc-900 text-sm truncate">{park.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {[park.city, park.county].filter(Boolean).join(', ') || 'No location set'}
                                </p>
                            </button>
                        ))}
                        {!loading && filteredParks.length === 0 && parks.length > 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No parks match your search.</p>
                        )}
                        {!loading && parks.length === 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No parks listed yet.</p>
                        )}
                    </div>
                </div>

                {/* Right: map + info */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedPark ? (
                        <>
                            {/* Map */}
                            <div className="flex-1 relative min-h-0">
                                <ParkViewMap key={selectedPark.id} park={selectedPark} />

                                {/* Info card overlay */}
                                <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-3 max-w-xs">
                                    <p className="font-semibold text-zinc-900 text-sm">{selectedPark.name}</p>
                                    {(selectedPark.city || selectedPark.county) && (
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            {[selectedPark.city, selectedPark.county].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    {selectedPark.address && (
                                        <div className="flex gap-1.5 mt-2">
                                            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <p className="text-xs text-zinc-600">{selectedPark.address}</p>
                                        </div>
                                    )}
                                    {selectedPark.openingHours && (
                                        <div className="flex gap-1.5 mt-1.5">
                                            <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-xs text-zinc-600">{selectedPark.openingHours}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-sm text-zinc-400">Select a park to see its location and details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
