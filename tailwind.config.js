module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  theme: {
    extend: {
      boxShadow: {
        'custom-card': '0 8px 24px rgba(0,0,0,.08)',
      },
      keyframes: {
        expand: {
          '0%': { transform: 'scale(1)', opacity: '0.3' },
          '100%': { transform: 'scale(1.5)', opacity: '1' }
        },
        contract: {
          '0%': { transform: 'scale(1.5)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.3' }
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        'expand': 'expand 4s ease-in-out',
        'contract': 'contract 4s ease-in-out',
        'gentle-glow': 'glow 2s ease-in-out infinite'
      }
    },
  },
  plugins: [],
};