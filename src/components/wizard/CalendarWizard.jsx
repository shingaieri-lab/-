// Googleカレンダー設定ウィザード（5ステップ）
import { useState } from 'react';
import { WizardOverlay, WizardStepBar } from './WizardParts.jsx';
import { getSalesMembers } from '../../lib/master.js';
import { loadGCalConfig, saveGCalConfig } from '../../lib/gcal.js';
import { CalendarNavIcon, CheckCircleIcon, UserIcon, WrenchIcon, ExternalLinkIcon, KeyIcon, UsersIcon, MapPinIcon, AlertIcon } from '../ui/Icons.jsx';

const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
const btnP = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const inp  = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

const labels = ["はじめに", "プロジェクト", "APIキー", "カレンダーID", "完了"];

export function CalendarWizard({ onBack }) {
  const gcal0 = loadGCalConfig();
  const [step, setStep] = useState(0);
  const [calApiKey, setCalApiKey] = useState(gcal0.apiKey || "");
  const [calIds, setCalIds] = useState(gcal0.calendarIds || {});
  const members = getSalesMembers();

  if (step === 0) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={0} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><CalendarNavIcon size={16} color="#174f35" /> Googleカレンダーの設定</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> チームの空き時間を自動で検索</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> 商談候補日をワンクリックでカレンダーに登録</div>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>必要なもの：各メンバーのGoogleカレンダーID<br />所要時間：約15〜30分　<span style={{display:"inline-flex",alignItems:"center",gap:3}}><UserIcon size={11} color="#6a9a7a" /> 管理者が1回だけ実施すればOK</span></div>
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
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><WrenchIcon size={16} color="#174f35" /> Google Cloudを準備する</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
          <div>1. 下のボタンをクリック → Google Cloud Console が開きます</div>
          <div>2. 画面上部「プロジェクトを選択」をクリック</div>
          <div>3. 「新しいプロジェクト」→ 名前を入力 → 「作成」</div>
          <div>4. 「APIとサービス」→「ライブラリ」を開く</div>
          <div>5. <b>「Google Calendar API」</b>を検索 → 「有効にする」</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems:"center", gap:5, padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}><ExternalLinkIcon size={12} color="#2563eb" /> Google Cloud Console を開く（別タブ）</a>
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
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><KeyIcon size={16} color="#174f35" /> APIキーを取得する</div>
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
    <WizardOverlay onDismiss={onBack}>
      <div style={{ ...cardStyle, maxWidth: 560 }}>
        <WizardStepBar current={3} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><UsersIcon size={16} color="#174f35" /> メンバーのカレンダーIDを入力する</div>
        <div style={{ background: "#fff7ed", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#92400e", marginBottom: 14, border: "1px solid #fde68a", lineHeight: 1.8 }}>
          <b style={{display:"flex",alignItems:"center",gap:4}}><MapPinIcon size={12} color="#92400e" /> カレンダーIDの確認方法（各メンバーが自分で確認）</b><br />
          Googleカレンダー → 左の自分の名前「⋮」→「設定と共有」→「カレンダーのID」をコピー<br />
          <b style={{display:"flex",alignItems:"center",gap:4}}><AlertIcon size={12} color="#92400e" /> 「予定の詳細を表示」を「全員」に共有設定を変更してください</b>
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
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={4} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><CheckCircleIcon size={16} color="#174f35" /> カレンダー設定完了！</div>
        <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>保存する内容</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#059669" /> APIキー：設定済み</div>
          {filledIds.map(([name, id]) => <div key={name} style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#059669" /> {name}：{id}</div>)}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(3)} style={btnS}>← 戻る</button>
          <button onClick={() => {
            const filteredIds = Object.fromEntries(Object.entries(calIds).filter(([, v]) => v.trim()));
            saveGCalConfig({ apiKey: calApiKey.trim(), calendarIds: filteredIds });
            onBack();
          }} style={btnP}>保存して完了</button>
        </div>
      </div>
    </WizardOverlay>
  );
}
