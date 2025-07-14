// date-fns日本語ロケール設定
// このファイルで日本語ロケールの読み込みとエラーハンドリングを管理

let jaLocale = null;

// 日本語ロケールを非同期で読み込み
export const loadJaLocale = async () => {
    try {
        if (!jaLocale) {
            const localeModule = await import('date-fns/locale/ja');
            jaLocale = localeModule.ja;
        }
        return jaLocale;
    } catch (error) {
        console.warn('日本語ロケールの読み込みに失敗しました。デフォルトロケールを使用します。', error);
        return undefined;
    }
};

// 同期的に日本語ロケールを取得（ページ読み込み時の初期化用）
export const getJaLocale = () => {
    try {
        // 静的インポートを試行
        const { ja } = require('date-fns/locale');
        return ja;
    } catch (error) {
        console.warn('日本語ロケールが利用できません。デフォルトロケールを使用します。');
        return undefined;
    }
};

// 安全な日本語ロケール
export const safeJaLocale = getJaLocale(); 