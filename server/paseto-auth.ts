/**
 * PASETO Token Authentication - Banking-Grade Security
 * 
 * PASETO (Platform-Agnostic SEcurity TOkens) is more secure than JWT because:
 * - No algorithm confusion attacks
 * - Requires authenticated encryption
 * - Simpler, safer defaults
 * 
 * Uses V4.local for symmetric encryption (internal services)
 * Uses V4.public for asymmetric signing (external services like Wingold)
 */

import * as paseto from 'paseto';
import crypto from 'crypto';

const { V4 } = paseto;

let publicKeyPaseto: ReturnType<typeof crypto.createPublicKey> | Buffer | null = null;
let privateKeyPaseto: ReturnType<typeof crypto.createPrivateKey> | Buffer | null = null;
let symmetricKeyPaseto: Buffer | null = null;
let initialized = false;

export interface TokenPayload {
  sub: string;
  iss: string;
  aud?: string;
  exp?: string;
  iat?: string;
  [key: string]: any;
}

async function initializeKeys(): Promise<void> {
  if (initialized) return;

  try {
    const keys = await V4.generateKey('public');
    privateKeyPaseto = keys.secretKey as Buffer;
    publicKeyPaseto = keys.publicKey as Buffer;
    console.log('[PASETO] Generated Ed25519 keypair for token signing');
  } catch (error) {
    console.error('[PASETO] Failed to generate keypair:', error);
    throw new Error('PASETO key initialization failed');
  }

  const symKeyEnv = process.env.PASETO_SYMMETRIC_KEY;
  if (symKeyEnv) {
    try {
      symmetricKeyPaseto = Buffer.from(symKeyEnv, 'hex');
      if (symmetricKeyPaseto.length !== 32) {
        console.warn('[PASETO] Symmetric key must be 32 bytes, generating new one');
        symmetricKeyPaseto = null;
      }
    } catch {
      console.warn('[PASETO] Invalid symmetric key format, generating new one');
      symmetricKeyPaseto = null;
    }
  }
  
  if (!symmetricKeyPaseto) {
    const localKey = await V4.generateKey('local');
    symmetricKeyPaseto = localKey as Buffer;
    console.log('[PASETO] Generated symmetric key for local tokens');
  }
  
  initialized = true;
  console.log('[PASETO] Token service initialized successfully');
}

let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeKeys();
  }
  await initPromise;
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiresIn format. Use format like "5m", "1h", "7d"');
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error('Invalid time unit');
  }
}

export async function signPublicToken(payload: TokenPayload, expiresIn: string = '5m'): Promise<string> {
  await ensureInitialized();
  
  if (!privateKeyPaseto) {
    throw new Error('Private key not available');
  }

  const now = new Date();
  const expiration = new Date(now.getTime() + parseExpiresIn(expiresIn));
  
  const tokenPayload = {
    ...payload,
    iat: now.toISOString(),
    exp: expiration.toISOString(),
  };

  try {
    const token = await V4.sign(tokenPayload, privateKeyPaseto);
    return token;
  } catch (error) {
    console.error('[PASETO] Token signing failed:', error);
    throw new Error('Failed to sign token');
  }
}

export async function verifyPublicToken(token: string): Promise<TokenPayload> {
  await ensureInitialized();
  
  if (!publicKeyPaseto) {
    throw new Error('Public key not available');
  }

  try {
    const verified = await V4.verify(token, publicKeyPaseto);
    
    if (verified.exp) {
      const expDate = new Date(verified.exp as string);
      if (expDate < new Date()) {
        throw new Error('Token has expired');
      }
    }
    
    return verified as TokenPayload;
  } catch (error: any) {
    console.error('[PASETO] Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}

export async function encryptLocalToken(payload: TokenPayload, expiresIn: string = '1h'): Promise<string> {
  await ensureInitialized();
  
  if (!symmetricKeyPaseto) {
    throw new Error('Symmetric key not available');
  }

  const now = new Date();
  const expiration = new Date(now.getTime() + parseExpiresIn(expiresIn));
  
  const tokenPayload = {
    ...payload,
    iat: now.toISOString(),
    exp: expiration.toISOString(),
  };

  try {
    const token = await V4.encrypt(tokenPayload, symmetricKeyPaseto);
    return token;
  } catch (error) {
    console.error('[PASETO] Token encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

export async function decryptLocalToken(token: string): Promise<TokenPayload> {
  await ensureInitialized();
  
  if (!symmetricKeyPaseto) {
    throw new Error('Symmetric key not available');
  }

  try {
    const decrypted = await V4.decrypt(token, symmetricKeyPaseto);
    
    if (decrypted.exp) {
      const expDate = new Date(decrypted.exp as string);
      if (expDate < new Date()) {
        throw new Error('Token has expired');
      }
    }
    
    return decrypted as TokenPayload;
  } catch (error: any) {
    console.error('[PASETO] Token decryption failed:', error.message);
    throw new Error('Invalid or expired token');
  }
}

export async function generateServiceToken(
  serviceId: string,
  permissions: string[],
  expiresIn: string = '1h'
): Promise<string> {
  return encryptLocalToken({
    sub: serviceId,
    iss: 'finatrades.com',
    permissions,
    type: 'service',
  }, expiresIn);
}

export async function generateAdminToken(
  adminId: string,
  role: string,
  expiresIn: string = '30m'
): Promise<string> {
  return encryptLocalToken({
    sub: adminId,
    iss: 'finatrades.com',
    role,
    type: 'admin',
  }, expiresIn);
}

export async function getPublicKey(): Promise<Buffer | null> {
  await ensureInitialized();
  return publicKeyPaseto as Buffer | null;
}

export { ensureInitialized as initializePaseto };
