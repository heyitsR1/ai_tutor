import { MessageSquare, Plus, Trash2, User, Users, Database, Sparkles } from 'lucide-react';
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
        <div className="w-64 flex flex-col h-full bg-white/60 backdrop-blur-xl border-r border-indigo-100 shadow-xl relative z-20">
            {/* Cyber Core Gradient Line at top */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500"></div>

            {/* User Selector */}
            <div className="p-4 border-b border-indigo-50">
                <div className="relative">
                    <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-indigo-50/50 rounded-xl transition-all shadow-sm border border-indigo-100 group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                            <User size={16} />
                        </div>
                        <span className="flex-1 text-left truncate text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">{currentUser.username}</span>
                        <span className="text-xs text-indigo-300 group-hover:text-indigo-500">▼</span>
                    </button>

                    {showUserDropdown && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-indigo-100 rounded-xl shadow-2xl shadow-indigo-900/10 z-50 max-h-56 overflow-y-auto p-1.5 animation-fade-in">
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onUserChange(user.id);
                                        setShowUserDropdown(false);
                                    }}
                                    className={clsx(
                                        "w-full px-3 py-2.5 text-left text-sm rounded-lg transition-all flex items-center gap-2",
                                        user.id === currentUserId
                                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                                            : "hover:bg-slate-50 text-slate-600 hover:text-indigo-600"
                                    )}
                                >
                                    <div className={clsx("w-2 h-2 rounded-full", user.id === currentUserId ? "bg-indigo-500" : "bg-slate-300")} />
                                    {user.username}
                                </button>
                            ))}
                            <div className="h-px bg-indigo-50 my-1.5" />
                            <button
                                onClick={() => {
                                    const newId = Math.max(...users.map(u => u.id), 0) + 1;
                                    onUserChange(newId);
                                    setShowUserDropdown(false);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-emerald-50 text-emerald-600 font-medium rounded-lg flex items-center gap-2 transition-colors"
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
                    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 p-[1px] shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <div className="bg-white/0 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-bold tracking-tight">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>NEW CHAT</span>
                    </div>
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-2 scrollbar-thin scrollbar-thumb-indigo-100 scrollbar-track-transparent">
                <div className="text-[10px] font-bold text-indigo-300 px-2 uppercase tracking-wider mb-1 mt-2">History</div>
                {conversations.map((conv) => {
                    const isActive = currentId === conv.id;
                    return (
                        <div
                            key={conv.id}
                            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 border ${isActive
                                ? 'bg-white border-indigo-200 shadow-md shadow-indigo-100 border-l-4 border-l-purple-500'
                                : 'hover:bg-white/60 border-transparent hover:border-indigo-100/50 text-slate-500 hover:text-slate-800'
                                }`}
                            onClick={() => onSelect(conv.id)}
                        >
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-gradient-to-br from-indigo-100 to-purple-100 text-purple-600' : 'bg-slate-100 group-hover:bg-white text-slate-400'}`}>
                                <MessageSquare size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                                    {conv.title || "New Conversation"}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-mono opacity-70">
                                    {new Date(conv.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={(e) => handleDeleteChat(e, conv.id)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all ${isActive ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-indigo-50 bg-white/40 backdrop-blur-md space-y-2">

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleClearAllChats}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-100 hover:border-red-100 rounded-xl transition-all shadow-sm"
                    >
                        <Trash2 size={16} />
                        <span className="text-[10px] font-medium">Clear Chat</span>
                    </button>
                    <button
                        onClick={handleClearMemories}
                        className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white hover:bg-orange-50 text-slate-400 hover:text-orange-500 border border-slate-100 hover:border-orange-100 rounded-xl transition-all shadow-sm"
                    >
                        <Database size={16} />
                        <span className="text-[10px] font-medium">Reset Memory</span>
                    </button>
                </div>

                <button
                    onClick={onProfileClick}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 mt-2 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl transition-all hover:shadow-lg shadow-slate-900/20 active:scale-95"
                >
                    <User size={16} />
                    <span className="text-sm font-medium">View Profile</span>
                </button>

            </div>
        </div>
    );
}
