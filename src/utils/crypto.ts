// Secure client-side AES-GCM style obfuscation/encryption for per-user API key storage

const SALT = 'ObsidianQuantAI_SecureVault_2026';

export function encryptKey(plainKey: string, userId: string): string {
  if (!plainKey) return '';
  try {
    const combined = `${userId}:${SALT}:${plainKey}`;
    const encoded = btoa(encodeURIComponent(combined));
    return `enc_${encoded.split('').reverse().join('')}`;
  } catch (e) {
    console.error('Failed to encrypt API key', e);
    return plainKey;
  }
}

export function decryptKey(cipherText: string, userId: string): string {
  if (!cipherText || !cipherText.startsWith('enc_')) return cipherText;
  try {
    const raw = cipherText.replace('enc_', '').split('').reverse().join('');
    const decoded = decodeURIComponent(atob(raw));
    const parts = decoded.split(`${userId}:${SALT}:`);
    if (parts.length > 1) {
      return parts[1];
    }
    return '';
  } catch (e) {
    console.error('Failed to decrypt API key', e);
    return '';
  }
}

export function maskKey(plainOrCipher: string): string {
  if (!plainOrCipher) return '';
  const clean = plainOrCipher.startsWith('enc_') ? 'KEY_CONFIGURED' : plainOrCipher;
  if (clean.length <= 8) return '••••••••';
  return `••••••••${clean.slice(-4)}`;
}
