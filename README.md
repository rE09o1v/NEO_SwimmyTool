# 生徒管理システム (NEO SwimmyTool)

プログラミング教室向けの生徒管理および授業記録システムです。授業記録の作成から評価シート画像の生成、Google Driveへの自動アップロードまでを一元管理できます。

## 機能概要

### 主要機能
- **ログイン認証** - IDとパスワードによる安全なアクセス制御
- **生徒管理** - 生徒情報の登録、編集、削除、検索
- **授業記録管理** - 統一フォームでの授業記録作成・編集
- **評価シート画像生成** - 授業記録から自動的に評価シート画像を生成
- **Google Drive連携** - 評価シート画像の自動アップロード
- **コメント入力支援** - 定型文テンプレートと過去コメント引用機能

### 対応デバイス
- デスクトップブラウザ (Chrome, Edge, Safari最新版)
- タブレット・スマートフォン (レスポンシブデザイン対応)

## 技術スタック

- **フロントエンド**: React 18, Material-UI
- **状態管理**: React Hooks (useState, useEffect)
- **ルーティング**: React Router v6
- **データ保存**: ローカルストレージ (デモ版)
- **画像生成**: HTML2Canvas
- **API連携**: Google Drive API
- **日付処理**: date-fns
- **開発環境**: Create React App

## セットアップ

### 必要要件
- Node.js 16.x以上
- npm または yarn

### インストール手順

1. リポジトリのクローン
```bash
git clone <repository-url>
cd NEO_SwimmyTool
```

2. 依存関係のインストール
```bash
npm install
```

3. 環境変数の設定（Google Drive連携用）
```bash
# .env.local ファイルを作成
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_GOOGLE_API_KEY=your-google-api-key
```

4. アプリケーションの起動
```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 使用方法

### 初回ログイン
デモ用のアカウントでログインできます：
- **メンター**: `mentor1` / `password123`
- **スタッフ**: `staff1` / `password123`
- **管理者**: `admin` / `admin123`

### 基本的な使用フロー

1. **生徒登録**
   - 生徒管理画面から新規生徒を登録
   - 氏名、年齢、受講コース、Google Driveフォルダパスを入力

2. **授業記録作成**
   - 授業記録画面から新規記録を作成
   - 実施日、授業範囲、タイピング結果、書き取り結果、コメントを入力
   - コメントテンプレート機能で効率的に入力

3. **評価シート生成**
   - 作成した授業記録から「画像生成」ボタンをクリック
   - 統一レイアウトの評価シート画像が自動生成・ダウンロード

4. **Google Drive連携**
   - Google Drive認証後、評価シート画像が自動的に指定フォルダにアップロード

## プロジェクト構造

```
src/
├── components/           # Reactコンポーネント
│   ├── Login.js         # ログイン画面
│   ├── Dashboard.js     # ダッシュボード
│   ├── StudentManagement.js  # 生徒管理
│   ├── ClassRecord.js   # 授業記録
│   └── Navbar.js        # ナビゲーション
├── services/            # API・サービス層
│   ├── dataService.js   # データ管理サービス
│   ├── imageService.js  # 画像生成サービス
│   └── googleDriveService.js  # Google Drive連携
├── App.js              # メインアプリケーション
└── index.js            # エントリーポイント
```

## 開発情報

### デモデータ
初回起動時に以下のデモデータが自動作成されます：
- サンプル生徒3名
- コメントテンプレート
- 授業記録サンプル

### ローカルストレージキー
- `swimmy_students` - 生徒データ
- `swimmy_class_records` - 授業記録データ
- `swimmy_comment_templates` - コメントテンプレート

### Google Drive API設定
本格運用時には以下の設定が必要です：
1. Google Cloud Consoleでプロジェクト作成
2. Drive API有効化
3. OAuth 2.0認証情報の作成
4. 環境変数の設定

## カスタマイズ

### 評価シートレイアウト
`src/services/imageService.js` の `createEvaluationSheetHtml` 関数を編集することで、評価シートのレイアウトをカスタマイズできます。

### コメントテンプレート
`src/services/dataService.js` の初期テンプレートデータを編集することで、デフォルトのコメントテンプレートを変更できます。

## トラブルシューティング

### よくある問題

**Q: 画像生成が失敗する**
A: ブラウザのキャンバス制限やメモリ不足が原因の可能性があります。ページをリロードして再試行してください。

**Q: Google Drive連携が機能しない**
A: API認証情報の設定を確認してください。デモモードでは実際のアップロードは行われません。

**Q: データが消える**
A: ローカルストレージを使用しているため、ブラウザデータの削除時にデータが失われます。本格運用時はバックエンドDBの実装を推奨します。

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## サポート

技術的な質問や機能要望については、プロジェクトのIssuesまでお寄せください。 