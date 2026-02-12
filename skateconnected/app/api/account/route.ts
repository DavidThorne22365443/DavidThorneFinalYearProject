
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;  // eg http://localhost5000
const BETA_ACCOUNT_ID = process.env.BETA_ACCOUNT_ID; // user ID


//if env vars are missing it returns an error message as follows
function configError(msg: string) {
    return NextResponse.json({ error: msg }, { status: 500 });
}

export async function GET() {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");
    if (!BETA_ACCOUNT_ID) return configError("BETA_ACCOUNT_ID missing in .env.local");

    try {
        const r = await fetch(`${BACKEND_URL}/accounts/${BETA_ACCOUNT_ID}`, {
            // uses the url and uuid to find the account assiciated with those details
            cache: "no-store",  // ensures fresh data is always fetched
        });

        // backend response is read and forwarded back to the browser
        const data = await r.json().catch(() => ({}));
        return NextResponse.json(data, { status: r.status });
    } catch {
        return NextResponse.json({ error: "Failed to reach backend" }, { status: 502 });
    }
}

export async function PUT(req: Request) {
    if (!BACKEND_URL) return configError("BACKEND_URL missing in .env.local");
    if (!BETA_ACCOUNT_ID) return configError("BETA_ACCOUNT_ID missing in .env.local");

    try {
        // reads the request in json. an example of a request might be {"username": "differentname"}
        const body = await req.json();

        const r = await fetch(`${BACKEND_URL}/accounts/${BETA_ACCOUNT_ID}`, {

            // forwards the update to the backend
            method: "PUT",
            headers: { "Content-Type": "application/json" },  // says to backend that the message is in json
            body: JSON.stringify(body),
        });

        const data = await r.json().catch(() => ({}));
        return NextResponse.json(data, { status: r.status });


        //waits and reads backends response before forwarding the status back to dashboard


    } catch {
        return NextResponse.json({ error: "Failed to update account" }, { status: 502 });
    }
}
