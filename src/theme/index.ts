import { createTheme, Theme } from '@mui/material/styles';

// Color palette tokens
const palette = {
  primary: '#1a3a5c',
  primaryLight: '#2a5080',
  secondary: '#e67e22',
  successMain: '#27ae60',
  warningMain: '#f39c12',
  errorMain: '#e74c3c',
  infoMain: '#2980b9',
  textPrimary: '#2d3748',
  textSecondary: '#718096',
  lightBg: '#ffffff',
  lightPaper: '#f8f9fa',
  darkBg: '#121212',
  darkPaper: '#1e1e1e',
};

export function getTheme(mode: 'light' | 'dark'): Theme {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
        light: palette.primaryLight,
      },
      secondary: {
        main: palette.secondary,
      },
      success: {
        main: palette.successMain,
      },
      warning: {
        main: palette.warningMain,
      },
      error: {
        main: palette.errorMain,
      },
      info: {
        main: palette.infoMain,
      },
      background: {
        default: isLight ? palette.lightBg : palette.darkBg,
        paper: isLight ? palette.lightPaper : palette.darkPaper,
      },
      text: {
        primary: isLight ? palette.textPrimary : '#e2e8f0',
        secondary: isLight ? palette.textSecondary : '#a0aec0',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 },
      h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
      h6: { fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.4 },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', lineHeight: 1.5 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          containedPrimary: {
            '&:hover': {
              backgroundColor: palette.primaryLight,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isLight ? '1px solid #e2e8f0' : '1px solid #2d3748',
            boxShadow: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: isLight ? palette.textSecondary : '#a0aec0',
              backgroundColor: isLight ? '#f8f9fa' : '#1e1e1e',
              borderBottom: isLight ? '2px solid #e2e8f0' : '2px solid #2d3748',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: '0.75rem',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.3)',
            backgroundColor: isLight ? palette.lightBg : palette.darkPaper,
            color: isLight ? palette.textPrimary : '#e2e8f0',
          },
        },
      },
    },
  });
}
