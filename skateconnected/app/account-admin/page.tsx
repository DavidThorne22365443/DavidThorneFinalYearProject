"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Account = {
    id: string;
    username: string;
    email?: string;
    parkId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    showLastName?: boolean;
    favouriteTrick?: string | null;
    city?: string | null;
    emailVerified?: boolean;
    isAdmin?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export default function AccountAdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<Account | null>(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [createUsername, setCreateUsername] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredAccounts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter(
            (a) =>
                (a.username ?? "").toLowerCase().includes(q) ||
                (a.email ?? "").toLowerCase().includes(q)
        );
    }, [accounts, searchQuery]);

    const selectedAccount = useMemo(
        () => accounts.find((a) => a.id === selectedId) ?? null,
        [accounts, selectedId]
    );

    useEffect(() => {
        (async () => {
            setAuthChecking(true);
            setAccessDenied(false);
            try {
                const r = await fetch("/api/account", { cache: "no-store" });
                if (r.status === 401) {
                    router.replace("/login");
                    return;
                }
                const data = await r.json().catch(() => ({}));
                if (!r.ok) {
                    setAccessDenied(true);
                    setUser(null);
                    return;
                }
                setUser(data);
                if (!data?.isAdmin) {
                    setAccessDenied(true);
                    return;
                }
                setAccessDenied(false);
            } finally {
                setAuthChecking(false);
            }
        })();
    }, [router]);

    async function loadAccounts() {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch("/api/accounts", { cache: "no-store" });
            const data = await r.json().catch(() => []);
            if (!r.ok) {
                setError((data as any)?.error || "Failed to load accounts");
                setAccounts([]);
                return;
            }
            setAccounts(Array.isArray(data) ? data : []);
        } catch {
            setError("Failed to reach API");
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!authChecking && !accessDenied) loadAccounts();
    }, [authChecking, accessDenied]);

    useEffect(() => {
        if (selectedAccount) setEditUsername(selectedAccount.username);
    }, [selectedAccount]);

    async function createAccount() {
        if (!createUsername.trim()) return;
        setError(null);
        try {
            const r = await fetch("/api/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: createUsername.trim() }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                setError((data as any)?.error || "Create failed");
                return;
            }
            setAccounts((prev) => [...prev, data].sort((a, b) => a.username.localeCompare(b.username)));
            setCreateUsername("");
        } catch {
            setError("Create failed (network)");
        }
    }

    async function updateSelected() {
        if (!selectedAccount || editUsername.trim() === "") return;
        setError(null);
        try {
            const r = await fetch(`/api/accounts/${selectedAccount.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: editUsername.trim() }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                setError((data as any)?.error || "Update failed");
                return;
            }
            setAccounts((prev) =>
                prev.map((a) => (a.id === selectedAccount.id ? { ...a, username: editUsername.trim() } : a)).sort((a, b) => a.username.localeCompare(b.username))
            );
        } catch {
            setError("Update failed (network)");
        }
    }

    async function deleteSelected() {
        if (!selectedAccount) return;
        setError(null);
        try {
            const r = await fetch(`/api/accounts/${selectedAccount.id}`, { method: "DELETE" });
            if (!r.ok && r.status !== 204) {
                const data = await r.json().catch(() => ({}));
                setError((data as any)?.error || "Delete failed");
                return;
            }
            setAccounts((prev) => prev.filter((a) => a.id !== selectedAccount.id));
            setSelectedId(null);
        } catch {
            setError("Delete failed (network)");
        }
    }

    if (authChecking) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <p>Checking access…</p>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold">Account Admin</h1>
                <p className="text-red-600">Access denied. Admin only.</p>
                <Link href="/map" className="text-blue-600 hover:underline">Back to map</Link>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Account Admin</h1>
                <Link href="/map" className="text-sm text-blue-600 hover:underline">Map</Link>
                <Link href="/park-admin" className="text-sm text-blue-600 hover:underline">Park Admin</Link>
            </div>

            {loading && <p>Loading…</p>}
            {error && <p className="text-red-600">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">All Accounts</h2>
                        <button className="border rounded px-3 py-1" onClick={loadAccounts}>
                            Reload
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by username or email…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                    />
                    <div className="max-h-[420px] overflow-auto border rounded">
                        {filteredAccounts.map((a) => (
                            <button
                                key={a.id}
                                onClick={() => setSelectedId(a.id)}
                                className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 ${selectedId === a.id ? "bg-gray-100" : ""}`}
                            >
                                <div className="font-medium">{a.username}</div>
                                <div className="text-sm text-gray-600">
                                    {a.email ?? "—"} {a.isAdmin ? " (admin)" : ""}
                                </div>
                            </button>
                        ))}
                        {filteredAccounts.length === 0 && !loading && (
                            <div className="p-3 text-gray-600">{accounts.length === 0 ? "No accounts." : "No accounts match your search."}</div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border rounded p-4 space-y-3">
                        <h2 className="font-semibold">Create Account</h2>
                        <div className="flex gap-2">
                            <input
                                className="border rounded px-3 py-2 flex-1"
                                placeholder="Username"
                                value={createUsername}
                                onChange={(e) => setCreateUsername(e.target.value)}
                            />
                            <button className="border rounded px-3 py-2" onClick={createAccount} disabled={!createUsername.trim()}>
                                Create
                            </button>
                        </div>
                    </div>

                    <div className="border rounded p-4 space-y-3">
                        <h2 className="font-semibold">Edit / Delete</h2>
                        {!selectedAccount && <p className="text-gray-600">Select an account to edit or delete.</p>}
                        {selectedAccount && (
                            <div className="space-y-2">
                                <div className="text-sm text-gray-600">ID: {selectedAccount.id}</div>
                                <input
                                    className="border rounded px-3 py-2 w-full"
                                    placeholder="Username"
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                />
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
