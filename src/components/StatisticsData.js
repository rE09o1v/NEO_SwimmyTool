import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    List,
    ListItem,
    ListItemText,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp,
    Analytics,
    Timeline,
    Assignment,
    BarChart,
    KeyboardArrowLeft,
    Refresh
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
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
    getStudents,
    getClassRecords
} from '../services/dataService';

// Chart.jsの設定
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

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

// 上級タイピングの平均レベル計算
const calculateAverageLevel = (advancedData) => {
    if (!advancedData || advancedData.length === 0) return 0;
    
    const validLevels = advancedData
        .map(item => getLevelValue(item.evaluation || item.level))
        .filter(level => level > 0);

    if (validLevels.length === 0) return 0;
    return Math.round(validLevels.reduce((sum, level) => sum + level, 0) / validLevels.length);
};

// タイピング結果をフォーマットする関数
const formatTypingResult = (typingResult) => {
    if (!typingResult) return '記録なし';
    
    try {
        const parsed = JSON.parse(typingResult);
        if (parsed.grade) {
            if (['12級', '11級', '10級'].includes(parsed.grade)) {
                const charCount = parsed.data?.basicData?.charCount;
                const accuracy = parsed.data?.basicData?.accuracy;
                return `${parsed.grade} - ${charCount || '0'}文字 ${accuracy || '0%'}`;
            } else {
                const advancedData = parsed.data?.advancedData || [];
                if (advancedData.length > 0) {
                    const themes = advancedData.map(d => d.theme).join(', ');
                    return `${parsed.grade} - ${themes}`;
                }
                return parsed.grade;
            }
        }
        return typingResult;
    } catch (error) {
        return '記録なし';
    }
};

// 統計データを処理する関数（ClassRecordから完全移植）
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

function StatisticsData() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [classRecords, setClassRecords] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [selectedThemeGrade, setSelectedThemeGrade] = useState('');

    useEffect(() => {
        loadData();
    }, [studentId]);

    useEffect(() => {
        if (selectedStudent) {
            loadStudentStatistics();
        }
    }, [selectedStudent]);

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            const studentsData = await getStudents();
            setStudents(studentsData);

            if (studentId) {
                const student = studentsData.find(s => s.id === studentId);
                if (student) {
                    setSelectedStudent(student);
                } else {
                    setError('指定された生徒が見つかりません');
                }
            }
        } catch (err) {
            setError('データの読み込みに失敗しました: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStudentStatistics = async () => {
        if (!selectedStudent) return;

        try {
            setLoading(true);
            const records = await getClassRecords();
            const studentRecords = records.filter(r => r.studentId === selectedStudent.id);
            
            setClassRecords(studentRecords);
            const stats = processStatisticsData(studentRecords);
            setStatistics(stats);
        } catch (err) {
            setError('統計データの読み込みに失敗しました: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
        navigate(`/statistics-data/${student.id}`);
    };

    const handleBack = () => {
        setSelectedStudent(null);
        navigate('/statistics-data');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!selectedStudent) {
        // 生徒一覧表示
        return (
            <Box>
                <Box display="flex" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1" flexGrow={1}>
                        統計データ
                    </Typography>
                    <Button
                        startIcon={<Refresh />}
                        onClick={loadData}
                        variant="outlined"
                    >
                        更新
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    生徒を選択してください
                                </Typography>
                                <List>
                                    {students.map((student, index) => (
                                        <ListItem
                                            key={student.id}
                                            button
                                            onClick={() => handleStudentSelect(student)}
                                            divider={index < students.length - 1}
                                        >
                                            <ListItemText
                                                primary={student.name}
                                                secondary={`${student.age}歳 - ${student.course}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    // 統計データ表示（ClassRecordと全く同じ内容）
    if (!statistics) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    // タイピング推移グラフのデータ準備
    const createTypingChartData = () => {
        const basicData = statistics.typingProgressData.filter(d => d.type === 'basic' && d.charCount !== null);
        const advancedData = statistics.typingProgressData.filter(d => d.type === 'advanced' && d.value > 0);

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
                statistics.writingStats.step1 || 0,
                statistics.writingStats.step2 || 0,
                statistics.writingStats.step3 || 0
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
        <Box>
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton onClick={handleBack} sx={{ mr: 1 }}>
                    <KeyboardArrowLeft />
                </IconButton>
                <Typography variant="h4" component="h1" flexGrow={1}>
                    {selectedStudent.name}の統計データ
                </Typography>
                <Button
                    startIcon={<Refresh />}
                    onClick={loadData}
                    variant="outlined"
                >
                    更新
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* 概要統計 */}
                <Grid item xs={12}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="h4" color="primary">
                                        {statistics.totalRecords}
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
                                        {statistics.monthRecords}
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
                                        {statistics.weekRecords}
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
                                        {statistics.uniqueGrades.length}
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
                {Object.keys(statistics.basicGradeData).map(grade => {
                    const gradeData = statistics.basicGradeData[grade];

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
                {Object.keys(statistics.themeProgressData).length > 0 && (
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
                                            {Object.keys(statistics.themeProgressData)
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
                                    const gradeThemes = statistics.themeProgressData[selectedThemeGrade];

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
                                {statistics.latestRecords.slice(0, 5).map((record, index) => (
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
                                        {statistics.threeMonthRecords}回
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary">
                                        タイピング記録のある授業
                                    </Typography>
                                    <Typography variant="h6">
                                        {statistics.typingProgressData.length}回
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary">
                                        取り組んだ級
                                    </Typography>
                                    <Typography variant="body2">
                                        {statistics.uniqueGrades.join(', ') || '記録なし'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default StatisticsData;