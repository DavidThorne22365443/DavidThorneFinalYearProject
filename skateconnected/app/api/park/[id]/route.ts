import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return NextResponse.json({ error: msg }, { status: 500 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    try {
        const r = await fetch(`${BACKEND_URL}/park/${params.id}`, { cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        return NextResponse.json(data, { status: r.status } as ResponseInit);
    } catch {
        return NextResponse.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    try {
        const body = await req.json();

        const r = await fetch(`${BACKEND_URL}/park/${params.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await r.json().catch(() => ({}));
        return NextResponse.json(data, { status: r.status } as ResponseInit);
    } catch {
        return NextResponse.json({ error: "Failed to update park" }, { status: 502 });
    }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    try {
        const r = await fetch(`${BACKEND_URL}/park/${params.id}`, { method: "DELETE" });
        return new NextResponse(null, { status: r.status });
    } catch {
        return NextResponse.json({ error: "Failed to delete park" }, { status: 502 });
    }
}
