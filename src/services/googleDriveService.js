// Google Drive API連携サービス
// 注意: 実際のプロダクションでは、適切なOAuth 2.0フローと環境変数管理が必要です

// Google Drive API設定（デモ用）
const GOOGLE_DRIVE_CONFIG = {
    // 実際の実装では環境変数から取得
    CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-client-id',
    API_KEY: process.env.REACT_APP_GOOGLE_API_KEY || 'your-api-key',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

let gapi = null;
let isGapiLoaded = false;
let isGisLoaded = false;
let tokenClient = null;

// Google API初期化
export const initializeGoogleDrive = async () => {
    return new Promise((resolve, reject) => {
        // Google APIスクリプトが既に読み込まれているかチェック
        if (window.gapi && window.google) {
            loadGoogleAPI().then(resolve).catch(reject);
            return;
        }

        // Google APIスクリプトを動的に読み込み
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
            isGapiLoaded = true;
            checkAndInit().then(resolve).catch(reject);
        };
        gapiScript.onerror = () => reject(new Error('Google API script load failed'));

        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
            isGisLoaded = true;
            checkAndInit().then(resolve).catch(reject);
        };
        gisScript.onerror = () => reject(new Error('Google Identity Services script load failed'));

        document.head.appendChild(gapiScript);
        document.head.appendChild(gisScript);
    });
};

const checkAndInit = async () => {
    if (isGapiLoaded && isGisLoaded) {
        await loadGoogleAPI();
    }
};

const loadGoogleAPI = async () => {
    try {
        gapi = window.gapi;

        await new Promise((resolve, reject) => {
            gapi.load('client', { callback: resolve, onerror: reject });
        });

        await gapi.client.init({
            apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
            discoveryDocs: [GOOGLE_DRIVE_CONFIG.DISCOVERY_DOC],
        });

        // トークンクライアント初期化
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
            scope: GOOGLE_DRIVE_CONFIG.SCOPES,
            callback: '', // 実際の実装でコールバックを設定
        });

        console.log('Google Drive API初期化完了');
    } catch (error) {
        console.error('Google Drive API初期化エラー:', error);
        throw error;
    }
};

// 認証状態チェック
export const isAuthenticated = () => {
    if (!gapi || !gapi.client || !gapi.client.getToken) {
        return false;
    }
    const token = gapi.client.getToken();
    return token && token.access_token;
};

// Google Drive認証
export const authenticateGoogleDrive = () => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error('Google Drive API が初期化されていません'));
            return;
        }

        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(new Error(`認証エラー: ${resp.error}`));
                return;
            }
            resolve(resp);
        };

        // 既存のトークンがあるかチェック
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

// フォルダを作成または取得
export const createOrGetFolder = async (folderName, parentFolderId = null) => {
    try {
        if (!isAuthenticated()) {
            throw new Error('Google Drive認証が必要です');
        }

        // フォルダが既に存在するかチェック
        const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const searchParams = parentFolderId
            ? `${searchQuery} and '${parentFolderId}' in parents`
            : searchQuery;

        const searchResponse = await gapi.client.drive.files.list({
            q: searchParams,
            fields: 'files(id, name)'
        });

        if (searchResponse.result.files.length > 0) {
            return searchResponse.result.files[0];
        }

        // フォルダが存在しない場合は作成
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };

        if (parentFolderId) {
            folderMetadata.parents = [parentFolderId];
        }

        const createResponse = await gapi.client.drive.files.create({
            resource: folderMetadata,
            fields: 'id, name'
        });

        return createResponse.result;
    } catch (error) {
        console.error('フォルダ作成エラー:', error);
        throw error;
    }
};

// ファイルアップロード
export const uploadFile = async (fileBlob, fileName, folderId = null) => {
    try {
        if (!isAuthenticated()) {
            throw new Error('Google Drive認証が必要です');
        }

        const metadata = {
            name: fileName
        };

        if (folderId) {
            metadata.parents = [folderId];
        }

        // FormDataでマルチパートアップロード
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', fileBlob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`アップロードエラー: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('ファイルアップロードエラー:', error);
        throw error;
    }
};

// 評価シート画像をGoogle Driveにアップロード
export const uploadEvaluationSheet = async (imageBlob, classRecord) => {
    try {
        const fileName = `評価シート_${classRecord.studentName}_${new Date(classRecord.date).toISOString().slice(0, 10)}.png`;

        // 生徒フォルダを取得または作成
        let studentFolder = null;
        if (classRecord.studentFolder || classRecord.googleDriveFolder) {
            const folderPath = classRecord.studentFolder || classRecord.googleDriveFolder;

            // フォルダパスを解析して階層フォルダを作成
            const folderNames = folderPath.split('/').filter(name => name.trim() !== '');
            let currentParentId = null;

            for (const folderName of folderNames) {
                const folder = await createOrGetFolder(folderName, currentParentId);
                currentParentId = folder.id;
            }

            studentFolder = { id: currentParentId };
        }

        // ファイルアップロード
        const uploadResult = await uploadFile(
            imageBlob,
            fileName,
            studentFolder?.id
        );

        return {
            fileId: uploadResult.id,
            fileName: uploadResult.name,
            webViewLink: `https://drive.google.com/file/d/${uploadResult.id}/view`
        };
    } catch (error) {
        console.error('評価シートアップロードエラー:', error);
        throw error;
    }
};

// 複数ファイルの一括アップロード
export const uploadMultipleFiles = async (files) => {
    const results = [];

    for (const file of files) {
        try {
            const result = await uploadEvaluationSheet(file.blob, file.record);
            results.push({
                ...file,
                uploadResult: result,
                success: true
            });
        } catch (error) {
            results.push({
                ...file,
                error: error.message,
                success: false
            });
        }
    }

    return results;
};

// Google Drive認証状態をリセット
export const signOutGoogleDrive = () => {
    if (gapi && gapi.client) {
        const token = gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
    }
};

// デモ用のモック関数（実際のAPI呼び出しなし）
export const mockUploadEvaluationSheet = async (imageBlob, classRecord) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                fileId: `mock_${Date.now()}`,
                fileName: `評価シート_${classRecord.studentName}_${new Date(classRecord.date).toISOString().slice(0, 10)}.png`,
                webViewLink: `https://drive.google.com/file/d/mock_${Date.now()}/view`,
                message: 'デモモード: 実際のアップロードは行われていません'
            });
        }, 2000);
    });
}; 