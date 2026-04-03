// AI解析ルート
const express = require('express');
const { readData, getAccounts } = require('../lib/kv');
const { requireAuth, rateLimit } = require('../lib/auth');

const router = express.Router();

// AIシステムプロンプト（サーバー側に保持。フロントエンドには渡さない）
const AI_SYSTEM_PROMPT = `あなたはIS進捗管理のインサイドセールス専任アシスタントです。

ユーザーが電話メモ・アクション記録を入力すると、以下のJSON形式のみで出力してください。

{"action_summary":"架電内容サマリー（2〜3文）","action_type":"call または email または sms または other","action_result":"取次 または 不在 または 不通 または 折電 または 送信済 または その他","next_action_date_offset":5,"next_action_time":"10:00","next_action_memo":"次回アクションメモ","next_action_type":"call または email または sms または schedule または other","followup_talk_points":["ポイント1","ポイント2"],"email_subject":"フォローメール件名","email_body":"フォローメール本文","interest_level":"高 または 中 または 低","memo_for_zoho":"Zoho用詳細サマリー（3〜5文）"}

【next_action_typeの決定ルール】
過去のアクション履歴を必ず参照した上で、次回アクションに最適な手段を判断してください。

- schedule：
  - 商談・打ち合わせの日程調整が必要で、候補日を提案するタイミング
  - 「日程を調整したい」「いつが都合いいか」「商談の予定を入れたい」等の発言があった場合
  - 興味度「高」で具体的な商談ステップに進める状況

- email：
  - 今回の通話で資料送付を依頼された（→ 送付後フォロー電話が次なので今はemail）
  - 過去に資料・メールを送っており、次は別手段（call）が自然な流れの場合は除く
  - 電話が繋がりにくい状況が続いており、メールでアプローチする方が有効
  - 検討中でまず情報提供が先決

- call：
  - 過去にメール・資料送付済みで、次はリアクション確認の電話が適切
  - 折電待ち・担当者から折り返し連絡が来る予定
  - 興味度「高」で前向きな反応があり、直接会話で次のステップを決めたい
  - 不在・不通が続いているが見込みがあり、引き続き電話アプローチが必要
  - 急ぎの確認や意思決定を求める場面

- sms：
  - 電話に出ない・メールも反応が薄い・短い日程リマインドで十分

- other：
  - 訪問・商談・展示会対応など電話・メール以外が適切

【next_action_date_offsetの決定ルール】
メモ内容・過去のアクション履歴・顧客の反応を読み取り、最適な営業日数（整数）を判断してください。

- 「来週」「1週間後」→ 5
- 「2週間後」「再来週」→ 10
- 「来月」「1ヶ月後」→ 22
- 「3日後」「数日後」→ 3
- 「明日」→ 1

【フォローメールの生成ルール】
- email_bodyの書き出しは「{会社名}\n{担当者名} 様」（【リード】の会社名・担当者名を使用、なければ「ご担当者」）
- 本文中には「ダンドリワークの{送信者名}でございます」（【送信者情報】の名前を使用）
- 【送信者情報】に署名が含まれる場合、メール本文末尾に必ずそのまま追加すること

必ずJSONのみ返してください。`;

// AI解析（Gemini API呼び出し）
router.post('/api/ai/analyze', requireAuth, rateLimit, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'promptが必要です' });

  const accounts = await getAccounts();
  const account = accounts.find(a => a.id === req.accountId);
  const globalAiConfig = (await readData('ai_config')) || {};
  const apiKey = account?.geminiKey || globalAiConfig.geminiKey;

  if (!apiKey) return res.status(400).json({ error: 'Gemini APIキーが未設定です。設定画面（⚙️）の「APIキー設定」タブから入力してください。' });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: AI_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
      }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'AI解析リクエストに失敗しました: ' + e.message });
  }
});

module.exports = router;
