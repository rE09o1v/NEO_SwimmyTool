// ローカルストレージベースのデータサービス
// 実際のプロダクションではバックエンドAPIに置き換える

const STORAGE_KEYS = {
    STUDENTS: 'swimmy_students',
    CLASS_RECORDS: 'swimmy_class_records',
    TEMPLATES: 'swimmy_comment_templates',
    MENTORS: 'swimmy_mentors'
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
                { name: '田中太郎', age: 10, course: 'スクラッチプログラミング', googleDriveFolder: '生徒管理/田中太郎' },
                { name: '佐藤花子', age: 12, course: 'ロボットプログラミング', googleDriveFolder: '生徒管理/佐藤花子' },
                { name: '鈴木一郎', age: 8, course: 'スクラッチプログラミング', googleDriveFolder: '生徒管理/鈴木一郎' }
            ];

            const createdStudents = [];
            for (const student of demoStudents) {
                const createdStudent = await addStudent(student);
                createdStudents.push(createdStudent);
            }

            console.log('デモ生徒データを作成しました');

            // デモ授業記録データ
            const classRecords = await getClassRecords();
            if (classRecords.length === 0) {
                const currentDate = new Date();
                const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                const twoWeeksAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);

                const demoRecords = [
                    {
                        studentId: createdStudents[0].id,
                        studentName: createdStudents[0].name,
                        date: currentDate.toISOString(),
                        classRange: 'スプライトの動きとイベント',
                        typingResult: '35文字/分、正確率92%',
                        writingResult: '基本操作 8/10問正解',
                        comment: '今日も集中して取り組むことができました。キーボード操作にも慣れてきています。',
                        nextClassRange: 'ゲーム制作の基礎',
                        instructor: 'メンター田中'
                    },
                    {
                        studentId: createdStudents[1].id,
                        studentName: createdStudents[1].name,
                        date: oneWeekAgo.toISOString(),
                        classRange: 'センサーを使ったプログラミング',
                        typingResult: '42文字/分、正確率95%',
                        writingResult: '応用問題 9/10問正解',
                        comment: 'センサーの概念をしっかりと理解できています。論理的思考力が向上しています。',
                        nextClassRange: 'ロボットの自動制御',
                        instructor: 'スタッフ佐藤'
                    },
                    {
                        studentId: createdStudents[2].id,
                        studentName: createdStudents[2].name,
                        date: twoWeeksAgo.toISOString(),
                        classRange: 'キャラクターの基本動作',
                        typingResult: '28文字/分、正確率88%',
                        writingResult: '基本操作 7/10問正解',
                        comment: 'もう少しゆっくりと丁寧に進めましょう。基本操作の復習が必要です。',
                        nextClassRange: 'イベントとメッセージ',
                        instructor: 'メンター田中'
                    }
                ];

                for (const record of demoRecords) {
                    await addClassRecord(record);
                }

                console.log('デモ授業記録データを作成しました');
            }
        }
        // デモメンターデータの初期化
        const mentors = await getMentors();
        if (mentors.length === 0) {
            const demoMentors = [
                {
                    name: 'メンター田中',
                    email: 'tanaka@example.com',
                    speciality: 'スクラッチプログラミング',
                    status: 'active',
                    joinDate: '2024-01-15'
                },
                {
                    name: 'スタッフ佐藤',
                    email: 'sato@example.com',
                    speciality: 'ロボットプログラミング',
                    status: 'active',
                    joinDate: '2024-02-01'
                },
                {
                    name: 'メンター鈴木',
                    email: 'suzuki@example.com',
                    speciality: 'Pythonプログラミング',
                    status: 'active',
                    joinDate: '2024-03-10'
                }
            ];

            for (const mentor of demoMentors) {
                await addMentor(mentor);
            }

            console.log('デモメンターデータを作成しました');
        }
    } catch (error) {
        console.error('デモデータの初期化に失敗しました:', error);
    }
};

// メンター管理機能
export const getMentors = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const mentors = getFromStorage(STORAGE_KEYS.MENTORS);
            resolve(mentors);
        }, 100);
    });
};

export const getMentor = async (id) => {
    const mentors = await getMentors();
    return mentors.find(mentor => mentor.id === id);
};

export const addMentor = async (mentorData) => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const mentors = await getMentors();
                
                // 重複チェック
                const existingMentor = mentors.find(m => m.email === mentorData.email);
                if (existingMentor) {
                    reject(new Error('このメールアドレスは既に登録されています'));
                    return;
                }

                const newMentor = {
                    id: generateId(),
                    ...mentorData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    status: 'active'
                };

                mentors.push(newMentor);
                saveToStorage(STORAGE_KEYS.MENTORS, mentors);
                resolve(newMentor);
            } catch (error) {
                reject(error);
            }
        }, 100);
    });
};

export const updateMentor = async (id, mentorData) => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const mentors = await getMentors();
                const index = mentors.findIndex(mentor => mentor.id === id);
                
                if (index === -1) {
                    reject(new Error('メンターが見つかりません'));
                    return;
                }

                // メールアドレスの重複チェック（自分以外）
                if (mentorData.email) {
                    const existingMentor = mentors.find(m => m.email === mentorData.email && m.id !== id);
                    if (existingMentor) {
                        reject(new Error('このメールアドレスは既に登録されています'));
                        return;
                    }
                }

                mentors[index] = {
                    ...mentors[index],
                    ...mentorData,
                    updatedAt: new Date().toISOString()
                };

                saveToStorage(STORAGE_KEYS.MENTORS, mentors);
                resolve(mentors[index]);
            } catch (error) {
                reject(error);
            }
        }, 100);
    });
};

export const deleteMentor = async (id) => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const mentors = await getMentors();
                const index = mentors.findIndex(mentor => mentor.id === id);
                
                if (index === -1) {
                    reject(new Error('メンターが見つかりません'));
                    return;
                }

                mentors.splice(index, 1);
                saveToStorage(STORAGE_KEYS.MENTORS, mentors);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        }, 100);
    });
};

export const searchMentors = async (query) => {
    const mentors = await getMentors();
    return mentors.filter(mentor => 
        mentor.name.toLowerCase().includes(query.toLowerCase()) ||
        mentor.email.toLowerCase().includes(query.toLowerCase()) ||
        mentor.speciality.toLowerCase().includes(query.toLowerCase())
    );
}; 