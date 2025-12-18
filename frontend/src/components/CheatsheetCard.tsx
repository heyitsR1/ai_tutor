import { FileText, Download, Printer } from 'lucide-react';

interface CheatsheetCardProps {
    data: {
        topic: string;
        html: string;
    };
}

export function CheatsheetCard({ data }: CheatsheetCardProps) {
    const handleDownload = () => {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.topic.replace(/\s+/g, '_')}_cheatsheet.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(data.html);
            printWindow.document.close();
            printWindow.print();
        }
    };

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
                className="flex items-center justify-between p-4"
                style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-lg"
                        style={{
                            backgroundColor: 'rgba(175, 157, 142, 0.15)',
                            color: 'var(--color-main)'
                        }}
                    >
                        <FileText size={20} />
                    </div>
                    <div>
                        <div
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            Cheatsheet
                        </div>
                        <div
                            className="font-semibold"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {data.topic}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'var(--color-surface-warm)',
                            color: 'var(--color-accent)',
                            border: '1px solid var(--color-border-light)'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(116, 82, 59, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)'}
                    >
                        <Download size={14} />
                        Download
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'white'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5D4130'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                    >
                        <Printer size={14} />
                        Print
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="p-4">
                <iframe
                    srcDoc={data.html}
                    title={`${data.topic} Cheatsheet`}
                    className="w-full rounded-lg border-0"
                    style={{
                        height: '400px',
                        backgroundColor: 'white'
                    }}
                />
            </div>
        </div>
    );
}
