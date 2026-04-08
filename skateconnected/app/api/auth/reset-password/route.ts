import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(req: Request) {
    if (!BACKEND_URL) {
        return NextResponse.json({ error: "BACKEND_URL missing in .env.local" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/accounts/reset-password`, {
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

    return NextResponse.json(data, { status: r.status });
}
