// Gmail連携設定ウィザード（5ステップ）
import { useState } from 'react';
import { WizardOverlay, WizardStepBar } from './WizardParts.jsx';
import { MailIcon, CheckCircleIcon, UserIcon, WrenchIcon, ExternalLinkIcon, ClipboardIcon, AlertIcon, KeyIcon, LightbulbIcon } from '../ui/Icons.jsx';

const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
const btnP = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const inp  = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

const labels = ["はじめに", "API有効化", "同意画面", "ID取得", "完了"];

export function GmailWizard({ currentUser, onUpdateProfile, onSave, aiConfig, onBack }) {
  const [step, setStep] = useState(0);
  const [gmailClientId, setGmailClientId] = useState(currentUser?.gmailClientId || "");

  if (step === 0) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={0} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><MailIcon size={16} color="#174f35" /> Gmail連携の設定</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> 商談後のお礼メールをワンクリックで下書き作成</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> テンプレートに会社名・担当者名を自動差し込み</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> GoogleタスクにTODOを自動登録</div>
        </div>
        <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", lineHeight: 1.8 }}>
          <b style={{display:"flex",alignItems:"center",gap:4}}><UserIcon size={12} color="#92400e" /> 管理者のみ設定が必要です。</b><br />
          設定後、各メンバーは初回利用時にポップアップで「許可」を押すだけでOKです。<br />所要時間：約15〜20分
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={onBack} style={btnS}>← 戻る</button>
          <button onClick={() => setStep(1)} style={btnP}>はじめる →</button>
        </div>
      </div>
    </WizardOverlay>
  );

  if (step === 1) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={1} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><WrenchIcon size={16} color="#174f35" /> APIを有効にする</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
          <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
          <div>2. プロジェクトを選択（なければ新規作成）</div>
          <div>3. 「APIとサービス」→「ライブラリ」を開く</div>
          <div>4. <b>「Gmail API」</b>を検索 → 「有効にする」</div>
          <div>5. <b>「Google Tasks API」</b>も同様に有効にする</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems:"center", gap:5, padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}><ExternalLinkIcon size={12} color="#2563eb" /> Google Cloud Console を開く（別タブ）</a>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(0)} style={btnS}>← 戻る</button>
          <button onClick={() => setStep(2)} style={btnP}>完了 → 次へ</button>
        </div>
      </div>
    </WizardOverlay>
  );

  if (step === 2) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={2} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><ClipboardIcon size={16} color="#174f35" /> OAuth同意画面を設定する</div>
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
          <span style={{display:"flex",alignItems:"center",gap:4}}><AlertIcon size={11} color="#92400e" /> 「外部」を選ぶと審査が必要になります。社内利用は必ず「内部」を選んでください。</span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
          <button onClick={() => setStep(3)} style={btnP}>完了 → 次へ</button>
        </div>
      </div>
    </WizardOverlay>
  );

  if (step === 3) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={3} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><KeyIcon size={16} color="#174f35" /> クライアントIDを取得する</div>
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
            }} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, border: "1px solid #c0dece", background: "#fff", color: "#059669", cursor: "pointer", fontFamily: "inherit", display:"flex", alignItems:"center", gap:3 }}><ClipboardIcon size={10} color="#059669" /> コピー</button>
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
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={4} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><CheckCircleIcon size={16} color="#174f35" /> Gmail連携の設定完了！</div>
        <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 14, fontSize: 12, color: "#059669" }}>
          <div style={{ fontWeight: 700, display:"flex", alignItems:"center", gap:5 }}><CheckCircleIcon size={12} color="#059669" /> 以下のクライアントIDを保存します</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{gmailClientId.trim()}</div>
        </div>
        <div style={{ background: "#eff6ff", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#1e40af", marginBottom: 20, border: "1px solid #bfdbfe" }}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><LightbulbIcon size={11} color="#1e40af" /> 各メンバーは初めてメール送信するとき、Googleのポップアップが出ます。「許可」を押すだけでOKです。</span>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
          <button onClick={() => {
            onUpdateProfile({ ...currentUser, gmailClientId: gmailClientId.trim() });
            if (onSave) onSave({ ...(aiConfig || {}), gmailClientId: gmailClientId.trim() });
            onBack();
          }} style={btnP}>保存して完了</button>
        </div>
      </div>
    </WizardOverlay>
  );
}
