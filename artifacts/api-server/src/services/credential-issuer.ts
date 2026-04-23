import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import type { User, VerifiableCredential, InsertVerifiableCredential } from '@shared/schema';

const formatPemKey = (key: string | undefined): string | null => {
  if (!key) return null;
  
  // Handle escaped newlines
  let formatted = key.replace(/\\n/g, '\n');
  
  // If the key is all on one line, we need to format it properly
  // Check if there are already proper line breaks
  if (!formatted.includes('\n') || formatted.split('\n').length <= 2) {
    // Extract the header, body, and footer
    const headerMatch = formatted.match(/(-----BEGIN [A-Z ]+-----)/);
    const footerMatch = formatted.match(/(-----END [A-Z ]+-----)/);
    
    if (headerMatch && footerMatch) {
      const header = headerMatch[1];
      const footer = footerMatch[1];
      let body = formatted
        .replace(header, '')
        .replace(footer, '')
        .replace(/\s+/g, ''); // Remove all whitespace from body
      
      // Split body into 64-character lines (PEM format)
      const lines = body.match(/.{1,64}/g) || [];
      formatted = `${header}\n${lines.join('\n')}\n${footer}`;
    }
  }
  
  return formatted;
};

const SSO_PRIVATE_KEY = formatPemKey(process.env.SSO_PRIVATE_KEY);
const SSO_PUBLIC_KEY = formatPemKey(process.env.SSO_PUBLIC_KEY);
const ISSUER_DID = 'did:web:finatrades.com';
const ISSUER_NAME = 'Finatrades';

export interface CredentialClaims {
  kycLevel?: string;
  kycStatus?: string;
  idVerified?: boolean;
  addressVerified?: boolean;
  amlPassed?: boolean;
  documentHashes?: Record<string, string>;
  firstName?: string;
  lastName?: string;
  country?: string;
  accountType?: string;
}

export interface W3CVerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  issuer: {
    id: string;
    name: string;
  };
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id?: string;
  } & CredentialClaims;
}

export class CredentialIssuerService {
  private privateKey: string | null;
  private keyId: string;

  constructor() {
    this.privateKey = SSO_PRIVATE_KEY || null;
    this.keyId = 'finatrades-vc-key-1';
  }

  generateCredentialId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  async issueKycCredential(
    user: User,
    claims: CredentialClaims,
    expiresInDays: number = 365
  ): Promise<VerifiableCredential> {
    if (!this.privateKey) {
      throw new Error('SSO_PRIVATE_KEY not configured');
    }

    const credentialId = this.generateCredentialId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    const vcPayload: W3CVerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      type: ['VerifiableCredential', 'KYCCredential'],
      id: credentialId,
      issuer: {
        id: ISSUER_DID,
        name: ISSUER_NAME
      },
      issuanceDate: now.toISOString(),
      expirationDate: expiresAt.toISOString(),
      credentialSubject: {
        id: `did:user:${user.id}`,
        ...claims
      }
    };

    const subjectDid = `did:user:${user.id}`;
    
    const vcJwt = jwt.sign(
      {
        '@context': vcPayload['@context'],
        type: vcPayload.type,
        vc: vcPayload,
        sub: subjectDid,
        jti: credentialId,
        aud: ['wingoldandmetals.com', 'finatrades.com'],
        iss: ISSUER_DID,
        nbf: Math.floor(now.getTime() / 1000),
        iat: Math.floor(now.getTime() / 1000)
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: `${expiresInDays}d`,
        keyid: this.keyId,
        header: {
          typ: 'vc+ld+jwt',
          alg: 'RS256',
          kid: this.keyId
        }
      }
    );

    const credentialData: InsertVerifiableCredential = {
      credentialId,
      userId: user.id,
      credentialType: 'kyc',
      schemaVersion: '1.0',
      issuerDid: ISSUER_DID,
      subjectDid: `did:user:${user.id}`,
      vcJwt,
      vcPayload: vcPayload as any,
      claimsSummary: claims as any,
      status: 'active',
      issuedAt: now,
      expiresAt,
      keyId: this.keyId,
      signatureAlgorithm: 'RS256',
      issuedBy: 'system',
      presentationCount: 0
    };

