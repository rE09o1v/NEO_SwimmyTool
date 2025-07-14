import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    InputAdornment,
    IconButton,
    Divider,
    CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, School, Google } from '@mui/icons-material';
import { initializeGoogleDrive, authenticateGoogleDrive, isAuthenticated as isGoogleAuthenticated } from '../services/googleDriveService';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleInitialized, setGoogleInitialized] = useState(false);

    // デモ用の認証情報
    const validCredentials = [
        { username: 'mentor1', password: 'password123', name: 'メンター田中' },
        { username: 'staff1', password: 'password123', name: 'スタッフ佐藤' },
        { username: 'admin', password: 'admin123', name: '管理者' }
    ];

    useEffect(() => {
        initializeGoogle();
    }, []);

    const initializeGoogle = async () => {
        try {
            await initializeGoogleDrive();
            setGoogleInitialized(true);
        } catch (error) {
            console.warn('Google Drive初期化に失敗しました:', error);
            // エラーは表示せず、ローカル認証のみ使用可能とする
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // 簡単な認証ロジック（実際のプロダクションではサーバーサイドで実装）
        setTimeout(() => {
            const user = validCredentials.find(
                cred => cred.username === credentials.username && cred.password === credentials.password
            );

            if (user) {
                onLogin({
                    id: user.username,
                    name: user.name,
                    role: user.username === 'admin' ? 'admin' : 'mentor',
                    loginType: 'local'
                });
            } else {
                setError('ユーザー名またはパスワードが正しくありません。');
            }
            setLoading(false);
        }, 1000);
    };

    const handleGoogleLogin = async () => {
        if (!googleInitialized) {
            setError('Google Drive APIが初期化されていません。');
            return;
        }

        setGoogleLoading(true);
        setError('');

        try {
            await authenticateGoogleDrive();
            
            // Google認証成功後、ユーザー情報を取得
            const gapi = window.gapi;
            if (gapi && gapi.client) {
                try {
                    const response = await gapi.client.request({
                        path: 'https://www.googleapis.com/oauth2/v2/userinfo',
                    });
                    
                    const userInfo = response.result;
                    onLogin({
                        id: userInfo.id,
                        name: userInfo.name,
                        email: userInfo.email,
                        picture: userInfo.picture,
                        role: 'mentor',
                        loginType: 'google',
                        googleAuthenticated: true
                    });
                } catch (userInfoError) {
                    // ユーザー情報取得に失敗した場合でも、基本情報でログイン
                    onLogin({
                        id: 'google_user',
                        name: 'Google ユーザー',
                        role: 'mentor',
                        loginType: 'google',
                        googleAuthenticated: true
                    });
                }
            }
        } catch (error) {
            console.error('Google認証エラー:', error);
            setError('Google認証に失敗しました。再度お試しください。');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    return (
        <Container component="main" maxWidth="sm">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <School sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography component="h1" variant="h4" gutterBottom>
                            生徒管理システム
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            ログインしてシステムにアクセス
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Google Login */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={googleLoading ? <CircularProgress size={20} /> : <Google />}
                            onClick={handleGoogleLogin}
                            disabled={!googleInitialized || googleLoading}
                            sx={{
                                py: 1.5,
                                borderColor: '#4285F4',
                                color: '#4285F4',
                                '&:hover': {
                                    borderColor: '#3367D6',
                                    backgroundColor: 'rgba(66, 133, 244, 0.04)'
                                }
                            }}
                        >
                            {googleLoading ? 'Google認証中...' : 'Googleアカウントでログイン'}
                        </Button>
                        {googleInitialized && (
                            <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
                                Google Driveとの連携が自動で設定されます
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }}>または</Divider>

                    {/* Local Login */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="ユーザー名"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={credentials.username}
                            onChange={handleChange}
                            disabled={loading}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="パスワード"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={credentials.password}
                            onChange={handleChange}
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="パスワードを表示"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || !credentials.username || !credentials.password}
                        >
                            {loading ? 'ログイン中...' : 'ローカルアカウントでログイン'}
                        </Button>
                    </Box>

                    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>デモ用アカウント:</strong><br />
                            メンター: mentor1 / password123<br />
                            スタッフ: staff1 / password123<br />
                            管理者: admin / admin123
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login; 