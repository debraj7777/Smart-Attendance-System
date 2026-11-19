/**
 * AES-256-GCM encryption helpers for face descriptors.
 * Uses Node's built-in `crypto` module — no extra package required.
 *
 * Key must be a 64-char hex string (= 32 bytes) stored in DESCRIPTOR_ENCRYPTION_KEY.
 * Generate once with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import crypto from 'crypto';

const ALG = 'aes-256-gcm';

function getKey() {
  const hex = process.env.DESCRIPTOR_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'DESCRIPTOR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a float array and returns a storable string:
 *   "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptDescriptor(floatArray) {
  const key      = getKey();
  const iv       = crypto.randomBytes(12);
  const cipher   = crypto.createCipheriv(ALG, key, iv);
  const plain    = Buffer.from(JSON.stringify(floatArray));
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag  = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a stored string back into a plain JS number array.
 * Throws if the ciphertext has been tampered with (GCM auth failure).
 */
export function decryptDescriptor(stored) {
  const key = getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted descriptor format.');
  const [ivHex, tagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString());
}
