import { createTheme, Theme, alpha } from '@mui/material/styles';

const commonComponents = {
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        textTransform: 'none' as const,
        borderRadius: 10,
        fontWeight: 600,
        letterSpacing: 0.2,
        transition: 'all 0.2s ease',
      },
      containedPrimary: {
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        '&:hover': { background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
      },
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined' as const },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
          transition: 'all 0.2s',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 2 },
        },
      },
    },
  },
  MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600, fontSize: 12 } } },
  MuiDrawer: { styleOverrides: { paper: { borderRight: 'none', boxShadow: '2px 0 20px rgba(0,0,0,0.06)' } } },
  MuiDialog: { styleOverrides: { paper: { borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' } } },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        transition: 'all 0.15s ease',
        '&:hover': { backgroundColor: alpha('#6366F1', 0.06) },
      },
    },
  },
};

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#6366F1', light: '#818CF8', dark: '#4F46E5', contrastText: '#fff' },
    secondary: { main: '#EC4899', light: '#F472B6', dark: '#DB2777' },
    background: { default: '#F1F5F9', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#3B82F6' },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'].join(','),
    h1: { fontWeight: 800 }, h2: { fontWeight: 700 }, h3: { fontWeight: 700 },
    h4: { fontWeight: 700 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 }, button: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: commonComponents as any,
});

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#818CF8', light: '#A5B4FC', dark: '#6366F1', contrastText: '#fff' },
    secondary: { main: '#F472B6', light: '#F9A8D4', dark: '#EC4899' },
    background: { default: '#0B1120', paper: '#131C2E' },
    text: { primary: '#F1F5F9', secondary: '#94A3B8' },
    success: { main: '#34D399' },
    warning: { main: '#FCD34D' },
    error: { main: '#F87171' },
    info: { main: '#60A5FA' },
    divider: '#1E293B',
  },
  typography: {
    fontFamily: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'].join(','),
    h1: { fontWeight: 800 }, h2: { fontWeight: 700 }, h3: { fontWeight: 700 },
    h4: { fontWeight: 700 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 }, button: { fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    ...commonComponents,
    MuiButton: {
      ...(commonComponents.MuiButton),
      styleOverrides: {
        root: { textTransform: 'none' as const, borderRadius: 10, fontWeight: 600, letterSpacing: 0.2, transition: 'all 0.2s ease' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', transform: 'translateY(-1px)', boxShadow: '0 4px 15px rgba(129,140,248,0.35)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: 'none',
          border: '1px solid #1E293B',
          transition: 'all 0.2s ease',
          '&:hover': { borderColor: '#334155', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transform: 'translateY(-2px)' },
        },
      },
    },
    MuiDrawer: { styleOverrides: { paper: { borderRight: 'none', boxShadow: '2px 0 20px rgba(0,0,0,0.3)', backgroundColor: '#131C2E' } } },
  } as any,
});
