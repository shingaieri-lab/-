// セットアップウィザード
// AI・Gmail・Googleカレンダーの初期設定を案内する

import { useState } from 'react';
import { WizardOverlay, WizardStepBar, WizardStatusBadge } from './WizardParts.jsx';
import { getSalesMembers } from '../../lib/master.js';
import { loadGCalConfig, saveGCalConfig } from '../../lib/gcal.js';

export function SetupWizard({ currentUser, onUpdateProfile, onSave, aiConfig, onClose }) {
  const [section, setSection] = useState("overview");
  const [step, setStep] = useState(0);
  const [geminiKey, setGeminiKey] = useState(currentUser?.geminiKey || "");
  const [gmailClientId, setGmailClientId] = useState(currentUser?.gmailClientId || "");
  const gcal0 = loadGCalConfig();
  const [calApiKey, setCalApiKey] = useState(gcal0.apiKey || "");
  const [calIds, setCalIds] = useState(gcal0.calendarIds || {});
  const [geminiTest, setGeminiTest] = useState(null); // null | "testing" | "ok" | "error"
  const members = getSalesMembers();

  const geminiOk = !!(currentUser?.geminiConfigured);
  const gmailOk = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
  const calendarOk = !!(gcal0.apiKey && Object.keys(gcal0.calendarIds || {}).length > 0);

  const go = (sec, st = 0) => { setSection(sec); setStep(st); };
  // overview では完全クローズ、途中ステップでは overview に戻るだけ
  const dismiss = section === "overview" ? onClose : () => go("overview");

  const testGemini = async (key) => {
    if (!key.trim()) return;
    setGeminiTest("testing");
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      setGeminiTest(r.ok ? "ok" : "error");
    } catch { setGeminiTest("error"); }
  };

  const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
  const btnP = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

  // ── OVERVIEW ──
  if (section === "overview") return (
    <WizardOverlay onDismiss={dismiss}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35" }}>🚀 初期設定ウィザード</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>設定したい機能を選んでください。不要な機能はスキップできます。</div>
        {[
          { icon: "🤖", title: "AIアシスタント", desc: "商談メモの分析・要約・次アクション提案", ok: geminiOk, sec: "gemini" },
          { icon: "📧", title: "Gmail連携", desc: "メール下書き自動作成・GoogleタスクTODO登録", ok: gmailOk, sec: "gmail" },
          { icon: "📅", title: "Googleカレンダー", desc: "空き時間の自動検索・商談予定の登録", ok: calendarOk, sec: "calendar" },
        ].map(item => (
          <div key={item.sec} onClick={() => go(item.sec)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #e2f0e8", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: "#f8fbf9", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#eef8f2"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8fbf9"}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#174f35" }}>{item.title}</div>
              <div style={{ fontSize: 11, color: "#6a9a7a" }}>{item.desc}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <WizardStatusBadge ok={item.ok} />
              <span style={{ color: "#9ca3af", fontSize: 14 }}>›</span>
            </div>
          </div>
        ))}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <button onClick={onClose} style={btnS}>閉じる</button>
        </div>
      </div>
    </WizardOverlay>
  );

  // ── GEMINI WIZARD ──
  if (section === "gemini") {
    const labels = ["はじめに", "キー取得", "確認"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🤖 AIアシスタントの設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ 商談メモをAIが自動で分析・要約</div>
            <div>✅ 架電後の次アクションを自動提案</div>
            <div>✅ 顧客の温度感をスコアリング</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>
            使うもの：<b>Google AI Studio</b>（無料・Googleアカウントで今すぐ使えます）<br />所要時間：約5分
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 APIキーを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google AI Studio が開きます</div>
            <div>2. 画面左上 <b>「APIキーを作成」</b> をクリック</div>
            <div>3. <b>「新しいプロジェクトでAPIキーを作成」</b> を選択</div>
            <div>4. <code style={{ background: "#d8ede1", padding: "1px 5px", borderRadius: 3 }}>AIzaSy...</code> で始まる文字列が表示される</div>
            <div>5. <b>「コピー」</b>ボタンを押す</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google AI Studio を開く（別タブ）</a>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>コピーしたAPIキーを貼り付け</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={geminiKey} onChange={e => { setGeminiKey(e.target.value); setGeminiTest(null); }} placeholder="AIzaSy..." style={{ ...inp, flex: 1 }} />
              <button onClick={() => testGemini(geminiKey.trim())} disabled={!geminiKey.trim() || geminiTest === "testing"}
                style={{ ...btnP, padding: "9px 12px", fontSize: 11, flexShrink: 0, opacity: (!geminiKey.trim() || geminiTest === "testing") ? 0.5 : 1 }}>
                {geminiTest === "testing" ? "確認中…" : "接続テスト"}
              </button>
            </div>
            {geminiTest === "ok" && <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 700 }}>✅ 接続成功！</div>}
            {geminiTest === "error" && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: 700 }}>❌ 接続失敗。キーを確認してください。</div>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => { setStep(0); setGeminiTest(null); }} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} disabled={!geminiKey.trim()} style={{ ...btnP, opacity: geminiKey.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ AIアシスタントの設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700 }}>✅ 以下のAPIキーを保存します</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{geminiKey.trim()}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>「保存して完了」を押すと設定が保存されます。<br />「AIページ」でメモの分析が使えるようになります。</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => { onUpdateProfile({ ...currentUser, geminiKey: geminiKey.trim() }); go("overview"); }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  // ── GMAIL WIZARD ──
  if (section === "gmail") {
    const labels = ["はじめに", "API有効化", "同意画面", "ID取得", "完了"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📧 Gmail連携の設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ 商談後のお礼メールをワンクリックで下書き作成</div>
            <div>✅ テンプレートに会社名・担当者名を自動差し込み</div>
            <div>✅ GoogleタスクにTODOを自動登録</div>
          </div>
          <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", lineHeight: 1.8 }}>
            <b>👤 管理者のみ設定が必要です。</b><br />
            設定後、各メンバーは初回利用時にポップアップで「許可」を押すだけでOKです。<br />所要時間：約15〜20分
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔧 APIを有効にする</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
            <div>2. プロジェクトを選択（なければ新規作成）</div>
            <div>3. 「APIとサービス」→「ライブラリ」を開く</div>
            <div>4. <b>「Gmail API」</b>を検索 → 「有効にする」</div>
            <div>5. <b>「Google Tasks API」</b>も同様に有効にする</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google Cloud Console を開く（別タブ）</a>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(0)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 2) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📋 OAuth同意画面を設定する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 「APIとサービス」→「OAuth同意画面」を開く</div>
            <div>2. ユーザーの種類：<b>「内部」</b>を選択 → 「作成」</div>
            <div>3. アプリ名に「営業ツール」など入力</div>
            <div>4. サポートメールに自分のアドレスを入力</div>
            <div>5. 「スコープを追加」→ <b>Gmail</b> と <b>Tasks</b> を追加</div>
            <div>6. 「保存して次へ」を繰り返して完了</div>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#92400e", marginBottom: 16, border: "1px solid #fde68a" }}>
            ⚠️ 「外部」を選ぶと審査が必要になります。社内利用は必ず「内部」を選んでください。
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(3)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 3) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={3} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 クライアントIDを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 「認証情報」→「認証情報を作成」→「OAuthクライアントID」</div>
            <div>2. アプリの種類：<b>「ウェブアプリケーション」</b>を選択</div>
            <div>3. 「承認済みJavaScriptオリジン」に追加：</div>
            <div style={{ paddingLeft: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <code style={{ background: "#d8ede1", padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{window.location.origin}</code>
              <button onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.origin).catch(() => {
                    prompt("以下のURLをコピーしてください：", window.location.origin);
                  });
                } else {
                  prompt("以下のURLをコピーしてください：", window.location.origin);
                }
              }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid #c0dece", background: "#fff", color: "#059669", cursor: "pointer", fontFamily: "inherit" }}>📋 コピー</button>
            </div>
            <div>4. 「作成」→ クライアントIDをコピー</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>コピーしたクライアントIDを貼り付け</label>
            <input value={gmailClientId} onChange={e => setGmailClientId(e.target.value)} placeholder="xxxxxxxxxx.apps.googleusercontent.com" style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(4)} disabled={!gmailClientId.trim()} style={{ ...btnP, opacity: gmailClientId.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={4} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ Gmail連携の設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 14, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700 }}>✅ 以下のクライアントIDを保存します</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{gmailClientId.trim()}</div>
          </div>
          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#1e40af", marginBottom: 20, border: "1px solid #bfdbfe" }}>
            💡 各メンバーは初めてメール送信するとき、Googleのポップアップが出ます。「許可」を押すだけでOKです。
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
            <button onClick={() => {
              onUpdateProfile({ ...currentUser, gmailClientId: gmailClientId.trim() });
              if (onSave) onSave({ ...(aiConfig || {}), gmailClientId: gmailClientId.trim() });
              go("overview");
            }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  // ── CALENDAR WIZARD ──
  if (section === "calendar") {
    const labels = ["はじめに", "プロジェクト", "APIキー", "カレンダーID", "完了"];
    if (step === 0) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={0} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>📅 Googleカレンダーの設定</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
            <div>✅ チームの空き時間を自動で検索</div>
            <div>✅ 商談候補日をワンクリックでカレンダーに登録</div>
          </div>
          <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>必要なもの：各メンバーのGoogleカレンダーID<br />所要時間：約15〜30分　👤 管理者が1回だけ実施すればOK</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => go("overview")} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 1) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={1} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔧 Google Cloudを準備する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
            <div>2. 画面上部「プロジェクトを選択」をクリック</div>
            <div>3. 「新しいプロジェクト」→ 名前を入力 → 「作成」</div>
            <div>4. 「APIとサービス」→「ライブラリ」を開く</div>
            <div>5. <b>「Google Calendar API」</b>を検索 → 「有効にする」</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}>🔗 Google Cloud Console を開く（別タブ）</a>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(0)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(2)} style={btnP}>完了 → 次へ</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 2) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={2} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>🔑 APIキーを取得する</div>
          <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
            <div>1. Cloud Console の「認証情報」を開く</div>
            <div>2. 「認証情報を作成」→「APIキー」をクリック</div>
            <div>3. <code style={{ background: "#d8ede1", padding: "1px 5px", borderRadius: 3 }}>AIzaSy...</code> で始まる文字列をコピー</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#6a9a7a", display: "block", marginBottom: 4 }}>APIキーを貼り付け</label>
            <input value={calApiKey} onChange={e => setCalApiKey(e.target.value)} placeholder="AIzaSy..." style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
            <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(3)} disabled={!calApiKey.trim()} style={{ ...btnP, opacity: calApiKey.trim() ? 1 : 0.5 }}>次へ →</button>
          </div>
        </div>
      </WizardOverlay>
    );
    if (step === 3) return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={{ ...cardStyle, maxWidth: 560 }}>
          <WizardStepBar current={3} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>👥 メンバーのカレンダーIDを入力する</div>
          <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#92400e", marginBottom: 14, border: "1px solid #fde68a", lineHeight: 1.8 }}>
            <b>📌 カレンダーIDの確認方法（各メンバーが自分で確認）</b><br />
            Googleカレンダー → 左の自分の名前「⋮」→「設定と共有」→「カレンダーのID」をコピー<br />
            <b>⚠️ 「予定の詳細を表示」を「全員」に共有設定を変更してください</b>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
            {members.map(m => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#174f35", minWidth: 64, flexShrink: 0 }}>{m}</span>
                <input value={(calIds || {})[m] || ""} onChange={e => setCalIds(p => ({ ...p, [m]: e.target.value }))} placeholder="例：tanaka@gmail.com" style={{ ...inp, fontSize: 12 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={btnS}>← 戻る</button>
            <button onClick={() => setStep(4)}
              disabled={members.length > 0 && Object.values(calIds).filter(v => v.trim()).length === 0}
              style={{ ...btnP, opacity: (members.length === 0 || Object.values(calIds).filter(v => v.trim()).length > 0) ? 1 : 0.5 }}>
              次へ →
            </button>
          </div>
        </div>
      </WizardOverlay>
    );
    const filledIds = Object.entries(calIds).filter(([, v]) => v.trim());
    return (
      <WizardOverlay onDismiss={dismiss}>
        <div style={cardStyle}>
          <WizardStepBar current={4} labels={labels} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12 }}>✅ カレンダー設定完了！</div>
          <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>保存する内容</div>
            <div>✅ APIキー：設定済み</div>
            {filledIds.map(([name, id]) => <div key={name}>✅ {name}：{id}</div>)}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
            <button onClick={() => {
              const filteredIds = Object.fromEntries(Object.entries(calIds).filter(([, v]) => v.trim()));
              saveGCalConfig({ apiKey: calApiKey.trim(), calendarIds: filteredIds });
              go("overview");
            }} style={btnP}>保存して完了</button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  return null;
}
