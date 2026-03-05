import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

async function getAuthHeader(): Promise<string | null> {
    const jar = await cookies(); // ✅ async in your Next 16 build
    const token = jar.get("sc_token")?.value;
    if (!token) return null;
    return `Bearer ${token}`;
}

// GET: list messages for a conversation
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const { id } = await params;

    const r = await fetch(`${BACKEND_URL}/chat/conversations/${id}/messages`, {
        headers: { Authorization: auth },
        cache: "no-store",
    });

    const text = await r.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }

    return Response.json(data, { status: r.status });
}

// POST: create a message in a conversation
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: auth,
        },
        body: JSON.stringify(body),
    });

    const text = await r.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }

    return Response.json(data, { status: r.status });
}