import React, { useState } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, School } from '@mui/icons-material';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // デモ用の認証情報
    const validCredentials = [
        { username: 'mentor1', password: 'password123', name: 'メンター田中' },
        { username: 'staff1', password: 'password123', name: 'スタッフ佐藤' },
        { username: 'admin', password: 'admin123', name: '管理者' }
    ];

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
                    role: user.username === 'admin' ? 'admin' : 'mentor'
                });
            } else {
                setError('ユーザー名またはパスワードが正しくありません。');
            }
            setLoading(false);
        }, 1000);
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

                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

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
                            {loading ? 'ログイン中...' : 'ログイン'}
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