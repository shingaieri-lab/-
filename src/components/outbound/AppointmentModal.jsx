// アポ獲得情報入力モーダル + Chatwork送信
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { sendChatwork, buildChatworkMessage } from '../../lib/outboundApi.js';
import { getSalesMembers } from '../../lib/master.js';

const TIME_OPTIONS = [];
for (let h = 7; h <= 21; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

const RANK_OPTIONS = ['A', 'B', 'C', 'D'];

function todayJST() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' });
}

export function AppointmentModal({ lead, listName, currentUser, onSave, onClose }) {
  const existing     = lead.appointmentInfo || {};
  const salesMembers = getSalesMembers();

  const [form, setForm] = useState({
    salesPerson:    existing.salesPerson    || '',
    website:        existing.website        || '',
    address:        existing.address        || '',
    confirmedDate:  existing.confirmedDate  || todayJST(),
    meetingDate:    existing.meetingDate    || '',
    meetingTime:    existing.meetingTime    || '10:00',
    construction:   existing.construction  || '',
    supervisor:     existing.supervisor    ?? '',
    rank:           existing.rank          || '',
    note:           existing.note          || '',
    chatworkSentAt: existing.chatworkSentAt || null,
    zoomUrl:        existing.zoomUrl        || '',
    zoomMeetingId:  existing.zoomMeetingId  || '',
    gmailDraftedAt: existing.gmailDraftedAt || null,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(!!existing.chatworkSentAt);
  const [preview,     setPreview]     = useState(false);
  const [editMessage, setEditMessage] = useState(null);

  const appointmentInfo = { ...form };
  const message = buildChatworkMessage({ ...lead, appointmentInfo, listName });

  const handleTogglePreview = () => {
    if (!preview) setEditMessage(message); // 開くたびに最新内容で初期化
    setPreview(v => !v);
  };

  const validate = () => {
    if (!form.confirmedDate || !form.meetingDate) {
      alert('商談獲得日と商談日時を入力してください');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    await onSave({ ...lead, appointmentInfo });
    onClose();
  };

  const handleSendChatwork = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      await sendChatwork(editMessage ?? message);
      const sentAt = new Date().toISOString();
      const updated = { ...lead, appointmentInfo: { ...appointmentInfo, chatworkSentAt: sentAt } };
      await onSave(updated);
      set('chatworkSentAt', sentAt);
      setSent(true);
      alert('Chatworkに送信しました！');
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 560 }}>
        <div style={S.modalHead}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#174f35' }}>アポ獲得情報の入力</span>
          <button onClick={onClose} style={S.closeX}>✕</button>
        </div>

        <div style={{ ...S.modalBody, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14 }}>

          {/* リスト・企業情報（読み取り専用） */}
          <div style={{ background: '#f0f5f2', border: '1px solid #c0dece', borderRadius: 8, padding: '10px 14px', fontSize: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {listName  && <div><span style={{ color: '#6a9a7a' }}>リスト：</span><span style={{ color: '#174f35', fontWeight: 600 }}>{listName}</span></div>}
            <div><span style={{ color: '#6a9a7a' }}>企業名：</span><span style={{ color: '#174f35', fontWeight: 600 }}>{lead.company}</span></div>
            {(lead.contact || lead.position) && (
              <div><span style={{ color: '#6a9a7a' }}>役職/氏名：</span><span style={{ color: '#174f35' }}>{[lead.position, lead.contact].filter(Boolean).join(' / ')}</span></div>
            )}
            {lead.phone && (
              <div><span style={{ color: '#6a9a7a' }}>電話番号：</span><span style={{ color: '#174f35' }}>{lead.phone}</span></div>
            )}
            {lead.mobile && (
              <div><span style={{ color: '#6a9a7a' }}>携帯番号：</span><span style={{ color: '#174f35' }}>{lead.mobile}</span></div>
            )}
            {lead.email && (
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#6a9a7a' }}>メールアドレス：</span><span style={{ color: '#174f35' }}>{lead.email}</span></div>
            )}
          </div>

          {/* 商談獲得日・商談日時 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div>
              <label style={S.lbl}>商談獲得日 <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" value={form.confirmedDate} onChange={e => set('confirmedDate', e.target.value)} style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>商談日時 <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="date" value={form.meetingDate} onChange={e => set('meetingDate', e.target.value)} style={{ ...S.inp, flex: 1 }} />
                <select value={form.meetingTime} onChange={e => set('meetingTime', e.target.value)} style={{ ...S.sel, width: 90 }}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 営業担当者 */}
          <div>
            <label style={S.lbl}>営業担当者</label>
            <select value={form.salesPerson} onChange={e => set('salesPerson', e.target.value)} style={S.sel}>
              <option value="">選択してください</option>
              {salesMembers.map((name, i) => (
                <option key={i} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 住所・会社HP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={S.lbl}>住所</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="例: 大阪府大阪市〇〇区" style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>会社HP</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="例: https://example.com" style={S.inp} />
            </div>
          </div>

          {/* 工事内容 */}
          <div>
            <label style={S.lbl}>工事内容</label>
            <textarea value={form.construction} onChange={e => set('construction', e.target.value)} rows={2} placeholder="例: 外壁塗装・屋根工事" style={{ ...S.inp, resize: 'vertical' }} />
          </div>

          {/* 現場監督常駐・ランク */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div>
              <label style={{ ...S.lbl, fontSize: 13 }}>現場に監督常駐している？</label>
              <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
                {[['yes', 'はい'], ['no', 'いいえ'], ['unknown', '不明']].map(([v, label]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#2d6b4a', cursor: 'pointer' }}>
                    <input type="radio" name="supervisor" value={v} checked={form.supervisor === v} onChange={() => set('supervisor', v)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ ...S.lbl, fontSize: 13 }}>ランク</label>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                {RANK_OPTIONS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#2d6b4a', cursor: 'pointer' }}>
                    <input type="radio" name="rank" value={r} checked={form.rank === r} onChange={() => set('rank', r)} />
                    {r}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 備考 */}
          <div>
            <label style={S.lbl}>【概要】</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="例: 〇〇について関心あり" style={{ ...S.inp, resize: 'vertical' }} />
          </div>

          {/* Chatworkメッセージプレビュー（編集可） */}
          <div>
            <button onClick={handleTogglePreview}
              style={{ background: 'none', border: 'none', color: '#059669', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>
              {preview ? '▲ 送信内容を閉じる' : '▼ 送信内容を確認・編集する'}
            </button>
            {preview && (
              <>
                <div style={{ fontSize: 12, color: '#6a9a7a', marginTop: 6, marginBottom: 4 }}>内容を直接編集できます</div>
                <textarea
                  value={editMessage ?? ''}
                  onChange={e => setEditMessage(e.target.value)}
                  rows={14}
                  style={{ ...S.inp, fontSize: 13, whiteSpace: 'pre-wrap', resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                />
              </>
            )}
          </div>

          {sent && (
            <div style={{ background: '#d1fae5', border: '1px solid #10b98155', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#059669', fontWeight: 700 }}>
              ✓ Chatwork送信済み（{form.chatworkSentAt?.slice(0, 10)}）
            </div>
          )}
        </div>

        <div style={S.modalFoot}>
          <button onClick={onClose} style={S.btnSec}>キャンセル</button>
          <button onClick={handleSave} style={S.btnSec}>保存のみ</button>
          <button onClick={handleSendChatwork} disabled={sending}
            style={{ ...S.btnP, opacity: sending ? 0.6 : 1 }}>
            {sending ? '送信中...' : (sent ? '再送信' : 'Chatworkに送信')}
          </button>
        </div>
      </div>
    </div>
  );
}
