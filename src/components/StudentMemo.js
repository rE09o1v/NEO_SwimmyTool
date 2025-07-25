import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Chip,
    Fab,
    Paper,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Save,
    Cancel,
    StickyNote2
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { safeJaLocale } from '../services/localeSetup';
import {
    getStudentMemos,
    addStudentMemo,
    updateStudentMemo,
    deleteStudentMemo,
    getMentors
} from '../services/dataService';

const StudentMemo = ({ studentId, studentName, open, onClose }) => {
    const [memos, setMemos] = useState([]);
    const [editingMemo, setEditingMemo] = useState(null);
    const [memoText, setMemoText] = useState('');
    const [selectedMentor, setSelectedMentor] = useState('');
    const [mentors, setMentors] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && studentId) {
            loadMemos();
            loadMentors();
        }
    }, [open, studentId]);

    const loadMemos = async () => {
        setLoading(true);
        try {
            const memosData = await getStudentMemos(studentId);
            setMemos(memosData);
        } catch (error) {
            console.error('メモの読み込みに失敗しました:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMentors = async () => {
        try {
            const mentorsData = await getMentors();
            setMentors(mentorsData);
        } catch (error) {
            console.error('メンターの読み込みに失敗しました:', error);
        }
    };

    const handleCreateMemo = () => {
        setIsCreating(true);
        setMemoText('');
        setSelectedMentor('');
        setEditingMemo(null);
    };

    const handleEditMemo = (memo) => {
        setEditingMemo(memo.id);
        setMemoText(memo.content);
        setSelectedMentor(memo.createdBy || '');
        setIsCreating(false);
    };

    const handleSaveMemo = async () => {
        if (!memoText.trim() || !selectedMentor) return;

        setLoading(true);
        try {
            if (isCreating) {
                await addStudentMemo({
                    studentId,
                    content: memoText.trim(),
                    createdBy: selectedMentor
                });
            } else if (editingMemo) {
                await updateStudentMemo(editingMemo, {
                    content: memoText.trim(),
                    createdBy: selectedMentor
                });
            }
            
            setMemoText('');
            setSelectedMentor('');
            setEditingMemo(null);
            setIsCreating(false);
            await loadMemos();
        } catch (error) {
            console.error('メモの保存に失敗しました:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMemo = async (memoId) => {
        if (!window.confirm('このメモを削除しますか？')) return;

        setLoading(true);
        try {
            await deleteStudentMemo(memoId);
            await loadMemos();
        } catch (error) {
            console.error('メモの削除に失敗しました:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setMemoText('');
        setSelectedMentor('');
        setEditingMemo(null);
        setIsCreating(false);
    };

    const formatDate = (dateString) => {
        try {
            return format(parseISO(dateString), 'yyyy/MM/dd HH:mm', { locale: safeJaLocale });
        } catch (error) {
            return dateString;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '600px' }
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <StickyNote2 color="primary" />
                    <Typography variant="h6">
                        {studentName}さんのメモ
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                {/* 新規作成ボタン（上部） */}
                {!isCreating && !editingMemo && (
                    <Box mb={2}>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleCreateMemo}
                            disabled={loading}
                            color="primary"
                        >
                            新規メモ作成
                        </Button>
                    </Box>
                )}

                {/* 新規作成・編集フォーム */}
                {(isCreating || editingMemo) && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>作成者（メンター）</InputLabel>
                            <Select
                                value={selectedMentor}
                                onChange={(e) => setSelectedMentor(e.target.value)}
                                label="作成者（メンター）"
                            >
                                {mentors.map((mentor) => (
                                    <MenuItem key={mentor.id} value={mentor.name || `${mentor.lastName} ${mentor.firstName}`}>
                                        {mentor.name || `${mentor.lastName} ${mentor.firstName}`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="メモを入力してください..."
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                        <Box display="flex" gap={1} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                startIcon={<Cancel />}
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                キャンセル
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveMemo}
                                disabled={loading || !memoText.trim() || !selectedMentor}
                            >
                                保存
                            </Button>
                        </Box>
                    </Paper>
                )}

                {/* メモ一覧 */}
                {memos.length > 0 ? (
                    <List>
                        {memos.map((memo, index) => (
                            <React.Fragment key={memo.id}>
                                <ListItem
                                    alignItems="flex-start"
                                    sx={{
                                        bgcolor: editingMemo === memo.id ? 'action.selected' : 'transparent',
                                        borderRadius: 1,
                                        mb: 1
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box>
                                                <Typography
                                                    variant="body1"
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        lineHeight: 1.6,
                                                        mb: 1
                                                    }}
                                                >
                                                    {memo.content}
                                                </Typography>
                                                <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                                    {memo.createdBy && (
                                                        <Chip
                                                            label={`作成者: ${memo.createdBy}`}
                                                            size="small"
                                                            variant="filled"
                                                            color="default"
                                                        />
                                                    )}
                                                    <Chip
                                                        label={`作成: ${formatDate(memo.createdAt)}`}
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                    />
                                                    {memo.updatedAt !== memo.createdAt && (
                                                        <Chip
                                                            label={`更新: ${formatDate(memo.updatedAt)}`}
                                                            size="small"
                                                            variant="outlined"
                                                            color="secondary"
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleEditMemo(memo)}
                                            disabled={loading || isCreating || editingMemo}
                                            sx={{ mr: 1 }}
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleDeleteMemo(memo.id)}
                                            disabled={loading}
                                            color="error"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {index < memos.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                ) : (
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        py={4}
                    >
                        <StickyNote2 sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="textSecondary" gutterBottom>
                            まだメモがありません
                        </Typography>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                            上の「新規メモ作成」ボタンから最初のメモを作成してください
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudentMemo;