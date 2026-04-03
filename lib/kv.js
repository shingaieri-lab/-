// KV（データベース）の読み書き共通処理
const { kv } = require('@vercel/kv');

async function readData(key) {
  try { return await kv.get(key); } catch { return null; }
}

async function writeData(key, data) {
  await kv.set(key, data);
}

async function getAccounts() {
  return (await readData('accounts')) || [];
}

module.exports = { kv, readData, writeData, getAccounts };