    const credential = await storage.createVerifiableCredential(credentialData);
    
    return credential;
  }

  async verifyCredential(vcJwt: string): Promise<{
    valid: boolean;
    payload?: W3CVerifiableCredential;
    error?: string;
    credentialId?: string;
  }> {
    if (!SSO_PUBLIC_KEY) {
      return { valid: false, error: 'Public key not configured' };
    }

    try {
      const decoded = jwt.verify(vcJwt, SSO_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: ISSUER_DID
      }) as { vc: W3CVerifiableCredential; jti: string };

      const credential = await storage.getVerifiableCredentialByCredentialId(decoded.jti);
      
      if (!credential) {
        return { valid: false, error: 'Credential not found in registry' };
      }

      if (credential.status === 'revoked') {
        return { valid: false, error: 'Credential has been revoked', credentialId: decoded.jti };
      }

      if (credential.status === 'expired' || new Date(credential.expiresAt) < new Date()) {
        return { valid: false, error: 'Credential has expired', credentialId: decoded.jti };
      }

      if (credential.status === 'suspended') {
        return { valid: false, error: 'Credential is suspended', credentialId: decoded.jti };
      }

      return { 
        valid: true, 
        payload: decoded.vc,
        credentialId: decoded.jti
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Credential JWT has expired' };
      }
      if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'Invalid credential signature' };
      }
      return { valid: false, error: error.message };
    }
  }

  async revokeCredential(
    credentialId: string, 
    reason: string, 
    revokedBy?: string
  ): Promise<void> {
    await storage.revokeCredential(credentialId, reason, revokedBy);
  }

  async getJwks(): Promise<{
    keys: Array<{
      kty: string;
      use: string;
      kid: string;
      alg: string;
      n: string;
      e: string;
    }>;
  }> {
    if (!SSO_PUBLIC_KEY) {
      return { keys: [] };
    }

    const keyObject = crypto.createPublicKey(SSO_PUBLIC_KEY);
    const jwk = keyObject.export({ format: 'jwk' });

    return {
      keys: [
        {
          kty: 'RSA',
          use: 'sig',
          kid: this.keyId,
          alg: 'RS256',
          n: jwk.n as string,
          e: jwk.e as string
        }
      ]
    };
  }

  async recordPresentation(
    credentialId: string,
    userId: string,
    verifierDomain: string,
    verifierName?: string,
    claimsShared?: string[],
    context?: {
      presentationContext?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    await storage.createCredentialPresentation({
      credentialId,
      userId,
      verifierDomain,
      verifierName,
      claimsShared: claimsShared as any,
      verificationSuccessful: true,
      presentationContext: context?.presentationContext,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      presentedAt: new Date()
    });

    await storage.incrementPresentationCount(credentialId);
  }

  async getUserActiveCredential(userId: string): Promise<VerifiableCredential | undefined> {
    return storage.getActiveUserCredential(userId, 'kyc');
  }

  async getUserCredentials(userId: string): Promise<VerifiableCredential[]> {
    return storage.getUserVerifiableCredentials(userId);
  }

  async checkCredentialStatus(credentialId: string): Promise<{
    status: string;
    isActive: boolean;
    revocation?: {
      reason: string;
      revokedAt: Date;
    };
  }> {
    const credential = await storage.getVerifiableCredentialByCredentialId(credentialId);
    
    if (!credential) {
      return { status: 'not_found', isActive: false };
    }

    if (credential.status === 'revoked') {
      const revocation = await storage.getCredentialRevocation(credentialId);
      return {
        status: 'revoked',
        isActive: false,
        revocation: revocation ? {
          reason: revocation.reason,
          revokedAt: revocation.revokedAt
        } : undefined
      };
    }

    if (new Date(credential.expiresAt) < new Date()) {
      return { status: 'expired', isActive: false };
    }

    return { 
      status: credential.status, 
      isActive: credential.status === 'active' 
    };
  }
}

export const credentialIssuer = new CredentialIssuerService();
