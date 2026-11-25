/**
 * Password-protected client-side JSON backup encryption & decryption
 * using standard Web Crypto API (`PBKDF2-SHA256` 100,000 iterations + `AES-256-GCM`).
 * Zero external dependencies; runs identically in modern browsers and Node 22.
 *
 * Security notes:
 * - The PBKDF2 iteration count is a *fixed application constant* on decryption.
 *   A backup file is untrusted input: honouring its `iterations` field would let an
 *   attacker force up to billions of PBKDF2 rounds (CPU-exhaustion DoS on import).
 *   All backups written by this app use the same fixed value, so ignoring the field
 *   keeps old backups readable while removing the attacker-controlled work factor.
 * - The envelope's algorithm identifiers and salt/IV lengths are strictly validated
 *   *before* any key derivation or decryption is attempted.
 * - We deliberately do NOT add AES-GCM `additionalData`: AAD is part of the GCM
 *   authentication tag calculation, so enabling it now would make every backup
 *   produced by earlier versions impossible to decrypt. Envelope integrity is
 *   already provided by the authenticated ciphertext plus strict field checks;
 *   unauthenticated advisory metadata (`iterations`, `exportedAt`) is never trusted.
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
const EXPECTED_VERSION = 1
const EXPECTED_KDF = 'PBKDF2-SHA256'
const EXPECTED_CIPHER = 'AES-256-GCM'
const SALT_BYTES = 16
const IV_BYTES = 12
/** Refuse absurd payloads before allocating memory for base64 decoding. */
const MAX_BASE64_CHARS = 24 * 1024 * 1024

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/** Decodes base64 with an optional exact byte-length requirement; null on bad input. */
function decodeBase64Checked(b64: unknown, expectedBytes?: number): Uint8Array | null {
  if (typeof b64 !== 'string' || b64.length === 0 || b64.length > MAX_BASE64_CHARS) return null
  try {
    const binary = atob(b64)
    if (binary.length === 0 || binary.length > MAX_BASE64_CHARS / 2) return null
    if (expectedBytes !== undefined && binary.length !== expectedBytes) return null
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i)
    }
    return out
  } catch {
    return null
  }
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

interface ValidatedBackupEnvelope {
  salt: Uint8Array
  iv: Uint8Array
  ciphertext: Uint8Array
}

/**
 * Parses an untrusted envelope and validates every security-relevant field
 * before deriveKey/decrypt is called. `iterations` is intentionally not used.
 */
function validateEnvelope(rawText: string): ValidatedBackupEnvelope | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const env = parsed as Partial<EncryptedBackupEnvelope>
  if (env.encryptedKaloriShomarBackup !== true) return null
  if (env.version !== EXPECTED_VERSION) return null
  if (env.kdf !== EXPECTED_KDF) return null
  if (env.cipher !== EXPECTED_CIPHER) return null
  if (typeof env.exportedAt !== 'string') return null

  const salt = decodeBase64Checked(env.salt, SALT_BYTES)
  const iv = decodeBase64Checked(env.iv, IV_BYTES)
  const ciphertext = decodeBase64Checked(env.ciphertext)
  if (!salt || !iv || !ciphertext) return null

  return { salt, iv, ciphertext }
}

export function isEncryptedBackupEnvelope(rawText: string): boolean {
  return validateEnvelope(rawText) !== null
}

export async function encryptBackupJson(plainJson: string, password: string): Promise<string> {
  if (!password || password.length < 4) {
    throw new Error('رمز عبور پشتیبان باید حداقل ۴ نویسه باشد.')
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveAesGcmKey(password, salt, PBKDF2_ITERATIONS, ['encrypt'])

  const encodedPlain = new TextEncoder().encode(plainJson)
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encodedPlain,
  )

  const envelope: EncryptedBackupEnvelope = {
    encryptedKaloriShomarBackup: true,
    version: EXPECTED_VERSION,
    kdf: EXPECTED_KDF,
    cipher: EXPECTED_CIPHER,
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

  const validated = validateEnvelope(encryptedEnvelopeJson)
  if (!validated) {
    return { ok: false, error: 'ساختار فایل رمزنگاری‌شده معتبر نیست.' }
  }

  try {
    // Fixed, trusted iteration count — never take it from the untrusted envelope.
    const key = await deriveAesGcmKey(password, validated.salt, PBKDF2_ITERATIONS, ['decrypt'])
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: validated.iv as BufferSource },
      key,
      validated.ciphertext as BufferSource,
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
