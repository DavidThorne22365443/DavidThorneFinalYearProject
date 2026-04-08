import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return Response.json({ error: "BACKEND_URL missing" }, { status: 500 });

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/skatespot/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify(body),
    }).catch(() => null);

    if (!r) return Response.json({ error: "Failed to reach backend" }, { status: 502 });

    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return Response.json({ error: "BACKEND_URL missing" }, { status: 500 });

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const { id } = await params;

    const r = await fetch(`${BACKEND_URL}/skatespot/${id}`, {
        method: "DELETE",
        headers: { Authorization: auth },
    }).catch(() => null);

    if (!r) return Response.json({ error: "Failed to reach backend" }, { status: 502 });

    if (r.status === 204) return new Response(null, { status: 204 });
    const text = await r.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}
