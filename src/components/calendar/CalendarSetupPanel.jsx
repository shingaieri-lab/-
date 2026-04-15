// Googleカレンダー API 設定パネル
export function CalendarSetupPanel({ editCfg, setEditCfg, onSave, onClose, members }) {
  const card   = { background:"#ffffff", border:"1px solid #e2f0e8", borderRadius:14, padding:"18px 20px", marginBottom:14, boxShadow:"0 2px 10px #0569690a" };
  const lbl    = { display:"block", fontSize:11, color:"#6a9a7a", marginBottom:4, fontWeight:600 };
  const inp    = { width:"100%", background:"#f8fffe", border:"1px solid #99e6d8", borderRadius:7, padding:"9px 12px", color:"#1f5c40", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", marginBottom:0 };
  const btnP   = { background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" };
  const btnSec = { background:"#d8ede1", color:"#2d6b4a", border:"1px solid #c0dece", borderRadius:8, padding:"9px 16px", fontSize:13, cursor:"pointer", fontFamily:"inherit" };

  return (
    <div style={{...card, border:"1px solid #fde68a", background:"#fffbeb", marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:"#d97706",marginBottom:12}}>⚙️ Google Calendar API 設定</div>

      <div style={{background:"#fff",border:"1px solid #fde68a",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#92400e",lineHeight:1.8}}>
        <div style={{fontWeight:700,marginBottom:6}}>📋 設定手順</div>
        <div>① <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#0284c7"}}>Google Cloud Console</a> でプロジェクトを作成</div>
        <div>② 「APIとサービス」→「ライブラリ」→ <b>Google Calendar API</b> を有効化</div>
        <div>③ 「認証情報」→「APIキーを作成」→ APIキーをコピー</div>
        <div>④ 各担当者のGoogleカレンダーを開き「設定」→「カレンダーのID」をコピー<br/>　　（例：<code style={{background:"#fef9c3",padding:"1px 4px",borderRadius:3}}>abcdef@gmail.com</code> または <code style={{background:"#fef9c3",padding:"1px 4px",borderRadius:3}}>xxx@group.calendar.google.com</code>）</div>
        <div>⑤ カレンダーの「共有設定」で <b>「一般公開して誰でも閲覧できるようにする」</b> をON（または「予定の詳細を表示」を許可）</div>
      </div>

      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#1e40af",lineHeight:1.9}}>
        <div style={{fontWeight:700,marginBottom:6}}>📅 「カレンダーに登録」機能を使う場合の追加設定（管理者が1回だけ実施）</div>
        <div>⑥ 「認証情報」→「OAuthクライアントID」を作成（種類：<b>ウェブアプリケーション</b>）</div>
        <div>　　→ 「承認済みJavaScriptオリジン」に <code style={{background:"#dbeafe",padding:"1px 4px",borderRadius:3}}>{window.location.origin}</code> を追加</div>
        <div>⑦ 「OAuthの同意画面」でスコープに <code style={{background:"#dbeafe",padding:"1px 4px",borderRadius:3}}>https://www.googleapis.com/auth/calendar.events</code> を追加</div>
        <div>⑧ 作成した <b>クライアントID</b> を ⚙️設定 &gt; APIキー設定 の「Gmail Client ID」欄に入力すれば全員が使用可能になります</div>
        <div style={{marginTop:8,padding:"6px 10px",background:"#dbeafe",borderRadius:6,color:"#1e40af"}}>
          💡 各営業は初回のみGoogleの認証ポップアップで「許可」を押すだけです。個別の設定は不要です。
        </div>
        <div style={{marginTop:6,color:"#1d4ed8",fontWeight:600}}>※ 空き時間の検索（freeBusy）は APIキーのみで動作します。カレンダーへの予定登録にはOAuth認証（Client ID）が必要です。</div>
      </div>

      <div style={{marginBottom:10}}>
        <label style={lbl}>Google Calendar APIキー</label>
        <input value={editCfg.apiKey||""} onChange={e=>setEditCfg(p=>({...p,apiKey:e.target.value}))} placeholder="AIzaSy..." style={inp} />
      </div>

      <div style={{marginBottom:4}}>
        <label style={lbl}>担当者ごとのカレンダーID</label>
      </div>
      {members.map(m => (
        <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:600,color:"#174f35",minWidth:70}}>{m}</span>
          <input value={(editCfg.calendarIds||{})[m]||""}
            onChange={e=>setEditCfg(p=>({...p,calendarIds:{...(p.calendarIds||{}),[m]:e.target.value}}))}
            placeholder="例：tanaka@gmail.com" style={{...inp,flex:1}} />
        </div>
      ))}

      <div style={{marginBottom:14,borderTop:"1px solid #fde68a",paddingTop:14}}>
        <label style={lbl}>カレンダー登録タイトルテンプレート</label>
        <input value={editCfg.calRegTitleTpl||""} onChange={e=>setEditCfg(p=>({...p,calRegTitleTpl:e.target.value}))} placeholder="例：仮WEB営1）【{{会社名}}様】" style={inp} />
        <div style={{fontSize:11,color:"#92400e",marginTop:4}}><code style={{background:"#fef9c3",padding:"1px 4px",borderRadius:3}}>{"{{会社名}}"}</code> は相手先の企業名に置き換わります</div>
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
        <button onClick={onClose} style={btnSec}>閉じる</button>
        <button onClick={onSave} style={btnP}>保存</button>
      </div>
    </div>
  );
}
