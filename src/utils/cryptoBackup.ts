/**
 * Password-protected client-side JSON backup encryption & decryption
 * using standard Web Crypto API (`PBKDF2-SHA256` 100,000 iterations + `AES-256-GCM`).
 * Zero external dependencies; runs identically in modern browsers and Node 22.
 */
export interface EncryptedBackupEnvelope {
  encryptedKaloriShomarBackup: true
  version: 1
  kdf: 'PBKDF2-SHA256'
  cipher: 'AES-256-GCM'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  exportedAt: string
}

const PBKDF2_ITERATIONS = 100_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function deriveAesGcmKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  )
}

export function isEncryptedBackupEnvelope(rawText: string): boolean {
  try {
    const parsed = JSON.parse(rawText) as Partial<EncryptedBackupEnvelope>
    return Boolean(
      parsed &&
        typeof parsed === 'object' &&
        parsed.encryptedKaloriShomarBackup === true &&
        typeof parsed.ciphertext === 'string' &&
        typeof parsed.salt === 'string' &&
        typeof parsed.iv === 'string',
    )
  } catch {
    return false
  }
}

export async function encryptBackupJson(plainJson: string, password: string): Promise<string> {
  if (!password || password.length < 4) {
    throw new Error('رمز عبور پشتیبان باید حداقل ۴ نویسه باشد.')
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesGcmKey(password, salt, PBKDF2_ITERATIONS, ['encrypt'])

  const encodedPlain = new TextEncoder().encode(plainJson)
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encodedPlain,
  )

  const envelope: EncryptedBackupEnvelope = {
    encryptedKaloriShomarBackup: true,
    version: 1,
    kdf: 'PBKDF2-SHA256',
    cipher: 'AES-256-GCM',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuf)),
    exportedAt: new Date().toISOString(),
  }

  return JSON.stringify(envelope, null, 2)
}

export async function decryptBackupJson(
  encryptedEnvelopeJson: string,
  password: string,
): Promise<{ ok: true; plainJson: string } | { ok: false; error: string }> {
  if (!password) {
    return { ok: false, error: 'لطفاً رمز عبور فایل پشتیبان رمزنگاری‌شده را وارد کنید.' }
  }

  let env: EncryptedBackupEnvelope
  try {
    env = JSON.parse(encryptedEnvelopeJson) as EncryptedBackupEnvelope
    if (!env?.encryptedKaloriShomarBackup || !env.salt || !env.iv || !env.ciphertext) {
      return { ok: false, error: 'ساختار فایل رمزنگاری‌شده معتبر نیست.' }
    }
  } catch {
    return { ok: false, error: 'فایل انتخاب‌شده قابل خواندن نیست.' }
  }

  try {
    const salt = base64ToBytes(env.salt)
    const iv = base64ToBytes(env.iv)
    const ciphertext = base64ToBytes(env.ciphertext)
    const iterations =
      typeof env.iterations === 'number' && env.iterations >= 10_000
        ? env.iterations
        : PBKDF2_ITERATIONS

    const key = await deriveAesGcmKey(password, salt, iterations, ['decrypt'])
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    )
    const plainJson = new TextDecoder().decode(decryptedBuf)
    return { ok: true, plainJson }
  } catch {
    return {
      ok: false,
      error: 'رمز عبور اشتباه است یا فایل پشتیبان دست‌کاری شده است.',
    }
  }
}
