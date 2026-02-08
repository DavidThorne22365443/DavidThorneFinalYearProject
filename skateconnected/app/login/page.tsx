console.log("LOGIN PAGE VERSION: NEW (no fetch)");


"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);

    function handleSubmit(e: React.FormEvent) {
        console.log("SUBMIT CLICKED");

        e.preventDefault();

        // TEMP: skip backend auth and just go to the map page (/)
        router.push("/dashboard");

    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950 text-zinc-100">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Welcome back</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Log in to continue to <span className="text-zinc-200">skateconnected</span>.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-300 mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. davidthorne"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-2" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPw ? "text" : "password"}
                                autoComplete="current-password"
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

                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-500">Min 6 characters</span>
                            <Link href="/forgot-password" className="text-zinc-300 hover:text-white">
                                Forgot password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200"
                    >
                        Log in
                    </button>

                    <p className="text-center text-sm text-zinc-400">
                        Don’t have an account?{" "}
                        <Link href="/register" className="text-zinc-200 hover:text-white">
                            Create one
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
