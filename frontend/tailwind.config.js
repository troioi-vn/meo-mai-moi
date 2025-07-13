/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo 600
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#6B7280', // Gray 500
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#EC4899', // Pink 500
          foreground: '#FFFFFF',
        },
        neutral: {
          DEFAULT: '#F3F4F6', // Gray 100
          foreground: '#1F2937',
        },
        success: {
          DEFAULT: '#10B981', // Emerald 500
          foreground: '#FFFFFF',
        },
        error: {
          DEFAULT: '#EF4444', // Red 500
          foreground: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs': '.75rem',
        'sm': '.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '4rem',
      },
      lineHeight: {
        'tight': '1.2',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
      },
    },
  },
  plugins: [],
}