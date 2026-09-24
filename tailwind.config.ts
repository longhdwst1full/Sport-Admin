import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--ba-font-body)'],
        display: ['var(--ba-font-display)'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          "'Liberation Mono'",
          "'Courier New'",
          'monospace',
        ],
      },
      colors: {
        /* Bảng màu đĩa tạ, chung với client. Tên cũ giữ làm bí danh. */
        ba: {
          iron: {
            900: 'var(--ba-iron-900)', 800: 'var(--ba-iron-800)', 700: 'var(--ba-iron-700)',
            600: 'var(--ba-iron-600)', 500: 'var(--ba-iron-500)', 400: 'var(--ba-iron-400)',
            300: 'var(--ba-iron-300)', 200: 'var(--ba-iron-200)', 100: 'var(--ba-iron-100)',
            50: 'var(--ba-iron-50)',
          },
          chalk: 'var(--ba-chalk)',
          paper: 'var(--ba-paper)',
          blue: {
            50: 'var(--ba-blue-50)', 100: 'var(--ba-blue-100)', 200: 'var(--ba-blue-200)',
            300: 'var(--ba-blue-300)', 400: 'var(--ba-blue-400)', 500: 'var(--ba-blue-500)',
            600: 'var(--ba-blue-600)', 700: 'var(--ba-blue-700)', 800: 'var(--ba-blue-800)',
            900: 'var(--ba-blue-900)',
          },
          yellow: {
            50: 'var(--ba-yellow-50)', 100: 'var(--ba-yellow-100)', 200: 'var(--ba-yellow-200)',
            300: 'var(--ba-yellow-300)', 400: 'var(--ba-yellow-400)', 500: 'var(--ba-yellow-500)',
            600: 'var(--ba-yellow-600)',
          },
          red: { 100: 'var(--ba-red-100)', 500: 'var(--ba-red-500)', 600: 'var(--ba-red-600)' },
          green: { 100: 'var(--ba-green-100)', 500: 'var(--ba-green-500)', 600: 'var(--ba-green-600)' },
          amber: { 100: 'var(--ba-amber-100)', 500: 'var(--ba-amber-500)' },
          action: 'var(--ba-action)',
          price: 'var(--ba-price)',
          ink: 'var(--ba-ink)',
        },
        admin: {
          50: 'var(--ba-blue-50)', 100: 'var(--ba-blue-100)', 200: 'var(--ba-blue-200)',
          300: 'var(--ba-blue-300)', 400: 'var(--ba-blue-400)', 500: 'var(--ba-blue-500)',
          600: 'var(--ba-blue-600)', 700: 'var(--ba-blue-700)', 800: 'var(--ba-blue-800)',
          900: 'var(--ba-blue-900)', 950: 'var(--ba-iron-900)',
        },
        surface: {
          DEFAULT: 'var(--ba-surface)',
          raised: 'var(--ba-surface)',
          sunken: 'var(--ba-canvas)',
          overlay: 'rgba(20, 23, 27, 0.6)',
        },
        sidebar: {
          DEFAULT: 'var(--ba-iron-900)',
          lighter: 'var(--ba-iron-800)',
          hover: 'var(--ba-iron-700)',
          active: 'var(--ba-blue-300)',
          'active-bg': 'rgba(27, 84, 184, 0.18)',
          text: 'var(--ba-iron-300)',
          'text-active': 'var(--ba-paper)',
          border: 'rgba(255, 255, 255, 0.06)',
        },
      },
      boxShadow: {
        /* Chỉ hai mức thật; bí danh cũ trỏ về đó để thẻ hết mỗi cái một bóng. */
        raised: 'var(--ba-shadow-raised)',
        overlay: 'var(--ba-shadow-overlay)',
        card: 'var(--ba-shadow-raised)',
        'card-hover': 'var(--ba-shadow-raised)',
        elevated: 'var(--ba-shadow-overlay)',
        'glow-green': 'var(--ba-shadow-overlay)',
        soft: 'var(--ba-shadow-raised)',
        'inner-border': 'inset 0 0 0 1px var(--ba-border-subtle)',
      },
      borderRadius: {
        image: 'var(--ba-radius-image)',
        control: 'var(--ba-radius-control)',
        surface: 'var(--ba-radius-surface)',
        overlay: 'var(--ba-radius-overlay)',
        pill: 'var(--ba-radius-pill)',
        '2xl': '8px',
        '3xl': '10px',
        '4xl': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'fade-in-up': 'fadeInUp 0.4s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out both',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
        'scale-in': 'scaleIn 0.2s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'count-up': 'countUp 0.6s ease-out both',
        'blob': 'blob 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(20px, -30px) scale(1.05)' },
          '50%': { transform: 'translate(-10px, 15px) scale(0.95)' },
          '75%': { transform: 'translate(-20px, -10px) scale(1.02)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
