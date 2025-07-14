import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    IconButton,
    Box,
    useMediaQuery,
    useTheme
} from '@mui/material';
import {
    Dashboard,
    People,
    Assignment,
    Logout
} from '@mui/icons-material';

const Navbar = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const navigationItems = [
        { label: 'ダッシュボード', icon: <Dashboard />, path: '/' },
        { label: '生徒管理', icon: <People />, path: '/students' },
        { label: '授業記録', icon: <Assignment />, path: '/class-record' }
    ];

    const getCurrentValue = () => {
        const currentItem = navigationItems.find(item =>
            item.path === location.pathname ||
            (item.path === '/class-record' && location.pathname.startsWith('/class-record'))
        );
        return currentItem ? navigationItems.indexOf(currentItem) : 0;
    };

    const handleChange = (event, newValue) => {
        if (newValue < navigationItems.length) {
            navigate(navigationItems[newValue].path);
        }
    };

    return (
        <Paper sx={{ position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BottomNavigation
                    value={getCurrentValue()}
                    onChange={handleChange}
                    sx={{ flexGrow: 1 }}
                    showLabels={!isMobile}
                >
                    {navigationItems.map((item, index) => (
                        <BottomNavigationAction
                            key={index}
                            label={item.label}
                            icon={item.icon}
                        />
                    ))}
                </BottomNavigation>

                <IconButton
                    color="error"
                    onClick={onLogout}
                    sx={{ mr: 1 }}
                    title="ログアウト"
                >
                    <Logout />
                </IconButton>
            </Box>
        </Paper>
    );
};

export default Navbar; 