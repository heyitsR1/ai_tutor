import React from 'react';
import { User, Trash2, Database, MessageSquare, Zap, Flame, Trophy } from 'lucide-react';

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
    const [stats, setStats] = React.useState<{
        total_xp: number;
        level: number;
        level_title: string;
        current_xp: number;
        xp_for_next_level: number;
        progress_percent: number;
        streak_days: number;
    } | null>(null);

    React.useEffect(() => {
        fetchMemories();
        fetchStats();
    }, [userId]);

    const fetchStats = async () => {
        try {
            const res = await fetch(`http://localhost:8000/users/${userId}/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        }
    };

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

    const getCategoryStyle = (category: string) => {
        switch (category) {
            case 'user_profile':
                return {
                    backgroundColor: 'rgba(116, 82, 59, 0.1)',
                    color: 'var(--color-accent)',
                    borderColor: 'rgba(116, 82, 59, 0.2)'
                };
            case 'learning_preference':
                return {
                    backgroundColor: 'rgba(175, 157, 142, 0.15)',
                    color: 'var(--color-main)',
                    borderColor: 'rgba(175, 157, 142, 0.3)'
                };
            default:
                return {
                    backgroundColor: 'var(--color-secondary)',
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)'
                };
        }
    };

    return (
        <div
            className="h-full flex flex-col"
            style={{ backgroundColor: 'var(--color-bg)' }}
        >
            {/* Header */}
            <div
                className="h-16 flex items-center px-6 justify-between backdrop-blur-md"
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderBottom: '1px solid var(--color-border-light)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-main)', color: 'white' }}
                    >
                        <User size={18} />
                    </div>
                    <h1
                        className="text-xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Your Profile
                    </h1>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    Close
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* XP & Level Stats */}
                    {stats && (
                        <div
                            className="rounded-xl p-6"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border-light)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <h2
                                className="text-lg font-semibold mb-4 flex items-center gap-2"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                <Trophy size={20} style={{ color: 'var(--color-accent)' }} />
                                Your Progress
                            </h2>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Level Badge */}
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--color-accent), var(--color-main))',
                                            boxShadow: '0 4px 12px rgba(116, 82, 59, 0.3)'
                                        }}
                                    >
                                        <span className="text-white text-2xl font-bold">{stats.level}</span>
                                        <span className="text-white/80 text-[10px] uppercase tracking-wider">Level</span>
                                    </div>
                                    <div>
                                        <div
                                            className="text-xl font-bold"
                                            style={{ color: 'var(--color-text-primary)' }}
                                        >
                                            {stats.level_title}
                                        </div>
                                        <div
                                            className="text-sm flex items-center gap-1"
                                            style={{ color: 'var(--color-text-secondary)' }}
                                        >
                                            <Zap size={14} style={{ color: 'var(--color-accent)' }} />
                                            {stats.total_xp.toLocaleString()} Total XP
                                        </div>
                                    </div>
                                </div>

                                {/* Progress & Streak */}
                                <div className="flex-1 flex flex-col justify-center gap-3">
                                    {/* XP Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                                Level {stats.level} → {stats.level + 1}
                                            </span>
                                            <span style={{ color: 'var(--color-accent)' }}>
                                                {stats.current_xp} / {stats.xp_for_next_level} XP
                                            </span>
                                        </div>
                                        <div
                                            className="h-3 rounded-full overflow-hidden"
                                            style={{ backgroundColor: 'var(--color-secondary)' }}
                                        >
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${stats.progress_percent}%`,
                                                    background: 'linear-gradient(90deg, var(--color-main), var(--color-accent))'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Streak */}
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                            style={{
                                                backgroundColor: stats.streak_days > 0
                                                    ? 'rgba(245, 158, 11, 0.1)'
                                                    : 'var(--color-surface-warm)',
                                                border: `1px solid ${stats.streak_days > 0
                                                    ? 'rgba(245, 158, 11, 0.3)'
                                                    : 'var(--color-border-light)'}`
                                            }}
                                        >
                                            <Flame
                                                size={16}
                                                style={{ color: stats.streak_days > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}
                                            />
                                            <span
                                                className="text-sm font-semibold"
                                                style={{ color: stats.streak_days > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}
                                            >
                                                {stats.streak_days} day streak
                                            </span>
                                        </div>
                                        {stats.streak_days >= 3 && (
                                            <span
                                                className="text-xs px-2 py-1 rounded"
                                                style={{
                                                    backgroundColor: 'rgba(93, 138, 102, 0.1)',
                                                    color: 'var(--color-success)'
                                                }}
                                            >
                                                🔥 On Fire!
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Memory Overview */}
                    <div
                        className="rounded-xl p-6"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border-light)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <h2
                            className="text-lg font-semibold mb-4 flex items-center gap-2"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            <Database size={20} style={{ color: 'var(--color-accent)' }} />
                            Memory Overview
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div
                                className="rounded-lg p-4"
                                style={{ backgroundColor: 'var(--color-surface-warm)' }}
                            >
                                <div
                                    className="text-2xl font-bold"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {memories.length}
                                </div>
                                <div
                                    className="text-sm"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    Total Memories
                                </div>
                            </div>
                            <div
                                className="rounded-lg p-4"
                                style={{ backgroundColor: 'var(--color-surface-warm)' }}
                            >
                                <div
                                    className="text-2xl font-bold"
                                    style={{ color: 'var(--color-accent)' }}
                                >
                                    {memories.filter(m => m.category === 'user_profile').length}
                                </div>
                                <div
                                    className="text-sm"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    Profile Info
                                </div>
                            </div>
                            <div
                                className="rounded-lg p-4"
                                style={{ backgroundColor: 'var(--color-surface-warm)' }}
                            >
                                <div
                                    className="text-2xl font-bold"
                                    style={{ color: 'var(--color-main)' }}
                                >
                                    {memories.filter(m => m.category === 'learning_preference').length}
                                </div>
                                <div
                                    className="text-sm"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    Preferences
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={handleFlushMemories}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors text-sm font-medium"
                                style={{
                                    backgroundColor: 'rgba(166, 93, 93, 0.1)',
                                    color: 'var(--color-error)',
                                    border: '1px solid rgba(166, 93, 93, 0.2)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(166, 93, 93, 0.15)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(166, 93, 93, 0.1)'}
                            >
                                <Trash2 size={16} />
                                Clear All Memories
                            </button>
                        </div>
                    </div>

                    {/* Memories List */}
                    <div
                        className="rounded-xl p-6"
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border-light)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <h2
                            className="text-lg font-semibold mb-4 flex items-center gap-2"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            <MessageSquare size={20} style={{ color: 'var(--color-accent)' }} />
                            What I Know About You
                        </h2>

                        {loading ? (
                            <div
                                className="text-center py-8"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                Loading memories...
                            </div>
                        ) : memories.length === 0 ? (
                            <div
                                className="text-center py-8"
                                style={{ color: 'var(--color-text-muted)' }}
                            >
                                <Database size={48} className="mx-auto mb-3 opacity-50" />
                                <p>No memories stored yet.</p>
                                <p className="text-sm mt-2">Start chatting to build up your learning profile!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {memories.map((memory) => {
                                    const categoryStyle = getCategoryStyle(memory.category);
                                    return (
                                        <div
                                            key={memory.id}
                                            className="rounded-lg p-4 transition-colors"
                                            style={{
                                                backgroundColor: 'var(--color-surface-warm)',
                                                border: '1px solid var(--color-border-light)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border-light)'}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-2xl">{getCategoryIcon(memory.category)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span
                                                            className="text-xs px-2 py-1 rounded-md border"
                                                            style={categoryStyle}
                                                        >
                                                            {memory.category.replace('_', ' ')}
                                                        </span>
                                                        <span
                                                            className="text-xs"
                                                            style={{ color: 'var(--color-text-muted)' }}
                                                        >
                                                            {new Date(memory.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p
                                                        className="text-sm leading-relaxed"
                                                        style={{ color: 'var(--color-text-primary)' }}
                                                    >
                                                        {memory.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

