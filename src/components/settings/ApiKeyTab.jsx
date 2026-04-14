// APIキー設定タブ（Gemini・Gmail・GoogleタスクTODO）
import { loadGCalConfig } from '../../lib/gcal.js';

export function ApiKeyTab({ currentUser, profileForm, setProfileForm, profileMsg, saveProfile, onOpenWizard }) {
  const inp = { width:"100%", padding:"7px 10px", borderRadius:7, border:"1px solid #c0dece", fontSize:12, outline:"none", boxSizing:"border-box", fontFamily:"inherit", background:"#fff", color:"#174f35" };

  const gcalCfg = loadGCalConfig();
  const geminiOk = !!(currentUser?.geminiConfigured);
  const gmailOk  = !!(currentUser?.gmailClientId || window.__appData?.aiConfig?.gmailClientId);
  const calendarOk = !!(gcalCfg.apiKey && Object.keys(gcalCfg.calendarIds||{}).length > 0);
  const allOk = geminiOk && gmailOk && calendarOk;

  return (
    <div>
      <div>
        {/* ウィザードバナー */}
        <div style={{background: allOk ? "#f0fdf4" : "#fffbeb", border:`1px solid ${allOk?"#86efac":"#fde68a"}`, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12}}>
          <div style={{fontSize:22, flexShrink:0}}>{allOk ? "✅" : "🚀"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12, fontWeight:700, color: allOk ? "#166534" : "#92400e"}}>
              {allOk ? "すべての設定が完了しています" : "ウィザードを使うと簡単に設定できます"}
            </div>
            <div style={{fontSize:11, color: allOk ? "#166534" : "#d97706", marginTop:2}}>
              {[
                geminiOk ? null : "AIアシスタント未設定",
                gmailOk  ? null : "Gmail未設定",
                calendarOk ? null : "カレンダー未設定",
              ].filter(Boolean).join("　")||"全機能が利用可能です"}
            </div>
          </div>
          {!allOk && onOpenWizard && (
            <button onClick={onOpenWizard} style={{padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0}}>
              ウィザードで設定 →
            </button>
          )}
        </div>

        {/* 役割別の説明バナー */}
        {currentUser?.role === "admin" ? (
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#1e40af",lineHeight:1.8}}>
            <b>👑 管理者の設定内容</b><br />
            ① <b>Gemini APIキー</b>：ご自身のAIアシスタント用に取得・入力してください。<br />
            ② <b>Gmail OAuth Client ID</b>：Google Cloud Console で1回だけ作成し、入力してください。設定後は全メンバーがGmail・GoogleタスクTODO機能を使えるようになります（各メンバーは初回に「許可」を押すだけでOKです）。
          </div>
        ) : (
          <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#166534",lineHeight:1.8}}>
            <b>👤 メンバーの設定内容</b><br />
            ① <b>Gemini APIキー</b>：AIアシスタントを使うために、ご自身のキーを取得・入力してください。<br />
            ② <b>Gmail・GoogleタスクTODO</b>：管理者が設定済みであれば、初回利用時にGoogleのポップアップで「許可」を押すだけで使えます。
          </div>
        )}

        {/* ── 全員共通：Gemini APIキー ── */}
        <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:8,marginTop:4}}>🔑 AIアシスタント用 Gemini APIキー（各自が取得・入力）</div>
        <div style={{marginBottom:12}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
            <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a"}}>Gemini APIキー</label>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              {currentUser?.geminiConfigured
                ? <span style={{fontSize:10,background:"#d1fae5",color:"#059669",borderRadius:20,padding:"1px 8px",fontWeight:700}}>✅ 設定済み</span>
                : <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",borderRadius:20,padding:"1px 8px",fontWeight:700}}>⚠️ 未設定</span>
              }
              {onOpenWizard && <button onClick={()=>onOpenWizard()} style={{fontSize:10,padding:"2px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#f0f5f2",color:"#059669",cursor:"pointer",fontFamily:"inherit"}}>？ ウィザードで設定</button>}
            </div>
          </div>
          <input type="password" value={profileForm.geminiKey||""} onChange={e=>setProfileForm(p=>({...p,geminiKey:e.target.value}))}
            placeholder="AIzaSy..." style={{...inp, fontFamily:"monospace"}} />
          <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>AIアシスタント機能に使用します。<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google AI Studio</a>で無料取得できます。</div>
        </div>
        <div style={{background:"#f0f5f2",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#3d7a5e",lineHeight:2,marginBottom:24}}>
          <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 Gemini APIキー 取得手順</div>
          <div><b>① Googleアカウントでサインイン</b></div>
          <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google AI Studio（aistudio.google.com）</a> にアクセスし、Googleアカウントでログインします。
          </div>
          <div><b>② 「APIキーを作成」をクリック</b></div>
          <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
            左メニューまたは画面上部の <b>「Get API key」→「Create API key」</b> をクリックします。
          </div>
          <div><b>③ プロジェクトを選択または作成</b></div>
          <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
            既存のGoogle Cloudプロジェクトを選択するか、「新しいプロジェクトでAPIキーを作成」を選びます。
          </div>
          <div><b>④ APIキーをコピーして上の欄に貼り付け、「保存」をクリック</b></div>
          <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6}}>
            発行された <code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>AIzaSy...</code> で始まるキーをコピーし、入力欄にペーストして保存します。
          </div>
        </div>

        {/* ── Gmail OAuth Client ID ── */}
        <div style={{borderTop:"1px solid #d8ede1",paddingTop:20,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#174f35",marginBottom:12}}>
            📨 Gmail・GoogleタスクTODO 連携設定
          </div>

          {currentUser?.role === "admin" ? (
            <div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4}}>
                <label style={{fontSize:11,fontWeight:700,color:"#6a9a7a"}}>Gmail OAuth Client ID</label>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  {profileForm.gmailClientId
                    ? <span style={{fontSize:10,background:"#d1fae5",color:"#059669",borderRadius:20,padding:"1px 8px",fontWeight:700}}>✅ 設定済み</span>
                    : <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",borderRadius:20,padding:"1px 8px",fontWeight:700}}>⚠️ 未設定</span>
                  }
                  {onOpenWizard && <button onClick={()=>onOpenWizard()} style={{fontSize:10,padding:"2px 8px",borderRadius:6,border:"1px solid #c0dece",background:"#f0f5f2",color:"#059669",cursor:"pointer",fontFamily:"inherit"}}>？ ウィザードで設定</button>}
                </div>
              </div>
              <input type="text" value={profileForm.gmailClientId||""} onChange={e=>setProfileForm(p=>({...p,gmailClientId:e.target.value}))}
                placeholder="xxxxxxxxxx.apps.googleusercontent.com" style={{...inp, fontFamily:"monospace"}} />
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4,marginBottom:12}}>
                <b>管理者が1回だけ</b>設定すると、全メンバーがGmail・GoogleタスクTODO機能を使えるようになります。<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> で取得できます。
              </div>
              <div style={{background:"#f0f5f2",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#3d7a5e",lineHeight:2,marginBottom:12}}>
                <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 Gmail OAuth Client ID 取得手順（管理者が実施）</div>
                <div><b>① Google Cloud Console でプロジェクトを準備</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> にアクセスし、Googleアカウントでログイン。プロジェクト選択から既存のプロジェクトを選ぶか「新しいプロジェクト」を作成します。
                </div>
                <div><b>② Gmail API を有効化</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  左メニュー「APIとサービス」→「ライブラリ」→ 検索欄に <b>「Gmail API」</b> と入力 → 「Gmail API」を選択 →「有効にする」をクリック。
                </div>
                <div><b>③ OAuth 同意画面を設定</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  「APIとサービス」→「OAuth 同意画面」→ ユーザーの種類は <b>「内部」</b> を選択 →「作成」。アプリ名・サポートメールを入力し「保存して次へ」を繰り返して完了します。
                </div>
                <div><b>④ OAuth クライアント ID を作成</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  「APIとサービス」→「<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>認証情報</a>」→「認証情報を作成」→「OAuth クライアント ID」。アプリケーションの種類は <b>「ウェブ アプリケーション」</b> を選択。
                </div>
                <div><b>⑤ 承認済みJavaScript オリジンにURLを追加</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  「承認済みの JavaScript 生成元」→ <b>「URIを追加」</b> → このアプリのURL（<code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>{window.location.origin}</code>）を入力。
                </div>
                <div><b>⑥ 承認済みリダイレクト URI にURLを追加</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6,marginBottom:4}}>
                  同様に「承認済みのリダイレクト URI」にも同じURLを追加し、「作成」をクリック。
                </div>
                <div><b>⑦ クライアント ID をコピーして上の欄に貼り付け、「保存」をクリック</b></div>
                <div style={{paddingLeft:16,color:"#5a8a6a",lineHeight:1.6}}>
                  <code style={{background:"#d8ede1",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>xxxxxxxxxx.apps.googleusercontent.com</code> 形式のクライアント ID をコピーし、貼り付けて保存します。
                </div>
              </div>
              <div style={{background:"#eff6ff",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#1e40af",lineHeight:2,marginBottom:12,border:"1px solid #bfdbfe"}}>
                <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>✅ GoogleタスクTODO登録・カレンダー登録 — 追加設定（管理者が実施）</div>
                <div style={{fontSize:11,color:"#3b82f6",marginBottom:10}}>上記の Gmail OAuth Client ID をそのまま使います。以下の追加設定が必要です。</div>
                <div><b>① Google Tasks API を有効化</b></div>
                <div style={{paddingLeft:16,color:"#1d4ed8",lineHeight:1.6,marginBottom:4}}>
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:"#2563eb"}}>Google Cloud Console</a> →「APIとサービス」→「ライブラリ」→ <b>「Google Tasks API」</b> を検索 → 選択 →「<b>有効にする</b>」をクリック。
                </div>
                <div><b>② OAuth 同意画面にスコープを追加</b></div>
                <div style={{paddingLeft:16,color:"#1d4ed8",lineHeight:1.6,marginBottom:4}}>
                  「OAuth 同意画面」→「<b>スコープを追加または削除</b>」→ <code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>tasks</code> で検索 → <b><code style={{background:"#dbeafe",padding:"1px 5px",borderRadius:3,fontFamily:"monospace"}}>.../auth/tasks</code></b> にチェック →「更新」→「保存して次へ」。
                </div>
                <div style={{marginTop:6,padding:"6px 10px",background:"#dbeafe",borderRadius:6,color:"#1e40af"}}>
                  💡 設定後は各メンバーが初回のみGoogleの認証ポップアップで「許可」を押すだけです。個別の追加設定は不要です。
                </div>
              </div>
            </div>
          ) : (
            <div>
              {(() => {
                const sharedClientId = window.__appData?.aiConfig?.gmailClientId || "";
                return sharedClientId ? (
                  <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#166534",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:20}}>✅</div>
                    <div>
                      <div style={{fontWeight:700}}>Gmail・TODOの連携設定は管理者が完了しています</div>
                      <div style={{fontSize:11,color:"#15803d",marginTop:2}}>初回利用時にGoogleのポップアップが表示されます。「許可」を押すだけで使えるようになります。</div>
                    </div>
                  </div>
                ) : (
                  <div style={{background:"#fff7ed",border:"1px solid #fde68a",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#92400e",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:20}}>⚠️</div>
                    <div>
                      <div style={{fontWeight:700}}>管理者がまだGmailの設定を完了していません</div>
                      <div style={{fontSize:11,color:"#b45309",marginTop:2}}>管理者に「API設定」画面でGmail OAuth Client IDを設定してもらってください。</div>
                    </div>
                  </div>
                );
              })()}
              <div style={{background:"#f0fdf4",borderRadius:8,padding:"14px 16px",fontSize:12,color:"#166534",lineHeight:2,marginBottom:12,border:"1px solid #86efac"}}>
                <div style={{fontWeight:700,marginBottom:6,fontSize:13}}>📋 メンバーがやること（初回のみ）</div>
                <div><b>① Gmail送信またはTODOボタンを押す</b></div>
                <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6,marginBottom:4}}>
                  AIページや営業メールページの「Gmail下書き保存」「GoogleタスクにTODO作成」ボタンをクリックします。
                </div>
                <div><b>② Googleのポップアップで「許可」をクリック</b></div>
                <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6,marginBottom:4}}>
                  Googleアカウントの選択画面が表示されます。使用するアカウントを選び、「<b>許可</b>」をクリックしてください。
                </div>
                <div><b>③ 完了！以降はポップアップは表示されません</b></div>
                <div style={{paddingLeft:16,color:"#15803d",lineHeight:1.6}}>
                  同じブラウザセッション中は自動でログイン状態が保持されます。ページを再読込した場合は再度ポップアップが表示されることがあります。
                </div>
              </div>
            </div>
          )}
        </div>

        {profileMsg && <div style={{fontSize:12,color:"#059669",fontWeight:700,marginBottom:10}}>{profileMsg}</div>}
        <button onClick={saveProfile}
          style={{padding:"8px 28px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#10b981,#059669)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          保存
        </button>
      </div>
    </div>
  );
}
