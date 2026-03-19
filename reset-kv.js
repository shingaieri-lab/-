// KVデータ一括削除スクリプト（一度だけ実行用）
// 実行方法: node reset-kv.js
const { kv } = require('@vercel/kv');

async function resetAll() {
  const keys = ['accounts', 'leads', 'master_settings', 'ai_config', 'gcal_config', 'email_tpls'];
  for (const key of keys) {
    await kv.del(key);
    console.log(`削除: ${key}`);
  }
  console.log('リセット完了');
  process.exit(0);
}

resetAll().catch(e => { console.error(e); process.exit(1); });
