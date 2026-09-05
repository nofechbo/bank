import AppRoutes from './components/Routes';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { SupportChat } from './components/SupportChat';

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
        },
        body: {
          height: '100%',
          backgroundColor: '#1A2038', // optional: ensure body also stays dark
        },
        '#root': {
          height: '100%',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppRoutes />
        <SupportChat />
    </ThemeProvider>
  );
}

export default App;
