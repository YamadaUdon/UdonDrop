// Light Theme Configuration
export const lightTheme = {
  colors: {
    // Primary colors
    background: '#fafafa',
    surface: '#ffffff',
    surfaceHover: '#f5f5f5',
    
    // Text colors
    textPrimary: '#2c3e50',
    textSecondary: '#5a6c7d',
    textTertiary: '#8b9dc3',
    
    // Border colors
    border: '#e0e4e8',
    borderHover: '#d0d4d8',
    borderActive: '#b0b4b8',
    
    // Accent colors
    accent: '#4a5f7f',
    accentHover: '#3a4f6f',
    accentLight: '#6a7f9f',
    
    // Status colors
    success: '#5cb85c',
    warning: '#f0ad4e',
    error: '#d9534f',
    info: '#5bc0de',
    
    // Node type colors
    nodeInput: '#6a8caf',
    nodeProcess: '#7a9cc6',
    nodeML: '#8aacde',
    nodeOutput: '#9abcee',
    
    // Shadows
    shadowLight: 'rgba(0, 0, 0, 0.04)',
    shadowMedium: 'rgba(0, 0, 0, 0.08)',
    shadowDark: 'rgba(0, 0, 0, 0.12)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '18px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
  },
  
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
};

// Dark Theme Configuration
export const darkTheme = {
  colors: {
    // Primary colors
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceHover: '#3a3a3a',
    
    // Text colors
    textPrimary: '#e0e0e0',
    textSecondary: '#b0b0b0',
    textTertiary: '#888888',
    
    // Border colors
    border: '#404040',
    borderHover: '#505050',
    borderActive: '#606060',
    
    // Accent colors
    accent: '#6b7f9f',
    accentHover: '#7b8faf',
    accentLight: '#5b6f8f',
    
    // Status colors
    success: '#4a9a4a',
    warning: '#d08a2e',
    error: '#c9433f',
    info: '#4ba0ce',
    
    // Node type colors
    nodeInput: '#5a7c9f',
    nodeProcess: '#6a8cb6',
    nodeML: '#7a9cce',
    nodeOutput: '#8aacde',
    
    // Shadows
    shadowLight: 'rgba(0, 0, 0, 0.2)',
    shadowMedium: 'rgba(0, 0, 0, 0.3)',
    shadowDark: 'rgba(0, 0, 0, 0.4)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '18px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
  },
  
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
};

export type ThemeType = typeof lightTheme;

// Legacy export for backward compatibility
export const solitudeTheme = lightTheme;