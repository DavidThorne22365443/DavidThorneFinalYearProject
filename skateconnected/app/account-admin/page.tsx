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
    const [authChecking, setAuthChecking] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editUsername, setEditUsername] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

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
                if (r.status === 401) { router.replace("/login"); return; }
                const data = await r.json().catch(() => ({}));
                if (!r.ok || !data?.isAdmin) { setAccessDenied(true); return; }
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
            if (!r.ok) { setError((data as any)?.error || "Failed to load accounts"); setAccounts([]); return; }
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
        if (selectedAccount) { setEditUsername(selectedAccount.username); setConfirmDelete(false); }
    }, [selectedAccount]);

    async function updateSelected() {
        if (!selectedAccount || !editUsername.trim()) return;
        setError(null);
        try {
            const r = await fetch(`/api/accounts/${selectedAccount.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: editUsername.trim() }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) { setError((data as any)?.error || "Update failed"); return; }
            setAccounts((prev) =>
                prev.map((a) => (a.id === selectedAccount.id ? { ...a, username: editUsername.trim() } : a))
                    .sort((a, b) => a.username.localeCompare(b.username))
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
            setConfirmDelete(false);
        } catch {
            setError("Delete failed (network)");
        }
    }

    if (authChecking) {
        return <div className="p-8 text-sm text-zinc-500">Checking access…</div>;
    }

    if (accessDenied) {
        return (
            <div className="p-8 space-y-2">
                <p className="text-red-600 font-medium">Admin access required.</p>
                <Link href="/map" className="text-sm text-zinc-500 underline">Back to map</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 md:px-6 md:py-5 bg-white border-b border-zinc-200 flex items-center gap-3">
                <Link href="/map" className="text-zinc-400 hover:text-zinc-700 text-sm shrink-0">← Back</Link>
                <h1 className="text-lg md:text-xl font-bold text-zinc-900">User Admin</h1>
                <span className="text-xs text-zinc-400">
                    ({filteredAccounts.length}{searchQuery ? ` of ${accounts.length}` : ""} users)
                </span>
                {loading && <span className="text-xs text-zinc-400 ml-auto">Loading…</span>}
                {!loading && (
                    <button
                        onClick={loadAccounts}
                        className="ml-auto text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                        Reload
                    </button>
                )}
            </div>

            {error && (
                <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Account list */}
                <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 bg-white flex flex-col max-h-[40vh] md:max-h-none">
                    <div className="p-3 border-b border-zinc-100">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by username or email…"
                            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-300 bg-zinc-50"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {filteredAccounts.map((a) => (
                            <button
                                key={a.id}
                                onClick={() => setSelectedId(a.id)}
                                className={`w-full text-left px-4 py-3 border-b border-zinc-100 transition-colors ${
                                    selectedId === a.id ? "bg-zinc-100" : "hover:bg-zinc-50"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-zinc-900 text-sm truncate">{a.username}</p>
                                    {a.isAdmin && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-900 text-white shrink-0">
                                            admin
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{a.email ?? "No email"}</p>
                            </button>
                        ))}
                        {!loading && filteredAccounts.length === 0 && accounts.length > 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No accounts match your search.</p>
                        )}
                        {!loading && accounts.length === 0 && (
                            <p className="p-4 text-sm text-zinc-400 italic">No accounts yet.</p>
                        )}
                    </div>
                </div>

                {/* Detail + actions */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                    {/* Selected account detail */}
                    {selectedAccount ? (
                        <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-4">
                            {/* Account info */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-sm font-semibold text-zinc-900">{selectedAccount.username}</h2>
                                    {selectedAccount.isAdmin && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-900 text-white">
                                            admin
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {selectedAccount.email && (
                                        <p className="text-xs text-zinc-500">{selectedAccount.email}</p>
                                    )}
                                    {selectedAccount.city && (
                                        <p className="text-xs text-zinc-400">{selectedAccount.city}</p>
                                    )}
                                    {selectedAccount.createdAt && (
                                        <p className="text-xs text-zinc-400">
                                            Joined {new Date(selectedAccount.createdAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-zinc-100" />

                            {/* Edit username */}
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Username</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        className="flex-1 text-sm border border-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                    />
                                    <button
                                        onClick={updateSelected}
                                        disabled={!editUsername.trim() || editUsername.trim() === selectedAccount.username}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-zinc-100" />

                            {/* Delete */}
                            <div>
                                {selectedAccount.isAdmin ? (
                                    <p className="text-xs text-zinc-400 italic text-center">Admin accounts cannot be deleted.</p>
                                ) : !confirmDelete ? (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        className="w-full py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                    >
                                        Delete account
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-zinc-700">
                                            Delete <strong>{selectedAccount.username}</strong>? This cannot be undone.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                className="flex-1 py-2 rounded-lg text-sm font-medium text-zinc-700 border border-zinc-300 hover:bg-zinc-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={deleteSelected}
                                                className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                                            >
                                                Confirm delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-zinc-200 p-8 flex items-center justify-center">
                            <p className="text-sm text-zinc-400">Select an account to edit or delete it</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
