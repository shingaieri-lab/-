import { apiPost } from './api.js';

export const DEFAULT_EMAIL_TEMPLATES = [
  { id:"t1", name:"初回フォロー", useSlots:false, subject:"【ダンドリワーク】資料のご確認のお願い", body:"{{担当者名}} 様\n\nお世話になっております。\nダンドリワークの{{送信者名}}でございます。\n\n先日はお電話にてご対応いただきありがとうございました。\nご案内した資料をご確認いただけましたでしょうか？\n\n何かご不明な点がございましたら、お気軽にご連絡ください。\n\nよろしくお願いいたします。" },
  { id:"t2", name:"商談日程調整", useSlots:true, subject:"【ダンドリワーク{{送信者名}}】ご説明日程候補日をお送りします", body:"{{担当者名}} 様\n\nお世話になっております。\nダンドリワークの{{送信者名}}でございます。\n\n下記日程のご都合は、いかがでしょうか。\n\n============================\n【日程候補】\n{{候補日時}}\n============================\n\nご都合のよろしい日程をご返信いただけますと幸いです。\nよろしくお願いいたします。" },
  { id:"t3", name:"ナーチャリング", useSlots:false, subject:"【ダンドリワーク】建設業の施工管理DX事例のご紹介", body:"{{担当者名}} 様\n\nお世話になっております。\nダンドリワークの{{送信者名}}でございます。\n\n以前お話しさせていただいた件で、成果が出た事例をご紹介します。" },
];

export const loadEmailTpls = () => window.__appData.emailTpls || DEFAULT_EMAIL_TEMPLATES;

export const saveEmailTpls = (t) => { window.__appData.emailTpls = t; apiPost('/api/email-tpls', t); };

export const applyVars = (body, vars) => Object.entries(vars).reduce((s,[k,v])=>s.replaceAll("{{"+k+"}}",v||("{{"+k+"}}")),body);

export const formatSlot = (slot) => {
  const d = new Date(slot.date + "T00:00:00");
  const dow = ["日","月","火","水","木","金","土"][d.getDay()];
  const [y,m,day] = slot.date.split("-");
  return `${parseInt(y)}年${parseInt(m)}月${parseInt(day)}日（${dow}）${slot.start}〜${slot.end}`;
};
