import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

async function getAuthHeader(): Promise<string | null> {
    const jar = await cookies();
    const token = jar.get("sc_token")?.value;

    if (!token) return null;

    return `Bearer ${token}`;
}

// GET current logged-in user
export async function GET() {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    try {
        const r = await fetch(`${BACKEND_URL}/accounts/me`, {
            headers: {
                Authorization: auth,
            },
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

    } catch {
        return Response.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}

// UPDATE current logged-in user
export async function PUT(req: NextRequest) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    try {
        const body = await req.json().catch(() => ({}));

        const r = await fetch(`${BACKEND_URL}/accounts/me`, {
            method: "PUT",
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

    } catch {
        return Response.json({ error: "Failed to update account" }, { status: 502 });
    }
}