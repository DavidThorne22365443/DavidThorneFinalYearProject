"use client";

import { useEffect, useState } from "react";

type Account = {
    id: string;
    username: string;
    createdAt?: string;
    updatedAt?: string;
};

export default function DashboardPage() {
    const [account, setAccount] = useState<Account | null>(null);
    // holds loaded account object from backend

    const [username, setUsername] = useState("");
    // stores whats currently typed in the user input

    const [loading, setLoading] = useState(true);
    // controls the loading ui while the account is being fetched

    const [saving, setSaving] = useState(false);
    // controls the "saving" button for PUT requests (ie changing a username)

    const [error, setError] = useState<string | null>(null);
    // shows error messages

    const [message, setMessage] = useState<string | null>(null);
    // shows success messages

    async function load() {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const r = await fetch("/api/account", { cache: "no-store" });
            // calls your Next API route before calling Express backend

            const data = await r.json().catch(() => ({}));
            // reads the json file

            if (!r.ok) {
                setError(data?.error || "Failed to load account");
                setAccount(null);
            } else {

                //if the account was found store it, and set the input box as the current username
                setAccount(data);
                setUsername(data.username || "");
            }
        } catch {
            setError("Network error loading account");
            setAccount(null);
        } finally {
            setLoading(false);
        }
    }

    async function save() {
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            const r = await fetch("/api/account", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            // above, the updated username from the previous code is sent to the Next API route
            // Next forwards it to Express PUT endpoints
            // Express updates the database through Sequelize



            const data = await r.json().catch(() => ({}));
            // A response comes back and from that a message tells us this data is now either saved
            // or that an error has occurred

            if (!r.ok) {
                setError(data?.error || "Failed to update account");
            } else {
                setAccount(data);
                setMessage("Saved ✅");
            }
        } catch {
            setError("Network error saving account");
        } finally {
            setSaving(false);
        }
    }


    // after data has been changed like we see above, the following line loads the dashboard, hence why
    // data appears automatically

    useEffect(() => {
        load();
    }, []);



    // rather than showing blank screens, I made divs that appear temporarily when there are errors or
    // if the dashboard is loading
    if (loading) return <div className="p-6">Loading dashboard...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!account) return <div className="p-6">No account loaded.</div>;

    return (
        <div className="p-6 max-w-xl space-y-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            <div className="rounded border p-4 space-y-3">
                <div className="text-sm">
                    <span className="font-semibold">Account ID:</span> {account.id}
                </div>

                <div className="space-y-1">
                    <label className="font-semibold">Username</label>
                    <input
                        className="w-full border rounded px-3 py-2"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <button
                    className="border rounded px-4 py-2"
                    onClick={save}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Save"}
                </button>

                {message && <div className="text-green-700">{message}</div>}
            </div>
        </div>
    );
}
