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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
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
    getCommentTemplates,
    getMentors,
    getLastTypingResult
} from '../services/dataService';
import { generateEvaluationSheet } from '../services/imageService';
import { uploadEvaluationSheet, isAuthenticated as isGoogleAuthenticated } from '../services/googleDriveService';

// タイピング評価レベル（9級〜1級用）
const TYPING_LEVELS = [
    'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+',
    'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S', 'Good', 'Fast'
];

// タイピング級の選択肢
const TYPING_GRADES = [
    '12級', '11級', '10級', '9級', '8級', '7級', '6級', '5級', '4級', '3級', '2級', '1級'
];

// 級ごとのテーマ定義
const TYPING_THEMES = {
    '9級': ['しりとり2文字', 'しりとり3文字'],
    '8級': ['しりとり4文字', 'しりとり5文字'],
    '7級': ['食べもの', '動物', 'ことわざ'],
    '6級': ['魚', '植物', 'エコ生活のコツ'],
    '5級': ['回文', '都道府県', '掃除のコツ'],
    '4級': ['四字熟語', '料理の名前', '早口言葉'],
    '3級': ['中学英単語総合', '日本の昔話', 'スポーツの起源'],
    '2級': ['中学英単語総合', '世界の童話', 'オリジナル'],
    '1級': ['高校英単語総合', '料理のレシピ', '名作']
};

// タイピング結果を表示用文字列に変換する関数
const formatTypingResult = (typingResult) => {
    if (!typingResult) return '';

    try {
        const parsed = JSON.parse(typingResult);
        const grade = parsed.grade;
        const data = parsed.data;

        if (!grade) return '';

        const isBasicGrade = ['12級', '11級', '10級'].includes(grade);

        if (isBasicGrade) {
            const charCount = data.basicData?.charCount || '';
            const accuracy = data.basicData?.accuracy || '';
            return `${grade}: ${charCount}${charCount ? '文字' : ''}${charCount && accuracy ? ', ' : ''}${accuracy}`;
        } else {
            const themes = data.advancedData || [];
            const results = themes
                .filter(theme => theme.theme || theme.level)
                .map(theme => `${theme.theme || '?'}: ${theme.level || '?'}`)
                .join(', ');
            return `${grade}: ${results || '記録なし'}`;
        }
    } catch (e) {
        // 古い形式の場合はそのまま表示
        return typingResult;
    }
};

