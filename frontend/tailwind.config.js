/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cozy Neutral Homely palette
                bg: 'var(--color-bg)',
                secondary: 'var(--color-secondary)',
                main: 'var(--color-main)',
                accent: 'var(--color-accent)',
                'text-primary': 'var(--color-text-primary)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-muted': 'var(--color-text-muted)',
                surface: 'var(--color-surface)',
                'surface-warm': 'var(--color-surface-warm)',
                border: 'var(--color-border)',
                'border-light': 'var(--color-border-light)',
                success: 'var(--color-success)',
                error: 'var(--color-error)',
                warning: 'var(--color-warning)',
            },
            boxShadow: {
                'cozy-sm': 'var(--shadow-sm)',
                'cozy-md': 'var(--shadow-md)',
                'cozy-lg': 'var(--shadow-lg)',
            },
            transitionDuration: {
                'fast': '150ms',
                'normal': '250ms',
            }
        },
    },
    plugins: [],
}
