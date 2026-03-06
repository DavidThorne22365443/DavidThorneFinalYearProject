import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return NextResponse.json({ error: msg }, { status: 500 });
}

export async function POST(req: Request) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/accounts/register`, {
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
