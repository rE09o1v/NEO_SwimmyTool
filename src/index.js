import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
    typography: {
        fontFamily: [
            'Roboto',
            'Noto Sans JP',
            'sans-serif',
        ].join(','),
    },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // React.StrictMode を一時的に無効化 (react-beautiful-dnd の互換性問題のため)
    // <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </BrowserRouter>
    // </React.StrictMode>
); 