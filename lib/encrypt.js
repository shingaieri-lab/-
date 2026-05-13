// AES-256-GCM による機密値の暗号化・復号
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_PREFIX = 'enc:';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('ENCRYPTION_KEY is not set');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return key;
}

// 平文を暗号化して "enc:<iv>:<ciphertext>:<tag>" 形式の文字列にする
function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

// "enc:..." 形式なら復号、それ以外はそのまま返す（移行期の平文互換）
function decrypt(value) {
  if (!value || !String(value).startsWith(ENCRYPTED_PREFIX)) return value;
  try {
    const key = getKey();
    const [, ivHex, dataHex, tagHex] = String(value).split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return value;
  }
}

module.exports = { encrypt, decrypt };
