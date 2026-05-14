// 相談ボードページ（手動フラグ + 自動ピックアップ）
import { useState, useMemo } from 'react';
import { IS_COLORS, getStatusColor, getStatuses } from '../lib/master.js';
import { TODAY } from '../lib/holidays.js';
import { detectUnreachable, detectStalled, buildConsultationPrompt, extractText, ACTION_TYPE_LABEL } from '../lib/isReport.js';
import { analyzeWithAI } from '../lib/ai.js';
import { GearIcon, ChatIcon, SparkleIcon } from '../components/ui/Icons.jsx';
import { uid } from '../constants/index.js';

const STORAGE_KEY = 'consultation_settings';

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      stalledDays:          typeof s.stalledDays          === 'number'  ? s.stalledDays          : 14,
      minActions:           typeof s.minActions           === 'number'  ? s.minActions           : 2,
      excludeStatuses:      Array.isArray(s.excludeStatuses)            ? s.excludeStatuses      : [],
      stalledNoNextAction:  typeof s.stalledNoNextAction  === 'boolean' ? s.stalledNoNextAction  : false,
      stalledOverdueAction: typeof s.stalledOverdueAction === 'boolean' ? s.stalledOverdueAction : false,
      stalledLastFailed:    typeof s.stalledLastFailed    === 'boolean' ? s.stalledLastFailed    : false,
      minNurturing:         typeof s.minNurturing         === 'number'  ? s.minNurturing         : 3,
      minFollowupEnd:       typeof s.minFollowupEnd       === 'number'  ? s.minFollowupEnd       : 3,
    };
  } catch {
    return { stalledDays: 14, minActions: 2, minNurturing: 3, minFollowupEnd: 3, excludeStatuses: [], stalledNoNextAction: false, stalledOverdueAction: false, stalledLastFailed: false };
  }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const SECTIONS = [
  { key: 'flagged',     label: '相談フラグあり',     color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b33' },
  { key: 'stalled',     label: '停滞中',             color: '#8b5cf6', bg: '#faf5ff', border: '#8b5cf633' },
  { key: 'nurturing',   label: 'ナーチャリング候補', color: '#0891b2', bg: '#ecfeff', border: '#0891b233' },
  { key: 'followupEnd', label: '追客終了候補',       color: '#64748b', bg: '#f8fafc', border: '#64748b33' },
];

function buildCardSummary(actions) {
  if (!actions || actions.length === 0) return '';
  const sorted = [...actions]
    .filter(a => a.type !== 'consultation' && a.date)
    .sort((a, b) =>
      (String(b.date) + (b.time || '')).localeCompare(String(a.date) + (a.time || ''))
    );
  if (sorted.length === 0) return '';
  const last = sorted[0];
  const date = last.date.slice(5).replace('-', '/');
  const type = ACTION_TYPE_LABEL[last.type] || last.type || '';
  const result = last.result || '';
  const memo = extractText(last.summary || '');
  return [date, type, result, memo].filter(Boolean).join('  ');
}

function extractAIText(data) {
  if (!data?.candidates?.[0]?.content) return '';
  const raw = (data.candidates[0].content.parts || []).map(i => i.text || '').join('').trim();
  // APIがJSON形式で返す場合、使えるテキストフィールドを取り出す
  try {
    const parsed = JSON.parse(raw);
    return parsed.memo_for_zoho || parsed.action_summary || raw;
  } catch {
    return raw;
  }
}

// 相談メモ編集パネル（カード内インライン）
function ConsultEditor({ lead, section, onUpdate, onClose }) {
  const [aiText, setAiText]   = useState(lead.consultation_ai_summary || '');
  const [note, setNote]       = useState(lead.consultation_note || '');
  const [advice, setAdvice]   = useState(lead.consultation_advice || '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyzeWithAI(buildConsultationPrompt(lead, section.key));
      const text = extractAIText(data);
      if (!text) throw new Error('AIからの応答が空でした');
      setAiText(text);
    } catch {
      setError('AI生成に失敗しました。しばらく待って再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    onUpdate({ consultation_ai_summary: aiText, consultation_note: note, consultation_advice: advice });
    onClose();
  };

  const textareaBase = {
    fontSize: 13, color: '#174f35', border: '1px solid #c6dfd0',
    borderRadius: 6, padding: '6px 9px', resize: 'vertical',
    fontFamily: 'inherit', lineHeight: 1.6, width: '100%', boxSizing: 'border-box',
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ borderTop: '1px solid #e2f0e8', marginTop: 4, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {/* 相談前メモ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6a9a7a', letterSpacing: '0.05em' }}>相談前メモ</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: '#fff',
            background: loading ? '#a7bfb5' : 'linear-gradient(135deg,#059669,#047857)',
            border: 'none', borderRadius: 6, padding: '9px 14px',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          <SparkleIcon size={12} color="#fff" />
          {loading ? '生成中…' : 'AI相談ドラフト生成'}
        </button>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>上長への相談文を自動生成します</span>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', borderRadius: 5, padding: '4px 8px' }}>
          {error}
        </div>
      )}

      <textarea
        value={aiText}
        onChange={e => setAiText(e.target.value)}
        placeholder="AI生成ボタンで自動生成、または直接入力"
        rows={3}
        style={{ ...textareaBase, background: '#f8fbf9' }}
      />

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="補足メモ（スパイス）"
        rows={2}
        style={{ ...textareaBase, background: '#fff' }}
      />

      {/* 相談メモ（相談後） */}
      <div style={{ borderTop: '1px solid #d8ede1', paddingTop: 8, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.05em' }}>相談メモ</div>
        <textarea
          value={advice}
          onChange={e => setAdvice(e.target.value)}
          placeholder=""
          rows={2}
          style={{ ...textareaBase, background: '#f0fdf4', border: '1px solid #86efac' }}
        />
      </div>

      {/* 保存・キャンセル */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: '#6a9a7a', background: 'transparent', border: '1px solid #d8ede1', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          キャンセル
        </button>
        <button
          onClick={save}
          style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#059669', border: 'none', borderRadius: 5, padding: '9px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function LeadCard({ lead, section, onOpenLead, onUpdate, onCompleted, compact }) {
  const [showEditor, setShowEditor] = useState(false);
  const c  = IS_COLORS[lead.is_member] || { bg: '#3d7a5e' };

  const handleComplete = e => {
    e.stopPropagation();
    const existingActions = lead.actions || [];
    const patch = {
      consultation_completed: true,
      consultation_completed_actions: existingActions.length,
      consultation_ai_summary: '',
      consultation_note: '',
      consultation_advice: '',
    };
    if (lead.consultation_advice) {
      const consultAction = {
        id: uid(),
        type: 'consultation',
        result: '',
        date: new Date().toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' }),
        summary: lead.consultation_advice,
      };
      patch.actions = [consultAction, ...existingActions];
      patch.consultation_completed_actions = existingActions.length + 1;
    }
    if (section.key === 'flagged') patch.consultation_flag = false;
    onUpdate(patch);
    onCompleted?.();
  };
  const sc = getStatusColor(lead.status);
  const summary          = buildCardSummary(lead.actions);
  const calls            = (lead.actions || []).filter(a => a.type === 'call');
  const callCount        = calls.length;
  const unreachableCount = calls.filter(a => a.result === '不在' || a.result === '不通').length;
  const overdue  = lead.next_action_date && lead.next_action_date < TODAY;
  const isToday  = lead.next_action_date === TODAY;
  const nextColor = overdue ? '#ef4444' : isToday ? '#059669' : '#6a9a7a';
  const hasMemo   = lead.consultation_ai_summary || lead.consultation_note || lead.consultation_advice;

  return (
    <div
      onClick={() => { if (!showEditor) onOpenLead(lead.id); }}
      style={{
        background: '#fff',
        border: `1px solid ${section.border}`,
        borderLeft: `3px solid ${section.color}`,
        borderRadius: 8,
        padding: '12px 14px',
        cursor: showEditor ? 'default' : 'pointer',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 1px 4px #0001',
      }}
    >
      {/* 会社名 */}
      <div style={{ fontSize: 15, fontWeight: 800, color: '#174f35', lineHeight: 1.3, wordBreak: 'break-all' }}>
        {lead.company || '（会社名未設定）'}
      </div>

      {/* 担当者 + ステータス + 架電数 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {lead.is_member && (
          <span style={{ fontSize: 12, fontWeight: 700, color: c.bg, background: c.bg + '15', border: `1px solid ${c.bg}44`, borderRadius: 5, padding: '1px 8px', whiteSpace: 'nowrap' }}>
            {lead.is_member}
          </span>
        )}
        {lead.status && (
          <span style={{ fontSize: 12, fontWeight: 700, color: sc, background: sc + '15', border: `1px solid ${sc}44`, borderRadius: 5, padding: '1px 8px', whiteSpace: 'nowrap' }}>
            {lead.status}
          </span>
        )}
      </div>

      {/* 不在・不通回数 */}
      {callCount > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6' }}>
          不在・不通 {unreachableCount} / 架電 {callCount}
        </div>
      )}

      {/* 現状（3行）*/}
      {!compact && (
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6a9a7a', flexShrink: 0, marginTop: 2 }}>現状</span>
        <span style={{
          fontSize: 13, color: '#4a8060', lineHeight: 1.6, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {summary || '（アクション履歴なし）'}
        </span>
      </div>
      )}

      {/* 保存済み相談メモ */}
      {!compact && hasMemo && !showEditor && (
        <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d033', borderRadius: 6, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lead.consultation_ai_summary && (
            <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
              {lead.consultation_ai_summary}
            </div>
          )}
          {lead.consultation_note && (
            <div style={{ fontSize: 12, color: '#92400e' }}>
              {lead.consultation_note}
            </div>
          )}
          {lead.consultation_advice && (
            <div style={{ fontSize: 12, color: '#065f46', background: '#ecfdf5', borderRadius: 4, padding: '4px 8px', borderLeft: '3px solid #059669' }}>
              <span style={{ fontWeight: 700, marginRight: 4 }}>相談メモ:</span>{lead.consultation_advice}
            </div>
          )}
        </div>
      )}

      {/* 次アクション + ボタン行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>NEXT</span>
          {lead.next_action_date ? (
            <>
              {overdue && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #ef444433', borderRadius: 3, padding: '0 5px' }}>期限切れ</span>}
              {isToday && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #05966933', borderRadius: 3, padding: '0 5px' }}>本日</span>}
              <span style={{ fontSize: 13, fontWeight: 600, color: nextColor }}>
                {lead.next_action_date.slice(5).replace('-', '/')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#c0dece' }}>未設定</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <button
            onClick={e => { e.stopPropagation(); setShowEditor(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 700,
              color: showEditor ? '#fff' : '#059669',
              background: showEditor ? '#059669' : 'transparent',
              border: '1px solid #059669', borderRadius: 5, padding: '8px 12px',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <SparkleIcon size={11} color={showEditor ? '#fff' : '#059669'} />
            相談メモ
          </button>
          <button
            onClick={handleComplete}
            style={{
              fontSize: 12, fontWeight: 700, color: '#fff',
              background: '#6a9a7a', border: 'none',
              borderRadius: 5, padding: '8px 14px',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            完了
          </button>
        </div>
      </div>

      {/* インラインエディタ */}
      {showEditor && (
        <ConsultEditor
          lead={lead}
          section={section}
          onUpdate={onUpdate}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

// 設定パネル
function SettingsPanel({ settings, onChange, onClose }) {
  const [draft, setDraft] = useState({ minActions: 2, ...settings });
  const allStatuses = getStatuses();

  const apply = () => {
    const next = {
      stalledDays:          Math.max(1, Math.min(999, Number(draft.stalledDays)    || 14)),
      minActions:           Math.max(1, Math.min(99,  Number(draft.minActions)     || 2)),
      minNurturing:         Math.max(1, Math.min(99,  Number(draft.minNurturing)   || 3)),
      minFollowupEnd:       Math.max(1, Math.min(99,  Number(draft.minFollowupEnd) || 3)),
      excludeStatuses:      draft.excludeStatuses || [],
      stalledNoNextAction:  !!draft.stalledNoNextAction,
      stalledOverdueAction: !!draft.stalledOverdueAction,
      stalledLastFailed:    !!draft.stalledLastFailed,
    };
    saveSettings(next);
    onChange(next);
    onClose();
  };

  const toggleStatus = s => {
    setDraft(d => {
      const cur = d.excludeStatuses || [];
      return { ...d, excludeStatuses: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] };
    });
  };

  const inputStyle = { fontSize: 13, padding: '3px 6px', border: '1px solid #d8ede1', borderRadius: 5, textAlign: 'center', fontFamily: 'inherit', color: '#174f35' };
  const checkLabelStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#174f35', cursor: 'pointer' };

  const card = (color, bg, border) => ({
    flex: '1 1 200px', borderRadius: 8, padding: '10px 14px',
    background: bg, border: `1px solid ${border}`,
    display: 'flex', flexDirection: 'column', gap: 7,
  });
  const cardTitle = (color) => ({
    fontSize: 12, fontWeight: 800, color, letterSpacing: '0.05em',
    paddingBottom: 4, borderBottom: `1px solid ${color}33`, marginBottom: 2,
  });

  return (
    <div style={{ padding: '12px 24px 14px', background: '#fff', borderBottom: '1px solid #e2f0e8', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* 停滞中 */}
        <div style={card('#8b5cf6', '#faf5ff', '#8b5cf644')}>
          <div style={cardTitle('#8b5cf6')}>停滞中</div>
          <label style={{ ...checkLabelStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <input type="number" min="1" max="999" value={draft.stalledDays}
                onChange={e => setDraft(d => ({ ...d, stalledDays: e.target.value }))}
                style={{ ...inputStyle, width: 54 }} />
              日以上アクションなし
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>（最後のアクション日から）</span>
          </label>
          <label style={checkLabelStyle}>
            <input type="checkbox" checked={!!draft.stalledLastFailed}
              onChange={e => setDraft(d => ({ ...d, stalledLastFailed: e.target.checked }))}
              style={{ accentColor: '#8b5cf6' }} />
            前回が不在・不通のみ絞る
          </label>
          <label style={checkLabelStyle}>
            <input type="checkbox" checked={!!draft.stalledNoNextAction}
              onChange={e => setDraft(d => ({ ...d, stalledNoNextAction: e.target.checked }))}
              style={{ accentColor: '#8b5cf6' }} />
            次アクション未設定も含む
          </label>
          <label style={checkLabelStyle}>
            <input type="checkbox" checked={!!draft.stalledOverdueAction}
              onChange={e => setDraft(d => ({ ...d, stalledOverdueAction: e.target.checked }))}
              style={{ accentColor: '#8b5cf6' }} />
            次アクション期限切れも含む
          </label>
        </div>

        {/* ナーチャリング候補 */}
        <div style={card('#0891b2', '#ecfeff', '#0891b244')}>
          <div style={cardTitle('#0891b2')}>ナーチャリング候補</div>
          <label style={{ ...checkLabelStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              直近
              <input type="number" min="1" max="99" value={draft.minNurturing ?? 3}
                onChange={e => setDraft(d => ({ ...d, minNurturing: e.target.value }))}
                style={{ ...inputStyle, width: 46 }} />
              回の架電がすべて不在/不通
            </span>
            <span style={{ fontSize: 12, color: '#6a9a7a' }}>（ステータスがナーチャリング以外）</span>
          </label>
        </div>

        {/* 追客終了候補 */}
        <div style={card('#64748b', '#f8fafc', '#64748b44')}>
          <div style={cardTitle('#64748b')}>追客終了候補</div>
          <label style={{ ...checkLabelStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              直近
              <input type="number" min="1" max="99" value={draft.minFollowupEnd ?? 3}
                onChange={e => setDraft(d => ({ ...d, minFollowupEnd: e.target.value }))}
                style={{ ...inputStyle, width: 46 }} />
              回の架電がすべて不在/不通
            </span>
            <span style={{ fontSize: 12, color: '#6a9a7a' }}>（ステータスがナーチャリングのもの）</span>
          </label>
        </div>

        {/* 共通条件 */}
        <div style={card('#059669', '#f0fdf4', '#05966944')}>
          <div style={cardTitle('#059669')}>共通条件</div>
          <label style={checkLabelStyle}>
            アクション履歴が
            <input type="number" min="1" max="99" value={draft.minActions ?? 2}
              onChange={e => setDraft(d => ({ ...d, minActions: e.target.value }))}
              style={{ ...inputStyle, width: 46 }} />
            件以上
          </label>
        </div>

        <button onClick={apply}
          style={{ fontSize: 13, color: '#fff', background: '#059669', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-end', fontWeight: 700 }}>
          適用
        </button>
      </div>

      {/* 除外するステータス */}
      {allStatuses.length > 0 && (
        <div style={{ borderTop: '1px solid #e2f0e8', paddingTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6a9a7a', marginBottom: 6 }}>
            除外するステータス
            <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>選択したステータスは自動ピックアップしない</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allStatuses.map(s => {
              const checked = (draft.excludeStatuses || []).includes(s);
              return (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer',
                  background: checked ? '#ecfdf5' : '#f8fbf9',
                  border: `1px solid ${checked ? '#059669' : '#d8ede1'}`,
                  borderRadius: 5, padding: '3px 9px',
                  color: checked ? '#059669' : '#6a9a7a',
                  fontWeight: checked ? 700 : 400, userSelect: 'none',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleStatus(s)}
                    style={{ margin: 0, accentColor: '#059669' }} />
                  {s}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConsultationPage({ leads, onOpenLead, onUpdate }) {
  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const { flagged, stalled, nurturing, followupEnd } = useMemo(() => {
    const flagged = [];
    const stalled = [];
    const nurturing = [];
    const followupEnd = [];
    const seen = new Set();

    // 完了済み：完了時より多くアクションが追加されるまでは非表示（削除は無視）
    const isCompleted = l =>
      l.consultation_completed &&
      (l.actions || []).length <= (l.consultation_completed_actions ?? -1);

    const targets = leads.filter(l =>
      l.status !== '育成対象外' &&
      !settings.excludeStatuses.includes(l.status) &&
      !isCompleted(l)
    );

    targets.forEach(lead => {
      if (lead.consultation_flag) {
        flagged.push(lead);
        seen.add(lead.id);
      }
    });

    // 優先度：追客終了候補 ＞ ナーチャリング候補 ＞ 停滞中
    // 高優先度から先に seen に追加することで重複表示を防ぐ

    // ① 追客終了候補（ナーチャリングステータスのリードが対象）
    targets.forEach(lead => {
      if (seen.has(lead.id)) return;
      if (lead.status !== 'ナーチャリング') return;
      if (!lead.next_action_date) return;
      const actionCount = (lead.actions || []).filter(a => a.type !== 'consultation').length;
      if (actionCount < settings.minActions) return;
      if (detectUnreachable(lead, settings.minFollowupEnd)) {
        followupEnd.push(lead);
        seen.add(lead.id);
      }
    });

    // ② ナーチャリング候補（追客終了候補より優先度低・停滞中より優先度高）
    targets.forEach(lead => {
      if (seen.has(lead.id)) return;
      if (lead.status === 'ナーチャリング') return;
      const actionCount = (lead.actions || []).filter(a => a.type !== 'consultation').length;
      if (actionCount < settings.minActions) return;
      if (detectUnreachable(lead, settings.minNurturing)) {
        nurturing.push(lead);
        seen.add(lead.id);
      }
    });

    // ③ 停滞中（最も優先度低）
    targets.forEach(lead => {
      if (seen.has(lead.id)) return;
      const actionCount = (lead.actions || []).filter(a => a.type !== 'consultation').length;
      if (actionCount < settings.minActions) return;
      if (!lead.next_action_date && !settings.stalledNoNextAction) return;
      if (lead.status === 'ナーチャリング') return;
      if (detectStalled(lead, settings.stalledDays, {
        stalledNoNextAction:  settings.stalledNoNextAction,
        stalledOverdueAction: settings.stalledOverdueAction,
        stalledLastFailed:    settings.stalledLastFailed,
      })) {
        stalled.push(lead);
        seen.add(lead.id);
      }
    });

    return { flagged, stalled, nurturing, followupEnd };
  }, [leads, settings]);

  const todayLabel = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' });
  const total = flagged.length + stalled.length + nurturing.length + followupEnd.length;
  const sectionData = { flagged, stalled, nurturing, followupEnd };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* 完了トースト */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#059669', color: '#fff', fontWeight: 700, fontSize: 13,
          padding: '10px 22px', borderRadius: 24, boxShadow: '0 4px 16px #05966944',
          zIndex: 1000, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ padding: '24px 28px 8px', borderBottom: showSettings ? 'none' : '1px solid #d8ede1', background: '#f0f5f2', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#174f35', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 7 }}><ChatIcon size={20} color="#174f35" /> 相談ボード</span>
            <span style={{ fontSize: 12, color: '#6a9a7a', marginLeft: 10 }}>{todayLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 12, color: '#6a9a7a' }}>ピックアップ</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#174f35' }}>{total}</span>
            <span style={{ fontSize: 12, color: '#174f35' }}>件</span>
          </div>
          <span style={{ fontSize: 12, color: '#b0cfc0', flex: 1 }}>
            リード詳細のピンアイコンでフラグを立てると「相談フラグあり」に表示されます
          </span>
          <button
            onClick={() => setShowSettings(v => !v)}
            style={{ background: showSettings ? '#e2f0e8' : 'transparent', border: '1px solid #d8ede1', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <GearIcon size={15} color="#6a9a7a" />
            <span style={{ fontSize: 13, color: '#6a9a7a', fontFamily: 'inherit' }}>条件設定</span>
          </button>
        </div>
      </div>

      {/* 設定パネル（開閉） */}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}

      {/* ボード（3列） */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {SECTIONS.map(section => {
          const items = sectionData[section.key] || [];
          const description = section.key === 'stalled'
            ? [
                `${settings.stalledDays}日以上アクションなし`,
                settings.stalledNoNextAction  && 'ネクストアクション未設定',
                settings.stalledOverdueAction && '期限切れ',
                'ナーチャリング除く',
              ].filter(Boolean).join(' / ')
            : section.key === 'unreachable'
            ? `直近${settings.minUnreachable}回の架電がすべて不在`
            : section.key === 'nurturing'
            ? `直近${settings.minNurturing}回不在/不通・ナーチャリング以外`
            : section.key === 'followupEnd'
            ? <>{`直近${settings.minFollowupEnd}回不在/不通・ナーチャリング・`}<br/>アクション有</>
            : '手動でフラグを立てたリード';

          return (
            <div key={section.key} style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column' }}>
              {/* 列ヘッダー */}
              <div style={{
                background: section.bg, border: `1px solid ${section.border}`,
                borderRadius: '8px 8px 0 0', padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: section.color }}>{section.label}</span>
                  <div style={{ fontSize: 12, color: section.color + 'aa', marginTop: 2, minHeight: '2.4em', lineHeight: 1.5 }}>{description}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: section.color, background: '#fff', borderRadius: 10, padding: '2px 10px', border: `1px solid ${section.border}`, flexShrink: 0, marginLeft: 8, whiteSpace: 'nowrap' }}>
                  {items.length}件
                </span>
              </div>

              {/* カードリスト */}
              <div style={{
                flex: 1, overflowY: 'auto',
                background: section.bg + '88',
                border: `1px solid ${section.border}`, borderTop: 'none',
                borderRadius: '0 0 8px 8px', padding: 10,
                display: 'flex', flexDirection: 'column', gap: 8,
                maxHeight: 'calc(100vh - 200px)', minHeight: 80,
              }}>
                {items.length === 0 ? (
                  <div style={{ color: section.color + '66', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    該当なし
                  </div>
                ) : (
                  items.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      section={section}
                      onOpenLead={onOpenLead}
                      onUpdate={patch => onUpdate(lead.id, patch)}
                      onCompleted={() => showToast(`${lead.company || 'リード'} の相談を完了しました`)}
                      compact={section.key === 'followupEnd'}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
