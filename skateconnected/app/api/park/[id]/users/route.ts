const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return Response.json({ error: "BACKEND_URL missing" }, { status: 500 });

    const { id } = await params;

    const r = await fetch(`${BACKEND_URL}/park/${id}/users`, { cache: "no-store" }).catch(() => null);
    if (!r) return Response.json({ error: "Failed to reach backend" }, { status: 502 });

    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}
