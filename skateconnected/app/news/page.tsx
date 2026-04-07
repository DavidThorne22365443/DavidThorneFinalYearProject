'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Notice = {
    id: string;
    title: string;
    content: string;
    eventDate: string | null;
    approved: boolean;
    isPinned: boolean;
    addedById: string;
    addedByUsername?: string;
    addedByFirstName?: string | null;
    createdAt: string;
};

type Account = {
    id: string;
    username: string;
    isAdmin: boolean;
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function isUpcoming(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) >= today;
}

export default function NewsPage() {
    const [account, setAccount] = useState<Account | null>(null);
    const [accountLoaded, setAccountLoaded] = useState(false);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [pending, setPending] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    // Submit form
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState('');

    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetch('/api/account')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                setAccount(data);
                setAccountLoaded(true);
            })
            .catch(() => setAccountLoaded(true));
    }, []);

    useEffect(() => {
        fetch('/api/notice')
            .then((r) => r.json())
            .then((data) => {
                setNotices(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!account?.isAdmin) return;
        fetch('/api/notice/pending')
            .then((r) => r.json())
            .then((data) => setPending(Array.isArray(data) ? data : []));
    }, [account]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setSubmitStatus('loading');
        setSubmitError('');
        try {
            const r = await fetch('/api/notice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, eventDate: eventDate || null }),
            });
            if (r.ok) {
                setSubmitStatus('success');
                setTitle('');
                setContent('');
                setEventDate('');
                setShowForm(false);
            } else {
                const data = await r.json();
                setSubmitError(data.error || 'Failed to submit');
                setSubmitStatus('error');
            }
        } catch {
            setSubmitError('Failed to reach server');
            setSubmitStatus('error');
        }
    }

    async function handleApprove(id: string) {
        const r = await fetch(`/api/notice/${id}/approve`, { method: 'PUT' });
        if (r.ok) {
            const approved = await r.json();
            setPending((prev) => prev.filter((n) => n.id !== id));
            setNotices((prev) => sortNotices([...prev, approved]));
        }
    }

    async function handleDecline(id: string) {
        const r = await fetch(`/api/notice/${id}`, { method: 'DELETE' });
        if (r.ok || r.status === 204) {
            setPending((prev) => prev.filter((n) => n.id !== id));
        }
    }

    async function handleDelete(id: string) {
        const r = await fetch(`/api/notice/${id}`, { method: 'DELETE' });
        if (r.ok || r.status === 204) {
            setNotices((prev) => prev.filter((n) => n.id !== id));
        }
    }

    async function handlePin(id: string) {
        const r = await fetch(`/api/notice/${id}/pin`, { method: 'PUT' });
        if (r.ok) {
            const updated = await r.json();
            setNotices((prev) => sortNotices(prev.map((n) => (n.id === id ? updated : n))));
        }
    }

    function sortNotices(list: Notice[]): Notice[] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pinned = list.filter((n) => n.isPinned);
        const rest = list.filter((n) => !n.isPinned);
        rest.sort((a, b) => {
            const dA = a.eventDate ? Math.abs(new Date(a.eventDate).getTime() - today.getTime()) : Infinity;
            const dB = b.eventDate ? Math.abs(new Date(b.eventDate).getTime() - today.getTime()) : Infinity;
            return dA - dB;
        });
        return [...pinned, ...rest];
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Navbar */}
            <div className="fixed top-4 left-4 z-10">
                <div className="flex items-center gap-1 bg-white rounded-2xl shadow-lg px-4 py-2.5">
                    <Link href="/map" className="font-bold text-zinc-900 text-sm whitespace-nowrap hover:text-zinc-600 transition-colors mr-3">
                        skateconnected.ie
                    </Link>
                    <div className="w-px h-4 bg-zinc-200 mx-1" />
                    {account ? (
                        <>
                            <Link href="/chat" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Chats
                            </Link>
                            <Link href="/news" className="px-3 py-1 rounded-xl text-sm font-medium bg-zinc-900 text-white whitespace-nowrap">
                                News
                            </Link>
                            {account.isAdmin ? (
                                <>
                                    <Link href="/account-admin" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                        Users
                                    </Link>
                                    <Link href="/park-admin" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                        Skateparks
                                    </Link>
                                    <Link href="/skatespot-admin" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                        Spots
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/skateparks" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                        Skateparks
                                    </Link>
                                    <Link href="/skatespots" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                        Spots
                                    </Link>
                                </>
                            )}
                        </>
                    ) : accountLoaded ? (
                        <>
                            <Link href="/news" className="px-3 py-1 rounded-xl text-sm font-medium bg-zinc-900 text-white whitespace-nowrap">
                                News
                            </Link>
                            <Link href="/login" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Log in
                            </Link>
                            <Link href="/register" className="px-3 py-1 rounded-xl text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 transition-colors whitespace-nowrap">
                                Register
                            </Link>
                            <Link href="/skateparks" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Skateparks
                            </Link>
                            <Link href="/skatespots" className="px-3 py-1 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors whitespace-nowrap">
                                Spots
                            </Link>
                        </>
                    ) : null}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-zinc-900">News &amp; Events</h1>
                    {account && (
                        <button
                            onClick={() => {
                                setShowForm((v) => !v);
                                setSubmitStatus('idle');
                                setSubmitError('');
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
                        >
                            {showForm ? 'Cancel' : '+ Submit notice'}
                        </button>
                    )}
                </div>

                {/* Submit form */}
                {showForm && account && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 mb-6 flex flex-col gap-4">
                        <h2 className="font-semibold text-zinc-900">Submit a notice</h2>
                        <p className="text-xs text-zinc-500">Submitted notices are reviewed by an admin before being published.</p>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-zinc-600">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                                className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                                placeholder="e.g. Weekend skate session at Limerick Skatepark"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-zinc-600">Details</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={4}
                                className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 resize-none"
                                placeholder="Describe the event or notice..."
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-zinc-600">Event date <span className="text-zinc-400 font-normal">(optional)</span></label>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300 w-48"
                            />
                        </div>

                        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

                        <button
                            type="submit"
                            disabled={submitStatus === 'loading'}
                            className="self-start px-5 py-2 rounded-xl text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            {submitStatus === 'loading' ? 'Submitting...' : 'Submit for review'}
                        </button>
                    </form>
                )}

                {submitStatus === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 mb-6 text-sm text-emerald-700">
                        Your notice has been submitted and is awaiting admin approval.
                    </div>
                )}

                {/* Admin: pending notices */}
                {account?.isAdmin && pending.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Pending approval ({pending.length})</h2>
                        <div className="flex flex-col gap-3">
                            {pending.map((n) => (
                                <div key={n.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-zinc-900 text-sm">{n.title}</p>
                                            {n.eventDate && (
                                                <p className="text-xs text-zinc-500 mt-0.5">{formatDate(n.eventDate)}</p>
                                            )}
                                            <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{n.content}</p>
                                            <p className="text-xs text-zinc-400 mt-2">
                                                Submitted by {n.addedByFirstName || n.addedByUsername} &middot; {new Date(n.createdAt).toLocaleDateString('en-IE')}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => handleApprove(n.id)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleDecline(n.id)}
                                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Published notices */}
                <div>
                    {notices.length > 0 && (
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Latest notices</h2>
                    )}
                    {loading ? (
                        <div className="text-sm text-zinc-400 py-8 text-center">Loading...</div>
                    ) : notices.length === 0 ? (
                        <div className="text-sm text-zinc-400 py-12 text-center">No notices yet.</div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {notices.map((n) => {
                                const upcoming = isUpcoming(n.eventDate);
                                return (
                                    <div
                                        key={n.id}
                                        className={`bg-white rounded-2xl shadow-sm border p-5 ${n.isPinned ? 'border-zinc-900' : 'border-zinc-100'}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {n.isPinned && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M9.293 1.293a1 1 0 011.414 0l.707.707 1-1A1 1 0 0114 2v4l2 2-1.414 1.414L13 7.828V14l-3 3-3-3V7.828L4.414 9.414 3 8l2-2V2a1 1 0 011.586-.814l1 1 .707-.707z" />
                                                            </svg>
                                                            Pinned
                                                        </span>
                                                    )}
                                                    <h3 className="font-semibold text-zinc-900 text-base">{n.title}</h3>
                                                </div>
                                                {n.eventDate && (
                                                    <p className={`text-xs mt-1 font-medium ${upcoming ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                                        {upcoming ? 'Upcoming: ' : 'Took place: '}{formatDate(n.eventDate)}
                                                    </p>
                                                )}
                                                <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{n.content}</p>
                                                <p className="text-xs text-zinc-400 mt-3">
                                                    Posted {new Date(n.createdAt).toLocaleDateString('en-IE')}
                                                </p>
                                            </div>

                                            {account?.isAdmin && (
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handlePin(n.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                                                            n.isPinned
                                                                ? 'bg-zinc-900 text-white hover:bg-zinc-700'
                                                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                                        }`}
                                                    >
                                                        {n.isPinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(n.id)}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
