export async function GET() {
    const base = process.env.BACKEND_URL;
    if (!base) {
        return Response.json({ error: "BACKEND_URL missing in .env.local" }, { status: 500 });
    }

    const r = await fetch(`${base}/park`, { cache: "no-store" });
    const text = await r.text();

    // return as JSON if possible, otherwise raw
    try {
        return Response.json({ parks: JSON.parse(text) }, { status: r.status });
    } catch {
        return Response.json({ error: "backend returned non-json", raw: text }, { status: 502 });
    }
}
