import { describe, expect, it, vi } from 'vitest'
import {
  decryptBackupJson,
  encryptBackupJson,
  isEncryptedBackupEnvelope,
  type EncryptedBackupEnvelope,
} from './cryptoBackup'

const PASSWORD = 'StrongPass123'
const PLAIN = '{"hello":"world","n":42}'

async function makeEnvelope(): Promise<EncryptedBackupEnvelope> {
  return JSON.parse(await encryptBackupJson(PLAIN, PASSWORD)) as EncryptedBackupEnvelope
}

function tamper(env: EncryptedBackupEnvelope, patch: Record<string, unknown>): string {
  return JSON.stringify({ ...env, ...patch })
}

describe('encrypted backup envelope hardening', () => {
  it('round-trips a backup created by this app', async () => {
    const envelope = await makeEnvelope()
    expect(isEncryptedBackupEnvelope(JSON.stringify(envelope))).toBe(true)
    await expect(decryptBackupJson(JSON.stringify(envelope), PASSWORD)).resolves.toEqual({
      ok: true,
      plainJson: PLAIN,
    })
  })

  it('ignores an attacker-controlled huge iteration count (no PBKDF2 work-factor DoS)', async () => {
    const envelope = await makeEnvelope()
    const huge = tamper(envelope, { iterations: 999_999_999_999 })
    const spy = vi.spyOn(crypto.subtle, 'deriveKey')
    try {
      await expect(decryptBackupJson(huge, PASSWORD)).resolves.toEqual({
        ok: true,
        plainJson: PLAIN,
      })
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0]?.[0]).toMatchObject({
        name: 'PBKDF2',
        iterations: 100_000,
        hash: 'SHA-256',
      })
    } finally {
      spy.mockRestore()
    }
  })

  it('rejects malformed envelopes before any key derivation', async () => {
    const base = await makeEnvelope()
    const mutations: Array<[label: string, patch: Record<string, unknown>]> = [
      ['wrong version', { version: 2 }],
      ['wrong kdf', { kdf: 'PBKDF2-SHA512' }],
      ['wrong cipher', { cipher: 'AES-256-CBC' }],
      ['not an encrypted backup', { encryptedKaloriShomarBackup: false }],
      ['missing exportedAt', { exportedAt: undefined }],
      ['short salt', { salt: btoa('123456789012345') }],
      ['long salt', { salt: btoa('12345678901234567') }],
      ['short iv', { iv: btoa('12345678901') }],
      ['long iv', { iv: btoa('1234567890123') }],
      ['non-base64 salt', { salt: 'not%base64' }],
      ['empty ciphertext', { ciphertext: '' }],
    ]

    const spy = vi.spyOn(crypto.subtle, 'deriveKey')
    try {
      for (const [label, patch] of mutations) {
        const bad = tamper(base, patch)
        expect(isEncryptedBackupEnvelope(bad), label).toBe(false)
        const result = await decryptBackupJson(bad, PASSWORD)
        expect(result.ok, label).toBe(false)
      }
      for (const raw of ['not-json', '[]', 'null', '{"version":1}']) {
        expect(isEncryptedBackupEnvelope(raw), raw).toBe(false)
        expect((await decryptBackupJson(raw, PASSWORD)).ok, raw).toBe(false)
      }
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('rejects tampered ciphertext through GCM authentication', async () => {
    const base = await makeEnvelope()
    const bytes = Uint8Array.from(atob(base.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] = bytes[0]! ^ 0xff
    const tamperedCiphertext = btoa(String.fromCharCode(...bytes))
    const result = await decryptBackupJson(tamper(base, { ciphertext: tamperedCiphertext }), PASSWORD)
    expect(result.ok).toBe(false)
  })
})
