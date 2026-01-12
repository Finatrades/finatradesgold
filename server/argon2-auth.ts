/**
 * Argon2 Password Hashing - Banking-Grade Security
 * 
 * Argon2 is the winner of the Password Hashing Competition (2015)
 * and is recommended by OWASP for password hashing.
 * 
 * Advantages over bcrypt:
 * - Memory-hard (resistant to GPU attacks)
 * - Configurable parallelism
 * - Side-channel attack resistant (Argon2id variant)
 * - More modern design with better security margins
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

export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    return hash;
  } catch (error) {
    console.error('[Argon2] Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, password);
    }
    
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    }
    
    return hash === password;
  } catch (error) {
    console.error('[Argon2] Password verification failed:', error);
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
  
  if (!isValid) {
    return null;
  }
  
  const needsMigration = await needsRehash(currentHash);
  
  if (needsMigration) {
    const newHash = await hashPassword(password);
    console.log('[Argon2] Password migrated to Argon2id');
    return newHash;
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
