import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    CardContent,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Alert,
    Snackbar,
    Tabs,
    Tab,
    Autocomplete,
    Paper,
    Divider,
    LinearProgress,
    Fab
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Save,
    CloudUpload,
    Assignment,
    Image as ImageIcon,
    Article as Template
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { safeJaLocale } from '../services/localeSetup';
import {
    getStudents,
    getClassRecords,
    addClassRecord,
    updateClassRecord,
    deleteClassRecord,
    getCommentTemplates
} from '../services/dataService';
import { generateEvaluationSheet } from '../services/imageService';
import { uploadEvaluationSheet, isAuthenticated as isGoogleAuthenticated } from '../services/googleDriveService';

const ClassRecord = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [students, setStudents] = useState([]);
    const [classRecords, setClassRecords] = useState([]);
    const [commentTemplates, setCommentTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [recordForm, setRecordForm] = useState({
        studentId: '',
        studentName: '',
        date: new Date().toISOString().slice(0, 10),
        classRange: '',
        typingResult: '',
        writingResult: '',
        comment: '',
        nextClassRange: '',
        instructor: ''
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        // ログインユーザー情報を取得
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        loadData();
    }, [studentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, templatesData] = await Promise.all([
                getStudents(),
                getCommentTemplates()
            ]);

            setStudents(studentsData);
            setCommentTemplates(templatesData);

            if (studentId) {
                const student = studentsData.find(s => s.id === studentId);
                if (student) {
                    setSelectedStudent(student);
                    setRecordForm(prev => ({
                        ...prev,
                        studentId: student.id,
                        studentName: student.name
                    }));
                }
                const recordsData = await getClassRecords(studentId);
                setClassRecords(recordsData);
            } else {
                const allRecords = await getClassRecords();
                setClassRecords(allRecords);
            }
        } catch (error) {
            showSnackbar('データの読み込みに失敗しました', 'error');
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

    const handleOpenDialog = (record = null) => {
        if (record) {
            setEditingRecord(record);
            setRecordForm({
                studentId: record.studentId,
                studentName: record.studentName,
                date: record.date.slice(0, 10),
                classRange: record.classRange,
                typingResult: record.typingResult,
                writingResult: record.writingResult,
                comment: record.comment,
                nextClassRange: record.nextClassRange,
                instructor: record.instructor || ''
            });
        } else {
            setEditingRecord(null);
            setRecordForm({
                studentId: selectedStudent?.id || '',
                studentName: selectedStudent?.name || '',
                date: new Date().toISOString().slice(0, 10),
                classRange: '',
                typingResult: '',
                writingResult: '',
                comment: '',
                nextClassRange: '',
                instructor: currentUser?.name || ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRecord(null);
    };

    const handleFormChange = (field, value) => {
        setRecordForm({ ...recordForm, [field]: value });

        // 生徒選択時
        if (field === 'studentName') {
            const student = students.find(s => s.name === value);
            if (student) {
                setRecordForm(prev => ({
                    ...prev,
                    studentId: student.id,
                    studentName: student.name
                }));
            }
        }
    };

    const handleSubmit = async () => {
        if (!recordForm.studentId || !recordForm.classRange || !recordForm.instructor) {
            showSnackbar('必須項目を入力してください', 'error');
            return;
        }

        try {
            const recordData = {
                ...recordForm,
                date: new Date(recordForm.date + 'T00:00:00').toISOString()
            };

            if (editingRecord) {
                await updateClassRecord(editingRecord.id, recordData);
                showSnackbar('授業記録を更新しました');
            } else {
                await addClassRecord(recordData);
                showSnackbar('授業記録を保存しました');
            }

            handleCloseDialog();
            loadData();
        } catch (error) {
            showSnackbar('保存に失敗しました', 'error');
        }
    };

    const handleDelete = async (record) => {
        if (window.confirm('この授業記録を削除してもよろしいですか？')) {
            try {
                await deleteClassRecord(record.id);
                showSnackbar('授業記録を削除しました');
                loadData();
            } catch (error) {
                showSnackbar('削除に失敗しました', 'error');
            }
        }
    };

    const handleGenerateImage = async (record) => {
        try {
            showSnackbar('評価シート画像を生成しています...', 'info');
            const imageBlob = await generateEvaluationSheet(record);

            // ダウンロード
            const url = URL.createObjectURL(imageBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `評価シート_${record.studentName}_${format(parseISO(record.date), 'yyyyMMdd')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Google Drive連携チェック
            if (isGoogleAuthenticated()) {
                try {
                    showSnackbar('Google Driveにアップロードしています...', 'info');
                    const uploadResult = await uploadEvaluationSheet(imageBlob, record);
                    showSnackbar(
                        `評価シート画像を生成し、Google Driveにアップロードしました\nパス: ${uploadResult.uploadPath || '生徒管理フォルダ'}`,
                        'success'
                    );
                } catch (uploadError) {
                    console.error('Google Drive アップロードエラー:', uploadError);
                    showSnackbar('画像生成は完了しましたが、Google Driveアップロードに失敗しました', 'warning');
                }
            } else {
                showSnackbar('評価シート画像を生成しました（Google Drive未連携）');
            }
        } catch (error) {
            showSnackbar('画像生成に失敗しました', 'error');
        }
    };

    const handleUseTemplate = (template) => {
        const currentComment = recordForm.comment;
        const newComment = currentComment
            ? `${currentComment}\n${template.text}`
            : template.text;

        handleFormChange('comment', newComment);
        setOpenTemplateDialog(false);
    };

    const templatesByCategory = commentTemplates.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
    }, {});

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    {selectedStudent ? `${selectedStudent.name}さんの授業記録` : '授業記録'}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                >
                    新規作成
                </Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* タブ */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="授業記録一覧" />
                    <Tab label="統計情報" />
                </Tabs>
            </Paper>

            {/* 授業記録一覧 */}
            {tabValue === 0 && (
                <Grid container spacing={3}>
                    {classRecords.length > 0 ? (
                        classRecords.map((record) => (
                            <Grid item xs={12} md={6} lg={4} key={record.id}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                            <Typography variant="h6" component="div">
                                                {record.studentName}
                                            </Typography>
                                            <Chip
                                                label={format(parseISO(record.date), 'MM/dd', { locale: safeJaLocale })}
                                                size="small"
                                                color="primary"
                                            />
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            授業範囲: {record.classRange}
                                        </Typography>

                                        {record.instructor && (
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                担当者: {record.instructor}
                                            </Typography>
                                        )}

                                        {record.typingResult && (
                                            <Typography variant="body2" color="text.secondary">
                                                タイピング: {record.typingResult}
                                            </Typography>
                                        )}

                                        {record.writingResult && (
                                            <Typography variant="body2" color="text.secondary">
                                                書き取り: {record.writingResult}
                                            </Typography>
                                        )}

                                        {record.comment && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {record.comment.length > 80
                                                    ? `${record.comment.substring(0, 80)}...`
                                                    : record.comment
                                                }
                                            </Typography>
                                        )}

                                        {record.nextClassRange && (
                                            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                                次回: {record.nextClassRange}
                                            </Typography>
                                        )}

                                        <Box display="flex" justifyContent="space-between" mt={2}>
                                            <Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDialog(record)}
                                                    title="編集"
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleDelete(record)}
                                                    title="削除"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                            <Button
                                                size="small"
                                                startIcon={<ImageIcon />}
                                                onClick={() => handleGenerateImage(record)}
                                            >
                                                画像生成
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    ) : (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 4, textAlign: 'center' }}>
                                <Assignment sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    授業記録がありません
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    「新規作成」ボタンから最初の授業記録を作成しましょう
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* 統計情報 */}
            {tabValue === 1 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    記録統計
                                </Typography>
                                <Typography variant="body2">
                                    総授業回数: {classRecords.length}回
                                </Typography>
                                <Typography variant="body2">
                                    今月の授業回数: {classRecords.filter(record => {
                                        const recordDate = parseISO(record.date);
                                        const now = new Date();
                                        return recordDate.getMonth() === now.getMonth() &&
                                            recordDate.getFullYear() === now.getFullYear();
                                    }).length}回
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

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

            {/* 授業記録作成・編集ダイアログ */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingRecord ? '授業記録編集' : '新規授業記録'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    options={students.map(s => s.name)}
                                    value={recordForm.studentName}
                                    onChange={(e, value) => handleFormChange('studentName', value || '')}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="生徒名 *"
                                            fullWidth
                                            margin="normal"
                                        />
                                    )}
                                    disabled={!!selectedStudent}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="実施日 *"
                                    type="date"
                                    value={recordForm.date}
                                    onChange={(e) => handleFormChange('date', e.target.value)}
                                    margin="normal"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="担当者 *"
                                    value={recordForm.instructor}
                                    onChange={(e) => handleFormChange('instructor', e.target.value)}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="授業範囲 *"
                                    value={recordForm.classRange}
                                    onChange={(e) => handleFormChange('classRange', e.target.value)}
                                    margin="normal"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="タイピング結果"
                                    value={recordForm.typingResult}
                                    onChange={(e) => handleFormChange('typingResult', e.target.value)}
                                    margin="normal"
                                    placeholder="例: 30文字/分、正確率95%"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="書き取り練習結果"
                                    value={recordForm.writingResult}
                                    onChange={(e) => handleFormChange('writingResult', e.target.value)}
                                    margin="normal"
                                    placeholder="例: 10問中8問正解"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TextField
                                        fullWidth
                                        label="コメント"
                                        value={recordForm.comment}
                                        onChange={(e) => handleFormChange('comment', e.target.value)}
                                        margin="normal"
                                        multiline
                                        rows={3}
                                    />
                                    <IconButton
                                        onClick={() => setOpenTemplateDialog(true)}
                                        title="テンプレートを使用"
                                    >
                                        <Template />
                                    </IconButton>
                                </Box>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="次回の授業範囲"
                                    value={recordForm.nextClassRange}
                                    onChange={(e) => handleFormChange('nextClassRange', e.target.value)}
                                    margin="normal"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>キャンセル</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingRecord ? '更新' : '保存'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* コメントテンプレートダイアログ */}
            <Dialog open={openTemplateDialog} onClose={() => setOpenTemplateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>コメントテンプレート</DialogTitle>
                <DialogContent>
                    {Object.entries(templatesByCategory).map(([category, templates]) => (
                        <Box key={category} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                                {category}
                            </Typography>
                            <List dense>
                                {templates.map((template) => (
                                    <ListItem
                                        key={template.id}
                                        button
                                        onClick={() => handleUseTemplate(template)}
                                        sx={{ borderRadius: 1, mb: 0.5 }}
                                    >
                                        <ListItemText primary={template.text} />
                                    </ListItem>
                                ))}
                            </List>
                            <Divider />
                        </Box>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTemplateDialog(false)}>閉じる</Button>
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

export default ClassRecord; 