'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

function ParkEditMap({
    initialLat,
    initialLng,
    onMoved,
}: {
    initialLat: number;
    initialLng: number;
    onMoved: (lat: number, lng: number) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const onMovedRef = useRef(onMoved);
    onMovedRef.current = onMoved;

    useEffect(() => {
        if (!containerRef.current) return;
        if (!Number.isFinite(initialLat) || !Number.isFinite(initialLng)) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [initialLng, initialLat],
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
                cursor: grab;
            `;
            const inner = document.createElement('div');
            inner.style.cssText = 'transform: rotate(45deg); font-size: 13px; line-height: 1;';
            inner.textContent = '🛹';
            el.appendChild(inner);

            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom-left', draggable: true })
                .setLngLat([initialLng, initialLat])
                .addTo(map);

            marker.on('dragend', () => {
                const { lat, lng } = marker.getLngLat();
                onMovedRef.current(lat, lng);
            });
        });

        return () => { map.remove(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!Number.isFinite(initialLat) || !Number.isFinite(initialLng)) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-100">
                <p className="text-sm text-zinc-400">No coordinates set for this park.</p>
            </div>
        );
    }

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function ParkAdminPage() {
    const router = useRouter();
    const [authChecking, setAuthChecking] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editHours, setEditHours] = useState('');
    const [editLat, setEditLat] = useState<number | null>(null);
    const [editLng, setEditLng] = useState<number | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const selectedPark = useMemo(() => parks.find((p) => p.id === selectedId) ?? null, [parks, selectedId]);

    const filteredParks = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return parks;
        return parks.filter(
            (p) =>
                (p.name ?? '').toLowerCase().includes(q) ||
                (p.city ?? '').toLowerCase().includes(q) ||
                (p.county ?? '').toLowerCase().includes(q)
        );
    }, [parks, searchQuery]);

    useEffect(() => {
        (async () => {
            setAuthChecking(true);
            try {
                const r = await fetch('/api/account', { cache: 'no-store' });
                if (r.status === 401) { router.replace('/login'); return; }
                const data = await r.json().catch(() => ({}));
                if (!r.ok || !data?.isAdmin) { setAccessDenied(true); return; }
            } finally {
                setAuthChecking(false);
            }
        })();
    }, [router]);

    useEffect(() => {
        if (authChecking || accessDenied) return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await fetch('/api/park', { cache: 'no-store' });
                const data = await r.json().catch(() => []);
                if (!r.ok) { setError(data?.error || 'Failed to load parks'); return; }
                setParks(Array.isArray(data) ? data.sort((a: Park, b: Park) => a.name.localeCompare(b.name)) : []);
            } catch {
                setError('Failed to reach API');
            } finally {
                setLoading(false);
            }
        })();
    }, [authChecking, accessDenied]);

    // Sync edit form when park selected
    useEffect(() => {
        if (!selectedPark) return;
        setEditName(selectedPark.name ?? '');
        setEditAddress(selectedPark.address ?? '');
        setEditHours(selectedPark.openingHours ?? '');
        setEditLat(selectedPark.latitude != null ? Number(selectedPark.latitude) : null);
        setEditLng(selectedPark.longitude != null ? Number(selectedPark.longitude) : null);
        setEditError(null);
    }, [selectedPark]);

    async function saveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedPark || !editName.trim()) return;
        setEditLoading(true);
        setEditError(null);
        try {
            const body: Record<string, unknown> = {
                name: editName.trim(),
                address: editAddress.trim() || null,
                openingHours: editHours.trim() || null,
            };
            if (editLat != null) body.latitude = editLat;
            if (editLng != null) body.longitude = editLng;

            const r = await fetch(`/api/park/${selectedPark.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setEditError(data?.error || 'Update failed'); return; }
            setParks((prev) =>
                prev.map((p) => (p.id === selectedPark.id ? { ...p, ...data } : p))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
        } catch {
            setEditError('Update failed (network)');
        } finally {
            setEditLoading(false);
        }
    }

    async function deletePark() {
        if (!selectedPark || !confirm(`Delete "${selectedPark.name}"? This cannot be undone.`)) return;
        try {
            const r = await fetch(`/api/park/${selectedPark.id}`, { method: 'DELETE' });
            if (r.ok || r.status === 204) {
                setParks((prev) => prev.filter((p) => p.id !== selectedPark.id));
                setSelectedId(null);
            } else {
                const data = await r.json().catch(() => ({}));
                alert(data?.error || 'Delete failed');
            }
        } catch {
            alert('Delete failed (network)');
        }
    }

    if (authChecking) return <div className="p-8 text-sm text-zinc-500">Checking access…</div>;
    if (accessDenied) return (
        <div className="p-8 space-y-2">
            <p className="text-red-600 font-medium">Admin access required.</p>
            <Link href="/map" className="text-sm text-zinc-500 underline">Back to map</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-white border-b border-zinc-200 flex items-center gap-4">
                <Link href="/map" className="text-zinc-400 hover:text-zinc-700 text-sm">← Back to map</Link>
                <h1 className="text-xl font-bold text-zinc-900">Skatepark Admin</h1>
                <span className="text-xs text-zinc-400">({parks.length} parks)</span>
            </div>

            <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
                {/* Left: list */}
                <div className="w-80 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white flex flex-col">
                    <div className="p-4 border-b border-zinc-100">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search parks…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            />
                        </div>
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
                        {!loading && filteredParks.length === 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">
                                {parks.length === 0 ? 'No parks yet. Add them from the map.' : 'No parks match your search.'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: map + edit */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedPark ? (
                        <>
                            {/* Map takes most of the space */}
                            <div className="flex-1 relative min-h-0">
                                <ParkEditMap
                                    key={selectedPark.id}
                                    initialLat={Number(selectedPark.latitude)}
                                    initialLng={Number(selectedPark.longitude)}
                                    onMoved={(lat, lng) => { setEditLat(lat); setEditLng(lng); }}
                                />
                                <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-3">
                                    <p className="font-semibold text-zinc-900 text-sm">{selectedPark.name}</p>
                                    {(selectedPark.city || selectedPark.county) && (
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            {[selectedPark.city, selectedPark.county].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    {editLat != null && (
                                        <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                                            {editLat.toFixed(5)}, {editLng?.toFixed(5)}
                                        </p>
                                    )}
                                    <p className="text-xs text-zinc-400 mt-1 italic">Drag marker to reposition</p>
                                </div>
                            </div>

                            {/* Edit strip at the bottom */}
                            <div className="bg-white border-t border-zinc-200 p-4 shrink-0">
                                <form onSubmit={saveEdit} className="flex flex-wrap items-end gap-3">
                                    <div className="flex-1 min-w-40">
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Name</label>
                                        <input
                                            type="text"
                                            maxLength={30}
                                            required
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-40">
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Address</label>
                                        <input
                                            type="text"
                                            maxLength={100}
                                            value={editAddress}
                                            onChange={(e) => setEditAddress(e.target.value)}
                                            placeholder="Optional"
                                            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-40">
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Opening Hours</label>
                                        <input
                                            type="text"
                                            maxLength={200}
                                            value={editHours}
                                            onChange={(e) => setEditHours(e.target.value)}
                                            placeholder="Optional"
                                            className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        />
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="submit"
                                            disabled={editLoading || !editName.trim()}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                        >
                                            {editLoading ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={deletePark}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    {editError && <p className="w-full text-xs text-red-600">{editError}</p>}
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-sm text-zinc-400">Select a park to see its location and edit details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
