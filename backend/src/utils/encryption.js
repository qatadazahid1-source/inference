import crypto from 'crypto';
import { supabase } from '../index.js';

// IMPORTANT: We do NOT read/validate process.env.CREDENTIAL_ENCRYPTION_KEY at the
// top level of this module. ES module imports are resolved before any code in
// index.js (including dotenv.config()) runs, so a top-level check here would
// always fail with "missing from environment variables" even when the .env file
// is correct — because this file gets imported (via the route chain) before
// dotenv has had a chance to populate process.env.
//
// Instead, the key is read lazily, the first time it's actually needed inside
// a function call, by which point dotenv.config() in index.js has already run.

let cachedKeyBuffer = null;

function getKeyBuffer() {
  if (cachedKeyBuffer) return cachedKeyBuffer;

  const encryptionKeyHex = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!encryptionKeyHex) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is missing from environment variables.');
  }

  const keyBuffer = Buffer.from(encryptionKeyHex, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).');
  }

  cachedKeyBuffer = keyBuffer;
  return cachedKeyBuffer;
}

/**
 * Encrypts plain text using AES-256-GCM.
 * Returns formatted string: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plainText) {
  if (!plainText) return '';
  const keyBuffer = getKeyBuffer();
  const iv = crypto.randomBytes(12); // Standard IV size for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted string (format iv:authTag:ciphertext) using AES-256-GCM.
 * Returns the original plain text.
 */
export function decrypt(encryptedString) {
  if (!encryptedString) return '';
  const keyBuffer = getKeyBuffer();

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format. Expected iv:authTag:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Server-only helper to fetch an integration's API key, decrypt it, and return the plain key.
 * Scoped to organization_id.
 */
export async function getDecryptedApiKey(integrationId, organizationId) {
  const { data, error } = await supabase
    .from('ai_integrations')
    .select('api_key_hash')
    .eq('id', integrationId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    throw new Error(`Could not find active integration ${integrationId} for organization ${organizationId}`);
  }

  // Decrypt the api_key_hash
  return decrypt(data.api_key_hash);
}
