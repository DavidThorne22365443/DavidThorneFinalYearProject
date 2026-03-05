import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
        name: "sc_token",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0), // reliably clears cookie
    });

    return res;
}