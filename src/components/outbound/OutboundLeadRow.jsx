// 架電リストの1行コンポーネント（表示・架電記録・項目編集・Zoom入力・Gmail下書き）
import { useState } from 'react';
import { S } from '../../styles/index.js';
import { PhoneCallIcon, MobileIcon, EnvelopeIcon, MemoIcon } from '../ui/icons/NavIcons.jsx';
import { acquireGmailToken, buildGmailDraftRaw, postGmailDraft } from '../../lib/oauth.js';
import { getEffectiveAiConfig } from '../../lib/accounts.js';
import { getMaster } from '../../lib/master.js';
import { GmailDraftModal } from './GmailDraftModal.jsx';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function applyTplVars(tpl, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v || ''), tpl);
}

const STATUSES = ['未架電', '留守', '再架電', '折り返し待ち', '担当者不在', 'お断り', 'アポ獲得'];

const STATUS_COLOR = {
  '未架電':       { color: '#6a9a7a', bg: '#f0f5f2' },
  '留守':         { color: '#f59e0b', bg: '#fef9ec' },
  '再架電':       { color: '#3b82f6', bg: '#eff6ff' },
  '折り返し待ち': { color: '#8b5cf6', bg: '#f5f3ff' },
  '担当者不在':   { color: '#0891b2', bg: '#ecfeff' },
  'お断り':       { color: '#ef4444', bg: '#fef2f2' },
  'アポ獲得':     { color: '#059669', bg: '#d1fae5' },
};

