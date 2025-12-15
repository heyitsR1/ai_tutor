import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
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

    // Fetch messages when conversationId changes
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`/conversations/${conversationId}/messages`);
                const fetchedMessages = res.data;

                // If new chat (empty), show default messages
                if (fetchedMessages.length === 0) {
                    setMessages([
                        { role: 'assistant', content: 'Hello! I am your Agentic AI Tutor. How can I help you learn today?' },
                        { role: 'assistant', content: "I'm not just a chatbot. I have **Long-term Memory** to remember our past lessons, **Agency** to take initiative, and I can use **Tools** to help you learn better. I'll even automatically summarize our chat and start a new session if we talk too much, so we never lose context! Try asking me to remember something about you." }
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
                // Handle Rollover
                const systemMsg: Message = { role: 'system', content: data.response };
                setMessages(prev => [...prev, systemMsg]);
                // Wait a bit then switch
                setTimeout(() => {
                    onRollover(data.new_conversation_id);
                }, 2000);
            } else {
                const aiMessage: Message = { role: 'assistant', content: data.response };
                setMessages(prev => [...prev, aiMessage]);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'system', content: 'Error: Could not connect to the tutor.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={twMerge(
                            "flex items-start gap-3 max-w-[80%]",
                            msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto",
                            msg.role === 'system' && "mx-auto max-w-full"
                        )}
                    >
                        {msg.role !== 'system' && (
                            <div className={twMerge(
                                "p-2 rounded-full",
                                msg.role === 'user' ? "bg-blue-600" : "bg-purple-600"
                            )}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                        )}
                        <div className={twMerge(
                            "p-3 rounded-2xl px-4",
                            msg.role === 'user'
                                ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-sm"
                                : msg.role === 'system'
                                    ? "bg-yellow-900/20 border border-yellow-500/30 text-yellow-200 text-center w-full"
                                    : "bg-gray-800/80 border border-gray-700 text-gray-100 rounded-tl-sm"
                        )}>
                            <div className="prose prose-invert text-sm max-w-none">
                                <ReactMarkdown>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 mr-auto">
                        <div className="p-2 rounded-full bg-purple-600">
                            <Bot size={20} />
                        </div>
                        <div className="bg-gray-800/80 border border-gray-700 p-3 rounded-2xl rounded-tl-sm">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask your tutor anything..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-4 pr-12 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}
