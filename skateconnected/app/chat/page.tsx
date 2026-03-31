"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

type ConversationRow = {
    conversationId: string;
    otherUser: { id: string; username: string } | null;
    lastMessage: { id: string; body: string; createdAt: string } | null;
    status: "pending" | "accepted";
    inviterId: string | null;
};

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

export default function ChatPage() {
    const [rows, setRows] = useState<ConversationRow[]>([]);
    const [listError, setListError] = useState<string | null>(null);
    const [myId, setMyId] = useState<string | null>(null);
    const [decliningId, setDecliningId] = useState<string | null>(null);

    // Selected conversation
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [meta, setMeta] = useState<ConvMeta | null>(null);
    const [msgError, setMsgError] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Mobile: 'list' or 'chat'
    const [mobileView, setMobileView] = useState<"list" | "chat">("list");

    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetch("/api/account", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => setMyId(data?.id ?? null))
            .catch(() => {});
    }, []);

    async function loadList() {
        setListError(null);
        const r = await fetch("/api/chat/conversations", { cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setListError(data?.error || "Failed to load conversations");
            setRows([]);
            return;
        }
        const list: ConversationRow[] = Array.isArray(data) ? data : [];
        setRows(list);
        // Keep meta in sync for the selected conversation
        if (selectedId) {
            const row = list.find((c) => c.conversationId === selectedId);
            if (row) setMeta(row as ConvMeta);
        }
    }

    useEffect(() => {
        loadList();
    }, []);

    const loadMessages = useCallback(async (id: string) => {
        setMsgError(null);
        const [listRes, msgRes] = await Promise.all([
            fetch("/api/chat/conversations", { cache: "no-store" }),
            fetch(`/api/chat/conversations/${id}/messages`, { cache: "no-store" }),
        ]);
        const listData = await listRes.json().catch(() => ({}));
        if (listRes.ok && Array.isArray(listData)) {
            setRows(listData);
            const row = listData.find((c: ConvMeta) => c.conversationId === id);
            if (row) setMeta(row);
        }
        const msgData = await msgRes.json().catch(() => ({}));
        if (!msgRes.ok) {
            setMsgError(msgData?.error || "Failed to load messages");
            setMessages([]);
            return;
        }
        setMessages(Array.isArray(msgData) ? msgData : []);
    }, []);

    function selectConversation(id: string) {
        setSelectedId(id);
        setMessages([]);
        setText("");
        setMsgError(null);
        setMeta(rows.find((r) => r.conversationId === id) as ConvMeta ?? null);
        setMobileView("chat");
    }

    function backToList() {
        setSelectedId(null);
        setMobileView("list");
        setMessages([]);
        setMeta(null);
        loadList();
    }

    // Poll messages when a conversation is selected
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (!selectedId) return;
        loadMessages(selectedId);
        pollRef.current = setInterval(() => loadMessages(selectedId), 3000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [selectedId, loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send() {
        if (!selectedId || !text.trim()) return;
        setMsgError(null);
        const r = await fetch(`/api/chat/conversations/${selectedId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setMsgError(data?.error || "Failed to send message");
            return;
        }
        setText("");
        setMessages((prev) => [...prev, data]);
        await loadMessages(selectedId);
    }

    async function acceptInvite() {
        if (!selectedId) return;
        setActionLoading(true);
        try {
            const r = await fetch(`/api/chat/conversations/${selectedId}/accept`, { method: "POST" });
            if (r.ok) setMeta((prev) => prev ? { ...prev, status: "accepted" } : prev);
        } finally {
            setActionLoading(false);
        }
    }

    async function declineInviteThread() {
        if (!selectedId) return;
        setActionLoading(true);
        try {
            await fetch(`/api/chat/conversations/${selectedId}/decline`, { method: "DELETE" });
            setRows((prev) => prev.filter((r) => r.conversationId !== selectedId));
            backToList();
        } finally {
            setActionLoading(false);
        }
    }

    async function declineInviteList(conversationId: string) {
        setDecliningId(conversationId);
        try {
            await fetch(`/api/chat/conversations/${conversationId}/decline`, { method: "DELETE" });
            setRows((prev) => prev.filter((r) => r.conversationId !== conversationId));
            if (selectedId === conversationId) backToList();
        } finally {
            setDecliningId(null);
        }
    }

    const pendingInvites = rows.filter((r) => r.status === "pending" && r.inviterId !== myId);
    const otherConversations = rows.filter((r) => r.status === "accepted" || r.inviterId === myId);

    const isPending = meta?.status === "pending";
    const amInviter = meta?.inviterId === myId;
    const amRecipient = isPending && !amInviter;
    const hasAlreadySentMessage = isPending && amInviter && messages.length > 0;
    const inputBlocked = isPending && amInviter && hasAlreadySentMessage;

    // ── Sidebar (conversation list) ──────────────────────────────────────────
    const sidebar = (
        <aside className={`
            flex flex-col border-r border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 shrink-0 min-h-0
            w-full md:w-80 lg:w-96
            ${mobileView === "chat" ? "hidden md:flex" : "flex"}
        `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <Link
                        href="/map"
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        aria-label="Back to map"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Map
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h1>
                </div>
                <button
                    type="button"
                    onClick={loadList}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    Reload
                </button>
            </div>

            {listError && (
                <div className="p-3 mx-3 mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                    {listError}
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-auto">
                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                    <div>
                        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Chat Invites
                        </p>
                        {pendingInvites.map((c) => (
                            <div
                                key={c.conversationId}
                                className="flex items-center gap-3 px-4 py-3 border-b border-yellow-100 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10"
                            >
                                <button
                                    onClick={() => selectConversation(c.conversationId)}
                                    className="w-10 h-10 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center text-yellow-700 dark:text-yellow-200 font-semibold shrink-0"
                                >
                                    {(c.otherUser?.username ?? "?").charAt(0).toUpperCase()}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                        {c.otherUser?.username ?? "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {c.lastMessage?.body ?? "Wants to chat with you"}
                                    </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => selectConversation(c.conversationId)}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={() => declineInviteList(c.conversationId)}
                                        disabled={decliningId === c.conversationId}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {otherConversations.length === 0 && pendingInvites.length === 0 && !listError && (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No conversations yet.
                    </div>
                )}

                {otherConversations.length > 0 && pendingInvites.length > 0 && (
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Messages
                    </p>
                )}

                {/* Conversation rows */}
                {otherConversations.map((c) => {
                    const isPendingSent = c.status === "pending" && c.inviterId === myId;
                    const isActive = selectedId === c.conversationId;
                    return (
                        <button
                            key={c.conversationId}
                            onClick={() => selectConversation(c.conversationId)}
                            className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 transition-colors
                                ${isActive
                                    ? "bg-gray-100 dark:bg-gray-700"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                }`}
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
                                    {isPendingSent
                                        ? "Waiting for reply…"
                                        : (c.lastMessage ? c.lastMessage.body : "No messages yet")}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </aside>
    );

    // ── Chat thread panel ────────────────────────────────────────────────────
    const threadPanel = (
        <main className={`
            flex-1 flex flex-col min-h-0 min-w-0
            ${mobileView === "list" ? "hidden md:flex" : "flex"}
        `}>
            {selectedId ? (
                <>
                    {/* Thread header */}
                    <div className="flex-none flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        {/* Mobile back button */}
                        <button
                            onClick={backToList}
                            className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                            aria-label="Back to chats"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm shrink-0">
                            {(meta?.otherUser?.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                            {meta?.otherUser?.username ?? "Conversation"}
                        </span>
                    </div>

                    {/* Invite banner — recipient */}
                    {amRecipient && (
                        <div className="flex-none mx-4 mt-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 flex items-center justify-between gap-3">
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
                                    onClick={declineInviteThread}
                                    disabled={actionLoading}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Waiting banner — inviter */}
                    {inputBlocked && (
                        <div className="flex-none mx-4 mt-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Waiting for <strong>{meta?.otherUser?.username}</strong> to accept your chat invite…
                            </p>
                        </div>
                    )}

                    {msgError && (
                        <div className="flex-none px-4 pt-2 text-red-600 text-sm">{msgError}</div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-3">
                        {messages.map((m) => {
                            const isMe = myId && m.senderId === myId;
                            return (
                                <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    {!isMe && meta?.otherUser?.username && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
                                            {meta.otherUser.username}
                                        </span>
                                    )}
                                    <div className={`flex ${isMe ? "justify-end" : "justify-start"} max-w-[80%]`}>
                                        <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                                            isMe
                                                ? "bg-blue-600 text-white rounded-br-sm"
                                                : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-bl-sm"
                                        }`}>
                                            <div className="text-[15px] break-words">{m.body}</div>
                                            <div className={`text-[11px] mt-1 ${isMe ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                                                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {messages.length === 0 && !msgError && !amRecipient && (
                            <div className="text-gray-500 text-center py-8">No messages yet. Say hi!</div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex-none flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <input
                            className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            value={text}
                            placeholder={
                                inputBlocked ? "Waiting for acceptance…"
                                : amRecipient ? "Accept the invite to reply"
                                : "Type a message…"
                            }
                            disabled={inputBlocked || amRecipient}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(); }}
                        />
                        <button
                            className="rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-5 py-2.5 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={send}
                            disabled={inputBlocked || amRecipient}
                        >
                            Send
                        </button>
                    </div>
                </>
            ) : (
                /* Empty state */
                <div className="flex-1 flex items-center justify-center p-8">
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
                </div>
            )}
        </main>
    );

    return (
        <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {sidebar}
            {threadPanel}
        </div>
    );
}
