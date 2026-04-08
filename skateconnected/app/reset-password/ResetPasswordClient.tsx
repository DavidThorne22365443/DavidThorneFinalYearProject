"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const canSubmit = password.length >= 6 && password === confirm && !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError("Invalid or missing reset token. Please request a new reset link.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (!canSubmit) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data?.error ?? "Something went wrong. Please try again.");
                return;
            }

            setSuccess(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
                <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                    <h1 className="text-2xl font-semibold mb-4">Invalid link</h1>
                    <p className="text-sm text-zinc-400 mb-6">
                        This reset link is missing a token. Please request a new one.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="block text-center text-sm text-zinc-200 hover:text-white"
                    >
                        Request a new reset link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Set new password</h1>
                    <p className="text-sm text-zinc-400 mt-1">Choose a new password for your account.</p>
                </div>

                {success ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-green-800/60 bg-green-950/40 px-4 py-3 text-sm text-green-200">
                            Password updated successfully.
                        </div>
                        <Link
                            href="/login"
                            className="block w-full text-center rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200"
                        >
                            Log in
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-zinc-300 mb-2" htmlFor="password">
                                New password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPw ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-zinc-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((s) => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                    aria-label={showPw ? "Hide password" : "Show password"}
                                >
                                    {showPw ? "Hide" : "Show"}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Min 6 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm text-zinc-300 mb-2" htmlFor="confirm">
                                Confirm password
                            </label>
                            <input
                                id="confirm"
                                type={showPw ? "text" : "password"}
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600"
                            />
                            {confirm.length > 0 && password !== confirm && (
                                <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Updating..." : "Update password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
