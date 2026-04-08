import { getAuthHeader } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET() {
    if (!BACKEND_URL) return Response.json({ error: "BACKEND_URL missing" }, { status: 500 });

    const auth = await getAuthHeader();
    if (!auth) return Response.json({ error: "not logged in" }, { status: 401 });

    try {
        const r = await fetch(`${BACKEND_URL}/skatespot/pending`, {
            cache: "no-store",
            headers: { Authorization: auth },
        });
        const text = await r.text();
        let data: unknown;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
        return Response.json(data, { status: r.status });
    } catch (err) {
        console.error("GET /api/skatespot/pending failed:", err);
        return Response.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}
