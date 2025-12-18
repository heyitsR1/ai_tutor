import { HelpCircle, FileText, Globe } from 'lucide-react';

interface QuickActionsProps {
    onQuizMe: () => void;
    onCheatsheet: () => void;
    onExploreResources: () => void;
    disabled?: boolean;
}

export function QuickActions({
    onQuizMe,
    onCheatsheet,
    onExploreResources,
    disabled = false
}: QuickActionsProps) {
    const buttons = [
        {
            label: 'Quiz Me!',
            icon: HelpCircle,
            onClick: onQuizMe,
            color: 'var(--color-accent)',
            bgColor: 'rgba(116, 82, 59, 0.1)',
            hoverBg: 'rgba(116, 82, 59, 0.2)'
        },
        {
            label: 'Cheatsheet',
            icon: FileText,
            onClick: onCheatsheet,
            color: 'var(--color-main)',
            bgColor: 'rgba(175, 157, 142, 0.1)',
            hoverBg: 'rgba(175, 157, 142, 0.2)'
        },
        {
            label: 'Explore Resources',
            icon: Globe,
            onClick: onExploreResources,
            color: 'var(--color-success)',
            bgColor: 'rgba(93, 138, 102, 0.1)',
            hoverBg: 'rgba(93, 138, 102, 0.2)'
        }
    ];

    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {buttons.map((btn) => (
                <button
                    key={btn.label}
                    onClick={btn.onClick}
                    disabled={disabled}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        backgroundColor: btn.bgColor,
                        color: btn.color,
                        border: `1px solid ${btn.color}20`
                    }}
                    onMouseOver={(e) => {
                        if (!disabled) {
                            e.currentTarget.style.backgroundColor = btn.hoverBg;
                        }
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = btn.bgColor;
                    }}
                >
                    <btn.icon size={16} />
                    <span>{btn.label}</span>
                </button>
            ))}
        </div>
    );
}
