/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FAF7F2',
          alt: '#F0ECE3',
          dark: '#1A1A2E',
          'dark-alt': '#16213E',
        },
        foreground: {
          DEFAULT: '#2D2D2D',
          muted: '#6B6B6B',
          dark: '#E8E8E8',
          'dark-muted': '#A0A0B0',
        },
        accent: {
          DEFAULT: '#6B5B95',
          hover: '#574A7A',
          light: '#EDE8F5',
          dark: '#9B8CC4',
          'dark-light': '#2D2650',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        site: '1152px',
      },
    },
  },
  plugins: [],
};
