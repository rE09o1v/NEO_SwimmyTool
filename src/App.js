import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import ClassRecord from './components/ClassRecord';
import Navbar from './components/Navbar';
import { initializeDemoData } from './services/dataService';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // ローカルストレージから認証状態を復元
        const savedAuth = localStorage.getItem('isAuthenticated');
        const savedUser = localStorage.getItem('user');

        if (savedAuth === 'true' && savedUser) {
            setIsAuthenticated(true);
            setUser(JSON.parse(savedUser));
        }

        // デモデータの初期化
        initializeDemoData();
    }, []);

    const handleLogin = (userData) => {
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
    };

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        生徒管理システム
                    </Typography>
                    <Typography variant="body2" sx={{ mr: 2 }}>
                        {user?.name}さん
                    </Typography>
                </Toolbar>
            </AppBar>

            <Navbar onLogout={handleLogout} user={user} />

            <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/students" element={<StudentManagement />} />
                    <Route path="/class-record" element={<ClassRecord />} />
                    <Route path="/class-record/:studentId" element={<ClassRecord />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Container>
        </Box>
    );
}

export default App; 