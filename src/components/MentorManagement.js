import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Alert,
    Snackbar,
    Card,
    CardContent,
    Grid,
    InputAdornment,
    Fab,
    LinearProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Avatar
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    PersonAdd,
    Email,
    Work,
    CalendarToday,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import {
    getMentors,
    addMentor,
    updateMentor,
    deleteMentor,
    searchMentors
} from '../services/dataService';

const MentorManagement = () => {
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingMentor, setEditingMentor] = useState(null);
    const [mentorForm, setMentorForm] = useState({
        name: '',
        email: '',
        speciality: '',
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10)
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const specialities = [
        'スクラッチプログラミング',
        'ロボットプログラミング',
        'Pythonプログラミング',
        'ウェブプログラミング',
        'ゲーム制作',
        'アプリ開発',
        '3Dモデリング',
        'AI・機械学習'
    ];

    const statuses = [
        { value: 'active', label: '稼働中', color: 'success' },
        { value: 'inactive', label: '休職中', color: 'warning' },
        { value: 'resigned', label: '退職', color: 'error' }
    ];

    useEffect(() => {
        loadMentors();
    }, []);

    const loadMentors = async () => {
        try {
            setLoading(true);
            const data = await getMentors();
            setMentors(data);
        } catch (error) {
            showSnackbar('メンターデータの読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim() === '') {
            loadMentors();
            return;
        }

        try {
            setLoading(true);
            const results = await searchMentors(searchQuery);
            setMentors(results);
        } catch (error) {
            showSnackbar('検索に失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleOpenDialog = (mentor = null) => {
        if (mentor) {
            setEditingMentor(mentor);
            setMentorForm({
                name: mentor.name,
                email: mentor.email,
                speciality: mentor.speciality,
                status: mentor.status,
                joinDate: mentor.joinDate
            });
        } else {
            setEditingMentor(null);
            setMentorForm({
                name: '',
                email: '',
                speciality: '',
                status: 'active',
                joinDate: new Date().toISOString().slice(0, 10)
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingMentor(null);
    };

    const handleSubmit = async () => {
        if (!mentorForm.name || !mentorForm.email || !mentorForm.speciality) {
            showSnackbar('必須項目を入力してください', 'error');
            return;
        }

        try {
            if (editingMentor) {
                await updateMentor(editingMentor.id, mentorForm);
                showSnackbar('メンター情報を更新しました');
            } else {
                await addMentor(mentorForm);
                showSnackbar('新しいメンターを追加しました');
            }
            
            handleCloseDialog();
            loadMentors();
        } catch (error) {
            showSnackbar(error.message || 'メンター情報の保存に失敗しました', 'error');
        }
    };

    const handleDelete = async (mentor) => {
        if (window.confirm(`${mentor.name}さんを削除してもよろしいですか？\n\n※この操作は取り消せません。`)) {
            try {
                await deleteMentor(mentor.id);
                showSnackbar('メンターを削除しました');
                loadMentors();
            } catch (error) {
                showSnackbar('メンターの削除に失敗しました', 'error');
            }
        }
    };

    const handleFormChange = (field, value) => {
        setMentorForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getStatusInfo = (status) => {
        return statuses.find(s => s.value === status) || statuses[0];
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ja-JP');
    };

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress />
                <Typography sx={{ mt: 2, textAlign: 'center' }}>
                    メンターデータを読み込んでいます...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonAdd />
                メンター管理
            </Typography>

            {/* 統計カード */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                総メンター数
                            </Typography>
                            <Typography variant="h4">
                                {mentors.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                稼働中
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {mentors.filter(m => m.status === 'active').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                休職中
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {mentors.filter(m => m.status === 'inactive').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 検索 */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    label="メンター検索"
                    placeholder="名前、メール、専門分野で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ flexGrow: 1 }}
                />
                <Button variant="outlined" onClick={handleSearch}>
                    検索
                </Button>
                <Button variant="outlined" onClick={loadMentors}>
                    リセット
                </Button>
            </Box>

            {/* メンターテーブル */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>メンター名</TableCell>
                                <TableCell>メールアドレス</TableCell>
                                <TableCell>専門分野</TableCell>
                                <TableCell>ステータス</TableCell>
                                <TableCell>入社日</TableCell>
                                <TableCell align="center">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mentors.map((mentor) => {
                                const statusInfo = getStatusInfo(mentor.status);
                                return (
                                    <TableRow key={mentor.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar sx={{ width: 32, height: 32 }}>
                                                    {mentor.name.charAt(0)}
                                                </Avatar>
                                                {mentor.name}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Email fontSize="small" color="action" />
                                                {mentor.email}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Work fontSize="small" color="action" />
                                                {mentor.speciality}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={statusInfo.label}
                                                color={statusInfo.color}
                                                size="small"
                                                icon={mentor.status === 'active' ? <CheckCircle /> : <Cancel />}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CalendarToday fontSize="small" color="action" />
                                                {formatDate(mentor.joinDate)}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleOpenDialog(mentor)}
                                                title="編集"
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(mentor)}
                                                title="削除"
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {mentors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="textSecondary">
                                            メンターが見つかりません
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* 新規追加ボタン */}
            <Fab
                color="primary"
                aria-label="メンター追加"
                sx={{ position: 'fixed', bottom: 80, right: 16 }}
                onClick={() => handleOpenDialog()}
            >
                <Add />
            </Fab>

            {/* メンター編集ダイアログ */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {editingMentor ? 'メンター編集' : '新規メンター追加'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="メンター名"
                                fullWidth
                                required
                                value={mentorForm.name}
                                onChange={(e) => handleFormChange('name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="メールアドレス"
                                type="email"
                                fullWidth
                                required
                                value={mentorForm.email}
                                onChange={(e) => handleFormChange('email', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel>専門分野</InputLabel>
                                <Select
                                    value={mentorForm.speciality}
                                    label="専門分野"
                                    onChange={(e) => handleFormChange('speciality', e.target.value)}
                                >
                                    {specialities.map((speciality) => (
                                        <MenuItem key={speciality} value={speciality}>
                                            {speciality}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>ステータス</InputLabel>
                                <Select
                                    value={mentorForm.status}
                                    label="ステータス"
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                >
                                    {statuses.map((status) => (
                                        <MenuItem key={status.value} value={status.value}>
                                            {status.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="入社日"
                                type="date"
                                fullWidth
                                value={mentorForm.joinDate}
                                onChange={(e) => handleFormChange('joinDate', e.target.value)}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingMentor ? '更新' : '追加'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* スナックバー */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MentorManagement; 