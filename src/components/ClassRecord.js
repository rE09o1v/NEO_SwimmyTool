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
    Fab,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Save,
    CloudUpload,
    Assignment,
    Image as ImageIcon,
    Article as Template,
    TrendingUp,
    Analytics,
    BarChart,
    Timeline
} from '@mui/icons-material';
import { format, parseISO, subDays, subMonths } from 'date-fns';
import { safeJaLocale } from '../services/localeSetup';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
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
import { uploadEvaluationSheet, uploadEvaluationAndResultImages, isAuthenticated as isGoogleAuthenticated } from '../services/googleDriveService';

// Chart.jsの設定
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

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

// 書き取り結果を表示用文字列に変換する関数
const formatWritingResultForDisplay = (record) => {
    // 新形式のデータがある場合
    if (record.writingStep !== undefined && record.writingType !== undefined) {
        const step = record.writingStep ? `STEP${record.writingStep}` : '';
        const type = record.writingType && record.writingType.length > 0 ? record.writingType.join('・') : '';
        return [step, type].filter(Boolean).join(' - ');
    }

    // 旧形式のデータがある場合（後方互換性）
    if (record.writingResult) {
        return record.writingResult;
    }

    return '記録なし';
};

// 統計データを処理する関数
const processStatisticsData = (records) => {
    // 日付順にソート（古い順）
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 期間別統計
    const now = new Date();
    const lastWeek = subDays(now, 7);
    const lastMonth = subMonths(now, 1);
    const last3Months = subMonths(now, 3);

    const weekRecords = records.filter(r => new Date(r.date) >= lastWeek);
    const monthRecords = records.filter(r => new Date(r.date) >= lastMonth);
    const threeMonthRecords = records.filter(r => new Date(r.date) >= last3Months);

    // タイピング結果の推移データ準備
    const typingProgressData = sortedRecords
        .filter(record => record.typingResult)
        .map(record => {
            try {
                const parsed = JSON.parse(record.typingResult);
                const date = format(parseISO(record.date), 'MM/dd', { locale: safeJaLocale });

                if (['12級', '11級', '10級'].includes(parsed.grade)) {
                    // 基本級の場合：文字数を数値として取得
                    const charCount = parsed.data?.basicData?.charCount;
                    const accuracy = parsed.data?.basicData?.accuracy;
                    const numericCharCount = charCount ? parseInt(charCount.toString().replace(/[^\d]/g, '')) : null;
                    const numericAccuracy = accuracy ? parseFloat(accuracy.toString().replace(/[^\d.]/g, '')) : null;

                    return {
                        date,
                        grade: parsed.grade,
                        charCount: numericCharCount,
                        accuracy: numericAccuracy,
                        type: 'basic',
                        accuracyText: accuracy || ''
                    };
                } else {
                    // 上級の場合：評価レベルを数値に変換
                    const advancedData = parsed.data?.advancedData || [];
                    const averageLevel = calculateAverageLevel(advancedData);
                    return {
                        date,
                        grade: parsed.grade,
                        value: averageLevel,
                        type: 'advanced',
                        themes: advancedData.length,
                        themeDetails: advancedData // テーマ別詳細データを追加
                    };
                }
            } catch (e) {
                return null;
            }
        })
        .filter(Boolean);

    // 基本級の級別データを準備
    const basicGradeData = {};
    typingProgressData
        .filter(data => data.type === 'basic')
        .forEach(data => {
            if (!basicGradeData[data.grade]) {
                basicGradeData[data.grade] = [];
            }
            basicGradeData[data.grade].push(data);
        });

    // テーマ別推移データの準備
    const themeProgressData = {};
    sortedRecords
        .filter(record => record.typingResult)
        .forEach(record => {
            try {
                const parsed = JSON.parse(record.typingResult);
                const date = format(parseISO(record.date), 'MM/dd', { locale: safeJaLocale });

                if (!['12級', '11級', '10級'].includes(parsed.grade)) {
                    const advancedData = parsed.data?.advancedData || [];
                    const grade = parsed.grade;

                    if (!themeProgressData[grade]) {
                        themeProgressData[grade] = {};
                    }

                    advancedData.forEach((themeData, index) => {
                        if (themeData.theme && themeData.level) {
                            const themeName = themeData.theme;
                            const levelValue = getLevelValue(themeData.level);

                            if (!themeProgressData[grade][themeName]) {
                                themeProgressData[grade][themeName] = [];
                            }

                            themeProgressData[grade][themeName].push({
                                date,
                                level: themeData.level,
                                value: levelValue
                            });
                        }
                    });
                }
            } catch (e) {
                // エラーは無視
            }
        });

    // 書き取り結果の統計
    const writingStats = records.reduce((acc, record) => {
        let step = null;
        if (record.writingStep) {
            step = record.writingStep;
        } else if (record.writingResult && record.writingResult.includes('STEP')) {
            const match = record.writingResult.match(/STEP(\d)/);
            step = match ? match[1] : null;
        }

        if (step) {
            acc[`step${step}`] = (acc[`step${step}`] || 0) + 1;
        }
        return acc;
    }, {});

    return {
        totalRecords: records.length,
        weekRecords: weekRecords.length,
        monthRecords: monthRecords.length,
        threeMonthRecords: threeMonthRecords.length,
        typingProgressData,
        basicGradeData,
        themeProgressData,
        writingStats,
        uniqueGrades: [...new Set(typingProgressData.map(d => d.grade))].filter(Boolean),
        latestRecords: sortedRecords.slice(-5).reverse()
    };
};