// 編集フォーム（基本情報の修正）
function EditPanel({ lead, onSave, onCancel }) {
  const [form, setForm] = useState({
    company:  lead.company  || '',
    contact:  lead.contact  || '',
    position: lead.position || '',
    phone:    lead.phone    || '',
    mobile:   lead.mobile   || '',
    email:    lead.email    || '',
    industry: lead.industry || '',
    memo:     lead.memo     || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #e2f0e8', background: '#f8fbf9' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
        <div>
          <label style={S.lbl}>会社名 <span style={{ color: '#ef4444' }}>*</span></label>
          <input value={form.company} onChange={e => set('company', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>業種</label>
          <input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="例: IT・通信" style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>担当者名</label>
          <input value={form.contact} onChange={e => set('contact', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>役職</label>
          <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="例: 部長" style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>電話番号</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>携帯番号</label>
          <input value={form.mobile} onChange={e => set('mobile', e.target.value)} style={S.inp} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={S.lbl}>メールアドレス</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} style={S.inp} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={S.lbl}>メモ</label>
          <input value={form.memo} onChange={e => set('memo', e.target.value)} style={S.inp} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={S.btnSec}>キャンセル</button>
        <button onClick={() => { if (!form.company.trim()) { alert('会社名は必須です'); return; } onSave(form); }}
          style={S.btnP}>保存</button>
      </div>
    </div>
  );
}

export function OutboundLeadRow({ lead, canWrite, canEdit, selected, onToggleSelect, onUpdate, onOpenAppointment, currentUser }) {
  const [mode, setMode]             = useState(null); // null | 'record' | 'edit' | 'zoom'
  const [method, setMethod]         = useState('phone');
  const [memo, setMemo]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [memoOpen, setMemoOpen]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [zoomText, setZoomText] = useState(lead.appointmentInfo?.zoomText || '');
  const [gmailSending,  setGmailSending]  = useState(false);
  const [gmailToken,    setGmailToken]    = useState(null);
  const [gmailPreview,  setGmailPreview]  = useState(null); // null | { subject, body, to }

  const sc       = STATUS_COLOR[lead.status] || STATUS_COLOR['未架電'];
  const lastCall = lead.callHistory?.[0];

  const handleRecord = async () => {
    setSaving(true);
    const entry = {
      id: `ch_${Date.now()}`,
      date: new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }) + ' ' +
            new Date().toLocaleTimeString('sv', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }),
      method,
      result: lead.status,
      memo,
    };
    await onUpdate({ ...lead, callHistory: [entry, ...(lead.callHistory || [])] });
    setMemo(''); setSaving(false); setMode(null);
  };

  const handleEditSave = async (fields) => {
    setSaving(true);
    await onUpdate({ ...lead, ...fields });
    setSaving(false); setMode(null);
  };

  const handleStatusChange = (newStatus) => {
    const update = { ...lead, status: newStatus };
    // アポ獲得になった時点でdealStatusを初期化
    if (newStatus === 'アポ獲得' && !lead.appointmentInfo?.dealStatus) {
      update.appointmentInfo = { ...(lead.appointmentInfo || {}), dealStatus: '商談確定' };
    }
    onUpdate(update);
  };

  // Zoom情報を保存
  const handleSaveZoom = async () => {
    if (!zoomText.trim()) { alert('Zoom情報を入力してください'); return; }
    await onUpdate({ ...lead, appointmentInfo: { ...(lead.appointmentInfo || {}), zoomText: zoomText.trim() } });
    setMode(null);
  };

  // テンプレート変数を展開してプレビューモーダルを開く
  const handleOpenGmailPreview = () => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId || currentUser?.gmailClientId;
    if (!clientId) {
      alert('Gmail連携が設定されていません。設定＞マイアカウントでGmailクライアントIDを登録してください。');
      return;
    }
    const ai = lead.appointmentInfo || {};
    const meetingDate = ai.meetingDate || '';
    const meetingTime = ai.meetingTime || '';
    const weekday = meetingDate ? WEEKDAYS[new Date(meetingDate + 'T00:00:00').getDay()] : '';
    const dateStr = meetingDate ? `${meetingDate}（${weekday}） ${meetingTime}〜` : '';

    const tpl = getMaster().outboundEmailTpl || {};
    const vars = {
      担当者名:   lead.contact || 'ご担当者',
      企業名:    lead.company,
      商談日時:  dateStr,
      Zoomリンク: ai.zoomText || '',
      商談担当:  ai.salesPerson || '',
      送信者名:  currentUser?.name || '',
      署名:      currentUser?.signature || '',
    };
    setGmailPreview({
      to:      lead.email || '',
      subject: applyTplVars(tpl.subject || '', vars),
      body:    applyTplVars(tpl.body || '', vars),
    });
  };

  // プレビューで確認後、実際にGmail下書きを保存する
  const handleSendGmailDraft = async (subject, body) => {
    const clientId = getEffectiveAiConfig(currentUser).gmailClientId || currentUser?.gmailClientId;
    setGmailSending(true);
    try {
      const tokenObj = await acquireGmailToken(clientId, gmailToken);
      setGmailToken(tokenObj);
      const raw = buildGmailDraftRaw(gmailPreview.to, subject, body);
      await postGmailDraft(tokenObj.token, raw);
      const draftedAt = new Date().toISOString();
      await onUpdate({ ...lead, appointmentInfo: { ...(lead.appointmentInfo || {}), gmailDraftedAt: draftedAt } });
      setGmailPreview(null);
      alert('Gmailに下書きを保存しました！');
    } catch (e) {
      alert(e.message);
    } finally {
      setGmailSending(false);
    }
  };

  return (
    <>
    <div style={{ background: selected ? '#f0fdf4' : '#fff', border: `1px solid ${selected ? '#10b98155' : '#e2f0e8'}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden', transition: 'background 0.1s' }}>
      {/* メイン行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(lead.id)}
            onClick={e => e.stopPropagation()}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#059669', flexShrink: 0 }}
          />
        )}

        {/* 会社名・担当者・役職・業種 */}
        <div style={{ width: 600, flexShrink: 0, minWidth: 0 }}>
          {(lead.industry || lead.address) && (
            <div style={{ fontSize: 12, color: '#6a9a7a', marginBottom: 2 }}>
              {[lead.industry, lead.address].filter(Boolean).join('　')}
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, color: '#174f35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.company}
          </div>
          {(lead.contact || lead.position) && (
            <div style={{ fontSize: 14, color: '#6a9a7a', marginTop: 2 }}>
              {[lead.contact, lead.position].filter(Boolean).join(' / ')}
            </div>
          )}
          {lead.memo && (
            <div
              onClick={() => setMemoOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#3d7a5e', marginTop: 3, cursor: 'pointer' }}
            >
              <MemoIcon size={13} color="#3d7a5e" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                {lead.memo}
              </span>
              <span style={{ color: '#6a9a7a', flexShrink: 0 }}>{memoOpen ? '▲' : '▼'}</span>
            </div>
          )}
        </div>

        {/* 電話・携帯・メール（横並び・固定幅で開始位置を揃える） */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <span style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#059669', fontWeight: 700, fontSize: 14, overflow: 'hidden' }}>
            {lead.phone ? <><PhoneCallIcon size={15} color="#059669" />{lead.phone}</> : null}
          </span>
          <span style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#0284c7', fontWeight: 700, fontSize: 14, overflow: 'hidden' }}>
            {lead.mobile ? <><MobileIcon size={15} color="#0284c7" />{lead.mobile}</> : null}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, color: '#6a9a7a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.email ? <><EnvelopeIcon size={15} color="#6a9a7a" />{lead.email}</> : null}
          </span>
        </div>

        {/* ステータス（業務委託のみ編集、IS以上は読み取り表示） */}
        {currentUser?.role === 'outbound' ? (
          <select value={lead.status} onChange={e => handleStatusChange(e.target.value)}
            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}55`, borderRadius: 6, padding: '5px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}55`, borderRadius: 6, padding: '5px 10px', fontSize: 13, fontWeight: 700 }}>
            {lead.status}
          </span>
        )}

        {/* アポ情報入力ボタン（業務委託のみ） */}
        {lead.status === 'アポ獲得' && currentUser?.role === 'outbound' && (
          <button onClick={() => onOpenAppointment(lead)}
            style={{ background: '#d1fae5', color: '#059669', border: '1px solid #10b98155', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            アポ情報入力
          </button>
        )}

        {/* 操作ボタン群（左列: 記録/Zoom、右列: 編集/Gmail） */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {/* 左列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {currentUser?.role === 'outbound' && (
              <button onClick={() => setMode(mode === 'record' ? null : 'record')}
                style={{ ...S.btnSec, fontSize: 13, padding: '5px 12px' }}>
                {mode === 'record' ? '閉じる' : '記録する'}
              </button>
            )}
            {canEdit && lead.status === 'アポ獲得' && lead.appointmentInfo?.meetingDate && (
              <button onClick={() => setMode(mode === 'zoom' ? null : 'zoom')}
                style={{ background: mode === 'zoom' ? '#eff6ff' : '#f0f9ff', color: '#0284c7', border: '1px solid #bfdbfe', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {mode === 'zoom' ? '閉じる' : 'Zoom入力'}
              </button>
            )}
            {canEdit && lead.appointmentInfo?.zoomText && (
              <button onClick={handleOpenGmailPreview}
                style={{ background: '#fef2f2', color: '#ea4335', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Gmail下書き
              </button>
            )}
          </div>
          {/* 右列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {canEdit && lead.status !== 'アポ獲得' && (
              <button onClick={() => setMode(mode === 'edit' ? null : 'edit')}
                style={{ background: 'none', border: '1px solid #c0dece', borderRadius: 6, padding: '5px 12px', fontSize: 13, color: '#6a9a7a', cursor: 'pointer', fontFamily: 'inherit' }}>
                {mode === 'edit' ? '閉じる' : '編集'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* メモ展開 */}
      {lead.memo && memoOpen && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2f0e8', background: '#f8fbf9', fontSize: 12, color: '#3d7a5e', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
          {lead.memo}
        </div>
      )}

      {/* 最終架電履歴（クリックで全履歴展開） */}
      {lastCall && mode !== 'record' && (
        <>
          <div
            onClick={() => setHistoryOpen(v => !v)}
            style={{ padding: '5px 14px 7px', borderTop: '1px solid #f0f5f2', fontSize: 12, color: '#6a9a7a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
          >
            <span>
              最終: {lastCall.date} ／ {lastCall.method === 'phone' ? '電話' : 'メール'} ／ {lastCall.result}
              {lastCall.memo && <span style={{ marginLeft: 6, color: '#3d7a5e' }}>「{lastCall.memo}」</span>}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8, flexShrink: 0 }}>
              {lead.callHistory.length > 1 && `全${lead.callHistory.length}件`} {historyOpen ? '▲' : '▼'}
            </span>
          </div>
          {historyOpen && (
            <div style={{ padding: '8px 14px 10px', borderTop: '1px solid #f0f5f2', background: '#f8fbf9' }}>
              <div style={{ fontSize: 11, color: '#6a9a7a', fontWeight: 700, marginBottom: 6 }}>架電履歴</div>
              {lead.callHistory.map(h => (
                <div key={h.id} style={{ fontSize: 12, color: '#3d7a5e', padding: '5px 0', borderBottom: '1px solid #f0f5f2', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: '#6a9a7a', whiteSpace: 'nowrap', flexShrink: 0 }}>{h.date}</span>
                  <span style={{ flexShrink: 0 }}>{h.method === 'phone' ? '📞 電話' : '📧 メール'}</span>
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>{h.result}</span>
                  {h.memo && <span style={{ color: '#6a9a7a' }}>「{h.memo}」</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 架電記録フォーム */}
      {mode === 'record' && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #e2f0e8', background: '#f8fbf9' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <label style={S.lbl}>連絡手段</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...S.sel, fontSize: 12, padding: '6px 10px' }}>
                <option value="phone">電話</option>
                <option value="email">メール</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={S.lbl}>メモ（任意）</label>
              <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="例: 折り返し15時以降希望" style={S.inp} />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={handleRecord} disabled={saving}
                style={{ ...S.btnP, fontSize: 12, padding: '8px 14px', opacity: saving ? 0.6 : 1 }}>
                {saving ? '保存中...' : '記録する'}
              </button>
            </div>
          </div>
          {lead.callHistory?.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid #e2f0e8', paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: '#6a9a7a', fontWeight: 700, marginBottom: 4 }}>架電履歴</div>
              {lead.callHistory.map(h => (
                <div key={h.id} style={{ fontSize: 11, color: '#3d7a5e', padding: '3px 0', borderBottom: '1px solid #f0f5f2' }}>
                  {h.date} ／ {h.method === 'phone' ? '電話' : 'メール'} ／ {h.result}
                  {h.memo && <span style={{ marginLeft: 6, color: '#6a9a7a' }}>「{h.memo}」</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 項目編集フォーム */}
      {mode === 'edit' && (
        <EditPanel
          lead={lead}
          onSave={handleEditSave}
          onCancel={() => setMode(null)}
        />
      )}

      {/* Zoom入力フォーム */}
      {mode === 'zoom' && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #bfdbfe', background: '#f0f9ff' }}>
          <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 700, marginBottom: 6 }}>Zoom ミーティング情報</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            以下の形式でZoom情報を貼り付けてください：<br />
            <code style={{ background: '#e0f2fe', borderRadius: 3, padding: '1px 5px' }}>Zoom ミーティングに参加する</code>
            {' → URL → '}
            <code style={{ background: '#e0f2fe', borderRadius: 3, padding: '1px 5px' }}>ミーティングID: xxx</code>
          </div>
          <textarea
            value={zoomText}
            onChange={e => setZoomText(e.target.value)}
            rows={4}
            placeholder={`Zoom ミーティングに参加する\nhttps://us06web.zoom.us/j/8888888888\nミーティングID: 888 8888 8888`}
            style={{ ...S.inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 12, width: '100%', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handleSaveZoom}
              style={{ ...S.btnP, fontSize: 12, padding: '8px 14px' }}>
              保存
            </button>
          </div>
        </div>
      )}
    </div>

    {gmailPreview && (
      <GmailDraftModal
        to={gmailPreview.to}
        initialSubject={gmailPreview.subject}
        initialBody={gmailPreview.body}
        onSend={handleSendGmailDraft}
        onClose={() => setGmailPreview(null)}
      />
    )}
    </>
  );
}
