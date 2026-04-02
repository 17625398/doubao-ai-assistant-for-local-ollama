/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0057ff',
          hover: '#0046cc',
          light: '#e6f0ff',
        },
        background: {
          DEFAULT: '#ffffff',
          secondary: '#f5f5f5',
        },
        text: {
          primary: '#1a1a1a',
          secondary: '#666666',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
