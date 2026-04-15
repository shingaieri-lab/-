// ネクストアクション操作ボタン（編集トリガー + Google Tasks TODO作成 + 削除）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PencilIcon, TrashIcon, TaskIcon } from '../ui/Icons.jsx';
import { isTokenValid, handleOAuthCallbackError, handleOAuthPopupError } from '../../lib/oauth.js';
import { getEffectiveAiConfig } from '../../lib/accounts.js';

export function NextActionEditBtn({ nad, lead, onUpdate, currentUser, compact = false, onEdit }) {
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

  return (
    <div style={{ display: "flex", gap: 4, marginLeft: 4, flexShrink: 0 }}>
      {!compact && onEdit && (
        <button onClick={onEdit} style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", display:"flex", alignItems:"center" }} title="編集">
          <PencilIcon size={18} color="#059669" />
        </button>
      )}
      {(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId) && nad && (
        <button onClick={() => createCalTodo(nad, lead.next_action_time)} disabled={calSaving}
          style={{ background:"none", border:"none", cursor: calSaving ? "not-allowed" : "pointer", padding:"4px", display:"flex", alignItems:"center", opacity: calSaving ? 0.5 : 1 }}
          title="GoogleタスクにTODO作成">
          <TaskIcon size={18} color={calSaved ? "#059669" : "#3b82f6"} />
        </button>
      )}
      {!compact && (
        <button onClick={() => onUpdate({ next_action: "", next_action_date: "", next_action_time: "" })}
          style={{ background:"none", border:"none", cursor:"pointer", padding:"4px", display:"flex", alignItems:"center" }} title="削除">
          <TrashIcon size={18} color="#ef4444" />
        </button>
      )}
    </div>
  );
}
