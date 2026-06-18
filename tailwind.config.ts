import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'Noto Sans Thai', 'Helvetica Neue', 'Arial', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        ink: '#111111',
        paper: '#f4f3ef',
        concrete: '#8f8f89',
        raw: '#d8d6cf',
        line: '#111111',
        accent: '#f05a28',
      },
      boxShadow: {
        panel: '10px 10px 0 rgb(17 17 17 / 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
