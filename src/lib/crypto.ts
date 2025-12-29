import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { env, getServerEnv } from './env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

function getKey(salt: Buffer): Buffer {
  // Ensure we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('Encryption functions can only be called on the server')
  }

  const encryptionKey =
    getServerEnv().TOKEN_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    'default-key-for-development-only-change-in-production'

  if (
    encryptionKey === 'default-key-for-development-only-change-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    console.warn(
      '⚠️  WARNING: Using default encryption key in production! Set TOKEN_ENCRYPTION_KEY environment variable.'
    )
  }

  return Buffer.from(encryptionKey, 'utf8').slice(0, 32)
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH)
  const salt = randomBytes(SALT_LENGTH)
  const key = getKey(salt)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('hex')
}

export function decrypt(encryptedData: string): string {
  const buffer = Buffer.from(encryptedData, 'hex')

  const salt = buffer.slice(0, SALT_LENGTH)
  const iv = buffer.slice(SALT_LENGTH, TAG_POSITION)
  const tag = buffer.slice(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = buffer.slice(ENCRYPTED_POSITION)

  const key = getKey(salt)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
