import { v4 as uuidv4 } from 'uuid'

export function getSessionId() {
  const existing = localStorage.getItem('session_id')
  if (existing) {
    return existing.replace(/[^a-z0-9-]/g, '')
  }
  const newSessionId = uuidv4()
  localStorage.setItem('session_id', newSessionId)
  return newSessionId
}

export class CryptoManager {
  private key: CryptoKey | null = null

  async generateKey() {
    this.key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 128,
      },
      true,
      ['encrypt', 'decrypt'],
    )
  }

  async exportKey() {
    if (!this.key) {
      return null
    }
    return (await window.crypto.subtle.exportKey('jwk', this.key)).k
  }

  async importKey(objectKey: string) {
    this.key = await window.crypto.subtle.importKey(
      'jwk',
      {
        k: objectKey,
        alg: 'A128GCM',
        ext: true,
        key_ops: ['encrypt', 'decrypt'],
        kty: 'oct',
      },
      { name: 'AES-GCM', length: 128 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  async encrypt(data: string) {
    if (!this.key) {
      return null
    }
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      this.key,
      str2ab(data),
    )
    return ab2str(encrypted)
  }

  async decrypt(encrypted: string) {
    if (!this.key) {
      return null
    }
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      this.key,
      str2ab(encrypted),
    )
    return ab2str(decrypted)
  }
}

function ab2str(buf: ArrayBuffer) {
  return String.fromCharCode(...new Uint8Array(buf))
}

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}
