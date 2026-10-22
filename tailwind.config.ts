import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#182431',
        paper: '#F5F6F3',
        muted: '#66717D',
        line: '#DCE1E5',
        brand: '#E85D2A',
        accent: '#E85D2A',
        wash: '#EFF2F3',
        card: '#FFFFFF',
        green: '#2F7D6D',
        purple: '#725AA5',
        blue: '#3E6FA8',
        danger: '#BE4B43'
      },
      boxShadow: {
        card: '0 1px 2px rgba(24,36,49,.04), 0 10px 28px rgba(24,36,49,.06)',
        focus: '0 20px 50px rgba(24,36,49,.10)'
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        hand: ['Reenie Beanie', 'Caveat', 'cursive']
      }
    }
  },
  plugins: []
};

export default config;
