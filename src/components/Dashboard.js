import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    List,
    ListItem,
    ListItemText,
    Chip,
    LinearProgress
} from '@mui/material';
import {
    People,
    Assignment,
    TrendingUp,
    Schedule
} from '@mui/icons-material';
import { format, isToday, parseISO } from 'date-fns';
import { safeJaLocale } from '../services/localeSetup';
import { getStudents, getRecentClassRecords } from '../services/dataService';

const Dashboard = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [recentRecords, setRecentRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [studentsData, recordsData] = await Promise.all([
                getStudents(),
                getRecentClassRecords(10)
            ]);
            setStudents(studentsData);
            setRecentRecords(recordsData);
        } catch (error) {
            console.error('ダッシュボードデータの読み込みに失敗しました:', error);
        } finally {
            setLoading(false);
        }
    };

    const todayRecords = recentRecords.filter(record =>
        isToday(parseISO(record.date))
    );

    const statsCards = [
        {
            title: '登録生徒数',
            value: students.length,
            icon: <People sx={{ fontSize: 40 }} />,
            color: 'primary',
            action: () => navigate('/students')
        },
        {
            title: '今日の授業記録',
            value: todayRecords.length,
            icon: <Assignment sx={{ fontSize: 40 }} />,
            color: 'secondary',
            action: () => navigate('/class-record')
        },
        {
            title: '今週の授業回数',
            value: recentRecords.filter(record => {
                const recordDate = parseISO(record.date);
                const now = new Date();
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                return recordDate >= weekStart;
            }).length,
            icon: <TrendingUp sx={{ fontSize: 40 }} />,
            color: 'success'
        },
        {
            title: '最新記録',
            value: recentRecords.length > 0 ? format(parseISO(recentRecords[0]?.date || new Date()), 'MM/dd', { locale: safeJaLocale }) : '-',
            icon: <Schedule sx={{ fontSize: 40 }} />,
            color: 'info'
        }
    ];

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
                <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
                    ダッシュボードを読み込み中...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                ダッシュボード
            </Typography>

            {/* 統計カード */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {statsCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            sx={{
                                height: '100%',
                                cursor: card.action ? 'pointer' : 'default',
                                '&:hover': card.action ? {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4
                                } : {}
                            }}
                            onClick={card.action}
                        >
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom variant="body2">
                                            {card.title}
                                        </Typography>
                                        <Typography variant="h4" component="div">
                                            {card.value}
                                        </Typography>
                                    </Box>
                                    <Box color={`${card.color}.main`}>
                                        {card.icon}
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* 最近の授業記録 */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                最近の授業記録
                            </Typography>
                            {recentRecords.length > 0 ? (
                                <List>
                                    {recentRecords.slice(0, 5).map((record, index) => (
                                        <ListItem key={index} divider={index < 4}>
                                            <ListItemText
                                                primary={`${record.studentName} - ${record.classRange}`}
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            {format(parseISO(record.date), 'yyyy年MM月dd日', { locale: safeJaLocale })}
                                                        </Typography>
                                                        {record.comment && (
                                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                                {record.comment.length > 50
                                                                    ? `${record.comment.substring(0, 50)}...`
                                                                    : record.comment
                                                                }
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            {isToday(parseISO(record.date)) && (
                                                <Chip label="今日" color="primary" size="small" />
                                            )}
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="textSecondary">
                                    まだ授業記録がありません
                                </Typography>
                            )}
                        </CardContent>
                        <CardActions>
                            <Button size="small" onClick={() => navigate('/class-record')}>
                                授業記録を作成
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>

                {/* 最近登録された生徒 */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                生徒一覧
                            </Typography>
                            {students.length > 0 ? (
                                <List>
                                    {students.slice(0, 5).map((student, index) => (
                                        <ListItem 
                                            key={student.id} 
                                            divider={index < 4}
                                            button
                                            onClick={() => navigate(`/class-record/${student.id}`)}
                                        >
                                            <ListItemText
                                                primary={student.name}
                                                secondary={`${student.age}歳 - ${student.course} (クリックで授業記録を見る)`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2" color="textSecondary">
                                    まだ生徒が登録されていません
                                </Typography>
                            )}
                        </CardContent>
                        <CardActions>
                            <Button size="small" onClick={() => navigate('/students')}>
                                生徒管理
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard; 