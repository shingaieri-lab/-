// 流入元アイコン（SVG）コンポーネント
// iconKey に対応する SVG 図形を色付きの角丸背景付きで表示する

import { LEAD_SOURCE_ICONS } from '../../constants/index.js';

export function SourceIconSVG({ iconKey, size = 28, color }) {
  const def = LEAD_SOURCE_ICONS.find(d => d.key === iconKey);
  const c = color || (def ? def.color : "#6a9a7a");

  const sym = iconKey === "home"
    ? <polygon points="20,8 8,20 12,20 12,32 18,32 18,25 22,25 22,32 28,32 28,20 32,20" fill="white"/>
    : iconKey === "search"
    ? <><circle cx="16" cy="21" r="6" fill="none" stroke="white" strokeWidth="2.5"/><line x1="21" y1="26" x2="27" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></>
    : iconKey === "phone"
    ? <path d="M12 10 C11 10 9 11 9 13 C9 20 20 31 27 31 C29 31 30 29 30 28 L28 24 C28 23 27 23 26 23 L23 24 C22 24 21 24 21 23 C19 20 18 18 17 16 C16 15 17 14 17 13 L18 10 C18 9 17 8 16 8 Z" fill="white" stroke="white" strokeWidth="0.5"/>
    : iconKey === "mail"
    ? <><rect x="8" y="13" width="24" height="17" rx="2" fill="none" stroke="white" strokeWidth="2"/><polyline points="8,15 20,23 32,15" fill="none" stroke="white" strokeWidth="2"/></>
    : iconKey === "chat"
    ? <><rect x="7" y="10" width="22" height="15" rx="4" fill="none" stroke="white" strokeWidth="2.5"/><circle cx="13" cy="18" r="1.5" fill="white"/><circle cx="18" cy="18" r="1.5" fill="white"/><circle cx="23" cy="18" r="1.5" fill="white"/><path d="M11 25 L14 29 L14 25" fill="white"/></>
    : iconKey === "megaphone"
    ? <><path d="M10 15 L10 25 L14 25 L14 15 Z" fill="white"/><path d="M14 12 L28 7 L28 28 L14 28 Z" fill="white"/><line x1="31" y1="15" x2="31" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round"/></>
    : iconKey === "star"
    ? <polygon points="20,7 23,16 33,16 25,22 28,31 20,25 12,31 15,22 7,16 17,16" fill="white"/>
    : iconKey === "people"
    ? <><circle cx="14" cy="14" r="5" fill="white"/><path d="M5 30 C5 23 23 23 23 30" fill="white"/><circle cx="27" cy="13" r="4" fill="none" stroke="white" strokeWidth="2"/><path d="M20 29 C20 23 35 23 35 29" fill="none" stroke="white" strokeWidth="2"/></>
    : iconKey === "briefcase"
    ? <><rect x="9" y="18" width="22" height="14" rx="2" fill="none" stroke="white" strokeWidth="2.5"/><path d="M15 18 L15 14 C15 13 16 12 17 12 L23 12 C24 12 25 13 25 14 L25 18" fill="none" stroke="white" strokeWidth="2.5"/><line x1="9" y1="25" x2="31" y2="25" stroke="white" strokeWidth="2"/></>
    : iconKey === "map"
    ? <path d="M20 6 C14 6 10 11 10 17 C10 25 20 35 20 35 C20 35 30 25 30 17 C30 11 26 6 20 6 Z M20 22 C17.2 22 15 19.8 15 17 C15 14.2 17.2 12 20 12 C22.8 12 25 14.2 25 17 C25 19.8 22.8 22 20 22 Z" fill="white"/>
    : iconKey === "globe"
    ? <><circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="2"/><ellipse cx="20" cy="20" rx="5.5" ry="12" fill="none" stroke="white" strokeWidth="1.5"/><line x1="8" y1="20" x2="32" y2="20" stroke="white" strokeWidth="1.5"/><line x1="9" y1="14" x2="31" y2="14" stroke="white" strokeWidth="1.2"/><line x1="9" y1="26" x2="31" y2="26" stroke="white" strokeWidth="1.2"/></>
    : iconKey === "newspaper"
    ? <><rect x="8" y="9" width="22" height="22" rx="2" fill="none" stroke="white" strokeWidth="2"/><rect x="11" y="13" width="8" height="7" rx="1" fill="white"/><line x1="21" y1="13" x2="27" y2="13" stroke="white" strokeWidth="1.5"/><line x1="21" y1="17" x2="27" y2="17" stroke="white" strokeWidth="1.5"/><line x1="11" y1="23" x2="27" y2="23" stroke="white" strokeWidth="1.5"/><line x1="11" y1="27" x2="22" y2="27" stroke="white" strokeWidth="1.5"/></>
    : iconKey === "video"
    ? <><circle cx="20" cy="20" r="13" fill="none" stroke="white" strokeWidth="2"/><polygon points="16,13 30,20 16,27" fill="white"/></>
    : iconKey === "qr"
    ? <><rect x="8" y="8" width="9" height="9" rx="1" fill="none" stroke="white" strokeWidth="2"/><rect x="11" y="11" width="3" height="3" fill="white"/><rect x="23" y="8" width="9" height="9" rx="1" fill="none" stroke="white" strokeWidth="2"/><rect x="26" y="11" width="3" height="3" fill="white"/><rect x="8" y="23" width="9" height="9" rx="1" fill="none" stroke="white" strokeWidth="2"/><rect x="11" y="26" width="3" height="3" fill="white"/><rect x="23" y="23" width="3" height="3" fill="white"/><rect x="28" y="23" width="3" height="3" fill="white"/><rect x="23" y="28" width="9" height="3" fill="white"/></>
    : iconKey === "social"
    ? <><circle cx="11" cy="20" r="4" fill="white"/><circle cx="29" cy="11" r="4" fill="white"/><circle cx="29" cy="29" r="4" fill="white"/><line x1="15" y1="18" x2="25" y2="13" stroke="white" strokeWidth="2"/><line x1="15" y1="22" x2="25" y2="27" stroke="white" strokeWidth="2"/></>
    : iconKey === "document"
    ? <><rect x="10" y="7" width="17" height="26" rx="2" fill="none" stroke="white" strokeWidth="2"/><path d="M21 7 L21 12 L27 12" fill="none" stroke="white" strokeWidth="2"/><line x1="13" y1="17" x2="24" y2="17" stroke="white" strokeWidth="1.5"/><line x1="13" y1="21" x2="24" y2="21" stroke="white" strokeWidth="1.5"/><line x1="13" y1="25" x2="20" y2="25" stroke="white" strokeWidth="1.5"/></>
    : iconKey === "building"
    ? <><rect x="8" y="11" width="14" height="21" rx="1" fill="none" stroke="white" strokeWidth="2"/><rect x="22" y="18" width="10" height="14" rx="1" fill="none" stroke="white" strokeWidth="2"/><rect x="11" y="15" width="3" height="3" fill="white"/><rect x="16" y="15" width="3" height="3" fill="white"/><rect x="11" y="21" width="3" height="3" fill="white"/><rect x="16" y="21" width="3" height="3" fill="white"/><rect x="25" y="22" width="3" height="3" fill="white"/><line x1="14" y1="32" x2="14" y2="27" stroke="white" strokeWidth="3"/></>
    : iconKey === "lightbulb"
    ? <><path d="M20 8 C14.5 8 10 12.5 10 18 C10 21.5 11.5 24.5 14.5 26.5 L15 29 L25 29 L25.5 26.5 C28.5 24.5 30 21.5 30 18 C30 12.5 25.5 8 20 8 Z" fill="white"/><line x1="15" y1="31" x2="25" y2="31" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="16.5" y1="34" x2="23.5" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round"/></>
    : iconKey === "event"
    ? <><rect x="7" y="10" width="26" height="22" rx="3" fill="none" stroke="white" strokeWidth="2"/><line x1="7" y1="17" x2="33" y2="17" stroke="white" strokeWidth="2"/><line x1="13" y1="7" x2="13" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="27" y1="7" x2="27" y2="13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><rect x="11" y="21" width="4" height="4" rx="1" fill="white"/><rect x="18" y="21" width="4" height="4" rx="1" fill="white"/><rect x="25" y="21" width="4" height="4" rx="1" fill="white"/></>
    : iconKey === "referral"
    ? <><circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeWidth="2.5"/><polyline points="16,20 20,15 24,20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="20" y1="15" x2="20" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></>
    : <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontFamily="sans-serif">?</text>;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}>
      <rect x="1" y="1" width="38" height="38" rx="8" fill={c}/>
      {sym}
    </svg>
  );
}
