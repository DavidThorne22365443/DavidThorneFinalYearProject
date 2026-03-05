import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

export async function POST(req: Request) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/accounts/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const text = await r.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }

    if (!r.ok) {
        // pass backend error through
        return Response.json(data, { status: r.status });
    }

    const token = data?.token;
    if (!token) {
        return Response.json({ error: "backend did not return token" }, { status: 502 });
    }

    // Set httpOnly cookie
    const jar = await cookies();
    jar.set({
        name: "sc_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Return account info (no token needed client-side)
    return Response.json({ account: data.account }, { status: 200 });
}