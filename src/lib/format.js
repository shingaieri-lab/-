// テキスト整形ユーティリティ

// 半角数字・コロンを全角に変換する
export const toZenkaku = (str) =>
  String(str).replace(/[0-9:]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));

// 商談共有用テキストを組み立てる
export function buildDealShareText(lead) {
  let meetingDateTime = '';
  if (lead.meeting_date) {
    const d = new Date(lead.meeting_date + 'T00:00:00');
    const yy = toZenkaku(String(d.getFullYear()).slice(2));
    const mm = toZenkaku(String(d.getMonth() + 1).padStart(2, '0'));
    const dd = toZenkaku(String(d.getDate()).padStart(2, '0'));
    const dow = ['日','月','火','水','木','金','土'][d.getDay()];
    const timeStr = lead.meeting_time ? toZenkaku(lead.meeting_time) : '';
    meetingDateTime = `${yy}/${mm}/${dd}（${dow}）${timeStr ? timeStr + '～' : ''}`;
  }
  return `商談担当：${lead.sales_member ? lead.sales_member + 'さん' : ''}\n商談日時：${meetingDateTime}\n会社名：${lead.company || ''}\nHP：${lead.hp_url || ''}\nzoho：${lead.zoho_url || ''}\nIS確度：${lead.is_accuracy || ''}`;
}
