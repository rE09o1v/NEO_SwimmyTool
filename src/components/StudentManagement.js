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
    LinearProgress
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    PersonAdd,
    Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    getStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    initializeDemoData
} from '../services/dataService';

const StudentManagement = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [studentForm, setStudentForm] = useState({
        name: '',
        age: '',
        course: '',
        googleDriveFolder: ''
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const courses = [
        'スクラッチプログラミング',
        'ロボットプログラミング',
        'Pythonプログラミング',
        'ウェブプログラミング',
        'ゲーム制作'
    ];

    useEffect(() => {
        loadStudents();
        initializeDemoData(); // デモデータの初期化
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const data = await getStudents();
            setStudents(data);
        } catch (error) {
            showSnackbar('生徒データの読み込みに失敗しました', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim() === '') {
            loadStudents();
            return;
        }

        try {
            setLoading(true);
            const results = await searchStudents(searchQuery);
            setStudents(results);
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

    const handleOpenDialog = (student = null) => {
        if (student) {
            setEditingStudent(student);
            setStudentForm({
                name: student.name,
                age: student.age.toString(),
                course: student.course,
                googleDriveFolder: student.googleDriveFolder || ''
            });
        } else {
            setEditingStudent(null);
            setStudentForm({
                name: '',
                age: '',
                course: '',
                googleDriveFolder: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingStudent(null);
        setStudentForm({
            name: '',
            age: '',
            course: '',
            googleDriveFolder: ''
        });
    };

    const handleFormChange = (field, value) => {
        setStudentForm({ ...studentForm, [field]: value });
    };

    const handleSubmit = async () => {
        if (!studentForm.name || !studentForm.age || !studentForm.course) {
            showSnackbar('必須項目を入力してください', 'error');
            return;
        }

        try {
            const studentData = {
                name: studentForm.name,
                age: parseInt(studentForm.age),
                course: studentForm.course,
                googleDriveFolder: studentForm.googleDriveFolder || `/生徒フォルダ/${studentForm.name}`
            };

            if (editingStudent) {
                await updateStudent(editingStudent.id, studentData);
                showSnackbar('生徒情報を更新しました');
            } else {
                await addStudent(studentData);
                showSnackbar('新しい生徒を登録しました');
            }

            handleCloseDialog();
            loadStudents();
        } catch (error) {
            showSnackbar('保存に失敗しました', 'error');
        }
    };

    const handleDelete = async (student) => {
        if (window.confirm(`${student.name}さんの情報を削除してもよろしいですか？`)) {
            try {
                await deleteStudent(student.id);
                showSnackbar('生徒情報を削除しました');
                loadStudents();
            } catch (error) {
                showSnackbar('削除に失敗しました', 'error');
            }
        }
    };

    const handleViewClassRecords = (student) => {
        navigate(`/class-record/${student.id}`);
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    生徒管理
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => handleOpenDialog()}
                >
                    新規登録
                </Button>
            </Box>

            {/* 検索バー */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <TextField
                                fullWidth
                                label="生徒名またはコースで検索"
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

            {/* 生徒一覧テーブル */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>名前</TableCell>
                            <TableCell>年齢</TableCell>
                            <TableCell>コース</TableCell>
                            <TableCell>Google Driveフォルダ</TableCell>
                            <TableCell align="center">操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {students.length > 0 ? (
                            students.map((student) => (
                                <TableRow key={student.id} hover>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.age}歳</TableCell>
                                    <TableCell>{student.course}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="textSecondary">
                                            {student.googleDriveFolder}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            onClick={() => handleViewClassRecords(student)}
                                            title="授業記録を見る"
                                        >
                                            <Assignment />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDialog(student)}
                                            title="編集"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(student)}
                                            title="削除"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="textSecondary" py={4}>
                                        {searchQuery ? '検索結果がありません' : '生徒が登録されていません'}
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

            {/* 生徒登録・編集ダイアログ */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingStudent ? '生徒情報編集' : '新規生徒登録'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label="氏名 *"
                            value={studentForm.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            margin="normal"
                        />
                        <TextField
                            fullWidth
                            label="年齢 *"
                            type="number"
                            value={studentForm.age}
                            onChange={(e) => handleFormChange('age', e.target.value)}
                            margin="normal"
                            InputProps={{ inputProps: { min: 1, max: 20 } }}
                        />
                        <TextField
                            fullWidth
                            select
                            label="受講コース *"
                            value={studentForm.course}
                            onChange={(e) => handleFormChange('course', e.target.value)}
                            margin="normal"
                            SelectProps={{ native: true }}
                        >
                            <option value=""></option>
                            {courses.map((course) => (
                                <option key={course} value={course}>
                                    {course}
                                </option>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Google Driveフォルダパス"
                            value={studentForm.googleDriveFolder}
                            onChange={(e) => handleFormChange('googleDriveFolder', e.target.value)}
                            margin="normal"
                            helperText="空欄の場合は自動で設定されます"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>キャンセル</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingStudent ? '更新' : '登録'}
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

export default StudentManagement; 