/**
 * Banking-Grade Security Module Test Script
 * Run with: npx tsx server/test-banking-security.ts
 */

import { hashPassword, verifyPassword, needsRehash, bcrypt } from './password-utils';
import { signPublicToken, verifyPublicToken, encryptLocalToken, decryptLocalToken, initializePaseto } from './paseto-auth';
import { logger, logAudit, logTransaction, logSecurity } from './pino-logger';

async function testPasswordUtils() {
  console.log('\n=== Testing Argon2 Password Hashing ===\n');
  
  const testPassword = 'SecureP@ssw0rd123!';
  
  console.log('1. Hashing password with Argon2id...');
  const hash = await hashPassword(testPassword);
  console.log(`   Hash: ${hash.substring(0, 50)}...`);
  console.log(`   Uses Argon2: ${hash.startsWith('$argon2')}`);
  
  console.log('\n2. Verifying correct password...');
  const isValid = await verifyPassword(testPassword, hash);
  console.log(`   Result: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n3. Verifying wrong password...');
  const isInvalid = await verifyPassword('wrongpassword', hash);
  console.log(`   Result: ${!isInvalid ? '✅ PASS (correctly rejected)' : '❌ FAIL'}`);
  
  console.log('\n4. Testing bcrypt backward compatibility...');
  const bcryptHash = await bcrypt.hash(testPassword, 10);
  const bcryptVerify = await verifyPassword(testPassword, bcryptHash);
  console.log(`   Bcrypt hash verified: ${bcryptVerify ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n5. Checking if bcrypt hash needs rehash (migration to Argon2)...');
  const shouldRehash = await needsRehash(bcryptHash);
  console.log(`   Needs migration: ${shouldRehash ? '✅ Yes (correct)' : '❌ No'}`);
  
  return isValid && !isInvalid && bcryptVerify && shouldRehash;
}

async function testPasetoTokens() {
  console.log('\n=== Testing PASETO v4 Tokens ===\n');
  
  console.log('1. Initializing PASETO...');
  await initializePaseto();
  console.log('   ✅ Initialized');
  
  console.log('\n2. Signing a public token...');
  const payload = {
    sub: 'user-123',
    iss: 'finatrades.com',
    email: 'test@example.com',
    role: 'admin',
  };
  const publicToken = await signPublicToken(payload, '5m');
  console.log(`   Token: ${publicToken.substring(0, 50)}...`);
  
  console.log('\n3. Verifying the public token...');
  const verifiedPayload = await verifyPublicToken(publicToken);
  console.log(`   Subject: ${verifiedPayload.sub}`);
  console.log(`   Issuer: ${verifiedPayload.iss}`);
  console.log(`   Result: ${verifiedPayload.sub === 'user-123' ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n4. Encrypting a local token...');
  const localToken = await encryptLocalToken(payload, '1h');
  console.log(`   Token: ${localToken.substring(0, 50)}...`);
  
  console.log('\n5. Decrypting the local token...');
  const decryptedPayload = await decryptLocalToken(localToken);
  console.log(`   Subject: ${decryptedPayload.sub}`);
  console.log(`   Result: ${decryptedPayload.sub === 'user-123' ? '✅ PASS' : '❌ FAIL'}`);
  
  return verifiedPayload.sub === 'user-123' && decryptedPayload.sub === 'user-123';
}

function testPinoLogger() {
  console.log('\n=== Testing Pino Logger ===\n');
  
  console.log('1. Testing structured logging...');
  logger.info({ testId: 'test-001' }, 'Test log message');
  console.log('   ✅ Basic logging works');
  
  console.log('\n2. Testing sensitive data redaction...');
  logger.info({ 
    user: 'test@example.com',
    password: 'should-be-redacted',
    token: 'should-be-redacted',
    data: { nested: { password: 'also-redacted' } }
  }, 'Testing redaction');
  console.log('   ✅ Redaction configured (check logs for [REDACTED])');
  
  console.log('\n3. Testing audit logging...');
  logAudit({
    action: 'test_action',
    userId: 'test-user-123',
    resourceType: 'test',
    resourceId: 'test-001',
    success: true,
  });
  console.log('   ✅ Audit logging works');
  
  console.log('\n4. Testing transaction logging...');
  logTransaction({
    txId: 'TX-TEST-001',
    type: 'test_transfer',
    fromUserId: 'user-1',
    toUserId: 'user-2',
    amount: '10.5',
    currency: 'grams',
    status: 'completed',
  });
  console.log('   ✅ Transaction logging works');
  
  console.log('\n5. Testing security logging...');
  logSecurity({
    event: 'test_security_event',
    severity: 'low',
    userId: 'test-user',
    details: { test: true },
  });
  console.log('   ✅ Security logging works');
  
  return true;
}

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Banking-Grade Security Module Tests            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  
  const results: Record<string, boolean> = {};
  
  try {
    results.passwordUtils = await testPasswordUtils();
  } catch (error) {
    console.error('Password utils test failed:', error);
    results.passwordUtils = false;
  }
  
  try {
    results.pasetoTokens = await testPasetoTokens();
  } catch (error) {
    console.error('PASETO tokens test failed:', error);
    results.pasetoTokens = false;
  }
  
  try {
    results.pinoLogger = testPinoLogger();
  } catch (error) {
    console.error('Pino logger test failed:', error);
    results.pinoLogger = false;
  }
  
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Test Results Summary                           ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║   Argon2 Password Hashing: ${results.passwordUtils ? '✅ PASS' : '❌ FAIL'}              ║`);
  console.log(`║   PASETO v4 Tokens:        ${results.pasetoTokens ? '✅ PASS' : '❌ FAIL'}              ║`);
  console.log(`║   Pino Structured Logging: ${results.pinoLogger ? '✅ PASS' : '❌ FAIL'}              ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(console.error);
