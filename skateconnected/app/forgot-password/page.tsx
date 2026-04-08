"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const canSubmit = email.trim().length > 0 && !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!canSubmit) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data?.error ?? "Something went wrong. Please try again.");
                return;
            }

            setSubmitted(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Forgot password</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {submitted ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-green-800/60 bg-green-950/40 px-4 py-3 text-sm text-green-200">
                            If that email is registered, you'll receive a reset link shortly. Check your inbox.
                        </div>
                        <Link
                            href="/login"
                            className="block text-center text-sm text-zinc-300 hover:text-white"
                        >
                            Back to login
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
                            <label className="block text-sm text-zinc-300 mb-2" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending..." : "Send reset link"}
                        </button>

                        <p className="text-center text-sm text-zinc-400">
                            Remembered it?{" "}
                            <Link href="/login" className="text-zinc-200 hover:text-white">
                                Back to login
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
