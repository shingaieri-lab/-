// モバイル判定カスタムフック
// ウィンドウ幅が bp(px) 未満のときに true を返す。リサイズに追従する

import { useState, useEffect } from 'react';

export function useIsMobile(bp = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < bp
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < bp);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [bp]);

  return isMobile;
}
