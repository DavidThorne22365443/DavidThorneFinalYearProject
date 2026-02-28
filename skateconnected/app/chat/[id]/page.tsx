"use client";


//reads the id from the url:
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Msg = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
};

function getAccountId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accountId");
}

export default function ChatThreadPage() {
    const params = useParams<{ id: string }>();
    const conversationId = params.id;
    //extracts conversation id from url



    const [messages, setMessages] = useState<Msg[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState("");
    const [otherUsername, setOtherUsername] = useState<string | null>(null);


    //loads the chats based on the conversation id in the url
    async function loadConversationMeta() {
        const accountId = getAccountId();
        if (!accountId) return;
        const r = await fetch("/api/chat/conversations", {
            headers: { "x-account-id": accountId },
            cache: "no-store",
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !Array.isArray(data)) return;

        const row = data.find((c: { conversationId: string }) => c.conversationId === conversationId);
        setOtherUsername(row?.otherUser?.username ?? null);
        //finds the conversation row that matches that thread, then extracts the other username
    }

    async function load() {
        setError(null);
        const accountId = getAccountId();
        if (!accountId) {
            setError("No accountId in localStorage.");
            setMessages([]);
            return;
        }

        loadConversationMeta();


        //fetch messages list
        const r = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
            headers: { "x-account-id": accountId },
            cache: "no-store",
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setError(data?.error || "Failed to load messages");
            setMessages([]);
            return;
        }
        //update state
        setMessages(Array.isArray(data) ? data : []);
    }

    async function send() {
        setError(null);
        const accountId = getAccountId();
        if (!accountId) {
            setError("No accountId in localStorage.");
            return;
        }
        if (!text.trim()) return;

        const r = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-account-id": accountId,
            },
            body: JSON.stringify({ body: text }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            setError(data?.error || "Failed to send message");
            return;
        }


        //once successful, input is cleared and message bar is empty again (ready for next message)
        setText("");
        setMessages((prev) => [...prev, data]);
    }


    //the following few lines means:
    //when the chat is opened, load immediately, then poll (reload the chat to see if anything has
    // changed) every three seconds

    useEffect(() => {
        load();
        // optional: basic polling for v2.3.0
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [conversationId]);

    const myId = getAccountId();

    return (
        <div className="flex flex-col h-screen w-screen min-h-screen max-w-none mx-0 p-4 overflow-hidden">
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
                    {otherUsername ?? "Conversation"}
                </span>
            </div>

            {error && (
                <div className="flex-none text-red-600 text-sm mb-2">{error}</div>
            )}

            <div className="flex-1 min-h-0 overflow-auto space-y-3 pb-2">
                {messages.map((m) => {
                    const isMe = myId && m.senderId === myId;
                    return (
                        <div
                            key={m.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                            {!isMe && otherUsername && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 ml-1">
                                    {otherUsername}
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
                                    <div
                                        className={`text-[11px] mt-1 ${
                                            isMe ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
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
                {messages.length === 0 && !error && (
                    <div className="text-gray-500 text-center py-8">No messages yet. Say hi!</div>
                )}
            </div>

            <div className="flex-none flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <input
                    className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2.5 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={text}
                    placeholder="Type a message…"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) send();
                    }}
                />
                <button
                    className="rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-5 py-2.5 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shrink-0"
                    onClick={send}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
