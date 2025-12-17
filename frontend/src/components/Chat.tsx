import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { QuizCard } from './QuizCard';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatProps {
    conversationId: number;
    onRollover: (newId: number) => void;
}

export function Chat({ conversationId, onRollover }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`/conversations/${conversationId}/messages`);
                const fetchedMessages = res.data;
                if (fetchedMessages.length === 0) {
                    setMessages([
                        { role: 'assistant', content: "Hello! I am Siksak. Let's learn." },
                        { role: 'assistant', content: "I'll explain concepts in detail first, then test you with a quiz. What do you want to master today?" }
                    ]);
                } else {
                    setMessages(fetchedMessages);
                }
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };
        fetchMessages();
    }, [conversationId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post(`/conversations/${conversationId}/messages`, {
                message: userMessage.content
            });

            const data = res.data;

            if (data.new_conversation_id) {
                const systemMsg: Message = { role: 'system', content: data.response };
                setMessages(prev => [...prev, systemMsg]);
                setTimeout(() => {
                    onRollover(data.new_conversation_id);
                }, 2000);
            } else {
                const aiMessage: Message = { role: 'assistant', content: data.response };
                setMessages(prev => [...prev, aiMessage]);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'system', content: 'Connection Error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative overflow-hidden">
            {/* Messages Area - Flex 1 to fill available space */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={twMerge(
                            "flex items-start gap-3 max-w-[90%] md:max-w-[80%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto",
                            msg.role === 'system' && "mx-auto max-w-full"
                        )}
                    >
                        {msg.role !== 'system' && (
                            <div className={twMerge(
                                "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm",
                                msg.role === 'user'
                                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                                    : "bg-white border border-indigo-100 text-indigo-600"
                            )}>
                                {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                            </div>
                        )}

                        <div className={twMerge(
                            "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                            msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                : msg.role === 'system'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200 w-full text-center'
                                    : 'bg-white border border-indigo-50 text-slate-700 rounded-tl-sm shadow-indigo-100/50'
                        )}>
                            <div className={twMerge("prose max-w-none text-sm", msg.role === 'user' ? "prose-invert" : "prose-slate")}>
                                {msg.content.includes(":::quiz") ? (
                                    (() => {
                                        try {
                                            const parts = msg.content.split(":::quiz");
                                            const textContent = parts[0];
                                            const match = msg.content.match(/:::quiz\s*([\s\S]*?)\s*:::/);

                                            return (
                                                <div className="space-y-4">
                                                    <ReactMarkdown>{textContent}</ReactMarkdown>
                                                    {match && (() => {
                                                        const quizData = JSON.parse(match[1]);
                                                        return <QuizCard data={quizData} onComplete={(xp) => {
                                                            axios.post(`/conversations/${conversationId}/messages`, {
                                                                message: `[System Event] User completed quiz with ${xp} XP.`
                                                            }).catch(err => console.error(err));
                                                        }} />;
                                                    })()}
                                                </div>
                                            );
                                        } catch (e) {
                                            // Fallback
                                            return <ReactMarkdown>{msg.content}</ReactMarkdown>;
                                        }
                                    })()
                                ) : (
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 mr-auto">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                            <Sparkles size={16} />
                        </div>
                        <div className="bg-white border border-indigo-50 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Layout Fix: Input Area is now a standard flex item, not absolute */}
            <div className="w-full bg-white border-t border-indigo-50 mt-auto">
                <div className="max-w-3xl mx-auto w-full p-2">
                    <div className="relative flex items-center">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Siksak..."
                            className="w-full bg-transparent border-none rounded-xl px-4 py-3 pr-12 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 resize-none max-h-32 text-sm"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />
                        <div className="absolute right-1.5 bottom-1.5">
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center transform scale-90"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
