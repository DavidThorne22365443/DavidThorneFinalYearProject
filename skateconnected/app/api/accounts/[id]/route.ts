import type { NextRequest } from "next/server";
import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "admin only" }, { status: 401 });

    try {
        const { id } = await params;
        const r = await fetch(`${BACKEND_URL}/accounts/${id}`, {
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

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "admin only" }, { status: 401 });

    try {
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const r = await fetch(`${BACKEND_URL}/accounts/${id}`, {
            method: "PUT",
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
        return Response.json({ error: "Failed to update account" }, { status: 502 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "admin only" }, { status: 401 });

    try {
        const { id } = await params;
        const r = await fetch(`${BACKEND_URL}/accounts/${id}`, {
            method: "DELETE",
            headers: { Authorization: auth },
        });
        if (r.status === 204) return new Response(null, { status: 204 });
        const text = await r.text();
        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        return Response.json(data, { status: r.status });
    } catch {
        return Response.json({ error: "Failed to delete account" }, { status: 502 });
    }
}
