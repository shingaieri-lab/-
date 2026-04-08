// ネクストアクション編集ボタン（インライン編集 + Google Tasks TODO作成）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PencilIcon, TrashIcon } from '../ui/Icons.jsx';
import { isTokenValid, handleOAuthCallbackError, handleOAuthPopupError } from '../../lib/oauth.js';
import { getEffectiveAiConfig } from '../../lib/accounts.js';

export function NextActionEditBtn({ nad, lead, onUpdate, currentUser }) {
  const [editNA, setEditNA] = useState(false);
  const [naDate, setNADate] = useState(nad || "");
  const [naTime, setNATime] = useState(lead.next_action_time || "");
  const [naMemo, setNAMemo] = useState(lead.next_action || "");
  const [calToken, setCalToken] = useState(null);
  const [calSaving, setCalSaving] = useState(false);
  const [calSaved, setCalSaved] = useState(false);

  const createCalTodo = async (date, time) => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId;
    if (!clientId) {
      alert(currentUser?.role === "admin"
        ? "設定 > APIキー設定 で Gmail Client ID を入力してください"
        : "管理者にGmail OAuth Client IDの設定を依頼してください");
      return;
    }
    if (!date) { alert("ネクストアクション日が設定されていません"); return; }
    setCalSaving(true);
    try {
      // 有効期限内のトークンがあれば再利用、期限切れなら再取得する
      let tokenObj = calToken;
      if (!isTokenValid(tokenObj)) {
        if (!window.google?.accounts?.oauth2) {
          await new Promise((res, rej) => {
            if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) { res(); return; }
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          await new Promise(r => setTimeout(r, 500));
        }
        const rawToken = await new Promise((res, rej) => {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/tasks',
            callback: (resp) => {
              if (resp.error) { handleOAuthCallbackError(resp, rej); }
              else { res(resp.access_token); }
            },
            error_callback: (err) => handleOAuthPopupError(err, rej)
          });
          client.requestAccessToken();
        });
        tokenObj = { token: rawToken, expiresAt: Date.now() + 55 * 60 * 1000 };
        setCalToken(tokenObj);
      }
      const token = tokenObj.token;
      const task = {
        title: lead.company || "(会社名未設定)",
        notes: lead.zoho_url || "",
        due: `${date}T00:00:00.000Z`
      };
      const calRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(task)
      });
      if (!calRes.ok) {
        const err = await calRes.json();
        if ((err.error?.code === 401) || (err.error?.status === 'UNAUTHENTICATED')) {
          setCalToken(null);
          throw new Error('認証の期限が切れました。再度お試しください。');
        }
        throw new Error(err.error?.message || 'タスク作成に失敗しました');
      }
      setCalSaved(true);
      setTimeout(() => setCalSaved(false), 3000);
    } catch (e) {
      alert('GoogleタスクTODO作成エラー: ' + e.message);
    } finally {
      setCalSaving(false);
    }
  };

  if (editNA) return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginLeft: 4 }}>
      <input type="date" value={naDate} onChange={e => setNADate(e.target.value)}
        style={{ ...S.inp, padding: "3px 6px", fontSize: 11, width: 130 }} />
      <select value={naTime} onChange={e => setNATime(e.target.value)}
        style={{ ...S.inp, padding: "3px 6px", fontSize: 11, width: 80 }}>
        <option value="">時刻なし</option>
        {Array.from({ length: 28 }, (_, i) => {
          const h = String(Math.floor(i / 2) + 8).padStart(2, "0");
          const m = i % 2 === 0 ? "00" : "30";
          return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
        })}
      </select>
      <input value={naMemo} onChange={e => setNAMemo(e.target.value)} placeholder="メモ"
        style={{ ...S.inp, padding: "3px 6px", fontSize: 11, width: 120 }} />
      <button onClick={() => { onUpdate({ next_action_date: naDate, next_action_time: naTime, next_action: naMemo }); setEditNA(false); }}
        style={{ ...S.btnDelXs, background: "#059669" }}>保存</button>
      <button onClick={() => setEditNA(false)} style={S.btnCancelXs}>✕</button>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
      <button onClick={() => { setNADate(nad || ""); setNATime(lead.next_action_time || ""); setNAMemo(lead.next_action || ""); setEditNA(true); }}
        style={S.btnIconSm} title="編集"><PencilIcon size={11} color="#059669" /></button>
      {(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId) && nad && (
        <button onClick={() => createCalTodo(nad, lead.next_action_time)} disabled={calSaving}
          style={{ ...S.btnIconSm, fontSize: 11, opacity: calSaving ? 0.5 : 1, color: calSaved ? "#7c3aed" : "inherit" }}
          title="GoogleカレンダーにTODO作成">{calSaved ? "✅" : "☑️"}</button>
      )}
      <button onClick={() => onUpdate({ next_action: "", next_action_date: "", next_action_time: "" })}
        style={{ ...S.btnIconSm, background: "#fef2f2", border: "1px solid #fca5a5" }} title="削除">
        <TrashIcon size={11} color="#ef4444" />
      </button>
    </div>
  );
}
