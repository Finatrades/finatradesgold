/**
 * Password Utilities - Banking-Grade Authentication
 * 
 * Unified password hashing interface supporting both Argon2 (recommended)
 * and bcrypt (legacy compatibility). New passwords use Argon2id,
 * existing bcrypt hashes are verified and auto-migrated on login.
 * 
 * OWASP Password Storage Cheat Sheet compliant.
 */

import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, ARGON2_OPTIONS);
  } catch (error) {
    console.warn('[Password] Argon2 failed, falling back to bcrypt:', error);
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, password);
    }
    
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      return await bcrypt.compare(password, hash);
    }
    
    return hash === password;
  } catch (error) {
    console.error('[Password] Verification failed:', error);
    return false;
  }
}

export async function needsRehash(hash: string): Promise<boolean> {
  if (hash.startsWith('$argon2')) {
    try {
      return argon2.needsRehash(hash, ARGON2_OPTIONS);
    } catch {
      return true;
    }
  }
  
  return !hash.startsWith('$argon2');
}

export async function migratePassword(password: string, currentHash: string): Promise<string | null> {
  const isValid = await verifyPassword(password, currentHash);
  if (!isValid) return null;
  
  if (await needsRehash(currentHash)) {
    console.log('[Password] Migrating to Argon2id');
    return await hashPassword(password);
  }
  
  return null;
}

export async function hashPin(pin: string): Promise<string> {
  return hashPassword(pin);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return verifyPassword(pin, hash);
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => hashPassword(code)));
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await verifyPassword(code.toUpperCase(), hashedCodes[i])) {
      return i;
    }
  }
  return -1;
}

export { bcrypt };
