// ローカルストレージベースのデータサービス
// 実際のプロダクションではバックエンドAPIに置き換える

const STORAGE_KEYS = {
    STUDENTS: 'swimmy_students',
    CLASS_RECORDS: 'swimmy_class_records',
    TEMPLATES: 'swimmy_comment_templates'
};

// ユーティリティ関数
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getFromStorage = (key) => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Storage read error for ${key}:`, error);
        return [];
    }
};

const saveToStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`Storage write error for ${key}:`, error);
        return false;
    }
};

// 生徒管理
export const getStudents = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const students = getFromStorage(STORAGE_KEYS.STUDENTS);
            resolve(students);
        }, 100);
    });
};

export const getStudent = async (id) => {
    const students = await getStudents();
    return students.find(student => student.id === id);
};

export const addStudent = async (studentData) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const students = getFromStorage(STORAGE_KEYS.STUDENTS);
                const newStudent = {
                    id: generateId(),
                    ...studentData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                students.push(newStudent);

                if (saveToStorage(STORAGE_KEYS.STUDENTS, students)) {
                    resolve(newStudent);
                } else {
                    reject(new Error('保存に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

export const updateStudent = async (id, studentData) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const students = getFromStorage(STORAGE_KEYS.STUDENTS);
                const index = students.findIndex(student => student.id === id);

                if (index === -1) {
                    reject(new Error('生徒が見つかりません'));
                    return;
                }

                students[index] = {
                    ...students[index],
                    ...studentData,
                    updatedAt: new Date().toISOString()
                };

                if (saveToStorage(STORAGE_KEYS.STUDENTS, students)) {
                    resolve(students[index]);
                } else {
                    reject(new Error('更新に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

export const deleteStudent = async (id) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const students = getFromStorage(STORAGE_KEYS.STUDENTS);
                const filteredStudents = students.filter(student => student.id !== id);

                if (saveToStorage(STORAGE_KEYS.STUDENTS, filteredStudents)) {
                    resolve(true);
                } else {
                    reject(new Error('削除に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

export const searchStudents = async (query) => {
    const students = await getStudents();
    return students.filter(student =>
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.course.toLowerCase().includes(query.toLowerCase())
    );
};

// 授業記録管理
export const getClassRecords = async (studentId = null) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let records = getFromStorage(STORAGE_KEYS.CLASS_RECORDS);

            if (studentId) {
                records = records.filter(record => record.studentId === studentId);
            }

            // 日付でソート（新しい順）
            records.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(records);
        }, 100);
    });
};

export const getRecentClassRecords = async (limit = 10) => {
    const records = await getClassRecords();
    return records.slice(0, limit);
};

export const addClassRecord = async (recordData) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const records = getFromStorage(STORAGE_KEYS.CLASS_RECORDS);
                const newRecord = {
                    id: generateId(),
                    ...recordData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                records.push(newRecord);

                if (saveToStorage(STORAGE_KEYS.CLASS_RECORDS, records)) {
                    resolve(newRecord);
                } else {
                    reject(new Error('保存に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

export const updateClassRecord = async (id, recordData) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const records = getFromStorage(STORAGE_KEYS.CLASS_RECORDS);
                const index = records.findIndex(record => record.id === id);

                if (index === -1) {
                    reject(new Error('記録が見つかりません'));
                    return;
                }

                records[index] = {
                    ...records[index],
                    ...recordData,
                    updatedAt: new Date().toISOString()
                };

                if (saveToStorage(STORAGE_KEYS.CLASS_RECORDS, records)) {
                    resolve(records[index]);
                } else {
                    reject(new Error('更新に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

export const deleteClassRecord = async (id) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const records = getFromStorage(STORAGE_KEYS.CLASS_RECORDS);
                const filteredRecords = records.filter(record => record.id !== id);

                if (saveToStorage(STORAGE_KEYS.CLASS_RECORDS, filteredRecords)) {
                    resolve(true);
                } else {
                    reject(new Error('削除に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

// コメントテンプレート管理
export const getCommentTemplates = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            let templates = getFromStorage(STORAGE_KEYS.TEMPLATES);

            // 初期テンプレートがない場合は作成
            if (templates.length === 0) {
                templates = [
                    { id: '1', category: '良い点', text: '今日も集中して取り組むことができました。' },
                    { id: '2', category: '良い点', text: 'タイピングの正確性が向上しています。' },
                    { id: '3', category: '良い点', text: '新しい概念をしっかりと理解できています。' },
                    { id: '4', category: '改善点', text: '基本操作の復習が必要です。' },
                    { id: '5', category: '改善点', text: 'もう少しゆっくりと丁寧に進めましょう。' },
                    { id: '6', category: '次回予定', text: '前回の続きから始めます。' },
                    { id: '7', category: '次回予定', text: '復習を中心に進める予定です。' }
                ];
                saveToStorage(STORAGE_KEYS.TEMPLATES, templates);
            }

            resolve(templates);
        }, 100);
    });
};

export const addCommentTemplate = async (templateData) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const templates = getFromStorage(STORAGE_KEYS.TEMPLATES);
                const newTemplate = {
                    id: generateId(),
                    ...templateData
                };
                templates.push(newTemplate);

                if (saveToStorage(STORAGE_KEYS.TEMPLATES, templates)) {
                    resolve(newTemplate);
                } else {
                    reject(new Error('保存に失敗しました'));
                }
            } catch (error) {
                reject(error);
            }
        }, 200);
    });
};

// 初期データの作成（デモ用）
export const initializeDemoData = async () => {
    try {
        const students = await getStudents();

        if (students.length === 0) {
            // デモ生徒データ
            const demoStudents = [
                { name: '田中太郎', age: 10, course: 'スクラッチプログラミング', googleDriveFolder: '/生徒フォルダ/田中太郎' },
                { name: '佐藤花子', age: 12, course: 'ロボットプログラミング', googleDriveFolder: '/生徒フォルダ/佐藤花子' },
                { name: '鈴木一郎', age: 8, course: 'スクラッチプログラミング', googleDriveFolder: '/生徒フォルダ/鈴木一郎' }
            ];

            for (const student of demoStudents) {
                await addStudent(student);
            }

            console.log('デモ生徒データを作成しました');
        }
    } catch (error) {
        console.error('デモデータの初期化に失敗しました:', error);
    }
}; 