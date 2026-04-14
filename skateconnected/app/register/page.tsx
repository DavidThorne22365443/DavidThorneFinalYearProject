"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/cities";

export default function RegisterPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [showLastName, setShowLastName] = useState(true);
    const [favouriteTrick, setFavouriteTrick] = useState("");
    const [city, setCity] = useState("");
    const [skillLevel, setSkillLevel] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [step, setStep] = useState<"form" | "verify">("form");
    const [verifyEmail, setVerifyEmail] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);

    const router = useRouter();

    const passwordsMatch = password === confirmPassword;
    const pwHasLength = password.length >= 8;
    const pwHasNumber = /\d/.test(password);
    const pwHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);
    const passwordValid = pwHasLength && pwHasNumber && pwHasSpecial;

    const canSubmit =
        firstName.trim().length >= 1 &&
        lastName.trim().length >= 1 &&
        email.trim().length >= 1 &&
        username.trim().length >= 3 &&
        passwordValid &&
        confirmPassword.length >= 1 &&
        passwordsMatch &&
        city &&
        skillLevel &&
        !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }
        if (!passwordValid) {
            setError("Password must be at least 8 characters and include a number and a special character.");
            return;
        }
        if (!canSubmit) {
            setError("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                    email: email.trim().toLowerCase(),
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    showLastName,
                    favouriteTrick: favouriteTrick.trim() || undefined,
                    city: city.trim() || undefined,
                    skillLevel: skillLevel || undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(
                    data?.error ?? (res.status === 409 ? "An account with this username or email already exists." : "Registration failed.")
                );
                return;
            }

            setVerifyEmail(email.trim().toLowerCase());
            setStep("verify");
        } catch {
            setError("Could not reach the server. Is the app running?");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        setVerifyError(null);
        if (!verifyCode.trim()) {
            setVerifyError("Enter the 6-digit code from your email.");
            return;
        }
        setVerifyLoading(true);
        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: verifyEmail, code: verifyCode.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setVerifyError(data?.error ?? "Verification failed.");
                return;
            }
            router.push("/login?verified=1");
        } catch {
            setVerifyError("Could not reach the server.");
        } finally {
            setVerifyLoading(false);
        }
    }

    if (step === "verify") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-zinc-950 text-zinc-100">
                <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold">Verify your email</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            We sent a 6-digit code to <span className="text-zinc-200">{verifyEmail}</span>. Enter it below to create your account. No account has been created yet—if you don’t enter the correct code or you go back, you’ll need to sign up again.
                        </p>
                    </div>

                    {verifyError && (
                        <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                            {verifyError}
                        </div>
                    )}

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="verifyCode">
                                Verification code
                            </label>
                            <input
                                id="verifyCode"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                                placeholder="000000"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-zinc-600"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={verifyCode.trim().length !== 6 || verifyLoading}
                            className="w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {verifyLoading ? "Verifying…" : "Verify and continue"}
                        </button>

                        <p className="text-center text-sm text-zinc-400">
                            Didn’t get the email? Check spam or{" "}
                            <button type="button" onClick={() => setStep("form")} className="text-zinc-200 hover:text-white underline">
                                try again
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-zinc-950 text-zinc-100">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl backdrop-blur p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold">Create an account</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Join <span className="text-zinc-200">skateconnected</span> and set your home city.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="firstName">
                                First name <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                autoComplete="given-name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. David"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="lastName">
                                Second name <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                autoComplete="family-name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="e.g. Thorne"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="showLastName"
                            type="checkbox"
                            checked={showLastName}
                            onChange={(e) => setShowLastName(e.target.checked)}
                            className="rounded border-zinc-600 bg-zinc-800 text-white focus:ring-zinc-500"
                        />
                        <label htmlFor="showLastName" className="text-sm text-zinc-400">
                            Show my second name to others
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="favouriteTrick">
                            Favourite trick <span className="text-zinc-500 font-normal">(optional)</span>
                        </label>
                        <input
                            id="favouriteTrick"
                            type="text"
                            value={favouriteTrick}
                            onChange={(e) => setFavouriteTrick(e.target.value)}
                            placeholder="e.g. Kickflip, Ollie"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="city">
                            City you skate in <span className="text-red-400">*</span>
                        </label>
                        <select
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
                        >
                            <option value="">Select a city</option>
                            {CITIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">The map will focus on this city when you log in.</p>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="skillLevel">
                            Skill level <span className="text-red-400">*</span>
                        </label>
                        <select
                            id="skillLevel"
                            value={skillLevel}
                            onChange={(e) => setSkillLevel(e.target.value)}
                            required
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
                        >
                            <option value="">Select your level</option>
                            <option value="beginner">Beginner — just started skating in the last month or two</option>
                            <option value="intermediate">Intermediate — been skating for a little while</option>
                            <option value="advanced">Advanced — been skating for years</option>
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">This will be visible to others when you associate with a skatepark.</p>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="email">
                            Email <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600"
                        />
                        <p className="text-xs text-zinc-500 mt-1">We’ll send a verification code to this address.</p>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="username">
                            Username <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. david_skates"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600"
                        />
                        <p className="text-xs text-zinc-500 mt-1">3–20 characters. Must be unique.</p>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="password">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPw ? "text" : "password"}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 pr-12 outline-none focus:ring-2 focus:ring-zinc-600"
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
                        {password.length > 0 && (
                            <ul className="mt-2 space-y-0.5">
                                {[
                                    { ok: pwHasLength, label: "At least 8 characters" },
                                    { ok: pwHasNumber, label: "Contains a number" },
                                    { ok: pwHasSpecial, label: "Contains a special character (!@#$%…)" },
                                ].map(({ ok, label }) => (
                                    <li key={label} className={`text-xs flex items-center gap-1.5 ${ok ? "text-emerald-400" : "text-zinc-500"}`}>
                                        <span>{ok ? "✓" : "✗"}</span>{label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-1.5" htmlFor="confirmPassword">
                            Confirm password <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="confirmPassword"
                            type={showPw ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full rounded-xl border px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-600 bg-zinc-950/60 ${
                                confirmPassword && !passwordsMatch ? "border-red-600" : "border-zinc-800"
                            }`}
                        />
                        {confirmPassword && !passwordsMatch && (
                            <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating account…" : "Create account"}
                    </button>

                    <p className="text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <Link href="/login" className="text-zinc-200 hover:text-white">
                            Log in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
