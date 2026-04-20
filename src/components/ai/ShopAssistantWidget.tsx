'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

const SUGGESTIONS = [
    'Which products are my top sellers this month?',
    'How much am I owed right now?',
    'What should I restock first?',
    'Any products expiring soon?',
];

export default function ShopAssistantWidget() {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isAsking, setIsAsking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isAsking]);

    const send = async (text: string) => {
        const q = text.trim();
        if (!q || isAsking) return;

        const history = messages;
        setMessages((prev) => [...prev, { role: 'user', content: q }]);
        setQuestion('');
        setIsAsking(true);

        try {
            const { answer } = await api.ai.askAssistant(q, history);
            setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
        } catch (err: any) {
            toast.error(err.message || 'Assistant failed to reply');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I could not answer that right now. Try again in a moment.' },
            ]);
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Open shop assistant"
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
            >
                {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </button>

            {open && (
                <div className="fixed bottom-24 right-6 z-40 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-8rem))] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                        <Sparkles className="w-5 h-5" />
                        <div className="flex-1">
                            <div className="font-semibold text-sm">Shop Assistant</div>
                            <div className="text-xs text-blue-100">Ask about your shop's data</div>
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Hi! Ask me anything about your shop — sales, stock, debtors, expiring products.
                                </p>
                                <div className="space-y-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => send(s)}
                                            className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                        m.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-md'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md'
                                    }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {isAsking && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl px-3 py-2 text-sm">
                                    Thinking…
                                </div>
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            send(question);
                        }}
                        className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
                    >
                        <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask about your shop…"
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500"
                            disabled={isAsking}
                            maxLength={1000}
                        />
                        <button
                            type="submit"
                            disabled={isAsking || !question.trim()}
                            className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
                            aria-label="Send question"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
