/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FCFCFC',
          alt: '#F4F4F4',
          dark: '#0E0E0E',
          'dark-alt': '#161616',
        },
        foreground: {
          DEFAULT: '#111111',
          muted: '#6B6B6B',
          dark: '#EDEDED',
          'dark-muted': '#8E8E8E',
        },
        accent: {
          DEFAULT: '#6B5B95',
          hover: '#574A7A',
          light: '#EDE8F5',
          dark: '#9B8CC4',
          'dark-light': '#2D2650',
          'dark-hover': '#7B6DB0',
        },
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'sans-serif'],
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
