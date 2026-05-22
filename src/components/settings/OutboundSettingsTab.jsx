// アウトバウンド設定タブ（メールテンプレート・Chatwork設定）
import { useState, useEffect } from 'react';
import { fetchOutboundConfig, saveOutboundConfig } from '../../lib/outboundApi.js';

const VARIABLES = ['{{担当者名}}', '{{企業名}}', '{{商談日時}}', '{{Zoomリンク}}', '{{商談担当}}', '{{送信者名}}', '{{署名}}'];

function ChatworkSettings() {
  const [roomId,  setRoomId]  = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    fetchOutboundConfig()
      .then(cfg => setRoomId(cfg.roomId || ''))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!roomId.trim()) { alert('ルームIDを入力してください'); return; }
    setSaving(true);
    try {
      await saveOutboundConfig({ roomId: roomId.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c0dece', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#174f35' };

  if (loading) return <div style={{ fontSize: 12, color: '#6a9a7a' }}>読み込み中...</div>;

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ルームID */}
      <div>
        <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>
          ルームID <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          placeholder="例: 123456789"
          style={inp}
        />
        <div style={{ fontSize: 11, color: '#6a9a7a', marginTop: 3 }}>
          ChatworkのルームURLに含まれる数字（例: chatwork.com/rooms/<strong>123456789</strong>）
        </div>
      </div>

      {/* 保存ボタン */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: saved ? '#059669' : '#174f35', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }}>
          {saving ? '保存中...' : saved ? '保存しました ✓' : '保存'}
        </button>
      </div>
    </div>
  );
}

export function OutboundSettingsTab({ master, save }) {
  const inp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #c0dece', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#174f35' };

  const tpl = master.outboundEmailTpl || {};

  const setSubject = (v) => save({ ...master, outboundEmailTpl: { ...tpl, subject: v } });
  const setBody    = (v) => save({ ...master, outboundEmailTpl: { ...tpl, body: v } });

  return (
    <div style={{ maxWidth: 720 }}>

      {/* Chatwork設定 */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#174f35', marginBottom: 4 }}>Chatwork設定</div>
        <div style={{ fontSize: 12, color: '#6a9a7a', marginBottom: 16 }}>
          アポ獲得時の報告メッセージを送信するChatworkルームとAPIトークンを設定します。
        </div>
        <ChatworkSettings />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2f0e8', marginBottom: 32 }} />

      {/* メールテンプレート */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#174f35', marginBottom: 4 }}>メールテンプレート</div>
        <div style={{ fontSize: 11, color: '#6a9a7a', marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>使用できる変数：</span>
          {VARIABLES.map(v => (
            <code key={v} style={{ background: '#f0f5f2', border: '1px solid #c0dece', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#174f35' }}>{v}</code>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>件名</label>
          <input
            value={tpl.subject || ''}
            onChange={e => setSubject(e.target.value)}
            placeholder="例: 【商談のご案内】{{企業名}} 様 {{商談日時}}〜"
            style={inp}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: '#3d7a5e', fontWeight: 600, display: 'block', marginBottom: 4 }}>本文</label>
          <textarea
            value={tpl.body || ''}
            onChange={e => setBody(e.target.value)}
            rows={30}
            style={{ ...inp, resize: 'vertical' }}
            placeholder="本文テンプレートを入力..."
          />
        </div>
      </div>

    </div>
  );
}
