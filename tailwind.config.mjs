/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c2d5ff',
          300: '#93b5ff',
          400: '#608aff',
          500: '#3b63f5',
          600: '#2447e0',
          700: '#1c38c4',
          800: '#1c309f',
          900: '#1c2d7d',
          950: '#141e54',
        },
        lab: {
          bg:     '#f5f0ff',
          border: '#7c3aed',
          title:  '#5b21b6',
        },
        pitfall: {
          bg:     '#fff7ed',
          border: '#ea580c',
          title:  '#c2410c',
        },
        quiz: {
          bg:     '#f0fdf4',
          border: '#16a34a',
          title:  '#15803d',
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body':        theme('colors.gray.700'),
            '--tw-prose-headings':    theme('colors.gray.900'),
            '--tw-prose-links':       theme('colors.brand.600'),
            fontSize: '1.0625rem',
            lineHeight: '1.75',
            maxWidth: '70ch',
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
