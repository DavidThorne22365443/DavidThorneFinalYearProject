'use client';

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { getCityCenter } from '@/lib/cities';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

const DEFAULT_CENTER: [number, number] = [-8.6238, 52.6680];
const DEFAULT_ZOOM = 11;

const Map: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [accountLoaded, setAccountLoaded] = useState(false);
    const [account, setAccount] = useState<{ city?: string; isAdmin?: boolean } | null>(null);
    const userCityCenter = account?.city ? getCityCenter(account.city) : null;

    useEffect(() => {
        fetch('/api/account', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { city?: string; isAdmin?: boolean } | null) => {
                setAccount(data ?? null);
                setAccountLoaded(true);
            })
            .catch(() => setAccountLoaded(true));
    }, []);

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
        });

        return () => {
            if (mapInstance) {
                mapInstance.remove();
                mapRef.current = null;
            }
        };
    }, [accountLoaded, userCityCenter]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

            {/* MAP CONTAINER */}
            <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />

            {/* TOP-LEFT FLOATING NAVBAR */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">

                {/* Main nav pill */}
                <div className="flex items-center gap-1 bg-white rounded-2xl shadow-lg px-4 py-2.5">

                    {/* Brand */}
                    <span className="font-bold text-zinc-900 text-sm mr-3 whitespace-nowrap">
                        skateconnected.ie
                    </span>

                    <div className="w-px h-4 bg-zinc-200 mr-1" />

                    {/* Search icon */}
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

                    {/* Nav links */}
                    <Link
                        href="/chat"
                        className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                    >
                        Chats
                    </Link>
                    {account?.isAdmin ? (
                        <>
                            <Link
                                href="/account-admin"
                                className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                            >
                                Users
                            </Link>
                            <Link
                                href="/park-admin"
                                className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                            >
                                Skateparks
                            </Link>
                        </>
                    ) : (
                        <Link
                            href="/skateparks"
                            className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap"
                        >
                            Skateparks
                        </Link>
                    )}
                    <span
                        className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-300 cursor-not-allowed whitespace-nowrap"
                        title="Coming soon"
                    >
                        Skatespots
                    </span>
                </div>

                {/* Search bar — shown when search icon is toggled */}
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
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-zinc-400 hover:text-zinc-600"
                                aria-label="Clear search"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default Map;