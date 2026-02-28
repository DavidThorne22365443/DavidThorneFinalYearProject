"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConversationRow = {
    conversationId: string;
    otherUser: { id: string; username: string } | null;
    lastMessage: { id: string; body: string; createdAt: string } | null;
};


//reads the logged in user from localStorage
function getAccountId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accountId");
}


//gets when the a message was sent
function formatTime(createdAt: string) {
    const d = new Date(createdAt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatListPage() {
    const [rows, setRows] = useState<ConversationRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        const id = getAccountId();
        setAccountId(id);
    }, []);

    async function load() {
        setError(null);
        const id = getAccountId();
        if (!id) {
            setError("No accountId in localStorage. Set it below.");
            setRows([]);
            return;
        }

        const r = await fetch("/api/chat/conversations", {
            headers: { "x-account-id": id },
            cache: "no-store",
        });
        const data = await r.json().catch(() => ({}));

        if (!r.ok) {
            setError(data?.error || "Failed to load conversations");
            setRows([]);
            return;
        }
        setRows(Array.isArray(data) ? data : []);
        //updates conversation list
    }


    //ensures that whenever accountID changes the page reloads.
    useEffect(() => {
        load();
    }, [accountId]);

    return (
        <div className="flex h-screen w-screen min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Left: conversation list */}
            <aside className="w-full max-w-sm flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 min-h-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h1>
                    <button
                        type="button"
                        onClick={load}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        Reload
                    </button>
                </div>

                {error && (
                    <div className="p-3 mx-3 mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex-1 min-h-0 overflow-auto">
                    {rows.length === 0 && !error && (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No conversations yet.
                        </div>
                    )}
                    {rows.map((c) => (
                        <Link
                            key={c.conversationId}
                            href={`/chat/${c.conversationId}`}
                            className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold shrink-0">
                                {(c.otherUser?.username ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white truncate">
                                        {c.otherUser?.username ?? "Unknown"}
                                    </span>
                                    {c.lastMessage?.createdAt && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                            {formatTime(c.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                    {c.lastMessage ? c.lastMessage.body : "No messages yet"}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                    <span className="font-medium">Dev:</span> Set{" "}
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">localStorage.accountId</code> (e.g. in
                    console).
                </div>
            </aside>

            {/* Right: empty state */}
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Select a conversation</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Choose a chat from the list to start messaging.
                    </p>
                </div>
            </main>
        </div>
    );
}
