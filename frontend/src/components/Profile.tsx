import { User, Trash2, Database, MessageSquare } from 'lucide-react';

interface Memory {
    id: number;
    content: string;
    category: string;
    created_at: string;
}

interface ProfileProps {
    userId: number;
    onClose: () => void;
}

export function Profile({ userId, onClose }: ProfileProps) {
    const [memories, setMemories] = React.useState<Memory[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchMemories();
    }, [userId]);

    const fetchMemories = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:8000/memories?user_id=${userId}`);
            const data = await res.json();
            setMemories(data);
        } catch (err) {
            console.error('Failed to fetch memories', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFlushMemories = async () => {
        if (!confirm('Are you sure you want to delete ALL your memories? This cannot be undone.')) {
            return;
        }

        try {
            await fetch(`http://localhost:8000/memories?user_id=${userId}`, {
                method: 'DELETE',
            });
            setMemories([]);
            alert('All memories have been cleared!');
        } catch (err) {
            console.error('Failed to flush memories', err);
            alert('Failed to clear memories');
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'user_profile':
                return '👤';
            case 'learning_preference':
                return '📚';
            default:
                return '💭';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'user_profile':
                return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'learning_preference':
                return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            default:
                return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950">
            {/* Header */}
            <div className="h-16 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-md flex items-center px-6 justify-between">
                <div className="flex items-center gap-3">
                    <User size={24} className="text-purple-400" />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Your Profile
                    </h1>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Stats */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Database size={20} className="text-purple-400" />
                            Memory Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-white">{memories.length}</div>
                                <div className="text-sm text-gray-400">Total Memories</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-blue-400">
                                    {memories.filter(m => m.category === 'user_profile').length}
                                </div>
                                <div className="text-sm text-gray-400">Profile Info</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <div className="text-2xl font-bold text-purple-400">
                                    {memories.filter(m => m.category === 'learning_preference').length}
                                </div>
                                <div className="text-sm text-gray-400">Preferences</div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={handleFlushMemories}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Trash2 size={16} />
                                Clear All Memories
                            </button>
                        </div>
                    </div>

                    {/* Memories List */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MessageSquare size={20} className="text-purple-400" />
                            What I Know About You
                        </h2>

                        {loading ? (
                            <div className="text-center py-8 text-gray-400">Loading memories...</div>
                        ) : memories.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <Database size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No memories stored yet.</p>
                                <p className="text-sm mt-2">Start chatting to build up your learning profile!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {memories.map((memory) => (
                                    <div
                                        key={memory.id}
                                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600/50 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{getCategoryIcon(memory.category)}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs px-2 py-1 rounded-md border ${getCategoryColor(memory.category)}`}>
                                                        {memory.category.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(memory.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {memory.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
