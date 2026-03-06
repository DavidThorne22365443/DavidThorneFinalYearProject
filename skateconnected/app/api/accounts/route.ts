import type { NextRequest } from "next/server";
import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

export async function GET() {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "admin only" }, { status: 401 });

    try {
        const r = await fetch(`${BACKEND_URL}/accounts`, {
            headers: { Authorization: auth },
            cache: "no-store",
        });
        const text = await r.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        return Response.json(data, { status: r.status });
    } catch {
        return Response.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}

export async function POST(req: NextRequest) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "admin only" }, { status: 401 });

    try {
        const body = await req.json().catch(() => ({}));
        const r = await fetch(`${BACKEND_URL}/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: auth },
            body: JSON.stringify(body),
        });
        const text = await r.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        return Response.json(data, { status: r.status });
    } catch {
        return Response.json({ error: "Failed to create account" }, { status: 502 });
    }
}
