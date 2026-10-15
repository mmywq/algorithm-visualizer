import type { Config } from 'tailwindcss';

// Все цвета берутся из CSS-переменных в формате «R G B», поэтому работают
// модификаторы прозрачности (bg-brand/10) и обе темы без дублирования классов.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;
const accent = (name: string) => ({ DEFAULT: token(name), press: token(`${name}-press`) });

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-2': token('ink-2'),
        'ink-3': token('ink-3'),
        /** цвет текста на ярких заливках — тёмный в обеих темах */
        on: token('on'),
        hard: token('hard'),
        brand: accent('brand'),
        green: accent('green'),
        yellow: accent('yellow'),
        red: accent('red'),
        orange: accent('orange'),
        pink: accent('pink'),
        teal: accent('teal'),
        cyan: accent('cyan'),
        purple: accent('purple'),
        lime: accent('lime'),
        cat: { DEFAULT: 'rgb(var(--cat) / <alpha-value>)', press: 'rgb(var(--cat-press) / <alpha-value>)' },
      },
      opacity: { 8: '0.08', 12: '0.12', 14: '0.14', 16: '0.16', 35: '0.35', 85: '0.85', 92: '0.92' },
      fontFamily: {
        sans: ['"Nunito Variable"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Tiny5', '"Nunito Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        chunky: '0 4px 0 rgb(var(--c-line-strong))',
        pixel: '4px 4px 0 0 rgb(var(--c-hard))',
        'pixel-lg': '6px 6px 0 0 rgb(var(--c-hard))',
        pop: '0 18px 40px -18px rgb(var(--c-shadow) / 0.6)',
        float: '0 28px 70px -28px rgb(var(--c-shadow) / 0.75)',
        glow: '0 0 0 1px rgb(var(--c-brand) / 0.35), 0 0 32px -6px rgb(var(--c-brand) / 0.55)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        flame: { '0%,100%': { transform: 'scaleY(1) rotate(-2deg)' }, '50%': { transform: 'scaleY(1.08) rotate(2deg)' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        flame: 'flame 1.2s ease-in-out infinite',
        bob: 'bob 3.2s ease-in-out infinite',
        blink: 'blink 1s steps(1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