// タイピング結果入力コンポーネント
const TypingResultInput = ({ typingGrade, typingData, previousResult, onChange }) => {
    const isBasicGrade = ['12級', '11級', '10級'].includes(typingGrade);
    const availableThemes = TYPING_THEMES[typingGrade] || [];

    // 前回の結果が同じ級かどうかチェック
    const hasPreviousResult = previousResult && previousResult.grade === typingGrade;

    const handleBasicDataChange = (field, value) => {
        onChange({
            ...typingData,
            basicData: {
                ...typingData.basicData,
                [field]: value
            }
        });
    };

    const handleAdvancedDataChange = (index, field, value) => {
        const newAdvancedData = [...(typingData.advancedData || [])];
        while (newAdvancedData.length <= index) {
            newAdvancedData.push({ theme: '', level: '' });
        }

        // テーマは自動設定
        if (field === 'level') {
            newAdvancedData[index] = {
                theme: availableThemes[index] || '',
                level: value
            };
        }

        onChange({
            ...typingData,
            advancedData: newAdvancedData
        });
    };

    // 初期化時にテーマを自動設定
    React.useEffect(() => {
        if (!isBasicGrade && availableThemes.length > 0) {
            const newAdvancedData = [...(typingData.advancedData || [])];
            let hasChanges = false;

            availableThemes.forEach((theme, index) => {
                if (!newAdvancedData[index]) {
                    newAdvancedData[index] = { theme: theme, level: '' };
                    hasChanges = true;
                } else if (newAdvancedData[index].theme !== theme) {
                    newAdvancedData[index].theme = theme;
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                onChange({
                    ...typingData,
                    advancedData: newAdvancedData
                });
            }
        }
    }, [typingGrade, availableThemes, isBasicGrade]);

    if (!typingGrade) {
        return (
            <Typography variant="body2" color="text.secondary">
                タイピング級を選択してください
            </Typography>
        );
    }

    if (isBasicGrade) {
        return (
            <Box>
                {hasPreviousResult && (
                    <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                            前回の結果（{previousResult.grade}）
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2">
                                    入力文字数: {previousResult.data?.basicData?.charCount || '記録なし'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2">
                                    正タイプ率: {previousResult.data?.basicData?.accuracy || '記録なし'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>
                )}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    今回の結果
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="入力文字数"
                            value={typingData.basicData?.charCount || ''}
                            onChange={(e) => handleBasicDataChange('charCount', e.target.value)}
                            placeholder="例: 120文字"
                            margin="normal"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="正タイプ率"
                            value={typingData.basicData?.accuracy || ''}
                            onChange={(e) => handleBasicDataChange('accuracy', e.target.value)}
                            placeholder="例: 95%"
                            margin="normal"
                        />
                    </Grid>
                </Grid>
            </Box>
        );
    }

    return (
        <Box>
            {hasPreviousResult && (
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        前回の結果（{previousResult.grade}）
                    </Typography>
                    <Grid container spacing={2}>
                        {availableThemes.map((theme, index) => (
                            <Grid item xs={12} md={6} key={`prev-${index}`}>
                                <Typography variant="body2">
                                    {theme}: {previousResult.data?.advancedData?.[index]?.level || '記録なし'}
                                </Typography>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                今回の結果
            </Typography>
            <Grid container spacing={2}>
                {availableThemes.map((theme, index) => (
                    <Grid item xs={12} key={index}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <Typography variant="body1" sx={{
                                    padding: '12px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '4px',
                                    border: '1px solid #e0e0e0'
                                }}>
                                    {theme}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>評価レベル</InputLabel>
                                    <Select
                                        value={typingData.advancedData?.[index]?.level || ''}
                                        label="評価レベル"
                                        onChange={(e) => handleAdvancedDataChange(index, 'level', e.target.value)}
                                    >
                                        <MenuItem value="">選択してください</MenuItem>
                                        {TYPING_LEVELS.map((level) => (
                                            <MenuItem key={level} value={level}>
                                                {level}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const ClassRecord = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(0);
    const [students, setStudents] = useState([]);
    const [classRecords, setClassRecords] = useState([]);
    const [commentTemplates, setCommentTemplates] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    // 日付をローカル時間でフォーマット
    const formatDateLocal = (date = new Date()) => {
        const targetDate = date || new Date();
        return targetDate.getFullYear() + '-' +
            String(targetDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(targetDate.getDate()).padStart(2, '0');
    };

    const [recordForm, setRecordForm] = useState({
        studentId: '',
        studentName: '',
        date: formatDateLocal(),
        classRange: '',
        typingGrade: '',
        typingData: {
            basicData: {
                charCount: '',
                accuracy: ''
            },
            advancedData: []
        },
        writingResult: '',
        comment: '',
        nextClassRange: '',
        instructor: ''
    });
    const [previousTypingResult, setPreviousTypingResult] = useState(null);
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
            const [studentsData, templatesData, mentorsData] = await Promise.all([
                getStudents(),
                getCommentTemplates(),
                getMentors()
            ]);

            setStudents(studentsData);
            setCommentTemplates(templatesData);
            setMentors(mentorsData);

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

    const handleOpenDialog = async (record = null) => {
        if (record) {
            setEditingRecord(record);
            setPreviousTypingResult(null); // 編集時は前回の結果を表示しない

            // 既存の記録がある場合、typingResultから級とデータを復元
            let typingGrade = '';
            let typingData = {
                basicData: { charCount: '', accuracy: '' },
                advancedData: []
            };

            // 既存のtypingResultからデータを復元する処理
            if (record.typingResult) {
                try {
                    const parsed = JSON.parse(record.typingResult);
                    typingGrade = parsed.grade || '';
                    typingData = parsed.data || typingData;
                } catch (e) {
                    // 古い形式の場合はそのまま表示
                    typingGrade = '';
                    typingData.basicData = { charCount: record.typingResult, accuracy: '' };
                }
            }

            // 日付をローカル時間として正しく表示
            const formattedDate = formatDateLocal(new Date(record.date));

            setRecordForm({
                studentId: record.studentId,
                studentName: record.studentName,
                date: formattedDate,
                classRange: record.classRange,
                typingGrade: typingGrade,
                typingData: typingData,
                writingResult: record.writingResult,
                comment: record.comment,
                nextClassRange: record.nextClassRange,
                instructor: record.instructor || ''
            });
        } else {
            setEditingRecord(null);
            // 今日の日付をローカル時間で取得
            const todayFormatted = formatDateLocal();

            // 新規作成時、生徒が選択されている場合は前回のタイピング結果を取得
            let defaultTypingGrade = '';
            let defaultTypingData = {
                basicData: { charCount: '', accuracy: '' },
                advancedData: []
            };

            if (selectedStudent) {
                try {
                    const lastTypingResult = await getLastTypingResult(selectedStudent.id);
                    setPreviousTypingResult(lastTypingResult);
                    defaultTypingGrade = lastTypingResult.grade || '';
                } catch (error) {
                    console.error('前回タイピング結果の取得に失敗しました:', error);
                    setPreviousTypingResult(null);
                }
            } else {
                setPreviousTypingResult(null);
            }

            setRecordForm({
                studentId: selectedStudent?.id || '',
                studentName: selectedStudent?.name || '',
                date: todayFormatted,
                classRange: '',
                typingGrade: defaultTypingGrade,
                typingData: defaultTypingData,
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

    const handleFormChange = async (field, value) => {
        setRecordForm({ ...recordForm, [field]: value });

        // 生徒選択時
        if (field === 'studentName') {
            const student = students.find(s => s.name === value);
            if (student) {
                try {
                    // 前回のタイピング結果を取得
                    const lastTypingResult = await getLastTypingResult(student.id);
                    setPreviousTypingResult(lastTypingResult);

                    setRecordForm(prev => ({
                        ...prev,
                        studentId: student.id,
                        studentName: student.name,
                        typingGrade: lastTypingResult.grade || '',
                        typingData: {
                            basicData: { charCount: '', accuracy: '' },
                            advancedData: []
                        }
                    }));
                } catch (error) {
                    console.error('前回タイピング結果の取得に失敗しました:', error);
                    setPreviousTypingResult(null);
                    setRecordForm(prev => ({
                        ...prev,
                        studentId: student.id,
                        studentName: student.name,
                        typingGrade: '',
                        typingData: {
                            basicData: { charCount: '', accuracy: '' },
                            advancedData: []
                        }
                    }));
                }
            }
        }
    };

    const handleSubmit = async () => {
        if (!recordForm.studentId || !recordForm.classRange || !recordForm.instructor) {
            showSnackbar('必須項目を入力してください', 'error');
            return;
        }

        try {
            // タイピングデータをJSON形式で保存
            const typingResult = recordForm.typingGrade ? JSON.stringify({
                grade: recordForm.typingGrade,
                data: recordForm.typingData
            }) : '';

            // 日付をローカル時間として保存（JST維持）
            const [year, month, day] = recordForm.date.split('-');
            const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            const recordData = {
                ...recordForm,
                typingResult: typingResult,
                date: localDate.toISOString()
            };

            // typingGradeとtypingDataは保存しない
            delete recordData.typingGrade;
            delete recordData.typingData;

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
                                                タイピング: {formatTypingResult(record.typingResult)}
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
                                <FormControl fullWidth margin="normal" required>
                                    <InputLabel>担当者 *</InputLabel>
                                    <Select
                                        value={recordForm.instructor}
                                        label="担当者 *"
                                        onChange={(e) => handleFormChange('instructor', e.target.value)}
                                    >
                                        {mentors
                                            .filter(mentor => mentor.status === 'active')
                                            .map((mentor) => (
                                                <MenuItem key={mentor.id} value={mentor.name}>
                                                    {mentor.name} ({mentor.speciality})
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>
                                </FormControl>
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
                                <FormControl fullWidth margin="normal" required>
                                    <InputLabel>タイピング級 *</InputLabel>
                                    <Select
                                        value={recordForm.typingGrade}
                                        label="タイピング級 *"
                                        onChange={(e) => handleFormChange('typingGrade', e.target.value)}
                                    >
                                        <MenuItem value="">選択してください</MenuItem>
                                        {TYPING_GRADES.map((grade) => (
                                            <MenuItem key={grade} value={grade}>
                                                {grade}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Box>
                                    {previousTypingResult && previousTypingResult.grade === recordForm.typingGrade && (
                                        <Box sx={{ mb: 1, textAlign: 'right' }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => {
                                                    setRecordForm(prev => ({
                                                        ...prev,
                                                        typingData: previousTypingResult.data
                                                    }));
                                                }}
                                            >
                                                前回の結果を自動設定
                                            </Button>
                                        </Box>
                                    )}
                                    <TypingResultInput
                                        typingGrade={recordForm.typingGrade}
                                        typingData={recordForm.typingData}
                                        previousResult={previousTypingResult}
                                        onChange={(newData) => handleFormChange('typingData', newData)}
                                    />
                                </Box>
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