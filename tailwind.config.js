/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Classes composed at runtime (e.g. `btn-${tone}`, `coin-${kind}`) must never be purged.
  safelist: [{ pattern: /^(btn|coin)-(gold|mint|coral|cream|silver|choco|dark)$/ }],
  theme: {
    extend: {
      colors: {
        choco: { DEFAULT: '#1A120B', 2: '#2C1E14', 3: '#3B2819', 4: '#523823', ink: '#000000' },
        gold: '#FFD700',
        silver: '#E2E8F0',
        mint: '#10B981',
        coral: '#F43F5E',
        cream: '#FFFDF9',
        caramel: '#E8954A',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'Consolas', 'monospace'],
        body: ['Fredoka', '"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Noto Sans CJK KR"', 'system-ui', 'sans-serif'],
        ko: ['"Malgun Gothic"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Noto Sans CJK KR"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
