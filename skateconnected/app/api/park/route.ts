import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}

export async function GET() {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    try {
        const r = await fetch(`${BACKEND_URL}/park`, { cache: "no-store" });
        
        // Read as text first to avoid hanging on invalid JSON
        const text = await r.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        
        return Response.json(data, { status: r.status } as ResponseInit);
    } catch (err) {
        console.error("GET /api/park failed:", err);
        return Response.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}

export async function POST(req: Request) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    try {
        const body = await req.json();
        const r = await fetch(`${BACKEND_URL}/park`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        
        // Read as text first to avoid hanging on invalid JSON
        const text = await r.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
        
        return Response.json(data, { status: r.status } as ResponseInit);
    } catch (err) {
        console.error("POST /api/park failed:", err);
        return Response.json({ error: "Failed to create park" }, { status: 502 });
    }
}
