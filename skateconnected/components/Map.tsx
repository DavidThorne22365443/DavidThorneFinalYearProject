'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { getCityCenter } from '@/lib/cities';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

const DEFAULT_CENTER: [number, number] = [-8.6238, 52.6680];
const DEFAULT_ZOOM = 11;

type Account = {
    id: string;
    username: string;
    isAdmin: boolean;
    city?: string;
    showLastName?: boolean;
};

type Park = {
    id: string;
    name: string;
    city: string | null;
    county: string | null;
    address: string | null;
    openingHours: string | null;
    latitude: number | null;
    longitude: number | null;
};

type Member = {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    showLastName: boolean;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | null;
};

const SKILL_BADGE: Record<string, { label: string; className: string }> = {
    beginner:     { label: 'Beginner',     className: 'bg-emerald-100 text-emerald-700' },
    intermediate: { label: 'Intermediate', className: 'bg-blue-100 text-blue-700' },
    advanced:     { label: 'Advanced',     className: 'bg-purple-100 text-purple-700' },
};

function memberDisplayName(m: Member): string {
    if (m.firstName) {
        return m.showLastName && m.lastName ? `${m.firstName} ${m.lastName}` : m.firstName;
    }
    return m.username;
}

const Map: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<{ park: Park; marker: mapboxgl.Marker }[]>([]);
    const accountRef = useRef<Account | null>(null);

    const [mapReady, setMapReady] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [accountLoaded, setAccountLoaded] = useState(false);
    const [account, setAccount] = useState<Account | null>(null);

    // Parks
    const [parks, setParks] = useState<Park[]>([]);

    // Park detail panel
    const [selectedPark, setSelectedPark] = useState<Park | null>(null);
    const [parkMembers, setParkMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [myMemberships, setMyMemberships] = useState<string[]>([]);

    // Associate warning modal
    const [showAssociateWarning, setShowAssociateWarning] = useState(false);
    const [isAssociating, setIsAssociating] = useState(false);
    const [associateShowLastName, setAssociateShowLastName] = useState(true);

    // Admin add park panel
    const [adminClickCoords, setAdminClickCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [addParkForm, setAddParkForm] = useState({ name: '', address: '', openingHours: '' });
    const [addParkLoading, setAddParkLoading] = useState(false);
    const [addParkError, setAddParkError] = useState<string | null>(null);

    // Message user
    const [messagingUser, setMessagingUser] = useState<Member | null>(null);
    const [messageLoading, setMessageLoading] = useState(false);

    // Keep accountRef in sync for use in map event handlers (avoids stale closures)
    useEffect(() => {
        accountRef.current = account;
    }, [account]);

    // Load current user
    useEffect(() => {
        fetch('/api/account', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: Account | null) => {
                setAccount(data ?? null);
                setAccountLoaded(true);
            })
            .catch(() => setAccountLoaded(true));
    }, []);

    // Load parks
    useEffect(() => {
        fetch('/api/park', { cache: 'no-store' })
            .then((r) => r.ok ? r.json() : [])
            .then((data: Park[]) => setParks(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, []);

    // Load user's current memberships
    useEffect(() => {
        if (!account) return;
        fetch('/api/account/parks')
            .then((r) => r.ok ? r.json() : [])
            .then((ids: string[]) => setMyMemberships(Array.isArray(ids) ? ids : []))
            .catch(() => {});
    }, [account]);

    const userCityCenter = account?.city ? getCityCenter(account.city) : null;

    // Initialise the map
    useEffect(() => {
        if (!accountLoaded || !mapContainerRef.current || mapRef.current) return;

        const center = userCityCenter ?? DEFAULT_CENTER;
        const limerickBounds: [number, number, number, number] = [-9.37, 52.27, -8.15, 52.76];

        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center,
            zoom: DEFAULT_ZOOM,
        });

        mapRef.current = mapInstance;

        mapInstance.on('load', () => {
            const options: mapboxgl.FitBoundsOptions = { padding: 20, animate: false };
            if (userCityCenter) {
                const [lng, lat] = userCityCenter;
                const padding = 0.05;
                mapInstance.fitBounds(
                    [lng - padding, lat - padding, lng + padding, lat + padding],
                    options
                );
            } else {
                mapInstance.fitBounds(limerickBounds, options);
            }
            setMapReady(true);
        });

        // Admin: click on empty map to open "Add Park" panel
        mapInstance.on('click', (e) => {
            if (accountRef.current?.isAdmin) {
                setAdminClickCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
                setSelectedPark(null);
                setAddParkForm({ name: '', address: '', openingHours: '' });
                setAddParkError(null);
            }
        });

        return () => {
            if (mapInstance) {
                mapInstance.remove();
                mapRef.current = null;
            }
        };
    }, [accountLoaded, userCityCenter]);

    // Load park members when a park is selected
    const loadParkMembers = useCallback(async (parkId: string) => {
        setMembersLoading(true);
        setParkMembers([]);
        try {
            const r = await fetch(`/api/park/${parkId}/users`, { cache: 'no-store' });
            if (r.ok) {
                const data: Member[] = await r.json();
                setParkMembers(Array.isArray(data) ? data : []);
            }
        } finally {
            setMembersLoading(false);
        }
    }, []);

    // Add/update markers when parks change and map is ready
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;

        // Remove old markers
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];

        parks.forEach((park) => {
            if (park.latitude == null || park.longitude == null) return;

            const el = document.createElement('div');
            el.style.cssText = `
                width: 36px; height: 36px;
                background: #18181b;
                border: 2.5px solid #fff;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                display: flex; align-items: center; justify-content: center;
            `;
            const inner = document.createElement('div');
            inner.style.cssText = 'transform: rotate(45deg); font-size: 15px; line-height: 1;';
            inner.textContent = '🛹';
            el.appendChild(inner);

            const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom-left' })
                .setLngLat([Number(park.longitude), Number(park.latitude)])
                .addTo(map);

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                setSelectedPark(park);
                setAdminClickCoords(null);
                loadParkMembers(park.id);
            });

            markersRef.current.push({ park, marker });
        });
    }, [parks, mapReady, loadParkMembers]);

    async function associateWithPark() {
        if (!selectedPark) return;
        setIsAssociating(true);
        try {
            // Save showLastName preference if it changed
            if (account && associateShowLastName !== account.showLastName) {
                await fetch('/api/account', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ showLastName: associateShowLastName }),
                });
                setAccount((prev) => prev ? { ...prev, showLastName: associateShowLastName } : prev);
            }
            const r = await fetch(`/api/park/${selectedPark.id}/associate`, { method: 'POST' });
            const data = await r.json().catch(() => ({}));
            if (r.ok) {
                setMyMemberships((prev) => [...prev, selectedPark.id]);
                setShowAssociateWarning(false);
                loadParkMembers(selectedPark.id);
            } else {
                alert(data?.error || 'Failed to associate with park');
                setShowAssociateWarning(false);
            }
        } finally {
            setIsAssociating(false);
        }
    }

    async function dissociateFromPark() {
        if (!selectedPark) return;
        setIsAssociating(true);
        try {
            const r = await fetch(`/api/park/${selectedPark.id}/associate`, { method: 'DELETE' });
            if (r.ok || r.status === 204) {
                setMyMemberships((prev) => prev.filter((id) => id !== selectedPark.id));
                loadParkMembers(selectedPark.id);
            }
        } finally {
            setIsAssociating(false);
        }
    }

    async function startConversation(otherUser: Member) {
        if (!account) return;
        setMessageLoading(true);
        try {
            const r = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otherUserId: otherUser.id }),
            });
            const data = await r.json().catch(() => ({}));
            if (r.ok) {
                window.location.href = `/chat/${data.conversationId}`;
            } else {
                alert(data?.error || 'Failed to start conversation');
            }
        } finally {
            setMessageLoading(false);
            setMessagingUser(null);
        }
    }

    async function submitAddPark(e: React.FormEvent) {
        e.preventDefault();
        if (!adminClickCoords || !addParkForm.name.trim()) return;
        setAddParkLoading(true);
        setAddParkError(null);
        try {
            const r = await fetch('/api/park', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addParkForm.name,
                    address: addParkForm.address || null,
                    openingHours: addParkForm.openingHours || null,
                    latitude: adminClickCoords.lat,
                    longitude: adminClickCoords.lng,
                }),
            });
            const data = await r.json().catch(() => ({}));
            if (r.ok) {
                setParks((prev) => [...prev, data as Park]);
                setAdminClickCoords(null);
                setAddParkForm({ name: '', address: '', openingHours: '' });
            } else {
                setAddParkError(data?.error || 'Failed to create park');
            }
        } finally {
            setAddParkLoading(false);
        }
    }

    const isMyPark = selectedPark ? myMemberships.includes(selectedPark.id) : false;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

            {/* MAP CONTAINER */}
            <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />

            {/* TOP-LEFT FLOATING NAVBAR */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="flex items-center gap-1 bg-white rounded-2xl shadow-lg px-4 py-2.5">
                    <span className="font-bold text-zinc-900 text-sm mr-3 whitespace-nowrap">
                        skateconnected.ie
                    </span>
                    <div className="w-px h-4 bg-zinc-200 mr-1" />
                    <button
                        onClick={() => setSearchOpen(o => !o)}
                        className={`p-1.5 rounded-xl transition-colors ${searchOpen ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800'}`}
                        aria-label="Search"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                    </button>
                    <div className="w-px h-4 bg-zinc-200 mx-1" />
                    <Link href="/chat" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                        Chats
                    </Link>
                    {account?.isAdmin ? (
                        <>
                            <Link href="/account-admin" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Users
                            </Link>
                            <Link href="/park-admin" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Skateparks
                            </Link>
                        </>
                    ) : (
                        <Link href="/skateparks" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                            Skateparks
                        </Link>
                    )}
                    <span className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-300 cursor-not-allowed whitespace-nowrap" title="Coming soon">
                        Skatespots
                    </span>
                </div>

                {searchOpen && (
                    <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-4 py-3 w-80">
                        <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search people, skateparks, spots…"
                            className="flex-1 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 bg-transparent"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-zinc-600" aria-label="Clear search">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Admin hint */}
                {account?.isAdmin && (
                    <div className="bg-zinc-900/80 text-white text-xs rounded-xl px-3 py-1.5 backdrop-blur-sm">
                        Click anywhere on the map to add a skatepark
                    </div>
                )}
            </div>

            {/* PARK DETAIL PANEL */}
            {selectedPark && (
                <div className="absolute top-4 right-4 z-10 w-80 bg-white rounded-2xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between p-4 border-b border-zinc-100">
                        <div className="flex-1 min-w-0 pr-2">
                            <h2 className="font-bold text-zinc-900 text-base leading-tight">{selectedPark.name}</h2>
                            {(selectedPark.city || selectedPark.county) && (
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    {[selectedPark.city, selectedPark.county].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => { setSelectedPark(null); setParkMembers([]); }}
                            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 shrink-0"
                            aria-label="Close"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Details */}
                    <div className="p-4 border-b border-zinc-100 space-y-2">
                        {selectedPark.address && (
                            <div className="flex gap-2 text-sm text-zinc-700">
                                <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{selectedPark.address}</span>
                            </div>
                        )}
                        {selectedPark.openingHours && (
                            <div className="flex gap-2 text-sm text-zinc-700">
                                <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{selectedPark.openingHours}</span>
                            </div>
                        )}
                        {!selectedPark.address && !selectedPark.openingHours && (
                            <p className="text-sm text-zinc-400 italic">No details added yet.</p>
                        )}
                    </div>

                    {/* Members */}
                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                            Skaters here ({parkMembers.length})
                        </p>
                        {membersLoading && (
                            <p className="text-sm text-zinc-400">Loading…</p>
                        )}
                        {!membersLoading && parkMembers.length === 0 && (
                            <p className="text-sm text-zinc-400 italic">No members yet. Be the first!</p>
                        )}
                        <ul className="space-y-1">
                            {parkMembers.map((m) => {
                                const isMe = account?.id === m.id;
                                return (
                                    <li key={m.id} className="flex items-center justify-between gap-2 py-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                                                {(m.username).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm text-zinc-800 truncate block">
                                                    {memberDisplayName(m)}
                                                    {isMe && <span className="text-zinc-400 ml-1">(you)</span>}
                                                </span>
                                                {m.skillLevel && SKILL_BADGE[m.skillLevel] && (
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${SKILL_BADGE[m.skillLevel].className}`}>
                                                        {SKILL_BADGE[m.skillLevel].label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!isMe && account && (
                                            <button
                                                onClick={() => setMessagingUser(m)}
                                                className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-0.5 rounded-lg hover:bg-zinc-100 transition-colors shrink-0"
                                            >
                                                Message
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* Associate button */}
                    {account && (
                        <div className="p-4 border-t border-zinc-100">
                            {isMyPark ? (
                                <button
                                    onClick={dissociateFromPark}
                                    disabled={isAssociating}
                                    className="w-full py-2 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {isAssociating ? 'Removing…' : 'Remove my association'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                    setAssociateShowLastName(account?.showLastName ?? true);
                                    setShowAssociateWarning(true);
                                }}
                                    disabled={isAssociating}
                                    className="w-full py-2 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                >
                                    Associate with this park
                                </button>
                            )}
                        </div>
                    )}
                    {!account && (
                        <div className="p-4 border-t border-zinc-100">
                            <p className="text-xs text-zinc-400 text-center">
                                <Link href="/login" className="underline">Log in</Link> to associate with this park
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ADMIN ADD PARK PANEL */}
            {account?.isAdmin && adminClickCoords && (
                <div className="absolute top-4 right-4 z-10 w-80 bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                        <h2 className="font-bold text-zinc-900 text-base">Add Skatepark</h2>
                        <button
                            onClick={() => setAdminClickCoords(null)}
                            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100"
                            aria-label="Close"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={submitAddPark} className="p-4 space-y-3">
                        <div className="text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                            📍 {adminClickCoords.lat.toFixed(5)}, {adminClickCoords.lng.toFixed(5)}
                        </div>

                        {addParkError && (
                            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{addParkError}</p>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={30}
                                required
                                value={addParkForm.name}
                                onChange={(e) => setAddParkForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Limerick Skate Plaza"
                                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Address</label>
                            <input
                                type="text"
                                maxLength={100}
                                value={addParkForm.address}
                                onChange={(e) => setAddParkForm((f) => ({ ...f, address: e.target.value }))}
                                placeholder="e.g. Cornmarket Row, Limerick"
                                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Opening Hours</label>
                            <input
                                type="text"
                                maxLength={200}
                                value={addParkForm.openingHours}
                                onChange={(e) => setAddParkForm((f) => ({ ...f, openingHours: e.target.value }))}
                                placeholder="e.g. Open 24/7 or Mon–Fri 9am–9pm"
                                className="w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={addParkLoading || !addParkForm.name.trim()}
                            className="w-full py-2 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            {addParkLoading ? 'Saving…' : 'Add Skatepark'}
                        </button>
                    </form>
                </div>
            )}

            {/* ASSOCIATE WARNING MODAL */}
            {showAssociateWarning && selectedPark && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
                        <h3 className="font-bold text-zinc-900 text-base mb-2">Associate with {selectedPark.name}?</h3>
                        <p className="text-sm text-zinc-600 mb-3">
                            Your name will be <strong>visible to all SkateConnected users</strong> as a member of this park.
                            You can be associated with up to 4 skateparks.
                        </p>
                        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={associateShowLastName}
                                onChange={(e) => setAssociateShowLastName(e.target.checked)}
                                className="rounded border-zinc-400 bg-zinc-100 text-zinc-900 focus:ring-zinc-500"
                            />
                            <span className="text-sm text-zinc-700">Show my full name to other users</span>
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAssociateWarning(false)}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-700 border border-zinc-300 hover:bg-zinc-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={associateWithPark}
                                disabled={isAssociating}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                {isAssociating ? 'Joining…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MESSAGE USER CONFIRMATION */}
            {messagingUser && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
                        <h3 className="font-bold text-zinc-900 text-base mb-2">
                            Message {memberDisplayName(messagingUser)}?
                        </h3>
                        <p className="text-sm text-zinc-600 mb-4">
                            They will receive a chat invite and must accept before the conversation opens up.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMessagingUser(null)}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-700 border border-zinc-300 hover:bg-zinc-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => startConversation(messagingUser)}
                                disabled={messageLoading}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                {messageLoading ? 'Sending…' : 'Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Map;
