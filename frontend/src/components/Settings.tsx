import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Check, Key, Cpu, X } from 'lucide-react';

interface Provider {
    id: string;
    name: string;
    requires_key: boolean;
}

interface SettingsProps {
    userId: number;
    onClose: () => void;
}

export function Settings({ userId, onClose }: SettingsProps) {
    const [currentProvider, setCurrentProvider] = useState('claude');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [groqApiKey, setGroqApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [userId]);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`http://localhost:8000/users/${userId}/settings/model`);
            if (res.ok) {
                const data = await res.json();
                setCurrentProvider(data.provider);
                setHasApiKey(data.has_api_key);
                setProviders(data.available_providers);
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const saveSettings = async (provider: string) => {
        setIsSaving(true);
        setMessage(null);

        try {
            const body: { provider: string; api_key?: string } = { provider };

            if (provider === 'groq') {
                if (!groqApiKey && !hasApiKey) {
                    setMessage({ type: 'error', text: 'GROQ API key is required' });
                    setIsSaving(false);
                    return;
                }
                if (groqApiKey) {
                    body.api_key = groqApiKey;
                }
            }

            const res = await fetch(`http://localhost:8000/users/${userId}/settings/model`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setCurrentProvider(provider);
                setMessage({ type: 'success', text: `Switched to ${provider}` });
                if (provider === 'groq' && groqApiKey) {
                    setHasApiKey(true);
                    setGroqApiKey('');
                }
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.detail || 'Failed to save' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Connection error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="h-full flex flex-col"
            style={{ backgroundColor: 'var(--color-surface-warm)' }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4"
                style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
                <div className="flex items-center gap-2">
                    <SettingsIcon size={20} style={{ color: 'var(--color-accent)' }} />
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Settings
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Model Selection */}
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
                            <Cpu size={20} style={{ color: 'var(--color-accent)' }} />
                            AI Model
                        </h2>

                        <p
                            className="text-sm mb-4"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            Choose which AI model powers your tutoring experience.
                        </p>

                        <div className="space-y-3">
                            {providers.map((provider) => (
                                <div
                                    key={provider.id}
                                    className={`p-4 rounded-lg cursor-pointer transition-all ${currentProvider === provider.id ? 'ring-2' : ''
                                        }`}
                                    style={{
                                        backgroundColor: currentProvider === provider.id
                                            ? 'rgba(116, 82, 59, 0.1)'
                                            : 'var(--color-surface-warm)',
                                        border: `1px solid ${currentProvider === provider.id
                                            ? 'var(--color-accent)'
                                            : 'var(--color-border-light)'}`
                                    }}
                                    onClick={() => {
                                        if (provider.id !== 'groq') {
                                            saveSettings(provider.id);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div
                                                className="font-medium"
                                                style={{ color: 'var(--color-text-primary)' }}
                                            >
                                                {provider.name}
                                            </div>
                                            {provider.requires_key && (
                                                <div
                                                    className="text-xs flex items-center gap-1 mt-1"
                                                    style={{ color: 'var(--color-text-muted)' }}
                                                >
                                                    <Key size={12} />
                                                    Requires API key
                                                </div>
                                            )}
                                        </div>
                                        {currentProvider === provider.id && (
                                            <div
                                                className="p-1 rounded-full"
                                                style={{ backgroundColor: 'var(--color-success)' }}
                                            >
                                                <Check size={14} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* GROQ API Key Input */}
                                    {provider.id === 'groq' && (
                                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    placeholder={hasApiKey ? "API key saved (enter new to replace)" : "Enter GROQ API key..."}
                                                    value={groqApiKey}
                                                    onChange={(e) => setGroqApiKey(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                                                    style={{
                                                        backgroundColor: 'var(--color-surface)',
                                                        border: '1px solid var(--color-border)',
                                                        color: 'var(--color-text-primary)'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => saveSettings('groq')}
                                                    disabled={isSaving}
                                                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                    style={{
                                                        backgroundColor: 'var(--color-accent)',
                                                        color: 'white',
                                                        opacity: isSaving ? 0.7 : 1
                                                    }}
                                                >
                                                    {isSaving ? 'Saving...' : (currentProvider === 'groq' ? 'Update' : 'Switch')}
                                                </button>
                                            </div>
                                            <a
                                                href="https://console.groq.com/keys"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs mt-2 inline-block hover:underline"
                                                style={{ color: 'var(--color-accent)' }}
                                            >
                                                Get a free GROQ API key →
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Message */}
                        {message && (
                            <div
                                className="mt-4 p-3 rounded-lg text-sm"
                                style={{
                                    backgroundColor: message.type === 'success'
                                        ? 'rgba(93, 138, 102, 0.1)'
                                        : 'rgba(166, 93, 93, 0.1)',
                                    color: message.type === 'success'
                                        ? 'var(--color-success)'
                                        : 'var(--color-error)'
                                }}
                            >
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div
                        className="text-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        <p>
                            <strong>Claude (Default)</strong>: Uses Anthropic's Claude model. No setup needed.
                        </p>
                        <p className="mt-2">
                            <strong>GROQ</strong>: Ultra-fast inference with Llama 3.3 70B. Free tier available at groq.com.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
