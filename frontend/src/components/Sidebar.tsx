import { MessageSquare, Plus, Trash2, User, Database } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Conversation {
    id: number;
    title: string;
    created_at: string;
}

interface UserInfo {
    id: number;
    username: string;
}

interface SidebarProps {
    conversations: Conversation[];
    currentId: number | null;
    currentUserId: number;
    onSelect: (id: number) => void;
    onNewChat: () => void;
    onNewGuestChat: () => void;
    onUserChange: (userId: number) => void;
    onProfileClick: () => void;
}

export function Sidebar({ conversations, currentId, currentUserId, onSelect, onNewChat, onNewGuestChat, onUserChange, onProfileClick }: SidebarProps) {
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        }
    };

    const handleDeleteChat = async (e: React.MouseEvent, convId: number) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        try {
            await axios.delete(`/conversations/${convId}`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to delete conversation', err);
        }
    };

    const handleClearAllChats = async () => {
        if (!confirm('Delete ALL your conversations? This cannot be undone.')) return;
        try {
            await axios.delete(`/conversations?user_id=${currentUserId}`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to delete all conversations', err);
        }
    };

    const handleClearMemories = async () => {
        if (!confirm('Delete ALL your memories? This cannot be undone.')) return;
        try {
            await axios.delete(`/memories?user_id=${currentUserId}`);
            alert('All memories cleared!');
        } catch (err) {
            console.error('Failed to clear memories', err);
        }
    };

    const currentUser = users.find(u => u.id === currentUserId) || { id: currentUserId, username: `User ${currentUserId}` };

    return (
        <div
            className="w-64 flex flex-col h-full backdrop-blur-md relative z-20"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRight: '1px solid var(--color-border-light)'
            }}
        >
            {/* Warm accent bar at top */}
            <div className="h-1 w-full" style={{ backgroundColor: 'var(--color-main)' }} />

            {/* User Selector */}
            <div
                className="p-4"
                style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
                <div className="relative">
                    <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border-light)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
                    >
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                            <User size={16} />
                        </div>
                        <span
                            className="flex-1 text-left truncate font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {currentUser.username}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>▼</span>
                    </button>

                    {showUserDropdown && (
                        <div
                            className="absolute top-full mt-2 left-0 right-0 rounded-xl max-h-56 overflow-y-auto p-1.5 z-50"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                boxShadow: 'var(--shadow-lg)'
                            }}
                        >
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onUserChange(user.id);
                                        setShowUserDropdown(false);
                                    }}
                                    className={clsx(
                                        "w-full px-3 py-2.5 text-left text-sm rounded-lg transition-all flex items-center gap-2"
                                    )}
                                    style={{
                                        backgroundColor: user.id === currentUserId ? 'var(--color-surface-warm)' : 'transparent',
                                        color: user.id === currentUserId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        fontWeight: user.id === currentUserId ? 600 : 400
                                    }}
                                    onMouseOver={(e) => {
                                        if (user.id !== currentUserId) {
                                            e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (user.id !== currentUserId) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: user.id === currentUserId ? 'var(--color-accent)' : 'var(--color-border)' }}
                                    />
                                    {user.username}
                                </button>
                            ))}
                            <div className="h-px my-1.5" style={{ backgroundColor: 'var(--color-border-light)' }} />
                            <button
                                onClick={() => {
                                    const newId = Math.max(...users.map(u => u.id), 0) + 1;
                                    onUserChange(newId);
                                    setShowUserDropdown(false);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                style={{ color: 'var(--color-success)' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(93, 138, 102, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Plus size={14} /> Create New User
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 pt-2">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-semibold transition-all active:scale-[0.98]"
                    style={{
                        backgroundColor: 'var(--color-accent)',
                        boxShadow: '0 2px 8px rgba(116, 82, 59, 0.25)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5D4130'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                >
                    <Plus size={18} />
                    <span>New Chat</span>
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
                <div
                    className="text-[10px] font-semibold px-2 uppercase tracking-wider mb-2 mt-2"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    History
                </div>
                {conversations.map((conv) => {
                    const isActive = currentId === conv.id;
                    return (
                        <div
                            key={conv.id}
                            className="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
                            style={{
                                backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
                                border: isActive ? '1px solid var(--color-border)' : '1px solid transparent',
                                boxShadow: isActive ? 'var(--shadow-sm)' : 'none'
                            }}
                            onClick={() => onSelect(conv.id)}
                            onMouseOver={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <div
                                className="p-2 rounded-lg"
                                style={{
                                    backgroundColor: isActive ? 'var(--color-main)' : 'var(--color-secondary)',
                                    color: isActive ? 'white' : 'var(--color-text-secondary)'
                                }}
                            >
                                <MessageSquare size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p
                                    className="text-sm font-medium truncate"
                                    style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                                >
                                    {conv.title || "New Conversation"}
                                </p>
                                <p
                                    className="text-[10px] mt-0.5 font-mono"
                                    style={{ color: 'var(--color-text-muted)' }}
                                >
                                    {new Date(conv.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDeleteChat(e, conv.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(166, 93, 93, 0.1)';
                                    e.currentTarget.style.color = 'var(--color-error)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-text-muted)';
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div
                className="p-4 space-y-2"
                style={{
                    borderTop: '1px solid var(--color-border-light)',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)'
                }}
            >
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleClearAllChats}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border-light)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(166, 93, 93, 0.08)';
                            e.currentTarget.style.color = 'var(--color-error)';
                            e.currentTarget.style.borderColor = 'rgba(166, 93, 93, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.borderColor = 'var(--color-border-light)';
                        }}
                    >
                        <Trash2 size={16} />
                        <span className="text-[10px] font-medium">Clear Chat</span>
                    </button>
                    <button
                        onClick={handleClearMemories}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border-light)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(184, 149, 107, 0.08)';
                            e.currentTarget.style.color = 'var(--color-warning)';
                            e.currentTarget.style.borderColor = 'rgba(184, 149, 107, 0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                            e.currentTarget.style.color = 'var(--color-text-muted)';
                            e.currentTarget.style.borderColor = 'var(--color-border-light)';
                        }}
                    >
                        <Database size={16} />
                        <span className="text-[10px] font-medium">Reset Memory</span>
                    </button>
                </div>

                <button
                    onClick={onProfileClick}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 mt-2 rounded-xl transition-all active:scale-[0.98]"
                    style={{
                        backgroundColor: 'var(--color-text-primary)',
                        color: 'white'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2D2D2D'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-text-primary)'}
                >
                    <User size={16} />
                    <span className="text-sm font-medium">View Profile</span>
                </button>

            </div>
        </div>
    );
}

