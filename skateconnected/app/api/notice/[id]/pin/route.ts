import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return Response.json({ error: "BACKEND_URL missing" }, { status: 500 });

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    const { id } = await params;
    try {
        const r = await fetch(`${BACKEND_URL}/notice/${id}/pin`, {
            method: "PUT",
            headers: { Authorization: auth },
        });
        const text = await r.text();
        let data: unknown;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        return Response.json(data, { status: r.status });
    } catch (err) {
        console.error(`PUT /api/notice/${id}/pin failed:`, err);
        return Response.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}
