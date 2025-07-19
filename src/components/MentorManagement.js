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
        lastName: '',
        firstName: '',
        emergencyContact: '',
        status: 'active'
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
                lastName: mentor.lastName || mentor.name || '', // 既存データ互換性
                firstName: mentor.firstName || '',
                emergencyContact: mentor.emergencyContact || '',
                status: mentor.status
            });
        } else {
            setEditingMentor(null);
            setMentorForm({
                lastName: '',
                firstName: '',
                emergencyContact: '',
                status: 'active'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingMentor(null);
        setMentorForm({
            lastName: '',
            firstName: '',
            emergencyContact: '',
            status: 'active'
        });
    };

    const handleSubmit = async () => {
        if (!mentorForm.lastName || !mentorForm.firstName) {
            showSnackbar('姓と名は必須項目です', 'error');
            return;
        }

        try {
            // 授業記録で使用するためのname（姓のみ）を追加
            const mentorData = {
                ...mentorForm,
                name: mentorForm.lastName // 授業記録で使用
            };

            if (editingMentor) {
                await updateMentor(editingMentor.id, mentorData);
                showSnackbar('メンター情報を更新しました');
            } else {
                await addMentor(mentorData);
                showSnackbar('新しいメンターを追加しました');
            }
            
            handleCloseDialog();
            loadMentors();
        } catch (error) {
            showSnackbar(error.message || 'メンター情報の保存に失敗しました', 'error');
        }
    };

    const handleDelete = async (mentor) => {
        const displayName = mentor.lastName && mentor.firstName 
            ? `${mentor.lastName} ${mentor.firstName}`
            : mentor.name;
        if (window.confirm(`${displayName}さんを削除してもよろしいですか？\n\n※この操作は取り消せません。`)) {
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



    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    メンター管理
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => handleOpenDialog()}
                >
                    新規追加
                </Button>
            </Box>

            {/* 検索バー */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="メンター検索"
                                placeholder="姓、名、緊急連絡先で検索..."
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
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={handleSearch}
                                startIcon={<Search />}
                            >
                                検索
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* 読み込み中 */}
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* メンターテーブル */}
            <TableContainer component={Paper}>
                <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>姓</TableCell>
                                <TableCell>名</TableCell>
                                <TableCell>緊急連絡先</TableCell>
                                <TableCell>ステータス</TableCell>
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
                                                    {(mentor.lastName || mentor.name || '').charAt(0)}
                                                </Avatar>
                                                {mentor.lastName || mentor.name || ''}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {mentor.firstName || ''}
                                        </TableCell>
                                        <TableCell>
                                            {mentor.emergencyContact || ''}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={statusInfo.label}
                                                color={statusInfo.color}
                                                size="small"
                                                icon={mentor.status === 'active' ? <CheckCircle /> : <Cancel />}
                                            />
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
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography color="textSecondary">
                                            メンターが見つかりません
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

            {/* 新規追加ボタン */}
            <Fab
                color="primary"
                aria-label="メンター追加"
                sx={{ 
                    position: 'fixed', 
                    bottom: 80, 
                    right: 16,
                    display: { xs: 'flex', md: 'none' }
                }}
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
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="姓"
                                fullWidth
                                required
                                value={mentorForm.lastName}
                                onChange={(e) => handleFormChange('lastName', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="名"
                                fullWidth
                                required
                                value={mentorForm.firstName}
                                onChange={(e) => handleFormChange('firstName', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="緊急連絡先"
                                fullWidth
                                value={mentorForm.emergencyContact}
                                onChange={(e) => handleFormChange('emergencyContact', e.target.value)}
                                placeholder="電話番号またはメールアドレス"
                            />
                        </Grid>
                        <Grid item xs={12}>
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