// タイピングレベルを数値に変換
const levelValues = {
    'E-': 1, 'E': 2, 'E+': 3,
    'D-': 4, 'D': 5, 'D+': 6,
    'C-': 7, 'C': 8, 'C+': 9,
    'B-': 10, 'B': 11, 'B+': 12,
    'A-': 13, 'A': 14, 'A+': 15,
    'S': 16, 'Good': 17, 'Fast': 18
};

const getLevelValue = (level) => {
    return levelValues[level] || 0;
};

const calculateAverageLevel = (advancedData) => {
    const validLevels = advancedData
        .map(item => levelValues[item.level])
        .filter(value => value !== undefined);

    return validLevels.length > 0
        ? Math.round(validLevels.reduce((sum, val) => sum + val, 0) / validLevels.length)
        : 0;
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
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [openTemplateTypeDialog, setOpenTemplateTypeDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
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
        writingStep: '',
        writingType: [],
        typingComment: '', // タイピングについてのコメント
        curriculumComment: '', // カリキュラムについてのコメント
        nextClassRange: '',
        instructor: '',
        images: [] // 成果物画像配列を追加
    });
    const [previousTypingResult, setPreviousTypingResult] = useState(null);
    const [selectedThemeGrade, setSelectedThemeGrade] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [imageFiles, setImageFiles] = useState([]); // アップロードされた画像ファイルの実体

    useEffect(() => {
        // ログインユーザー情報を取得
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        loadData();
    }, [studentId]);

    // 生徒が選択されていない場合、統計タブが選択されていたら授業記録一覧タブに戻す
    useEffect(() => {
        if (!selectedStudent && tabValue === 1) {
            setTabValue(0);
        }
    }, [selectedStudent, tabValue]);

    // テーマ別推移の初期値設定
    useEffect(() => {
        if (classRecords.length > 0) {
            const stats = processStatisticsData(classRecords);
            const availableGrades = Object.keys(stats.themeProgressData);

            if (availableGrades.length > 0 && (!selectedThemeGrade || !availableGrades.includes(selectedThemeGrade))) {
                const sortedGrades = availableGrades.sort((a, b) => {
                    const gradeA = parseInt(a.replace('級', ''));
                    const gradeB = parseInt(b.replace('級', ''));
                    return gradeB - gradeA;
                });
                if (sortedGrades.length > 0) {
                    setSelectedThemeGrade(sortedGrades[0]);
                }
            }
        }
    }, [classRecords, selectedThemeGrade]);

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

            // 書き取り結果の復元処理（後方互換性のため）
            let writingStep = '';
            let writingType = [];

            if (record.writingStep !== undefined && record.writingType !== undefined) {
                // 新形式のデータ
                writingStep = record.writingStep;
                writingType = record.writingType || [];
            } else if (record.writingResult) {
                // 旧形式のデータを新形式に変換（デフォルト値）
                writingStep = '1'; // デフォルトでSTEP1
                writingType = ['練習']; // デフォルトで練習
            }

            setRecordForm({
                studentId: record.studentId,
                studentName: record.studentName,
                date: formattedDate,
                classRange: record.classRange,
                typingGrade: typingGrade,
                typingData: typingData,
                writingStep: writingStep,
                writingType: writingType,
                typingComment: record.typingComment || '',
                curriculumComment: record.curriculumComment || record.comment || '', // 既存データ互換性のため
                nextClassRange: record.nextClassRange,
                instructor: record.instructor || '',
                images: record.images || [] // 既存の画像を読み込み
            });
            
            // 編集時の画像ファイル状態をリセット（保存された画像のみ表示）
            setImageFiles([]);
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
                    const lastTypingResult = await getLastTypingResult(selectedStudent.id, editingRecord?.id);
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
                writingStep: '',
                writingType: [],
                typingComment: '',
                curriculumComment: '',
                nextClassRange: '',
                instructor: currentUser?.name || '',
                images: [] // 新規作成時は空の画像配列
            });
            
            // 新規作成時は画像ファイル状態もリセット
            setImageFiles([]);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRecord(null);
        // 画像ファイル状態をリセット
        setImageFiles([]);
        // フォームをリセット
        setRecordForm({
            studentId: selectedStudent?.id || '',
            studentName: selectedStudent?.name || '',
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
            writingStep: '',
            writingType: [],
            typingComment: '',
            curriculumComment: '',
            nextClassRange: '',
            instructor: '',
            images: []
        });
    };

    const handleFormChange = async (field, value) => {
        setRecordForm({ ...recordForm, [field]: value });

        // 生徒選択時
        if (field === 'studentName') {
            const student = students.find(s => s.name === value);
            if (student) {
                try {
                    // 前回のタイピング結果を取得（編集中の場合は現在のレコードを除外）
                    const lastTypingResult = await getLastTypingResult(student.id, editingRecord?.id);
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

    // 簡単なID生成関数
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    // 画像ファイルアップロード処理
    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = {
                        id: generateId(),
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        dataUrl: e.target.result
                    };
                    
                    setRecordForm(prev => ({
                        ...prev,
                        images: [...prev.images, imageData]
                    }));
                    
                    setImageFiles(prev => [...prev, file]);
                };
                reader.readAsDataURL(file);
            }
        });
        
        // 入力をクリア
        event.target.value = '';
    };

    // 画像削除処理
    const handleImageRemove = (imageId) => {
        const imageIndex = recordForm.images.findIndex(img => img.id === imageId);
        
        setRecordForm(prev => ({
            ...prev,
            images: prev.images.filter(img => img.id !== imageId)
        }));
        
        if (imageIndex !== -1) {
            setImageFiles(prev => prev.filter((_, index) => index !== imageIndex));
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

            // 書き取り結果を後方互換性のため文字列にも変換
            const writingResult = formatWritingResultForDisplay({
                writingStep: recordForm.writingStep,
                writingType: recordForm.writingType
            });

            // 日付をローカル時間として保存（JST維持）
            const [year, month, day] = recordForm.date.split('-');
            const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

            // コメントを統合（後方互換性のため）
            const combinedComment = [
                recordForm.typingComment && `【タイピング】\n${recordForm.typingComment}`,
                recordForm.curriculumComment && `【カリキュラム】\n${recordForm.curriculumComment}`
            ].filter(Boolean).join('\n\n');

            const recordData = {
                ...recordForm,
                comment: combinedComment, // 後方互換性のため統合コメントも保存
                typingResult: typingResult,
                writingResult: writingResult, // 後方互換性のため
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
                    
                    // 成果物画像がある場合は一括アップロード
                    if (record.images && record.images.length > 0) {
                        // 画像データからBlobを再作成
                        const imageFiles = await Promise.all(
                            record.images.map(async (image) => {
                                const response = await fetch(image.dataUrl);
                                return response.blob();
                            })
                        );
                        
                        const uploadResult = await uploadEvaluationAndResultImages(
                            imageBlob, 
                            imageFiles, 
                            record.images, 
                            record
                        );
                        
                        let message = '評価シート画像を生成し、Google Driveにアップロードしました';
                        
                        if (uploadResult.resultImages) {
                            const { successCount, totalFiles } = uploadResult.resultImages;
                            message += `\n成果物画像: ${successCount}/${totalFiles}枚アップロード完了`;
                        }
                        
                        if (uploadResult.errors.length > 0) {
                            message += `\n一部エラー: ${uploadResult.errors.join(', ')}`;
                        }
                        
                        message += `\nパス: ${uploadResult.evaluation?.uploadPath || '生徒管理フォルダ'}`;
                        
                        showSnackbar(message, uploadResult.errors.length > 0 ? 'warning' : 'success');
                    } else {
                        // 成果物画像がない場合は評価シートのみ
                        const uploadResult = await uploadEvaluationSheet(imageBlob, record);
                        showSnackbar(
                            `評価シート画像を生成し、Google Driveにアップロードしました\nパス: ${uploadResult.uploadPath || '生徒管理フォルダ'}`,
                            'success'
                        );
                    }
                } catch (uploadError) {
                    console.error('Google Drive アップロードエラー:', uploadError);
                    showSnackbar('画像生成は完了しましたが、Google Driveアップロードに失敗しました', 'warning');
                }
            } else {
                showSnackbar('評価シート画像を生成しました（Google Drive未連携）');
            }
        } catch (error) {
            console.error('画像生成エラー:', error);
            showSnackbar('画像生成に失敗しました', 'error');
        }
    };

    const handleTemplateClick = (template) => {
        setSelectedTemplate(template);
        setOpenTemplateDialog(false);
        setOpenTemplateTypeDialog(true);
    };

    const handleUseTemplate = (commentType) => {
        if (!selectedTemplate) return;
        
        const currentComment = commentType === 'typing' ? recordForm.typingComment : recordForm.curriculumComment;
        const newComment = currentComment
            ? `${currentComment}\n${selectedTemplate.text}`
            : selectedTemplate.text;

        const fieldName = commentType === 'typing' ? 'typingComment' : 'curriculumComment';
        handleFormChange(fieldName, newComment);
        setOpenTemplateTypeDialog(false);
        setSelectedTemplate(null);
    };

    const handleOpenDetail = (record) => {
        setDetailRecord(record);
        setOpenDetailDialog(true);
    };

    const handleCloseDetail = () => {
        setOpenDetailDialog(false);
        setDetailRecord(null);
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
                <Box>
                    <Typography variant="h4">
                        {selectedStudent ? `${selectedStudent.name}さんの授業記録` : '授業記録'}
                    </Typography>
                    {!selectedStudent && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            特定の生徒の統計情報を見るには、生徒管理から個別の授業記録にアクセスしてください
                        </Typography>
                    )}
                </Box>
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
                    value={selectedStudent ? tabValue : 0}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label="授業記録一覧" />
                    {selectedStudent && <Tab label="統計情報" />}
                </Tabs>
            </Paper>

            {/* 授業記録一覧 */}
            {tabValue === 0 && (
                <Grid container spacing={3}>
                    {classRecords.length > 0 ? (
                        classRecords.map((record) => (
                            <Grid item xs={12} md={6} lg={4} key={record.id}>
                                <Card 
                                    sx={{ 
                                        cursor: 'pointer',
                                        height: 350,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }} 
                                    onClick={() => handleOpenDetail(record)}
                                >
                                    <CardContent sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        height: '100%',
                                        pb: 1
                                    }}>
                                        {/* コンテンツエリア */}
                                        <Box sx={{ flexGrow: 1 }}>
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

                                        {(record.writingStep || record.writingType?.length > 0 || record.writingResult) && (
                                            <Typography variant="body2" color="text.secondary">
                                                書き取り: {formatWritingResultForDisplay(record)}
                                            </Typography>
                                        )}

                                        {(record.typingComment || record.curriculumComment || record.comment) && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {(() => {
                                                    const comments = [];
                                                    if (record.typingComment) {
                                                        comments.push(`【T】${record.typingComment}`);
                                                    }
                                                    if (record.curriculumComment) {
                                                        comments.push(`【C】${record.curriculumComment}`);
                                                    }
                                                    
                                                    let displayText = comments.length > 0 
                                                        ? comments.join(' ') 
                                                        : record.comment || '';
                                                    
                                                    return displayText.length > 60
                                                        ? `${displayText.substring(0, 60)}...`
                                                        : displayText;
                                                })()}
                                            </Typography>
                                        )}

                                        {record.nextClassRange && (
                                            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                                次回: {record.nextClassRange}
                                            </Typography>
                                        )}

                                        {record.images && record.images.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    成果物画像 ({record.images.length}枚)
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
                                                    {record.images.slice(0, 3).map((image) => (
                                                        <Box
                                                            key={image.id}
                                                            sx={{
                                                                flexShrink: 0,
                                                                width: 60,
                                                                height: 60,
                                                                borderRadius: 1,
                                                                overflow: 'hidden',
                                                                border: '1px solid #e0e0e0'
                                                            }}
                                                        >
                                                            <img
                                                                src={image.dataUrl}
                                                                alt={image.name}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover'
                                                                }}
                                                            />
                                                        </Box>
                                                    ))}
                                                    {record.images.length > 3 && (
                                                        <Box
                                                            sx={{
                                                                flexShrink: 0,
                                                                width: 60,
                                                                height: 60,
                                                                borderRadius: 1,
                                                                border: '1px solid #e0e0e0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: '#f5f5f5'
                                                            }}
                                                        >
                                                            <Typography variant="caption">
                                                                +{record.images.length - 3}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                        </Box>

                                        {/* 操作ボタンエリア */}
                                        <Box display="flex" justifyContent="space-between" mt={2}>
                                            <Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDialog(record);
                                                    }}
                                                    title="編集"
                                                >
                                                    <Edit />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(record);
                                                    }}
                                                    title="削除"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Box>
                                            <Button
                                                size="small"
                                                startIcon={<ImageIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleGenerateImage(record);
                                                }}
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
            {tabValue === 1 && (() => {
                const stats = processStatisticsData(classRecords);

                // タイピング推移グラフのデータ準備
                const createTypingChartData = () => {
                    const basicData = stats.typingProgressData.filter(d => d.type === 'basic' && d.charCount !== null);
                    const advancedData = stats.typingProgressData.filter(d => d.type === 'advanced' && d.value > 0);

                    return {
                        basic: {
                            labels: basicData.map(d => d.date),
                            datasets: [{
                                label: '入力文字数',
                                data: basicData.map(d => d.charCount),
                                borderColor: 'rgb(75, 192, 192)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                tension: 0.1,
                                fill: true
                            }]
                        },
                        advanced: {
                            labels: advancedData.map(d => d.date),
                            datasets: [{
                                label: '評価レベル（平均）',
                                data: advancedData.map(d => d.value),
                                borderColor: 'rgb(255, 99, 132)',
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                tension: 0.1,
                                fill: true
                            }]
                        }
                    };
                };

                // 書き取り統計のグラフデータ
                const writingChartData = {
                    labels: ['STEP1', 'STEP2', 'STEP3'],
                    datasets: [{
                        label: '実施回数',
                        data: [
                            stats.writingStats.step1 || 0,
                            stats.writingStats.step2 || 0,
                            stats.writingStats.step3 || 0
                        ],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(75, 192, 192, 0.5)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                };

                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                };

                const typingChartData = createTypingChartData();

                return (
                    <Grid container spacing={3}>
                        {/* 概要統計 */}
                        <Grid item xs={12}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                            <Typography variant="h4" color="primary">
                                                {stats.totalRecords}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                総授業回数
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Analytics sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                            <Typography variant="h4" color="success.main">
                                                {stats.monthRecords}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                今月の授業
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                            <Typography variant="h4" color="warning.main">
                                                {stats.weekRecords}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                今週の授業
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card>
                                        <CardContent sx={{ textAlign: 'center' }}>
                                            <Timeline sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                            <Typography variant="h4" color="info.main">
                                                {stats.uniqueGrades.length}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                取り組み級数
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* タイピング推移グラフ */}
                        {typingChartData.basic.labels.length > 0 && (
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BarChart />
                                            タイピング推移（基本級全体）
                                        </Typography>
                                        <Box sx={{ height: 300 }}>
                                            <Line data={typingChartData.basic} options={chartOptions} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* 基本級の級別推移グラフ */}
                        {Object.keys(stats.basicGradeData).map(grade => {
                            const gradeData = stats.basicGradeData[grade];

                            if (gradeData.length === 0) return null;

                            // 日付でソート
                            const sortedData = [...gradeData].sort((a, b) => new Date(a.date) - new Date(b.date));

                            const charCountData = {
                                labels: sortedData.map(d => d.date),
                                datasets: [
                                    {
                                        label: '入力文字数',
                                        data: sortedData.map(d => d.charCount),
                                        borderColor: 'rgb(54, 162, 235)',
                                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                        tension: 0.1,
                                        fill: true,
                                        yAxisID: 'y'
                                    },
                                    {
                                        label: '正タイプ率(%)',
                                        data: sortedData.map(d => d.accuracy),
                                        borderColor: 'rgb(255, 99, 132)',
                                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                        tension: 0.1,
                                        fill: false,
                                        yAxisID: 'y1'
                                    }
                                ].filter(dataset => dataset.data.some(d => d !== null))
                            };

                            return (
                                <Grid item xs={12} md={6} key={`basic-${grade}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Timeline />
                                                {grade}の推移
                                            </Typography>
                                            <Box sx={{ height: 300 }}>
                                                <Line data={charCountData} options={{
                                                    responsive: true,
                                                    maintainAspectRatio: false,
                                                    interaction: {
                                                        mode: 'index',
                                                        intersect: false,
                                                    },
                                                    plugins: {
                                                        legend: {
                                                            position: 'top',
                                                        },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: function (context) {
                                                                    if (context.dataset.label === '正タイプ率(%)') {
                                                                        return `${context.dataset.label}: ${context.parsed.y}%`;
                                                                    }
                                                                    return `${context.dataset.label}: ${context.parsed.y}文字`;
                                                                }
                                                            }
                                                        }
                                                    },
                                                    scales: {
                                                        x: {
                                                            display: true,
                                                            title: {
                                                                display: true,
                                                                text: '日付'
                                                            }
                                                        },
                                                        y: {
                                                            type: 'linear',
                                                            display: true,
                                                            position: 'left',
                                                            title: {
                                                                display: true,
                                                                text: '入力文字数'
                                                            },
                                                            beginAtZero: true
                                                        },
                                                        y1: {
                                                            type: 'linear',
                                                            display: true,
                                                            position: 'right',
                                                            title: {
                                                                display: true,
                                                                text: '正タイプ率(%)'
                                                            },
                                                            min: 0,
                                                            max: 100,
                                                            grid: {
                                                                drawOnChartArea: false,
                                                            },
                                                        }
                                                    }
                                                }} />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}

                        {/* 上級タイピング推移 */}
                        {typingChartData.advanced.labels.length > 0 && (
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Timeline />
                                            タイピング推移（上級平均）
                                        </Typography>
                                        <Box sx={{ height: 300 }}>
                                            <Line data={typingChartData.advanced} options={{
                                                ...chartOptions,
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        max: 18,
                                                        ticks: {
                                                            callback: function (value) {
                                                                const levels = ['', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S', 'Good', 'Fast'];
                                                                return levels[value] || value;
                                                            }
                                                        }
                                                    }
                                                }
                                            }} />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* テーマ別推移グラフ */}
                        {Object.keys(stats.themeProgressData).length > 0 && (
                            <Grid item xs={12}>
                                <Card>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Timeline />
                                                テーマ別推移
                                            </Typography>
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <InputLabel>級を選択</InputLabel>
                                                <Select
                                                    value={selectedThemeGrade}
                                                    label="級を選択"
                                                    onChange={(e) => setSelectedThemeGrade(e.target.value)}
                                                >
                                                    <MenuItem value="">級を選択</MenuItem>
                                                    {Object.keys(stats.themeProgressData)
                                                        .sort((a, b) => {
                                                            // 級を数値でソート（9級, 8級, 7級...の順）
                                                            const gradeA = parseInt(a.replace('級', ''));
                                                            const gradeB = parseInt(b.replace('級', ''));
                                                            return gradeB - gradeA;
                                                        })
                                                        .map(grade => (
                                                            <MenuItem key={grade} value={grade}>
                                                                {grade}
                                                            </MenuItem>
                                                        ))
                                                    }
                                                </Select>
                                            </FormControl>
                                        </Box>

                                        {selectedThemeGrade && (() => {
                                            const gradeThemes = stats.themeProgressData[selectedThemeGrade];

                                            if (!gradeThemes || Object.keys(gradeThemes).length === 0) {
                                                return (
                                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                                        {selectedThemeGrade}のデータがありません
                                                    </Typography>
                                                );
                                            }

                                            // テーマごとのデータセットを作成
                                            const allDates = new Set();
                                            Object.values(gradeThemes).forEach(themeData => {
                                                themeData.forEach(entry => allDates.add(entry.date));
                                            });
                                            const sortedDates = Array.from(allDates).sort();

                                            const colors = [
                                                'rgb(255, 99, 132)',   // 赤
                                                'rgb(54, 162, 235)',   // 青
                                                'rgb(255, 205, 86)',   // 黄
                                                'rgb(75, 192, 192)',   // 緑
                                                'rgb(153, 102, 255)',  // 紫
                                                'rgb(255, 159, 64)',   // オレンジ
                                                'rgb(199, 199, 199)',  // グレー
                                                'rgb(83, 102, 255)'    // インディゴ
                                            ];

                                            const datasets = Object.keys(gradeThemes).map((themeName, index) => {
                                                const themeData = gradeThemes[themeName];
                                                const color = colors[index % colors.length];

                                                // 日付順にデータを整理
                                                const dataPoints = sortedDates.map(date => {
                                                    const entry = themeData.find(d => d.date === date);
                                                    return entry ? entry.value : null;
                                                });

                                                return {
                                                    label: themeName,
                                                    data: dataPoints,
                                                    borderColor: color,
                                                    backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
                                                    tension: 0.1,
                                                    connectNulls: false
                                                };
                                            });

                                            const themeChartData = {
                                                labels: sortedDates,
                                                datasets
                                            };

                                            return (
                                                <Box sx={{ height: 400 }}>
                                                    <Line data={themeChartData} options={{
                                                        ...chartOptions,
                                                        interaction: {
                                                            mode: 'index',
                                                            intersect: false,
                                                        },
                                                        plugins: {
                                                            legend: {
                                                                position: 'top',
                                                            },
                                                            tooltip: {
                                                                callbacks: {
                                                                    label: function (context) {
                                                                        const levels = ['', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S', 'Good', 'Fast'];
                                                                        const levelName = levels[context.parsed.y] || context.parsed.y;
                                                                        return `${context.dataset.label}: ${levelName}`;
                                                                    }
                                                                }
                                                            }
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                max: 18,
                                                                ticks: {
                                                                    callback: function (value) {
                                                                        const levels = ['', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S', 'Good', 'Fast'];
                                                                        return levels[value] || value;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }} />
                                                </Box>
                                            );
                                        })()}

                                        {!selectedThemeGrade && (
                                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                                上記のドロップダウンから級を選択してください
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {/* 書き取り統計 */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BarChart />
                                        書き取りSTEP別実施回数
                                    </Typography>
                                    <Box sx={{ height: 300 }}>
                                        <Bar data={writingChartData} options={chartOptions} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 最近の記録 */}
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        最近の記録
                                    </Typography>
                                    <List dense>
                                        {stats.latestRecords.slice(0, 5).map((record, index) => (
                                            <ListItem key={index}>
                                                <ListItemText
                                                    primary={`${format(parseISO(record.date), 'MM/dd', { locale: safeJaLocale })} - ${record.classRange}`}
                                                    secondary={formatTypingResult(record.typingResult)}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* 詳細統計 */}
                        <Grid item xs={12}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        詳細統計
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                過去3ヶ月の授業回数
                                            </Typography>
                                            <Typography variant="h6">
                                                {stats.threeMonthRecords}回
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                タイピング記録のある授業
                                            </Typography>
                                            <Typography variant="h6">
                                                {stats.typingProgressData.length}回
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                取り組んだ級
                                            </Typography>
                                            <Typography variant="body2">
                                                {stats.uniqueGrades.join(', ') || '記録なし'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                );
            })()}

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
                                                    {mentor.name}
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
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>書き取りSTEP</InputLabel>
                                    <Select
                                        value={recordForm.writingStep}
                                        label="書き取りSTEP"
                                        onChange={(e) => handleFormChange('writingStep', e.target.value)}
                                    >
                                        <MenuItem value="">選択してください</MenuItem>
                                        <MenuItem value="1">STEP1</MenuItem>
                                        <MenuItem value="2">STEP2</MenuItem>
                                        <MenuItem value="3">STEP3</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" sx={{ mb: 1 }}>書き取り種類</Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={recordForm.writingType.includes('練習')}
                                                    onChange={(e) => {
                                                        const newTypes = e.target.checked
                                                            ? [...recordForm.writingType, '練習']
                                                            : recordForm.writingType.filter(type => type !== '練習');
                                                        handleFormChange('writingType', newTypes);
                                                    }}
                                                />
                                            }
                                            label="練習"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={recordForm.writingType.includes('テスト')}
                                                    onChange={(e) => {
                                                        const newTypes = e.target.checked
                                                            ? [...recordForm.writingType, 'テスト']
                                                            : recordForm.writingType.filter(type => type !== 'テスト');
                                                        handleFormChange('writingType', newTypes);
                                                    }}
                                                />
                                            }
                                            label="テスト"
                                        />
                                    </Box>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TextField
                                        fullWidth
                                        label="タイピングについてのコメント"
                                        value={recordForm.typingComment}
                                        onChange={(e) => handleFormChange('typingComment', e.target.value)}
                                        margin="normal"
                                        multiline
                                        rows={3}
                                        placeholder="タイピングの成果、課題、次回への改善点など"
                                    />
                                    <IconButton
                                        onClick={() => setOpenTemplateDialog(true)}
                                        title="テンプレートを使用"
                                    >
                                        <Template />
                                    </IconButton>
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TextField
                                        fullWidth
                                        label="カリキュラムについてのコメント"
                                        value={recordForm.curriculumComment}
                                        onChange={(e) => handleFormChange('curriculumComment', e.target.value)}
                                        margin="normal"
                                        multiline
                                        rows={3}
                                        placeholder="授業の理解度、進捗、次回の予定など"
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
                            <Grid item xs={12}>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ImageIcon />
                                        成果物画像
                                    </Typography>
                                    <input
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        id="image-upload-button"
                                        multiple
                                        type="file"
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="image-upload-button">
                                        <Button variant="outlined" component="span" startIcon={<CloudUpload />}>
                                            画像をアップロード
                                        </Button>
                                    </label>
                                    
                                    {recordForm.images.length > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                            <Grid container spacing={2}>
                                                {recordForm.images.map((image) => (
                                                    <Grid item xs={6} sm={4} md={3} key={image.id}>
                                                        <Card>
                                                            <Box sx={{ position: 'relative' }}>
                                                                <img
                                                                    src={image.dataUrl}
                                                                    alt={image.name}
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '120px',
                                                                        objectFit: 'cover'
                                                                    }}
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{
                                                                        position: 'absolute',
                                                                        top: 4,
                                                                        right: 4,
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(255, 255, 255, 0.9)'
                                                                        }
                                                                    }}
                                                                    onClick={() => handleImageRemove(image.id)}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                                                <Typography variant="caption" noWrap>
                                                                    {image.name}
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    )}
                                </Box>
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

            {/* コメント種類選択ダイアログ */}
            <Dialog open={openTemplateTypeDialog} onClose={() => setOpenTemplateTypeDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>コメントを追加する欄を選択</DialogTitle>
                <DialogContent>
                    {selectedTemplate && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                選択したテンプレート:
                            </Typography>
                            <Typography variant="body1" sx={{ p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                {selectedTemplate.text}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ flexDirection: 'column', gap: 1 }}>
                    <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleUseTemplate('typing')}
                        sx={{ mb: 1 }}
                    >
                        タイピングについてのコメント欄に追加
                    </Button>
                    <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => handleUseTemplate('curriculum')}
                        sx={{ mb: 1 }}
                    >
                        カリキュラムについてのコメント欄に追加
                    </Button>
                    <Button onClick={() => setOpenTemplateTypeDialog(false)}>キャンセル</Button>
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
                                        onClick={() => handleTemplateClick(template)}
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

            {/* 記録詳細ダイアログ */}
            <Dialog open={openDetailDialog} onClose={handleCloseDetail} maxWidth="md" fullWidth>
                <DialogTitle>
                    授業記録詳細
                </DialogTitle>
                <DialogContent>
                    {detailRecord && (
                        <Box sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        生徒名
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {detailRecord.studentName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        実施日
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {format(parseISO(detailRecord.date), 'yyyy年MM月dd日', { locale: safeJaLocale })}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        担当者
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {detailRecord.instructor || '記録なし'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        授業範囲
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {detailRecord.classRange}
                                    </Typography>
                                </Grid>
                                {detailRecord.typingResult && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            タイピング結果
                                        </Typography>
                                        <Typography variant="body1" sx={{ mb: 2 }}>
                                            {formatTypingResult(detailRecord.typingResult)}
                                        </Typography>
                                    </Grid>
                                )}
                                {(detailRecord.writingStep || detailRecord.writingType?.length > 0 || detailRecord.writingResult) && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            書き取り結果
                                        </Typography>
                                        <Typography variant="body1" sx={{ mb: 2 }}>
                                            {formatWritingResultForDisplay(detailRecord)}
                                        </Typography>
                                    </Grid>
                                )}
                                {(detailRecord.typingComment || detailRecord.curriculumComment || detailRecord.comment) && (
                                    <Grid item xs={12}>
                                        {detailRecord.typingComment && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    タイピングについてのコメント
                                                </Typography>
                                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                                    {detailRecord.typingComment}
                                                </Typography>
                                            </Box>
                                        )}
                                        {detailRecord.curriculumComment && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    カリキュラムについてのコメント
                                                </Typography>
                                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                                    {detailRecord.curriculumComment}
                                                </Typography>
                                            </Box>
                                        )}
                                        {!detailRecord.typingComment && !detailRecord.curriculumComment && detailRecord.comment && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    コメント
                                                </Typography>
                                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                                    {detailRecord.comment}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Grid>
                                )}
                                {detailRecord.nextClassRange && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            次回の授業範囲
                                        </Typography>
                                        <Typography variant="body1" sx={{ mb: 2 }}>
                                            {detailRecord.nextClassRange}
                                        </Typography>
                                    </Grid>
                                )}
                                {detailRecord.images && detailRecord.images.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                            成果物画像 ({detailRecord.images.length}枚)
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {detailRecord.images.map((image) => (
                                                <Grid item xs={6} sm={4} md={3} key={image.id}>
                                                    <Card>
                                                        <img
                                                            src={image.dataUrl}
                                                            alt={image.name}
                                                            style={{
                                                                width: '100%',
                                                                height: '200px',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                                                            <Typography variant="caption" noWrap>
                                                                {image.name}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetail}>閉じる</Button>
                    {detailRecord && (
                        <Button
                            variant="contained"
                            startIcon={<ImageIcon />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateImage(detailRecord);
                            }}
                        >
                            画像生成
                        </Button>
                    )}
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