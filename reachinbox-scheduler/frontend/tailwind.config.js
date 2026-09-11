/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          light: '#EEF2FF',
          dark: '#3730A3',
        },
        text: {
          primary: '#111827',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
        scheduled: {
          bg: '#EEF2FF',
          text: '#3730A3',
        },
        processing: {
          bg: '#FEF3C7',
          text: '#B45309',
        },
        sent: {
          bg: '#DCFCE7',
          text: '#15803D',
        },
        failed: {
          bg: '#FEE2E2',
          text: '#B91C1C',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover':
          '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        modal:
          '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
};
