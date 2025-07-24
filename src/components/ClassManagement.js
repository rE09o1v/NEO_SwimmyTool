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
    searchClasses,
    getCurricula,
    addCurriculum,
    updateCurriculum,
    deleteCurriculum
} from '../services/dataService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ClassManagement = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [openCurriculumDialog, setOpenCurriculumDialog] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classForm, setClassForm] = useState({
        name: '',
        description: '',
        order: ''
    });
    const [curricula, setCurricula] = useState([]);
    const [curriculumForm, setCurriculumForm] = useState({
        title: '',
        description: '',
        order: ''
    });
    const [editingCurriculum, setEditingCurriculum] = useState(null);
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

    const loadCurricula = async (classId) => {
        try {
            const data = await getCurricula(classId);
            setCurricula(data);
        } catch (error) {
            showSnackbar('カリキュラムデータの読み込みに失敗しました', 'error');
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

    const handleOpenCurriculumDialog = (classItem, curriculum = null) => {
        setSelectedClass(classItem);
        if (curriculum) {
            setEditingCurriculum(curriculum);
            setCurriculumForm({
                title: curriculum.title,
                description: curriculum.description || '',
                order: curriculum.order ? curriculum.order.toString() : ''
            });
        } else {
            setEditingCurriculum({}); // 新規追加時は空のオブジェクト
            setCurriculumForm({
                title: '',
                description: '',
                order: ''
            });
        }
        setOpenCurriculumDialog(true);
    };

    const handleDeleteCurriculum = async (curriculumItem) => {
        if (window.confirm(`${curriculumItem.title}を削除してもよろしいですか？\n\n※この操作は取り消せません。`)) {
            try {
                await deleteCurriculum(curriculumItem.id);
                showSnackbar('カリキュラムを削除しました');
                if (selectedClass) {
                    loadCurricula(selectedClass.id);
                }
            } catch (error) {
                showSnackbar('カリキュラムの削除に失敗しました', 'error');
            }
        }
    };

    const handleCurriculumSubmit = async () => {
        if (!curriculumForm.title) {
            showSnackbar('カリキュラム名は必須項目です', 'error');
            return;
        }
        try {
            const curriculumData = {
                classId: selectedClass.id,
                title: curriculumForm.title,
                description: curriculumForm.description,
                order: curriculumForm.order ? parseInt(curriculumForm.order) : curricula.length + 1
            };
            if (editingCurriculum && editingCurriculum.id) {
                await updateCurriculum(editingCurriculum.id, curriculumData);
                showSnackbar('カリキュラム情報を更新しました');
            } else {
                await addCurriculum(curriculumData);
                showSnackbar('新しいカリキュラムを追加しました');
            }
            handleCloseCurriculumDialog();
            if (selectedClass) {
                loadCurricula(selectedClass.id);
            }
        } catch (error) {
            showSnackbar(error.message || 'カリキュラム情報の保存に失敗しました', 'error');
        }
    };

    const handleCloseCurriculumDialog = () => {
        setOpenCurriculumDialog(false);
        setSelectedClass(null);
        setEditingCurriculum(null);
        setCurriculumForm({
            title: '',
            description: '',
            order: ''
        });
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

    const handleClassDragEnd = async (result) => {
        if (!result.destination) return;
        
        const items = Array.from(classes);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Update the order property of each class item
        const updatedItems = items.map((item, index) => ({
            ...item,
            order: index + 1
        }));
        
        setClasses(updatedItems);
        
        // Update the order in the backend
        try {
            for (const item of updatedItems) {
                await updateClass(item.id, { order: item.order });
            }
            showSnackbar('クラスの順序を更新しました');
        } catch (error) {
            showSnackbar('クラスの順序更新に失敗しました', 'error');
        }
    };

    const handleCurriculumDragEnd = async (result) => {
        if (!result.destination) return;
        
        const items = Array.from(curricula);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Update the order property of each curriculum item
        const updatedItems = items.map((item, index) => ({
            ...item,
            order: index + 1
        }));
        
        setCurricula(updatedItems);
        
        // Update the order in the backend
        try {
            for (const item of updatedItems) {
                await updateCurriculum(item.id, { order: item.order });
            }
            showSnackbar('カリキュラムの順序を更新しました');
        } catch (error) {
            showSnackbar('カリキュラムの順序更新に失敗しました', 'error');
        }
    };

    const handleCurriculumFormChange = (field, value) => {
        setCurriculumForm(prev => ({
            ...prev,
            [field]: value
        }));
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

            {/* 検索時の注意メッセージ */}
            {searchQuery && classes.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    検索中は順序の変更はできません。順序を変更したい場合は検索をクリアしてください。
                </Alert>
            )}

            {/* クラス一覧テーブル */}
            {classes.length > 0 ? (
                searchQuery ? (
                    // 検索中はドラッグ&ドロップを無効化
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
                                                disabled
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
                                                onClick={() => {
                                                    setSelectedClass(classItem);
                                                    loadCurricula(classItem.id);
                                                    setOpenCurriculumDialog(true);
                                                }}
                                                title="カリキュラム管理"
                                            >
                                                <ClassIcon />
                                            </IconButton>
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
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    // 通常表示時はドラッグ&ドロップ有効
                    <DragDropContext onDragEnd={handleClassDragEnd}>
                        <Droppable droppableId="classes">
                            {(provided) => (
                            <TableContainer component={Paper} {...provided.droppableProps} ref={provided.innerRef}>
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
                                        {classes.map((classItem, index) => (
                                            <Draggable key={classItem.id} draggableId={classItem.id.toString()} index={index}>
                                                {(provided) => (
                                                    <TableRow 
                                                        ref={provided.innerRef} 
                                                        {...provided.draggableProps} 
                                                        hover
                                                    >
                                                        <TableCell {...provided.dragHandleProps}>
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
                                                                onClick={() => {
                                                                    setSelectedClass(classItem);
                                                                    loadCurricula(classItem.id);
                                                                    setOpenCurriculumDialog(true);
                                                                }}
                                                                title="カリキュラム管理"
                                                            >
                                                                <ClassIcon />
                                                            </IconButton>
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
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Droppable>
                </DragDropContext>
                )
            ) : (
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
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        {searchQuery ? '検索結果がありません' : 'クラスが登録されていません'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* カリキュラム管理ダイアログ */}
            <Dialog 
                open={openCurriculumDialog} 
                onClose={handleCloseCurriculumDialog} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>
                    {selectedClass ? `${selectedClass.name} - カリキュラム管理` : 'カリキュラム管理'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 3 }}>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => handleOpenCurriculumDialog(selectedClass, null)}
                            sx={{ mb: 2 }}
                        >
                            新規カリキュラム追加
                        </Button>
                        
                        {curricula.length > 0 ? (
                            <DragDropContext onDragEnd={handleCurriculumDragEnd}>
                                <Droppable droppableId="curricula">
                                    {(provided) => (
                                        <TableContainer component={Paper} {...provided.droppableProps} ref={provided.innerRef}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>順序</TableCell>
                                                        <TableCell>カリキュラム名</TableCell>
                                                        <TableCell>説明</TableCell>
                                                        <TableCell align="center">操作</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {curricula.map((curriculum, index) => (
                                                        <Draggable key={curriculum.id} draggableId={curriculum.id.toString()} index={index}>
                                                            {(provided) => (
                                                                <TableRow 
                                                                    ref={provided.innerRef} 
                                                                    {...provided.draggableProps} 
                                                                    hover
                                                                >
                                                                    <TableCell {...provided.dragHandleProps}>
                                                                        <Chip
                                                                            icon={<DragHandle />}
                                                                            label={curriculum.order || '-'}
                                                                            size="small"
                                                                            variant="outlined"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                                            {curriculum.title}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {curriculum.description || '-'}
                                                                    </TableCell>
                                                                    <TableCell align="center">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleOpenCurriculumDialog(selectedClass, curriculum)}
                                                                            title="編集"
                                                                        >
                                                                            <Edit />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => handleDeleteCurriculum(curriculum)}
                                                                            title="削除"
                                                                        >
                                                                            <Delete />
                                                                        </IconButton>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        ) : (
                            <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                                カリキュラムが登録されていません
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCurriculumDialog}>閉じる</Button>
                </DialogActions>
            </Dialog>

            {/* カリキュラム登録・編集ダイアログ */}
            <Dialog open={!!editingCurriculum} onClose={handleCloseCurriculumDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingCurriculum && editingCurriculum.id ? 'カリキュラム編集' : '新規カリキュラム追加'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="カリキュラム名"
                                fullWidth
                                required
                                value={curriculumForm.title}
                                onChange={(e) => handleCurriculumFormChange('title', e.target.value)}
                                placeholder="例: 基礎プログラミング、Scratch入門"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="説明"
                                fullWidth
                                value={curriculumForm.description}
                                onChange={(e) => handleCurriculumFormChange('description', e.target.value)}
                                placeholder="カリキュラムの詳細説明..."
                                multiline
                                rows={3}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="表示順序"
                                type="number"
                                fullWidth
                                value={curriculumForm.order}
                                onChange={(e) => handleCurriculumFormChange('order', e.target.value)}
                                placeholder="例: 1, 2, 3..."
                                helperText="小さい数値ほど上位に表示されます"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCurriculumDialog}>キャンセル</Button>
                    <Button onClick={handleCurriculumSubmit} variant="contained">
                        {editingCurriculum && editingCurriculum.id ? '更新' : '追加'}
                    </Button>
                </DialogActions>
            </Dialog>

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