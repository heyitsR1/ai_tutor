import { MessageSquare, Plus, Trash2, User, Users, Database } from 'lucide-react';
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

    // Fetch users on mount
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
            window.location.reload(); // Simple refresh for now
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
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            {/* User Selector */}
            <div className="p-4 border-b border-gray-800">
                <div className="relative">
                    <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                    >
                        <Users size={16} />
                        <span className="flex-1 text-left truncate">{currentUser.username}</span>
                        <span className="text-xs text-gray-500">▼</span>
                    </button>

                    {showUserDropdown && (
                        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {users.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => {
                                        onUserChange(user.id);
                                        setShowUserDropdown(false);
                                    }}
                                    className={clsx(
                                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors",
                                        user.id === currentUserId && "bg-gray-700 text-purple-400"
                                    )}
                                >
                                    {user.username}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    const newId = Math.max(...users.map(u => u.id), 0) + 1;
                                    onUserChange(newId);
                                    setShowUserDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors border-t border-gray-700 text-green-400"
                            >
                                + Create New User
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap- px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    New Chat
                </button>
                <button
                    onClick={onNewGuestChat}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
                >
                    <User size={16} />
                    Guest Mode
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {conversations.map((conv) => (
                    <div key={conv.id} className="relative group">
                        <button
                            onClick={() => onSelect(conv.id)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-left transition-colors pr-10",
                                currentId === conv.id
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                            )}
                        >
                            <MessageSquare size={18} />
                            <span className="truncate flex-1">{conv.title || "New Conversation"}</span>
                        </button>
                        <button
                            onClick={(e) => handleDeleteChat(e, conv.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-800 space-y-2">
                <button
                    onClick={onProfileClick}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
                >
                    <User size={16} />
                    View Profile
                </button>
                <button
                    onClick={handleClearAllChats}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-xs"
                >
                    <Trash2 size={14} />
                    Clear All Chats
                </button>
                <button
                    onClick={handleClearMemories}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 rounded-lg transition-colors text-xs"
                >
                    <Database size={14} />
                    Clear All Memories
                </button>
                <div className="text-xs text-gray-500 text-center pt-2">
                    Agentic AI Tutor v1.0
                </div>
            </div>
        </div>
    );
}
