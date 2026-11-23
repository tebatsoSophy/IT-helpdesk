/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#15202B', soft: '#1F2E3D', line: '#2C3E50', muted: '#8DA2B5' },
        paper: '#EEF1F4',
        rule: '#D8DEE4',
        subtle: '#5B6B7A',
        accent: { DEFAULT: '#0E5A8A', dark: '#0A4568', soft: '#E3EEF6' },
        crit: '#B42318',
        high: '#C2570C',
        med: '#8A6500',
        low: '#4B6272',
        good: '#1B7F4B',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px', lg: '8px' },
    },
  },
  plugins: [],
}
