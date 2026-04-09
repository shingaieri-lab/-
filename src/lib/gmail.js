// Gmail / Google OAuth 共通ユーティリティ

// Google OAuth のエラーハンドリング共通処理
export function handleOAuthCallbackError(resp, rej) {
  if (resp.error === 'redirect_uri_mismatch' || resp.error === 'invalid_client') {
    rej(new Error(`OAuth設定エラー: Google Cloud ConsoleのOAuthクライアントの「承認済みJavaScriptオリジン」に "${window.location.origin}" を追加してください。`));
  } else {
    rej(new Error(resp.error));
  }
}

export function handleOAuthPopupError(err, rej) {
  if (err.type === 'popup_blocked_by_browser') {
    rej(new Error('ポップアップがブロックされました。ブラウザのポップアップブロックを解除してください。'));
  } else {
    rej(new Error(`OAuth設定エラー: Google Cloud ConsoleのOAuthクライアントの「承認済みJavaScriptオリジン」に "${window.location.origin}" が登録されているか確認してください。`));
  }
}

// トークンオブジェクト { token, expiresAt } が有効かチェック（期限の60秒前に再取得）
// Googleのアクセストークンは発行から60分で失効するため、55分を目安に期限切れ扱いにする
export const isTokenValid = (tokenObj) =>
  !!(tokenObj?.token && tokenObj.expiresAt > Date.now() + 60 * 1000);

// OAuthトークン（Googleの認証許可証）を取得する共通関数
// currentTokenObj: すでに持っているトークンオブジェクト { token, expiresAt }（有効期限内ならそのまま返す）
// 戻り値: { token: string, expiresAt: number }
export const acquireGmailToken = async (clientId, currentTokenObj) => {
  if (isTokenValid(currentTokenObj)) return currentTokenObj;
  // Googleのスクリプトがまだ読み込まれていなければ動的に読み込む
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
  return new Promise((res, rej) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/gmail.compose',
      callback: (resp) => {
        if (resp.error) {
          handleOAuthCallbackError(resp, rej);
        } else {
          // 55分後に期限切れとして扱う（Googleトークンは60分有効）
          res({ token: resp.access_token, expiresAt: Date.now() + 55 * 60 * 1000 });
        }
      },
      error_callback: (err) => handleOAuthPopupError(err, rej)
    });
    client.requestAccessToken();
  });
};

// MIMEメール形式のRAWデータ（Gmail APIが受け取る形式）を組み立てる共通関数
export const buildGmailDraftRaw = (to, subject, body) => {
  const utf8B64 = (str) => { const b = new TextEncoder().encode(str); let s=''; for(let c of b) s+=String.fromCharCode(c); return btoa(s); };
  const lines = [];
  if (to) lines.push(`To: ${to}`);
  lines.push(`Subject: =?UTF-8?B?${utf8B64(subject)}?=`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(utf8B64(body));
  return btoa(lines.join('\r\n')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};

// Gmail APIに下書きを送信する共通関数
// 認証切れ（401）の場合は isUnauthenticated フラグ付きエラーをスローする
export const postGmailDraft = async (token, raw) => {
  const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw } })
  });
  if (!res.ok) {
    const err = await res.json();
    if ((err.error?.code===401)||(err.error?.status==='UNAUTHENTICATED')) {
      throw Object.assign(new Error('認証の期限が切れました。再度お試しください。'), { isUnauthenticated: true });
    }
    throw new Error(err.error?.message || '保存に失敗しました');
  }
};
