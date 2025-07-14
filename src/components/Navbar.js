import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BottomNavigation,
    BottomNavigationAction,
    Paper,
    IconButton,
    Box,
    useMediaQuery,
    useTheme,
    Avatar,
    Chip,
    Typography,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Dashboard,
    People,
    Assignment,
    Logout,
    CloudDone,
    CloudOff,
    Person,
    Settings
} from '@mui/icons-material';
import { isAuthenticated as isGoogleAuthenticated, signOutGoogleDrive } from '../services/googleDriveService';

const Navbar = ({ onLogout, user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [googleConnected, setGoogleConnected] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const navigationItems = [
        { label: 'ダッシュボード', icon: <Dashboard />, path: '/' },
        { label: '生徒管理', icon: <People />, path: '/students' },
        { label: '授業記録', icon: <Assignment />, path: '/class-record' }
    ];

    useEffect(() => {
        // Google Drive連携状態を定期的にチェック
        const checkGoogleConnection = () => {
            setGoogleConnected(isGoogleAuthenticated());
        };

        checkGoogleConnection();
        const interval = setInterval(checkGoogleConnection, 5000);

        return () => clearInterval(interval);
    }, []);

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

    const handleUserMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    const handleGoogleSignOut = async () => {
        try {
            await signOutGoogleDrive();
            setGoogleConnected(false);
            handleUserMenuClose();
        } catch (error) {
            console.error('Google サインアウトエラー:', error);
        }
    };

    const handleLogout = () => {
        handleUserMenuClose();
        onLogout();
    };

    const renderUserInfo = () => {
        if (!user) return null;

        const isGoogleUser = user.loginType === 'google';
        const avatarSrc = isGoogleUser && user.picture ? user.picture : null;

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                {/* Google Drive連携状態 */}
                <Tooltip title={googleConnected ? 'Google Drive 連携中' : 'Google Drive 未連携'}>
                    <Chip
                        icon={googleConnected ? <CloudDone /> : <CloudOff />}
                        label={isMobile ? '' : (googleConnected ? '連携中' : '未連携')}
                        color={googleConnected ? 'success' : 'default'}
                        size="small"
                        variant={googleConnected ? 'filled' : 'outlined'}
                    />
                </Tooltip>

                {/* ユーザー情報 */}
                <Tooltip title={`${user.name} (${user.role === 'admin' ? '管理者' : 'メンター'})`}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'pointer',
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={handleUserMenuOpen}
                    >
                        <Avatar
                            src={avatarSrc}
                            sx={{ width: 32, height: 32 }}
                        >
                            {!avatarSrc && user.name.charAt(0)}
                        </Avatar>
                        {!isMobile && (
                            <Typography variant="body2" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.name}
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
            </Box>
        );
    };

    return (
        <>
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

                    {renderUserInfo()}

                    <IconButton
                        color="error"
                        onClick={handleLogout}
                        sx={{ mr: 1 }}
                        title="ログアウト"
                    >
                        <Logout />
                    </IconButton>
                </Box>
            </Paper>

            {/* ユーザーメニュー */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
            >
                <MenuItem disabled>
                    <ListItemIcon>
                        <Person />
                    </ListItemIcon>
                    <ListItemText
                        primary={user?.name}
                        secondary={`${user?.role === 'admin' ? '管理者' : 'メンター'} | ${user?.loginType === 'google' ? 'Google' : 'ローカル'}`}
                    />
                </MenuItem>
                
                <Divider />
                
                {user?.loginType === 'google' && googleConnected && (
                    <MenuItem onClick={handleGoogleSignOut}>
                        <ListItemIcon>
                            <CloudOff />
                        </ListItemIcon>
                        <ListItemText primary="Google Drive 連携解除" />
                    </MenuItem>
                )}
                
                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <Logout />
                    </ListItemIcon>
                    <ListItemText primary="ログアウト" />
                </MenuItem>
            </Menu>
        </>
    );
};

export default Navbar; 