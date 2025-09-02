# 📚 GitHub Pagesで無料公開する完全ガイド（初心者向け）

## 準備するもの
- GitHubアカウント（無料）
- 公開したいHTMLファイル（BucksBoxai-Websiteフォルダ）

---

## 📝 ステップ1: GitHubアカウント作成

1. **GitHub公式サイトにアクセス**
   - https://github.com にアクセス
   - 右上の「Sign up」をクリック

2. **アカウント情報入力**
   - Username（ユーザー名）: 半角英数字で入力
   - Email: メールアドレス
   - Password: パスワード
   - 無料プランを選択

---

## 📁 ステップ2: リポジトリ作成

1. **新規リポジトリ作成**
   - ログイン後、右上の「+」→「New repository」をクリック

2. **リポジトリ設定**
   ```
   Repository name: bucksbox-website
   Description: BucksBox.ai Official Website
   Public: ✅ 選択（必須）
   Initialize with README: ✅ チェック
   ```
   - 「Create repository」をクリック

---

## ⬆️ ステップ3: ファイルをアップロード

1. **ファイルアップロード画面へ**
   - リポジトリページで「Add file」→「Upload files」をクリック

2. **ファイルをドラッグ&ドロップ**
   - BucksBoxai-Websiteフォルダ内の全ファイルを選択
   - ドラッグ&ドロップでアップロード
   
3. **重要：メインファイル名を変更**
   ```
   bucksbox-homepage-revised (10).html → index.html
   ```
   - これが必須！トップページは必ず「index.html」

4. **コミット（保存）**
   - 下部の「Commit changes」をクリック

---

## ⚙️ ステップ4: GitHub Pages有効化

1. **Settings（設定）へ**
   - リポジトリページの「Settings」タブをクリック

2. **Pages設定**
   - 左メニューから「Pages」を選択
   - Source: 「Deploy from a branch」
   - Branch: 「main」を選択
   - Folder: 「/ (root)」を選択
   - 「Save」をクリック

3. **公開URL確認**
   - 数分待つと上部に公開URLが表示
   ```
   https://あなたのユーザー名.github.io/bucksbox-website/
   ```

---

## ✅ ステップ5: 動作確認

1. **PCで確認**
   - 公開URLにアクセス
   - 全ページが表示されるか確認

2. **スマホで確認**
   - スマホのブラウザで公開URLにアクセス
   - リンクが正常に動作するか確認

---

## 🔧 トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| **404エラー** | 5-10分待つ（反映に時間がかかる） |
| **ページが表示されない** | index.htmlの名前を確認 |
| **リンクが動かない** | ファイル名の大文字小文字を確認 |

---

## 📌 重要な注意点

1. **必ずPublicリポジトリ**
   - 無料版はPublicのみ対応
   - 誰でも見られる状態になります

2. **index.htmlは必須**
   - トップページは必ず「index.html」という名前に

3. **更新方法**
   - ファイルを変更したら「Upload files」で上書き
   - 自動的に反映されます

---

## 🎉 完成！

これで世界中からアクセス可能なWebサイトが完成です！
スマホでもPCでも、すべてのリンクが正常に動作します。

**質問があれば何でも聞いてください！**