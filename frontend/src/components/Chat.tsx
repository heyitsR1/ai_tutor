import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Wand2, Undo2 } from 'lucide-react';
import { QuizCard } from './QuizCard';
import { QuickActions } from './QuickActions';
import { CheatsheetCard } from './CheatsheetCard';
import { ResourcesCard } from './ResourcesCard';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';
import aiTutorIcon from '../assets/ai_tutor.svg';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatProps {
    conversationId: number;
    onRollover: (newId: number) => void;
    onTitleUpdate?: (conversationId: number, newTitle: string) => void;
}

export function Chat({ conversationId, onRollover, onTitleUpdate }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [originalPrompt, setOriginalPrompt] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
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

    const handleEnhancePrompt = async () => {
        if (!input.trim() || isEnhancing || isLoading) return;

        setIsEnhancing(true);
        setOriginalPrompt(input);

        try {
            const res = await axios.post('/enhance-prompt', { prompt: input });
            setInput(res.data.enhanced);
        } catch (error) {
            console.error('Error enhancing prompt:', error);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleUndoEnhance = () => {
        if (originalPrompt) {
            setInput(originalPrompt);
            setOriginalPrompt(null);
        }
    };

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

                // Handle auto-generated title for new chats
                if (data.new_title && onTitleUpdate) {
                    onTitleUpdate(conversationId, data.new_title);
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'system', content: 'Connection Error.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Quick Action Handlers
    const handleQuickAction = async (action: string) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const res = await axios.post(`/conversations/${conversationId}/messages`, {
                message: action
            });

            const data = res.data;
            const aiMessage: Message = { role: 'assistant', content: data.response };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error with quick action:', error);
            setMessages(prev => [...prev, { role: 'system', content: 'Action failed. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuizMe = () => handleQuickAction('[ACTION: QUIZ] Generate a quiz with 3 multiple-choice questions based on what we just discussed. Use the present_quiz tool.');
    const handleCheatsheet = () => handleQuickAction('[ACTION: CHEATSHEET] Create a comprehensive cheatsheet summarizing the key concepts from our discussion. Use the generate_cheatsheet tool with proper sections.');
    const handleExploreResources = () => handleQuickAction('[ACTION: RESOURCES] Find curated learning resources (documentation, tutorials, videos, courses) related to what we discussed. Include BOTH free and paid options. Use the web_search tool.');

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative overflow-hidden">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5"
            >
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
                            <div
                                className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{
                                    backgroundColor: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface)',
                                    color: msg.role === 'user' ? 'white' : 'var(--color-accent)',
                                    border: msg.role === 'user' ? 'none' : '1px solid var(--color-border-light)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                {msg.role === 'user' ? <User size={16} /> : <img src={aiTutorIcon} alt="AI" className="w-4 h-4" />}
                            </div>
                        )}

                        <div
                            className={twMerge(
                                "p-4 rounded-2xl text-sm leading-relaxed",
                                msg.role === 'user' && "rounded-tr-sm",
                                msg.role === 'assistant' && "rounded-tl-sm",
                                msg.role === 'system' && "w-full text-center"
                            )}
                            style={{
                                backgroundColor: msg.role === 'user'
                                    ? 'var(--color-main)'
                                    : msg.role === 'system'
                                        ? 'rgba(184, 149, 107, 0.15)'
                                        : 'var(--color-surface)',
                                color: msg.role === 'user'
                                    ? 'white'
                                    : msg.role === 'system'
                                        ? 'var(--color-warning)'
                                        : 'var(--color-text-primary)',
                                border: msg.role === 'user'
                                    ? 'none'
                                    : msg.role === 'system'
                                        ? '1px solid rgba(184, 149, 107, 0.3)'
                                        : '1px solid var(--color-border-light)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <div className={twMerge(
                                "prose max-w-none text-sm",
                                msg.role === 'user' ? "prose-invert" : ""
                            )}>
                                {(() => {
                                    // Parse content for protocol blocks
                                    const content = msg.content;
                                    const hasQuiz = content.includes(":::quiz");
                                    const hasCheatsheet = content.includes(":::cheatsheet");
                                    const hasResources = content.includes(":::resources");

                                    if (!hasQuiz && !hasCheatsheet && !hasResources) {
                                        return <ReactMarkdown>{content}</ReactMarkdown>;
                                    }

                                    try {
                                        // Extract text before any protocol block
                                        const firstBlockMatch = content.match(/:::(quiz|cheatsheet|resources)/);
                                        const textContent = firstBlockMatch
                                            ? content.substring(0, firstBlockMatch.index).trim()
                                            : content;

                                        // Parse each protocol block
                                        const quizMatch = content.match(/:::quiz\s*([\s\S]*?)\s*:::/);
                                        const cheatsheetMatch = content.match(/:::cheatsheet\s*([\s\S]*?)\s*:::/);
                                        const resourcesMatch = content.match(/:::resources\s*([\s\S]*?)\s*:::/);

                                        return (
                                            <div className="space-y-4">
                                                {textContent && <ReactMarkdown>{textContent}</ReactMarkdown>}

                                                {quizMatch && (() => {
                                                    const quizData = JSON.parse(quizMatch[1]);
                                                    return <QuizCard data={quizData} onComplete={(xp) => {
                                                        axios.post(`/conversations/${conversationId}/messages`, {
                                                            message: `[System Event] User completed quiz with ${xp} XP.`
                                                        }).catch(err => console.error(err));
                                                    }} />;
                                                })()}

                                                {cheatsheetMatch && (() => {
                                                    const cheatsheetData = JSON.parse(cheatsheetMatch[1]);
                                                    return <CheatsheetCard data={cheatsheetData} />;
                                                })()}

                                                {resourcesMatch && (() => {
                                                    const resourcesData = JSON.parse(resourcesMatch[1]);
                                                    return <ResourcesCard data={resourcesData} />;
                                                })()}
                                            </div>
                                        );
                                    } catch (e) {
                                        console.error('Error parsing protocol blocks:', e);
                                        return <ReactMarkdown>{content}</ReactMarkdown>;
                                    }
                                })()}
                            </div>
                            {/* Show Quick Actions after the last assistant message without protocol blocks */}
                            {/* Only show after substantive conversation (not welcome messages) */}
                            {msg.role === 'assistant' &&
                                idx === messages.length - 1 &&
                                messages.length > 2 &&  // Skip welcome messages
                                !msg.content.includes('Hello! I am Siksak') &&
                                !msg.content.includes('What do you want to master') &&
                                !msg.content.includes(':::quiz') &&
                                !msg.content.includes(':::cheatsheet') &&
                                !msg.content.includes(':::resources') && (
                                    <QuickActions
                                        onQuizMe={handleQuizMe}
                                        onCheatsheet={handleCheatsheet}
                                        onExploreResources={handleExploreResources}
                                        disabled={isLoading}
                                    />
                                )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 mr-auto">
                        <div
                            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-accent)',
                                border: '1px solid var(--color-border-light)'
                            }}
                        >
                            <img src={aiTutorIcon} alt="AI" className="w-4 h-4" />
                        </div>
                        <div
                            className="p-4 rounded-2xl rounded-tl-sm"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border-light)'
                            }}
                        >
                            <div className="flex gap-1.5">
                                <span
                                    className="w-2 h-2 rounded-full animate-bounce"
                                    style={{ backgroundColor: 'var(--color-main)', animationDelay: '0ms' }}
                                />
                                <span
                                    className="w-2 h-2 rounded-full animate-bounce"
                                    style={{ backgroundColor: 'var(--color-accent)', animationDelay: '150ms' }}
                                />
                                <span
                                    className="w-2 h-2 rounded-full animate-bounce"
                                    style={{ backgroundColor: 'var(--color-main)', animationDelay: '300ms' }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
                className="w-full mt-auto"
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderTop: '1px solid var(--color-border-light)'
                }}
            >
                <div className="max-w-3xl mx-auto w-full p-3">
                    <div
                        className="relative flex items-center rounded-xl"
                        style={{
                            backgroundColor: 'var(--color-surface-warm)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Siksak..."
                            className="w-full bg-transparent border-none rounded-xl px-4 py-3 pr-12 placeholder-opacity-60 focus:outline-none focus:ring-0 resize-none max-h-32 text-sm"
                            style={{
                                color: 'var(--color-text-primary)',
                                minHeight: '48px'
                            }}
                            rows={1}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                            {/* Undo enhance button - only show when we have original prompt */}
                            {originalPrompt && (
                                <button
                                    onClick={handleUndoEnhance}
                                    className="p-2 rounded-lg transition-all flex items-center justify-center"
                                    style={{
                                        backgroundColor: 'rgba(175, 157, 142, 0.15)',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                    title="Undo enhancement"
                                >
                                    <Undo2 size={14} />
                                </button>
                            )}

                            {/* Enhance prompt button */}
                            <button
                                onClick={handleEnhancePrompt}
                                disabled={isEnhancing || isLoading || !input.trim()}
                                className="p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                style={{
                                    backgroundColor: originalPrompt ? 'rgba(93, 138, 102, 0.15)' : 'rgba(175, 157, 142, 0.15)',
                                    color: originalPrompt ? 'var(--color-success)' : 'var(--color-accent)'
                                }}
                                title={originalPrompt ? "Prompt enhanced" : "Enhance prompt with AI"}
                            >
                                {isEnhancing ? (
                                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Wand2 size={14} />
                                )}
                            </button>

                            {/* Send button */}
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="p-2.5 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center"
                                style={{
                                    backgroundColor: 'var(--color-accent)',
                                    boxShadow: '0 2px 6px rgba(116, 82, 59, 0.25)'
                                }}
                                onMouseOver={(e) => {
                                    if (!isLoading && input.trim()) {
                                        e.currentTarget.style.backgroundColor = '#5D4130';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                                }}
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

