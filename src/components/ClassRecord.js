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
    getLastTypingResult,
    getClasses,
    getCurricula
} from '../services/dataService';
import { generateEvaluationSheet } from '../services/imageService';
import { uploadEvaluationSheet, uploadEvaluationAndResultImages, isAuthenticated as isGoogleAuthenticated } from '../services/googleDriveService';


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
    const [classes, setClasses] = useState([]);
    const [curricula, setCurricula] = useState([]);
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
        classId: '', // クラス選択
        curriculumId: '', // カリキュラム選択
        classRange: '', // 従来の授業範囲（後方互換性のため）
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


    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, templatesData, mentorsData, classesData] = await Promise.all([
                getStudents(),
                getCommentTemplates(),
                getMentors(),
                getClasses()
            ]);

            setStudents(studentsData);
            setCommentTemplates(templatesData);
            setMentors(mentorsData);
            setClasses(classesData);

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
                classId: record.classId || '', // 既存データ互換性のため
                curriculumId: record.curriculumId || '', // カリキュラム選択
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
            
            // 編集時にクラスが選択されている場合はカリキュラムデータを読み込み
            if (record.classId) {
                try {
                    const curriculaData = await getCurricula(record.classId);
                    setCurricula(curriculaData);
                } catch (error) {
                    console.error('カリキュラムデータの取得に失敗しました:', error);
                    setCurricula([]);
                }
            }
            
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
                classId: '',
                curriculumId: '',
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
            classId: '',
            curriculumId: '',
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

        // クラス選択時
        if (field === 'classId') {
            if (value) {
                try {
                    const curriculaData = await getCurricula(value);
                    setCurricula(curriculaData);
                    setRecordForm(prev => ({
                        ...prev,
                        curriculumId: '', // クラス変更時はカリキュラム選択をリセット
                        classRange: '' // 従来の実施範囲もリセット
                    }));
                } catch (error) {
                    console.error('カリキュラムデータの取得に失敗しました:', error);
                    setCurricula([]);
                }
            } else {
                setCurricula([]);
                setRecordForm(prev => ({
                    ...prev,
                    curriculumId: '',
                    classRange: ''
                }));
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
        if (!recordForm.studentId || !recordForm.classId || !recordForm.instructor) {
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
                                            {(() => {
                                                const classInfo = record.classId 
                                                    ? classes.find(c => c.id === record.classId)
                                                    : null;
                                                const className = classInfo ? classInfo.name : '';
                                                
                                                // カリキュラム情報を取得（将来的にカリキュラムデータも表示可能にするため）
                                                const curriculumInfo = record.curriculumId 
                                                    ? curricula.find(c => c.id === record.curriculumId)
                                                    : null;
                                                const curriculumName = curriculumInfo ? curriculumInfo.title : '';
                                                const range = record.classRange || '';
                                                
                                                let displayText = '';
                                                if (className) {
                                                    displayText = `クラス: ${className}`;
                                                    if (curriculumName) {
                                                        displayText += ` | カリキュラム: ${curriculumName}`;
                                                    }
                                                    if (range) {
                                                        displayText += ` | 範囲: ${range}`;
                                                    }
                                                } else if (range) {
                                                    displayText = `授業範囲: ${range}`;
                                                } else {
                                                    displayText = '授業範囲: 未設定';
                                                }
                                                
                                                return displayText;
                                            })()}
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
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal" required>
                                    <InputLabel>クラス *</InputLabel>
                                    <Select
                                        value={recordForm.classId}
                                        label="クラス *"
                                        onChange={(e) => handleFormChange('classId', e.target.value)}
                                    >
                                        <MenuItem value="">選択してください</MenuItem>
                                        {classes.map((classItem) => (
                                            <MenuItem key={classItem.id} value={classItem.id}>
                                                {classItem.name} {classItem.description && `(${classItem.description})`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>カリキュラム</InputLabel>
                                    <Select
                                        value={recordForm.curriculumId}
                                        label="カリキュラム"
                                        onChange={(e) => handleFormChange('curriculumId', e.target.value)}
                                        disabled={!recordForm.classId}
                                    >
                                        <MenuItem value="">選択してください</MenuItem>
                                        {curricula.map((curriculum) => (
                                            <MenuItem key={curriculum.id} value={curriculum.id}>
                                                {curriculum.title} {curriculum.description && `(${curriculum.description})`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {!recordForm.classId && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                            先にクラスを選択してください
                                        </Typography>
                                    )}
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="実施範囲"
                                    value={recordForm.classRange}
                                    onChange={(e) => handleFormChange('classRange', e.target.value)}
                                    margin="normal"
                                    placeholder="例: Unit 1-3, 基本操作（カリキュラム未選択時）"
                                    helperText="カリキュラムを選択した場合、この項目は補足情報として使用されます"
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
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        クラス
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {(() => {
                                            const classInfo = detailRecord.classId 
                                                ? classes.find(c => c.id === detailRecord.classId)
                                                : null;
                                            return classInfo ? classInfo.name : '未設定';
                                        })()}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        カリキュラム
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {(() => {
                                            const curriculumInfo = detailRecord.curriculumId 
                                                ? curricula.find(c => c.id === detailRecord.curriculumId)
                                                : null;
                                            return curriculumInfo ? curriculumInfo.title : '未選択';
                                        })()}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        実施範囲・補足
                                    </Typography>
                                    <Typography variant="body1" sx={{ mb: 2 }}>
                                        {detailRecord.classRange || '記録なし'}
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