import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

function configError(msg: string) {
    return Response.json({ error: msg }, { status: 500 });
}



//GET: list messages
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const accountId = req.headers.get("x-account-id");
    if (!accountId) return Response.json({ error: "x-account-id missing" }, { status: 401 });


    //extracting conversation id
    const { id } = await params;

    const r = await fetch(`${BACKEND_URL}/chat/conversations/${id}/messages`, {
        headers: { "x-account-id": accountId },
        cache: "no-store",
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}


//POST: create a message

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");

    const accountId = req.headers.get("x-account-id");
    if (!accountId) return Response.json({ error: "x-account-id missing" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const r = await fetch(`${BACKEND_URL}/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-account-id": accountId,
        },
        body: JSON.stringify(body),
    });

    const text = await r.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return Response.json(data, { status: r.status });
}
