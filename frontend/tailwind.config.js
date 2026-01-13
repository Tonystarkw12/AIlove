/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 宝可梦主题颜色
        'poke-red': '#ffcb05',
        'poke-blue': '#3b4cca',
        'poke-yellow': '#FFCB05',
        'poke-dark-blue': '#003A70',
        'ui-bg': '#f0f0f0',

        // GameBoy配色
        'gameboy-bg': '#9BBC0F',
        'gameboy-dark': '#0F380F',
        'gameboy-light': '#8BAC0F',
        'gameboy-accent': '#306230',

        // 血条和经验条
        'hp-red': '#FF5A5A',
        'exp-blue': '#4A90E2',

        // VIP等级颜色
        'vip-bronze': '#CD7F32',
        'vip-silver': '#C0C0C0',
        'vip-gold': '#FFD700',
        'vip-diamond': '#B9F2FF',
      },
      boxShadow: {
        'gameboy': '4px 4px 0px 0px #000000',
        'gameboy-lg': '8px 8px 0px 0px #000000',
        'pokemon': '0 4px 10px rgba(0, 0, 0, 0.2)',
      },
      fontFamily: {
        'gameboy': ['"Press Start 2P"', '"Courier New"', 'monospace'],
        'pixel': ['"PixelFont"', 'monospace'],
        'rounded': ['"Varela Round"', '"Nunito"', 'sans-serif'],
      },
      animation: {
        'bounce-subtle': 'bounce-subtle 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
