"use client";

import { useEffect, useMemo, useState } from "react";

type Park = {
    id: string;
    name: string;
    city: string | null;
    county: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    createdAt?: string;
    updatedAt?: string;
};

export default function ParkAdminPage() {
    const [parks, setParks] = useState<Park[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Create form
    const [name, setName] = useState("");
    const [city, setCity] = useState("");
    const [county, setCounty] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");

    // Update form
    const selectedPark = useMemo(
        () => parks.find((p) => p.id === selectedId) ?? null,
        [parks, selectedId]
    );

    const [editName, setEditName] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editCounty, setEditCounty] = useState("");
    const [editLat, setEditLat] = useState("");
    const [editLng, setEditLng] = useState("");

    async function loadOnce() {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch("/api/park-state", { cache: "no-store" });
            const data = await r.json();

            if (!r.ok) {
                const msg = data?.detail ? `${data.error}: ${data.detail}` : (data?.error || "Failed to load park state");
                setError(msg);
                setParks([]);
                return;
            }

            setParks(Array.isArray(data.parks) ? data.parks : []);
        } catch (err: any) {
            setError(`Failed to reach API: ${err?.message || "Unknown error"}`);
            setParks([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOnce();
    }, []);

    // Keep edit form in sync when selecting a park
    useEffect(() => {
        if (!selectedPark) return;
        setEditName(selectedPark.name ?? "");
        setEditCity(selectedPark.city ?? "");
        setEditCounty(selectedPark.county ?? "");
        setEditLat(selectedPark.latitude == null ? "" : String(selectedPark.latitude));
        setEditLng(selectedPark.longitude == null ? "" : String(selectedPark.longitude));
    }, [selectedPark]);

    async function createPark() {
        setError(null);
        const payload: any = {
            name,
            city: city || null,
            county: county || null,
            latitude: lat === "" ? null : Number(lat),
            longitude: lng === "" ? null : Number(lng),
        };

        try {
            const r = await fetch("/api/park", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await r.json();

            if (!r.ok) {
                const msg = data?.detail ? `${data.error}: ${data.detail}` : (data?.error || "Create failed");
                setError(msg);
                return;
            }

            // update client cache (no refetch required)
            setParks((prev) => [data, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
            setName("");
            setCity("");
            setCounty("");
            setLat("");
            setLng("");
        } catch {
            setError("Create failed (network)");
        }
    }

    async function updateSelected() {
        if (!selectedPark) return;
        setError(null);

        const payload: any = {
            name: editName,
            city: editCity || null,
            county: editCounty || null,
            latitude: editLat === "" ? null : Number(editLat),
            longitude: editLng === "" ? null : Number(editLng),
        };

        try {
            const r = await fetch(`/api/park/${selectedPark.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await r.json();

            if (!r.ok) {
                setError(data?.error || "Update failed");
                return;
            }

            // update client cache
            setParks((prev) =>
                prev.map((p) => (p.id === selectedPark.id ? data : p)).sort((a, b) => a.name.localeCompare(b.name))
            );
        } catch {
            setError("Update failed (network)");
        }
    }

    async function deleteSelected() {
        if (!selectedPark) return;
        setError(null);

        try {
            const r = await fetch(`/api/park/${selectedPark.id}`, { method: "DELETE" });

            if (!r.ok && r.status !== 204) {
                const data = await r.json().catch(() => ({}));
                setError((data as any)?.error || "Delete failed");
                return;
            }

            setParks((prev) => prev.filter((p) => p.id !== selectedPark.id));
            setSelectedId(null);
        } catch {
            setError("Delete failed (network)");
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Park Admin</h1>

            {loading && <p>Loading…</p>}
            {error && <p className="text-red-600">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: parks list */}
                <div className="border rounded p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">All Parks</h2>
                        <button className="border rounded px-3 py-1" onClick={loadOnce}>
                            Reload
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-auto border rounded">
                        {parks.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedId(p.id)}
                                className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 ${
                                    selectedId === p.id ? "bg-gray-100" : ""
                                }`}
                            >
                                <div className="font-medium">{p.name}</div>
                                <div className="text-sm text-gray-600">
                                    {(p.city ?? "—")}, {(p.county ?? "—")}
                                </div>
                            </button>
                        ))}
                        {parks.length === 0 && !loading && <div className="p-3 text-gray-600">No parks yet.</div>}
                    </div>
                </div>

                {/* RIGHT: create + edit */}
                <div className="space-y-6">
                    {/* CREATE */}
                    <div className="border rounded p-4 space-y-3">
                        <h2 className="font-semibold">Create Park</h2>

                        <div className="space-y-2">
                            <input className="border rounded px-3 py-2 w-full" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                            <input className="border rounded px-3 py-2 w-full" placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
                            <input className="border rounded px-3 py-2 w-full" placeholder="County (optional)" value={county} onChange={(e) => setCounty(e.target.value)} />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" step="any" className="border rounded px-3 py-2 w-full" placeholder="Latitude e.g. 52.66" value={lat} onChange={(e) => setLat(e.target.value)} />
                                <input type="number" step="any" className="border rounded px-3 py-2 w-full" placeholder="Longitude e.g. -8.63" value={lng} onChange={(e) => setLng(e.target.value)} />
                            </div>
                            <button className="border rounded px-3 py-2" onClick={createPark} disabled={!name.trim()}>
                                Create
                            </button>
                        </div>
                    </div>

                    {/* EDIT/READ */}
                    <div className="border rounded p-4 space-y-3">
                        <h2 className="font-semibold">Read / Update / Delete</h2>

                        {!selectedPark && <p className="text-gray-600">Select a park from the list to view/edit.</p>}

                        {selectedPark && (
                            <div className="space-y-2">
                                <div className="text-sm text-gray-600">ID: {selectedPark.id}</div>

                                <input className="border rounded px-3 py-2 w-full" placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                <input className="border rounded px-3 py-2 w-full" placeholder="City" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                                <input className="border rounded px-3 py-2 w-full" placeholder="County" value={editCounty} onChange={(e) => setEditCounty(e.target.value)} />

                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" step="any" className="border rounded px-3 py-2 w-full" placeholder="Latitude e.g. 52.66" value={editLat} onChange={(e) => setEditLat(e.target.value)} />
                                    <input type="number" step="any" className="border rounded px-3 py-2 w-full" placeholder="Longitude e.g. -8.63" value={editLng} onChange={(e) => setEditLng(e.target.value)} />
                                </div>

                                <div className="flex gap-2">
                                    <button className="border rounded px-3 py-2" onClick={updateSelected}>
                                        Update
                                    </button>
                                    <button className="border rounded px-3 py-2" onClick={deleteSelected}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
