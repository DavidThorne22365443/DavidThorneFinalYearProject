import { cookies } from "next/headers";

export async function getAuthHeader(): Promise<string | null> {
    const jar = await cookies();
    const token = jar.get("sc_token")?.value;
    if (!token) return null;
    return `Bearer ${token}`;
}
