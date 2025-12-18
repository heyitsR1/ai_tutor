import { Globe, ExternalLink } from 'lucide-react';

interface Resource {
    title: string;
    url: string;
    description: string;
}

interface ResourcesCardProps {
    data: {
        query: string;
        resources: Resource[];
    };
}

export function ResourcesCard({ data }: ResourcesCardProps) {
    return (
        <div className="w-full max-w-2xl mx-auto my-4 rounded-xl overflow-hidden"
            style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-md)'
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 p-4"
                style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
                <div
                    className="p-2 rounded-lg"
                    style={{
                        backgroundColor: 'rgba(93, 138, 102, 0.15)',
                        color: 'var(--color-success)'
                    }}
                >
                    <Globe size={20} />
                </div>
                <div>
                    <div
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Learning Resources
                    </div>
                    <div
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Results for "{data.query}"
                    </div>
                </div>
            </div>

            {/* Resources List */}
            <div className="p-4 space-y-3">
                {data.resources.map((resource, idx) => (
                    <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 rounded-lg transition-all duration-200 group"
                        style={{
                            backgroundColor: 'var(--color-surface-warm)',
                            border: '1px solid var(--color-border-light)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-success)';
                            e.currentTarget.style.backgroundColor = 'rgba(93, 138, 102, 0.05)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border-light)';
                            e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)';
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div
                                    className="font-semibold text-sm mb-1 flex items-center gap-2"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    <span className="truncate">{resource.title}</span>
                                    <ExternalLink
                                        size={14}
                                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'var(--color-success)' }}
                                    />
                                </div>
                                <div
                                    className="text-xs mb-2 truncate"
                                    style={{ color: 'var(--color-success)' }}
                                >
                                    {resource.url}
                                </div>
                                <div
                                    className="text-sm line-clamp-2"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                >
                                    {resource.description}
                                </div>
                            </div>
                        </div>
                    </a>
                ))}

                {data.resources.length === 0 && (
                    <div
                        className="text-center py-6"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        No resources found for this query.
                    </div>
                )}
            </div>
        </div>
    );
}
