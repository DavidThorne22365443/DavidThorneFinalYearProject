import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

async function getAuthHeader(): Promise<string | null> {
    const jar = await cookies();              // ✅ cookies is async in your build
    const token = jar.get("sc_token")?.value; // ✅ now .get exists
    if (!token) return null;
    return `Bearer ${token}`;
}

export async function GET() {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const r = await fetch(`${BACKEND_URL}/chat/conversations`, {
        headers: { Authorization: auth },
        cache: "no-store",
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}

export async function POST(req: NextRequest) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/chat/conversations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: auth,
        },
        body: JSON.stringify(body),
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}