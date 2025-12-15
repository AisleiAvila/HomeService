/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Cores da marca Natan Construtora
        brand: {
          // Vermelho Coral - Cor principal do logo
          primary: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ea5455',  // Cor principal do logo
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
          // Preto/Cinza - Cor secundária do logo
          secondary: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#e5e5e5',
            300: '#d4d4d4',
            400: '#a3a3a3',
            500: '#333333',  // Cor principal do logo
            600: '#2b2b2b',
            700: '#262626',
            800: '#1f1f1f',
            900: '#171717',
            950: '#0a0a0a',
          },
          // Cinza Claro - Texto secundário do logo
          accent: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',  // Tom usado em CONSTRUTORA
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
            950: '#0a0a0a',
          },
        },
        // Cores semânticas
        semantic: {
          success: {
            light: '#10b981',
            DEFAULT: '#059669',
            dark: '#047857',
          },
          warning: {
            light: '#fbbf24',
            DEFAULT: '#f59e0b',
            dark: '#d97706',
          },
          error: {
            light: '#f87171',
            DEFAULT: '#dc2626',
            dark: '#b91c1c',
          },
          info: {
            light: '#60a5fa',
            DEFAULT: '#3b82f6',
            dark: '#2563eb',
          },
        },
        // Tons neutros customizados
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(234, 84, 85, 0.15)',
        'brand-lg': '0 10px 40px 0 rgba(234, 84, 85, 0.20)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'brand': '0.75rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
