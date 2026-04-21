// Gemini APIキー設定ウィザード（3ステップ）
import { useState } from 'react';
import { WizardOverlay, WizardStepBar } from './WizardParts.jsx';
import { SparkleIcon, CheckCircleIcon, XCircleIcon, KeyIcon, ExternalLinkIcon } from '../ui/Icons.jsx';

const cardStyle = { background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 8px 32px #0002", maxHeight: "90vh", overflowY: "auto" };
const btnP = { padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
const btnS = { padding: "10px 20px", borderRadius: 8, border: "1px solid #c0dece", background: "#fff", color: "#6a9a7a", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const inp  = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #c0dece", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace", background: "#fff", color: "#174f35" };

const labels = ["はじめに", "キー取得", "確認"];

export function GeminiWizard({ currentUser, onUpdateProfile, onBack }) {
  const [step, setStep] = useState(0);
  const [geminiKey, setGeminiKey] = useState(currentUser?.geminiKey || "");
  const [geminiTest, setGeminiTest] = useState(null);

  const testGemini = async (key) => {
    if (!key.trim()) return;
    setGeminiTest("testing");
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      setGeminiTest(r.ok ? "ok" : "error");
    } catch { setGeminiTest("error"); }
  };

  if (step === 0) return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={0} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><SparkleIcon size={16} color="#174f35" /> AIアシスタントの設定</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 1.9, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>設定すると使えること</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> 商談メモをAIが自動で分析・要約</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> 架電後の次アクションを自動提案</div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><CheckCircleIcon size={11} color="#3d7a5e" /> 顧客の温度感をスコアリング</div>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>
          使うもの：<b>Google AI Studio</b>（無料・Googleアカウントで今すぐ使えます）<br />所要時間：約5分
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
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><KeyIcon size={16} color="#174f35" /> APIキーを取得する</div>
        <div style={{ background: "#f0f5f2", borderRadius: 8, padding: "14px 16px", marginBottom: 14, fontSize: 12, lineHeight: 2, color: "#3d7a5e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>手順</div>
          <div>1. 下のボタンをクリック → Google AI Studio が開きます</div>
          <div>2. 画面左上 <b>「APIキーを作成」</b> をクリック</div>
          <div>3. <b>「新しいプロジェクトでAPIキーを作成」</b> を選択</div>
          <div>4. <code style={{ background: "#d8ede1", padding: "1px 5px", borderRadius: 3 }}>AIzaSy...</code> で始まる文字列が表示される</div>
          <div>5. <b>「コピー」</b>ボタンを押す</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems:"center", gap:5, padding: "8px 16px", borderRadius: 8, background: "#eff6ff", color: "#2563eb", fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe", textDecoration: "none" }}><ExternalLinkIcon size={12} color="#2563eb" /> Google AI Studio を開く（別タブ）</a>
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
          {geminiTest === "ok" && <div style={{ fontSize: 11, color: "#059669", marginTop: 4, fontWeight: 700, display:"flex", alignItems:"center", gap:4 }}><CheckCircleIcon size={11} color="#059669" /> 接続成功！</div>}
          {geminiTest === "error" && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontWeight: 700, display:"flex", alignItems:"center", gap:4 }}><XCircleIcon size={11} color="#dc2626" /> 接続失敗。キーを確認してください。</div>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => { setStep(0); setGeminiTest(null); }} style={btnS}>← 戻る</button>
          <button onClick={() => setStep(2)} disabled={!geminiKey.trim()} style={{ ...btnP, opacity: geminiKey.trim() ? 1 : 0.5 }}>次へ →</button>
        </div>
      </div>
    </WizardOverlay>
  );

  return (
    <WizardOverlay onDismiss={onBack}>
      <div style={cardStyle}>
        <WizardStepBar current={2} labels={labels} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#174f35", marginBottom: 12, display:"flex", alignItems:"center", gap:7 }}><CheckCircleIcon size={16} color="#174f35" /> AIアシスタントの設定完了！</div>
        <div style={{ background: "#d1fae5", borderRadius: 8, padding: "16px", marginBottom: 16, fontSize: 12, color: "#059669" }}>
          <div style={{ fontWeight: 700, display:"flex", alignItems:"center", gap:5 }}><CheckCircleIcon size={12} color="#059669" /> 以下のAPIキーを保存します</div>
          <div style={{ fontSize: 11, marginTop: 4, color: "#3d7a5e", fontFamily: "monospace", wordBreak: "break-all" }}>{geminiKey.trim()}</div>
        </div>
        <div style={{ fontSize: 12, color: "#6a9a7a", marginBottom: 20 }}>「保存して完了」を押すと設定が保存されます。<br />「AIページ」でメモの分析が使えるようになります。</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => setStep(1)} style={btnS}>← 戻る</button>
          <button onClick={() => { onUpdateProfile({ ...currentUser, geminiKey: geminiKey.trim() }); onBack(); }} style={btnP}>保存して完了</button>
        </div>
      </div>
    </WizardOverlay>
  );
}
