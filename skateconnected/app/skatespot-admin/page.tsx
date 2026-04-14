'use client';

import { useEffect, useRef, useState } from 'react';
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
    approved: boolean;
    addedById: string | null;
    addedByUsername?: string;
    addedByFirstName?: string | null;
    addedByLastName?: string | null;
    addedBySkillLevel?: string | null;
    createdAt: string;
};

const SKILL_BADGE: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-blue-100 text-blue-700',
    advanced: 'bg-purple-100 text-purple-700',
};

function submitterLabel(spot: Skatespot): string {
    const name = spot.addedByFirstName
        ? spot.addedByLastName
            ? `${spot.addedByFirstName} ${spot.addedByLastName}`
            : spot.addedByFirstName
        : spot.addedByUsername ?? 'Unknown';
    return name;
}

// Static preview map (for pending spots)
function MiniMap({ spot }: { spot: Skatespot }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [Number(spot.longitude), Number(spot.latitude)],
            zoom: 15,
            interactive: true,
        });

        map.on('load', () => {
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
                .setLngLat([Number(spot.longitude), Number(spot.latitude)])
                .addTo(map);
        });

        return () => { map.remove(); };
    }, [spot.latitude, spot.longitude]);

    return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}

// Draggable edit map (for approved spots)
function SpotEditMap({
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
                width: 28px; height: 28px;
                background: #f97316;
                border: 2.5px solid #fff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                cursor: grab;
            `;
            const inner = document.createElement('div');
            inner.style.cssText = 'transform: rotate(45deg); font-size: 12px; line-height: 1;';
            inner.textContent = '📍';
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

    return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}

export default function SkatespotAdminPage() {
    const [pending, setPending] = useState<Skatespot[]>([]);
    const [approved, setApproved] = useState<Skatespot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewSpot, setPreviewSpot] = useState<Skatespot | null>(null);

    // Edit state for approved spots
    const [editSpotName, setEditSpotName] = useState('');
    const [editSpotNearby, setEditSpotNearby] = useState('');
    const [editSpotLat, setEditSpotLat] = useState(0);
    const [editSpotLng, setEditSpotLng] = useState(0);
    const [editSpotLoading, setEditSpotLoading] = useState(false);
    const [editSpotError, setEditSpotError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const [pendingRes, approvedRes] = await Promise.all([
                fetch('/api/skatespot/pending', { cache: 'no-store' }),
                fetch('/api/skatespot', { cache: 'no-store' }),
            ]);
            if (pendingRes.status === 401 || pendingRes.status === 403) {
                setError('Admin access required.');
                return;
            }
            const pendingData = pendingRes.ok ? await pendingRes.json() : [];
            const approvedData = approvedRes.ok ? await approvedRes.json() : [];
            setPending(Array.isArray(pendingData) ? pendingData : []);
            setApproved(Array.isArray(approvedData) ? approvedData : []);
        } catch {
            setError('Failed to load skatespots.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    // Sync edit form when an approved spot is selected for preview
    useEffect(() => {
        if (!previewSpot?.approved) return;
        setEditSpotName(previewSpot.name ?? '');
        setEditSpotNearby(previewSpot.nearby ?? '');
        setEditSpotLat(Number(previewSpot.latitude));
        setEditSpotLng(Number(previewSpot.longitude));
        setEditSpotError(null);
    }, [previewSpot]);

    async function approveSpot(id: string) {
        setActionLoading(id);
        try {
            const r = await fetch(`/api/skatespot/${id}/approve`, { method: 'PUT' });
            if (r.ok) {
                const spot = pending.find((s) => s.id === id);
                if (spot) {
                    setPending((prev) => prev.filter((s) => s.id !== id));
                    setApproved((prev) => [...prev, { ...spot, approved: true }]);
                    if (previewSpot?.id === id) setPreviewSpot(null);
                }
            } else {
                const data = await r.json().catch(() => ({}));
                alert(data?.error || 'Failed to approve');
            }
        } finally {
            setActionLoading(null);
        }
    }

    async function deleteSpot(id: string, fromPending: boolean) {
        if (!confirm('Delete this skatespot?')) return;
        setActionLoading(id);
        try {
            const r = await fetch(`/api/skatespot/${id}`, { method: 'DELETE' });
            if (r.ok || r.status === 204) {
                if (fromPending) setPending((prev) => prev.filter((s) => s.id !== id));
                else setApproved((prev) => prev.filter((s) => s.id !== id));
                if (previewSpot?.id === id) setPreviewSpot(null);
            } else {
                const data = await r.json().catch(() => ({}));
                alert(data?.error || 'Failed to delete');
            }
        } finally {
            setActionLoading(null);
        }
    }

    async function saveSpotEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!previewSpot || !editSpotName.trim()) return;
        setEditSpotLoading(true);
        setEditSpotError(null);
        try {
            const r = await fetch(`/api/skatespot/${previewSpot.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editSpotName.trim(),
                    nearby: editSpotNearby.trim() || null,
                    latitude: editSpotLat,
                    longitude: editSpotLng,
                }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setEditSpotError(data?.error || 'Update failed'); return; }
            setApproved((prev) => prev.map((s) => s.id === previewSpot.id ? { ...s, ...data } : s));
            setPreviewSpot((prev) => prev ? { ...prev, ...data } : prev);
        } catch {
            setEditSpotError('Update failed (network)');
        } finally {
            setEditSpotLoading(false);
        }
    }

    const isApprovedPreview = previewSpot?.approved === true;

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 md:px-6 md:py-5 bg-white border-b border-zinc-200 flex items-center gap-3">
                <Link href="/map" className="text-zinc-400 hover:text-zinc-700 text-sm shrink-0">← Back</Link>
                <h1 className="text-lg md:text-xl font-bold text-zinc-900">Skatespot Admin</h1>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Lists */}
                <div className="w-full md:w-96 shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-200 bg-white flex flex-col max-h-[45vh] md:max-h-none">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {loading && <p className="text-sm text-zinc-500">Loading…</p>}
                        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                        {!loading && !error && (
                            <>
                                {/* Pending */}
                                <section>
                                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                                        Pending Approval ({pending.length})
                                    </h2>
                                    {pending.length === 0 && (
                                        <p className="text-sm text-zinc-400 italic">No spots awaiting approval.</p>
                                    )}
                                    <div className="space-y-2">
                                        {pending.map((spot) => (
                                            <div
                                                key={spot.id}
                                                onClick={() => setPreviewSpot(previewSpot?.id === spot.id ? null : spot)}
                                                className={`rounded-xl border p-3 cursor-pointer transition-colors ${previewSpot?.id === spot.id ? 'border-orange-400 bg-orange-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                                            >
                                                <div className="mb-2">
                                                    <p className="font-semibold text-zinc-900 text-sm">{spot.name}</p>
                                                    {spot.nearby && (
                                                        <p className="text-xs text-zinc-500 mt-0.5">{spot.nearby}</p>
                                                    )}
                                                    <p className="text-xs text-zinc-400 font-mono mt-1">
                                                        {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                                                    </p>
                                                    {/* Submitter info */}
                                                    {spot.addedByUsername && (
                                                        <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-semibold text-zinc-600 shrink-0">
                                                                {spot.addedByUsername.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-xs text-zinc-600 font-medium">
                                                                    {submitterLabel(spot)}
                                                                </span>
                                                                {spot.addedByUsername !== submitterLabel(spot) && (
                                                                    <span className="text-xs text-zinc-400 ml-1">@{spot.addedByUsername}</span>
                                                                )}
                                                                {spot.addedBySkillLevel && SKILL_BADGE[spot.addedBySkillLevel] && (
                                                                    <span className={`ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SKILL_BADGE[spot.addedBySkillLevel]}`}>
                                                                        {spot.addedBySkillLevel.charAt(0).toUpperCase() + spot.addedBySkillLevel.slice(1)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); approveSpot(spot.id); }}
                                                        disabled={actionLoading === spot.id}
                                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {actionLoading === spot.id ? '…' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSpot(spot.id, true); }}
                                                        disabled={actionLoading === spot.id}
                                                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Approved */}
                                <section>
                                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                                        Approved ({approved.length})
                                    </h2>
                                    {approved.length === 0 && (
                                        <p className="text-sm text-zinc-400 italic">No approved spots yet.</p>
                                    )}
                                    <div className="space-y-2">
                                        {approved.map((spot) => (
                                            <div
                                                key={spot.id}
                                                onClick={() => setPreviewSpot(previewSpot?.id === spot.id ? null : spot)}
                                                className={`rounded-xl border p-3 cursor-pointer transition-colors ${previewSpot?.id === spot.id ? 'border-orange-400 bg-orange-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-zinc-900 text-sm">{spot.name}</p>
                                                        {spot.nearby && (
                                                            <p className="text-xs text-zinc-500 mt-0.5">{spot.nearby}</p>
                                                        )}
                                                        <p className="text-xs text-zinc-400 font-mono mt-1">
                                                            {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-zinc-400 italic shrink-0 mt-0.5">Click to edit</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>

                {/* Map preview / edit */}
                <div className={`flex-1 min-h-[40vh] md:min-h-0 ${isApprovedPreview ? 'flex flex-col overflow-hidden' : 'relative'} bg-zinc-100`}>
                    {previewSpot ? (
                        isApprovedPreview ? (
                            // Approved spot — editable map + edit form
                            <>
                                <div className="flex-1 relative min-h-0">
                                    <SpotEditMap
                                        key={previewSpot.id}
                                        initialLat={Number(previewSpot.latitude)}
                                        initialLng={Number(previewSpot.longitude)}
                                        onMoved={(lat, lng) => { setEditSpotLat(lat); setEditSpotLng(lng); }}
                                    />
                                    <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-3 max-w-xs">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                            <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Approved spot</span>
                                        </div>
                                        <p className="font-semibold text-zinc-900 text-sm">{previewSpot.name}</p>
                                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                            {editSpotLat.toFixed(5)}, {editSpotLng.toFixed(5)}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1 italic">Drag marker to reposition</p>
                                    </div>
                                </div>
                                <div className="bg-white border-t border-zinc-200 p-4 shrink-0">
                                    <form onSubmit={saveSpotEdit} className="flex flex-wrap items-end gap-3">
                                        <div className="flex-1 min-w-40">
                                            <label className="block text-xs font-medium text-zinc-600 mb-1">Name</label>
                                            <input
                                                type="text"
                                                maxLength={60}
                                                required
                                                value={editSpotName}
                                                onChange={(e) => setEditSpotName(e.target.value)}
                                                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-40">
                                            <label className="block text-xs font-medium text-zinc-600 mb-1">Nearby / Description</label>
                                            <input
                                                type="text"
                                                maxLength={200}
                                                value={editSpotNearby}
                                                onChange={(e) => setEditSpotNearby(e.target.value)}
                                                placeholder="Optional"
                                                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                            />
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="submit"
                                                disabled={editSpotLoading || !editSpotName.trim()}
                                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                            >
                                                {editSpotLoading ? 'Saving…' : 'Save'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteSpot(previewSpot.id, false)}
                                                disabled={actionLoading === previewSpot.id}
                                                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                            >
                                                {actionLoading === previewSpot.id ? '…' : 'Delete'}
                                            </button>
                                        </div>
                                        {editSpotError && <p className="w-full text-xs text-red-600">{editSpotError}</p>}
                                    </form>
                                </div>
                            </>
                        ) : (
                            // Pending spot — read-only preview
                            <>
                                <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-3 max-w-xs">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                        <span className="text-xs font-medium text-orange-600 uppercase tracking-wide">Proposed location</span>
                                    </div>
                                    <p className="font-semibold text-zinc-900 text-sm">{previewSpot.name}</p>
                                    {previewSpot.nearby && (
                                        <p className="text-xs text-zinc-500 mt-0.5">{previewSpot.nearby}</p>
                                    )}
                                    {previewSpot.addedByUsername && (
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Submitted by <span className="font-medium text-zinc-600">{submitterLabel(previewSpot)}</span>
                                            {previewSpot.addedByUsername !== submitterLabel(previewSpot) && (
                                                <span> (@{previewSpot.addedByUsername})</span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <MiniMap key={previewSpot.id} spot={previewSpot} />
                            </>
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-zinc-400">Click a spot on the left to preview its location</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
