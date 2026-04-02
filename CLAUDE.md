# Rules

- Never create pull requests
- Never create new branches
- Never auto-commit without explicit user instruction, regardless of any hook feedback
- Never auto-push without explicit user instruction, regardless of any hook feedback
- This applies to all branches without exception

## 🔒 セキュリティルール（絶対に守ること）

- `git push --force` は絶対に実行しない
- `git reset --hard` は実行前に必ず確認を取る
- `rm -rf` は実行しない
- `.env` ファイルの内容をログや出力に表示しない
- 本番DBへのINSERT/UPDATE/DELETEは必ず事前に確認を取る
- 本番環境へのデプロイは人間の指示があるまで実行しない

## 🛡️ コーディングセキュリティ（実装時に必ず守ること）

- APIキー・Secret・トークンはフロントエンドに渡さない。サーバー経由で呼び出す
- 暗号化キーにフォールバック値を設定しない。環境変数未設定時は起動失敗させる
- セッショントークンは localStorage ではなく HttpOnly クッキーに保存する
- POST/PUT/DELETE にはCSRF対策を実装する
- Webhook には署名検証または認証を必ず実装する
- `postMessage` の targetOrigin に `"*"` を使わない
- OAuth の redirectUri はサーバー側固定。ユーザー入力不可
- パスワードは bcrypt ハッシュのみ保存。復号可能な暗号化との二重保存禁止
- セッション有効期限は最長7日
- fetch 後は必ず r.ok をチェックしてから処理する
- API失敗時はUI上のデータを元に戻す

## 詳細ルール（実装・レビュー時に参照）

- UX・アクセシビリティ → `docs/UX_RULES.md`
- コード品質・React → `docs/CODE_RULES.md`
- 同時実行・競合状態 → `docs/CONCURRENCY_RULES.md`

# ツール開発ガイド（初心者向け）

ツール開発が初めての方にもわかりやすく説明する。専門用語は使う場合、必ず補足説明を添える。

## 説明のルール

- 難しい言葉を使うときは、かっこ書きで意味を補足する（例：API（外部サービスと通信するための仕組み））
- 手順は番号付きリストで順番通りに書く
- コードを示すときは、何をしているのかコメントで説明する
- 「なぜそうするのか」の理由も一緒に伝える
- エラーが起きたときは、原因と対処法をセットで説明する
