# ⛑️ KY活動表 PWA — デプロイガイド

## 📁 ファイル構成

```
ky-app/
├── index.html          ← ログイン画面（PINコード入力）
├── app.html            ← KY活動入力アプリ本体
├── sw.js               ← Service Worker（オフライン対応）
├── manifest.json       ← PWAマニフェスト（ホーム画面追加用）
├── icon-192.png        ← アプリアイコン（192×192）
├── icon-512.png        ← アプリアイコン（512×512）
├── qr-print.html       ← QRコード生成・印刷ページ
└── google-apps-script.js ← Googleスプレッドシート連携スクリプト
```

---

## 🚀 STEP 1 — GitHub Pagesにデプロイ

### 1-1. GitHubアカウントを準備
- https://github.com でアカウント作成（無料）

### 1-2. リポジトリを作成
1. 「New repository」をクリック
2. Repository name: `ky-app`（任意）
3. Public を選択
4. 「Create repository」をクリック

### 1-3. ファイルをアップロード
1. 「uploading an existing file」をクリック
2. 上記の全ファイルをドラッグ&ドロップ
3. 「Commit changes」をクリック

### 1-4. GitHub Pagesを有効化
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. Save

### ✅ 数分後にURLが発行されます
```
https://あなたのユーザー名.github.io/ky-app/
```

---

## 📊 STEP 2 — Googleスプレッドシート連携

### 2-1. Googleスプレッドシートを作成
1. https://sheets.google.com で新規シートを作成
2. URLの `spreadsheets/d/` の後の文字列が **Spreadsheet ID**
   ```
   例: docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                      ↑ これがSpreadsheet ID
   ```

### 2-2. Apps Scriptをデプロイ
1. https://script.google.com → 新しいプロジェクト
2. `google-apps-script.js` の内容をコピー&ペースト
3. **SPREADSHEET_ID** を自分のIDに変更
4. 「デプロイ」→「新しいデプロイ」
   - 種類: ウェブアプリ
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
5. 「デプロイ」→ 表示されたURLをコピー

### 2-3. URLをapp.htmlに設定
`app.html` の先頭付近にある以下の行を編集：
```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
// ↓ 変更後
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

---

## 🔐 STEP 3 — 現場とPINを設定

### index.html の SITES を編集
```javascript
const SITES = [
  { id: 'site1', name: '林道南アルプス線（嘉助工区）', pin: '1234' },
  { id: 'site2', name: '○○工事 現場B',                pin: '5678' },
  // 追加する場合はここに記載
];
```

### qr-print.html の SITES_CONFIG も同じ内容に更新
```javascript
const SITES_CONFIG = [
  { id: 'site1', name: '林道南アルプス線（嘉助工区）', pin: '1234' },
  ...
];
```

⚠️ **PINは必ず変更してください！** デフォルトの1234は使わないこと。

---

## 📲 STEP 4 — QRコードを印刷して現場に貼る

1. `qr-print.html` をブラウザで開く
2. GitHub PagesのURLを入力
3. 「QRコードを生成する」をクリック
4. 「印刷する」でA4印刷 → 現場の掲示板や安全朝礼ボードに貼る

---

## 📱 STEP 5 — スマートフォンにインストール

### iPhone (Safari)
1. SafariでQRコードをスキャン
2. URLを開く
3. 画面下の **共有ボタン（□↑）** をタップ
4. **「ホーム画面に追加」** を選択
5. 「追加」をタップ → ホーム画面にアイコンが表示される

### Android (Chrome)
1. ChromeでQRコードをスキャン
2. URLを開く
3. 画面下部に **「アプリをインストール」** バナーが表示される
4. タップしてインストール
   （または メニュー → 「ホーム画面に追加」）

---

## 🔄 オフライン動作について

| 状況 | 動作 |
|------|------|
| オンライン | 記録 → 即時Googleスプレッドシートに送信 |
| オフライン | 記録 → 端末に保存、オンライン復帰時に自動送信 |
| 初回オフライン | 最初の1回はオンラインでアクセス必要（キャッシュのため） |

---

## 📂 Googleスプレッドシートの列構成

| 列 | 内容 |
|----|------|
| A | 提出日時（自動） |
| B | 日付 |
| C | 曜日 |
| D | 現場名 |
| E | 会社名 |
| F | リーダー |
| G | 確認者 |
| H | 作業内容 |
| I | ワンポイント |
| J-O | 危険ポイント①（点・重篤度・可能性・危険度・対策・再評価） |
| P-U | 危険ポイント② |
| V-AA | 危険ポイント③ |
| AB-AE | 体調確認4項目 |
| AF-AO | 参加者①〜⑩ |

---

## ❓ トラブルシューティング

**QRコードをスキャンしてもアプリが開かない**
→ GitHub PagesのURLが正しいか確認。有効化まで数分かかる場合あり。

**Googleスプレッドシートに送信されない**
→ Apps ScriptのURLが正しく設定されているか確認。
→ デプロイ時に「アクセス: 全員」になっているか確認。

**オフラインで動かない**
→ 最初にオンラインで一度アクセスしてキャッシュを作成する必要あり。
→ iOSはSafari以外ではPWAのオフライン機能が制限される。

**PINを忘れた**
→ index.html の SITES 配列を直接確認・変更してGitHubに再アップロード。
