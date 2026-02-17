import { NextResponse } from "next/server";

export async function GET() {
    const base = process.env.BACKEND_URL;
    if (!base) {
        return NextResponse.json({ error: "BACKEND_URL missing in .env.local" }, { status: 500 });
    }

    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const r = await fetch(`${base}/park`, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const text = await r.text();

        // return as JSON if possible, otherwise raw
        try {
            const parks = JSON.parse(text);
            return NextResponse.json({ parks: Array.isArray(parks) ? parks : [] }, { status: r.status });
        } catch {
            return NextResponse.json({ error: "backend returned non-json", raw: text }, { status: 502 });
        }
    } catch (err: any) {
        if (err.name === "AbortError") {
            return NextResponse.json({ error: "Backend request timed out" }, { status: 504 });
        }
        console.error("GET /api/park-state failed:", err);
        return NextResponse.json({ error: "Failed to reach backend", detail: err?.message }, { status: 502 });
    }
}
