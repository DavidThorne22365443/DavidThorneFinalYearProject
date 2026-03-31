"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Msg = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
};

type ConvMeta = {
    conversationId: string;
    otherUser: { id: string; username: string } | null;
    status: "pending" | "accepted";
    inviterId: string | null;
};

export default function ChatThreadPage() {
    const params = useParams<{ id: string }>();
    const conversationId = params.id;

    const [messages, setMessages] = useState<Msg[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [meta, setMeta] = useState<ConvMeta | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/account", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setMyId(data?.id ?? null))
            .catch(() => {});
    }, []);

    async function loadMeta() {
        const r = await fetch("/api/chat/conversations", { cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !Array.isArray(data)) return;
        const row = data.find((c: ConvMeta) => c.conversationId === conversationId);
        if (row) setMeta(row);
    }

    async function load() {
        setError(null);
        await loadMeta();

        const r = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
            cache: "no-store",
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setError(data?.error || "Failed to load messages");
            setMessages([]);
            return;
        }
        setMessages(Array.isArray(data) ? data : []);
    }

    async function send() {
        setError(null);
        if (!text.trim()) return;

        const r = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setError(data?.error || "Failed to send message");
            return;
        }

        setText("");
        setMessages((prev) => [...prev, data]);

        // After first message sent as inviter, reload meta to reflect state
        await loadMeta();
    }

    async function acceptInvite() {
        setActionLoading(true);
        try {
            const r = await fetch(`/api/chat/conversations/${conversationId}/accept`, {
                method: "POST",
            });
            if (r.ok) {
                setMeta((prev) => prev ? { ...prev, status: "accepted" } : prev);
            }
        } finally {
            setActionLoading(false);
        }
    }

    async function declineInvite() {
        setActionLoading(true);
        try {
            await fetch(`/api/chat/conversations/${conversationId}/decline`, {
                method: "DELETE",
            });
            window.location.href = "/chat";
        } finally {
            setActionLoading(false);
        }
    }

    useEffect(() => {
        load();
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [conversationId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const isPending = meta?.status === "pending";
    const amInviter = meta?.inviterId === myId;
    const amRecipient = isPending && !amInviter;
    const hasAlreadySentMessage = isPending && amInviter && messages.length > 0;
    const inputBlocked = isPending && amInviter && hasAlreadySentMessage;

    return (
        <div className="flex flex-col h-screen w-screen min-h-screen max-w-none mx-0 p-4 overflow-hidden">
            {/* Header */}
            <div className="flex-none flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                <Link
                    href="/chat"
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                    aria-label="Back to chats"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chat</h1>
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {meta?.otherUser?.username ?? "Conversation"}
                </span>
                <Link
                    href="/map"
                    className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                >
                    ← Map
                </Link>
            </div>

            {/* Invite banner — shown to RECIPIENT */}
            {amRecipient && (
                <div className="flex-none mb-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>{meta?.otherUser?.username}</strong> wants to chat with you.
                    </p>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={acceptInvite}
                            disabled={actionLoading}
                            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            Accept
                        </button>
                        <button
                            onClick={declineInvite}
                            disabled={actionLoading}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}

            {/* Waiting banner — shown to INVITER after sending first message */}
            {inputBlocked && (
                <div className="flex-none mb-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Waiting for <strong>{meta?.otherUser?.username}</strong> to accept your chat invite…
                    </p>
                </div>
            )}

            {error && (
                <div className="flex-none text-red-600 text-sm mb-2">{error}</div>
            )}

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-auto space-y-3 pb-2">
                {messages.map((m) => {
                    const isMe = myId && m.senderId === myId;
                    return (
                        <div
                            key={m.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                            {!isMe && meta?.otherUser?.username && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
                                    {meta.otherUser.username}
                                </span>
                            )}
                            <div className={`flex ${isMe ? "justify-end" : "justify-start"} max-w-[85%]`}>
                                <div
                                    className={`rounded-2xl px-4 py-2 shadow-sm ${
                                        isMe
                                            ? "bg-blue-600 text-white rounded-br-sm"
                                            : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-bl-sm"
                                    }`}
                                >
                                    <div className="text-[15px] break-words">{m.body}</div>
                                    <div className={`text-[11px] mt-1 ${isMe ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                                        {new Date(m.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {messages.length === 0 && !error && !amRecipient && (
                    <div className="text-gray-500 text-center py-8">No messages yet. Say hi!</div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-none flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <input
                    className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    value={text}
                    placeholder={
                        inputBlocked
                            ? "Waiting for acceptance…"
                            : amRecipient
                            ? "Accept the invite to reply"
                            : "Type a message…"
                    }
                    disabled={inputBlocked || amRecipient}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) send();
                    }}
                />
                <button
                    className="rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-5 py-2.5 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={send}
                    disabled={inputBlocked || amRecipient}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
