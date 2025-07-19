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
    Chip
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    Class as ClassIcon,
    DragHandle
} from '@mui/icons-material';
import {
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    searchClasses
} from '../services/dataService';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [classForm, setClassForm] = useState({
        name: '',
        description: '',
        order: ''
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        try {
            setLoading(true);
            const data = await getClasses();
            setClasses(data);
        } catch (error) {
            showSnackbar('クラスデータの読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim() === '') {
            loadClasses();
            return;
        }

        try {
            setLoading(true);
            const results = await searchClasses(searchQuery);
            setClasses(results);
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

    const handleOpenDialog = (classItem = null) => {
        if (classItem) {
            setEditingClass(classItem);
            setClassForm({
                name: classItem.name,
                description: classItem.description || '',
                order: classItem.order ? classItem.order.toString() : ''
            });
        } else {
            setEditingClass(null);
            setClassForm({
                name: '',
                description: '',
                order: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingClass(null);
        setClassForm({
            name: '',
            description: '',
            order: ''
        });
    };

    const handleFormChange = (field, value) => {
        setClassForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async () => {
        if (!classForm.name) {
            showSnackbar('クラス名は必須項目です', 'error');
            return;
        }

        try {
            const classData = {
                name: classForm.name,
                description: classForm.description,
                order: classForm.order ? parseInt(classForm.order) : classes.length + 1
            };

            if (editingClass) {
                await updateClass(editingClass.id, classData);
                showSnackbar('クラス情報を更新しました');
            } else {
                await addClass(classData);
                showSnackbar('新しいクラスを追加しました');
            }

            handleCloseDialog();
            loadClasses();
        } catch (error) {
            showSnackbar(error.message || 'クラス情報の保存に失敗しました', 'error');
        }
    };

    const handleDelete = async (classItem) => {
        if (window.confirm(`${classItem.name}を削除してもよろしいですか？\n\n※この操作は取り消せません。`)) {
            try {
                await deleteClass(classItem.id);
                showSnackbar('クラスを削除しました');
                loadClasses();
            } catch (error) {
                showSnackbar('クラスの削除に失敗しました', 'error');
            }
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    クラス管理
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
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
                                label="クラス検索"
                                placeholder="クラス名、説明で検索..."
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

            {/* クラス一覧テーブル */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>順序</TableCell>
                            <TableCell>クラス名</TableCell>
                            <TableCell>説明</TableCell>
                            <TableCell align="center">操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {classes.map((classItem) => (
                            <TableRow key={classItem.id} hover>
                                <TableCell>
                                    <Chip
                                        icon={<DragHandle />}
                                        label={classItem.order || '-'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ClassIcon color="primary" />
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {classItem.name}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {classItem.description || '-'}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog(classItem)}
                                        title="編集"
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(classItem)}
                                        title="削除"
                                    >
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {classes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {searchQuery ? '検索結果がありません' : 'クラスが登録されていません'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* フローティングアクションボタン（モバイル用） */}
            <Fab
                color="primary"
                aria-label="add"
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

            {/* クラス登録・編集ダイアログ */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingClass ? 'クラス編集' : '新規クラス追加'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="クラス名"
                                fullWidth
                                required
                                value={classForm.name}
                                onChange={(e) => handleFormChange('name', e.target.value)}
                                placeholder="例: M1, Advanced, Beginner"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="説明"
                                fullWidth
                                value={classForm.description}
                                onChange={(e) => handleFormChange('description', e.target.value)}
                                placeholder="例: 基礎レベル、プログラミング入門"
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="表示順序"
                                type="number"
                                fullWidth
                                value={classForm.order}
                                onChange={(e) => handleFormChange('order', e.target.value)}
                                placeholder="例: 1, 2, 3..."
                                helperText="小さい数値ほど上位に表示されます"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>キャンセル</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingClass ? '更新' : '追加'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* スナックバー */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default ClassManagement; 