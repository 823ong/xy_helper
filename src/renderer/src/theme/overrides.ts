import { GlobalThemeOverrides } from 'naive-ui'

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    borderRadiusSmall: '4px',
    // Google Material Design Colors
    primaryColor: '#1a73e8',
    primaryColorHover: '#1765cc',
    primaryColorPressed: '#1352a3',
    primaryColorSuppl: '#1a73e8', // Often used for tags etc, keeping consistent
    infoColor: '#1a73e8',
    infoColorHover: '#1765cc',
    infoColorPressed: '#1352a3',
    infoColorSuppl: '#1a73e8',
    successColor: '#1e8e3e',
    successColorHover: '#187032',
    successColorPressed: '#135928',
    successColorSuppl: '#1e8e3e',
    warningColor: '#f9ab00',
    warningColorHover: '#d99500',
    warningColorPressed: '#b87e00',
    warningColorSuppl: '#f9ab00',
    errorColor: '#d93025',
    errorColorHover: '#b5281f',
    errorColorPressed: '#912019',
    errorColorSuppl: '#d93025'
  },
  Card: {
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Soft shadow
    borderColor: 'transparent' // Remove border for cleaner card look
  },
  Button: {
    borderRadiusMedium: '20px', // Pill shape
    borderRadiusLarge: '24px',
    borderRadiusSmall: '16px',
    heightMedium: '40px',
    fontWeight: '500' // Slightly bolder text
  },
  Input: {
    borderRadius: '8px',
    boxShadowFocus: '0 0 0 2px rgba(24, 160, 88, 0.2)' // Example focus ring
  },
  Dialog: {
    borderRadius: '28px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' // Deep shadow
  },
  Modal: {
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  Dropdown: {
    borderRadius: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },
  Popover: {
    borderRadius: '12px'
  }
  // Add more component overrides as needed
}
