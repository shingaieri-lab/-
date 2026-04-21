// セットアップウィザード
// AI・Gmail・Googleカレンダーの初期設定を案内する

import { useState } from 'react';
import { WizardOverlay, WizardStatusBadge } from './WizardParts.jsx';
import { loadGCalConfig } from '../../lib/gcal.js';
import { GeminiWizard } from './GeminiWizard.jsx';
import { GmailWizard } from './GmailWizard.jsx';
import { CalendarWizard } from './CalendarWizard.jsx';
import { RocketIcon, SparkleIcon, MailIcon, CalendarNavIcon } from '../ui/Icons.jsx';

const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };

export function SetupWizard({ currentUser, onUpdateProfile, onSave, aiConfig, onClose }) {
  const [section, setSection] = useState("overview");

  const gcal0 = loadGCalConfig();
  const geminiOk = !!(currentUser?.geminiConfigured);
  const gmailOk = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
  const calendarOk = !!(gcal0.apiKey && Object.keys(gcal0.calendarIds || {}).length > 0);

  const backToOverview = () => setSection("overview");

  if (section === "gemini") return (
    <GeminiWizard currentUser={currentUser} onUpdateProfile={onUpdateProfile} onBack={backToOverview} />
  );
  if (section === "gmail") return (
    <GmailWizard currentUser={currentUser} onUpdateProfile={onUpdateProfile} onSave={onSave} aiConfig={aiConfig} onBack={backToOverview} />
  );
  if (section === "calendar") return (
    <CalendarWizard onBack={backToOverview} />
  );

  return (
    <WizardOverlay onDismiss={onClose}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#174f35", display:"flex", alignItems:"center", gap:7 }}><RocketIcon size={18} color="#174f35" /> 初期設定ウィザード</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>設定したい機能を選んでください。不要な機能はスキップできます。</div>
        {[
          { icon: <SparkleIcon size={24} color="#6366f1" />, title: "AIアシスタント", desc: "商談メモの分析・要約・次アクション提案", ok: geminiOk, sec: "gemini" },
          { icon: <MailIcon size={24} color="#0ea5e9" />, title: "Gmail連携", desc: "メール下書き自動作成・GoogleタスクTODO登録", ok: gmailOk, sec: "gmail" },
          { icon: <CalendarNavIcon size={24} color="#10b981" />, title: "Googleカレンダー", desc: "空き時間の自動検索・商談予定の登録", ok: calendarOk, sec: "calendar" },
        ].map(item => (
          <div key={item.sec} onClick={() => setSection(item.sec)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #e2f0e8", borderRadius: 10, marginBottom: 8, cursor: "pointer", background: "#f8fbf9", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#eef8f2"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8fbf9"}>
            <div style={{ fontSize: 24, flexShrink: 0, display:"flex", alignItems:"center" }}>{item.icon}</div>
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
}
