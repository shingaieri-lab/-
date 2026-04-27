# Vercel セキュリティインシデント 対応記録

作成日：2026-04-27

---

## インシデント概要

2026年4月、Vercelの内部システムに不正アクセスが発生。原因はVercel自体ではなく、第三者AIツール「Context.ai」のGoogle Workspace OAuthアプリが侵害されたことによるもの。Vercelは「限定的な顧客に影響があった」と発表。npmパッケージ・サプライチェーンへの影響はなし（複数社で確認済み）。

**IOC（侵害の指標）：**
```
OAuth App ID: 110671459871-30f1spbu0hptbs60cb4vsmv79i7bbvqj.apps.googleusercontent.com
```

---

## 確認アカウント

- Vercelアカウント：`shingais-projects-60587bb7`
- プロジェクト：`is-kanri`（mokumoku-system）https://is-kanri.vercel.app

---

## 必須対応

### 1. IOC確認（最優先）

**対応内容：** Vercelダッシュボード → Integrations画面を開き、上記OAuth App IDが存在しないか目視確認。

**状態：** ✅ 対応完了（2026-04-27）— Integrations画面にてUpstash（Storage）のみ確認。不審なOAuthアプリなし。IOC該当なし。

---

### 2. KV_REST_API_TOKEN / KV_REST_API_READ_ONLY_TOKEN のローテーション

**理由：** フルアクセストークンが漏洩すると、KV上の全データ（アカウント情報・セッション・Zohoトークン等）が読み書きされる可能性がある。

**対応手順：**
1. Upstashコンソール（https://console.upstash.com）にログイン
2. `fleet-mastodon-77221` データベースを選択
3. 「REST API」タブでトークンを再発行
4. Vercel環境変数（`KV_REST_API_TOKEN` / `KV_REST_API_READ_ONLY_TOKEN`）を新しい値に更新
5. 再デプロイ

**状態：** ✅ 対応完了（2026-04-27 09:32）— Vercel Storage → Settings → Rotate Secrets を実行。再デプロイ済み。

---

### 3. KV_URL / REDIS_URL のローテーション

**理由：** 接続文字列にパスワードが埋め込まれており、KVトークンとは別の認証経路のため個別対応が必要。

**対応手順：**
1. Upstashコンソールで同データベースのパスワードをリセット
2. 新しい接続文字列を取得
3. Vercel環境変数（`KV_URL` / `REDIS_URL`）を同時に更新（同一インスタンスを指している）
4. 再デプロイ

**状態：** ✅ 対応完了（2026-04-27 09:32）— 「2.」のRotate Secretsで同時にローテーション・再デプロイ済み。

---

### 4. ZOHO_WEBHOOK_TOKEN のローテーション

**理由：** 漏洩するとZoho CRMへの不正データ書き込みが可能になる。

**対応手順：**
1. Zohoコンソールでウェブフックトークンを再発行
2. Vercel環境変数（`ZOHO_WEBHOOK_TOKEN`）を新しい値に更新
3. 再デプロイ

**状態：** ✅ 対応完了（2026-04-27 09:40）— Vercel環境変数を新しい値に更新・再デプロイ済み。ZohoCRM側のWebhook未設定のためVercel側のみ対応。

---

## 推奨対応

### PASSWORD_ENC_KEY のローテーション

**理由：** 現在コードに参照箇所がなく（仕様記載のみで未実装）、変更しても既存データへの影響はない。ただし機密変数として設定されている以上、差し替えておくことが望ましい。

**対応手順：**
```bash
openssl rand -hex 32
```
で新しいキーを生成し、Vercel環境変数を更新。

**状態：** ✅ 対応完了（2026-04-27 09:45）— 新しい64文字ランダム値に更新済み。

---

### 全変数に Sensitive 設定を追加

Vercelダッシュボードで以下の変数すべてに「Sensitive」を設定し、値の閲覧を制限する。

- `KV_REST_API_TOKEN` — Upstash管理のため設定不可（Integration管理変数）
- `KV_REST_API_READ_ONLY_TOKEN` — 同上
- `KV_URL` — 同上
- `REDIS_URL` — 同上
- `ZOHO_WEBHOOK_TOKEN` — 対象外（All Environments設定のため）
- `PASSWORD_ENC_KEY` — ✅ Sensitive設定済み（Production and Preview）

**状態：** ✅ 対応完了（2026-04-27 09:45）— PASSWORD_ENC_KEYにSensitive設定済み。KV系4変数はUpstash Integration管理のため設定不可。

---

### MFA の設定

Vercelアカウントに認証アプリまたはパスキーでMFAを設定する（Vercel公式推奨）。

**状態：** ✅ 対応完了（2026-04-27 09:55）— Passkey（Chrome on Windows）＋ Authenticator App（TOTP）の両方を設定。Two-Factor Authentication：Active。

---

### Vercelアクティビティログの確認

Vercelダッシュボード → Settings → Activity で不審なデプロイ・アクセスがないか確認する。

**状態：** ✅ 対応完了（2026-04-27 09:57）— 全期間のログを確認。不審なアクセス・操作なし。記録されているのはアカウント作成（Mar 18）・GitHub連携（Mar 19）・CLI認証（Apr 2）・今回のMFA設定作業のみ。

---

## 対応ログ

| 日付 | 対応内容 | 担当 |
|------|----------|------|
| 2026-04-27 | 調査・本ドキュメント作成 | 新谷 |
| 2026-04-27 | IOC確認完了（Integrations画面）：不審アプリなし | 新谷 |
| 2026-04-27 | KV_REST_API_TOKEN / READ_ONLY_TOKEN / KV_URL / REDIS_URL をRotate Secretsで一括ローテーション・再デプロイ済み | 新谷 |
| 2026-04-27 | ZOHO_WEBHOOK_TOKEN をローテーション・再デプロイ済み | 新谷 |
| 2026-04-27 | PASSWORD_ENC_KEY をローテーション・Sensitive設定（Production and Preview）済み | 新谷 |
| 2026-04-27 | `vercel env pull` でローカルの .env.local を最新値に同期（KV系・ZOHO_WEBHOOK_TOKEN更新、PASSWORD_ENC_KEYはDevelopment対象外のため削除） | 新谷 |
| 2026-04-27 | MFA設定完了：Passkey（Chrome on Windows）＋ Authenticator App（TOTP）登録。Two-Factor Authentication Active。 | 新谷 |
| 2026-04-27 | Vercelアクティビティログ確認完了：不審なアクセス・操作なし | 新谷 |
| 2026-04-27 | Upstash Usageログ確認完了：SCANなし・TCP接続ゼロ・Keyspace安定。不審アクセスの痕跡なし | 新谷 |
| 2026-04-27 | ZohoアクセスログはCRM管理者権限が必要なため確認不可。管理者への確認依頼が必要 | 新谷 |
