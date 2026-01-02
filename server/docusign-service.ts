import crypto from 'crypto';

const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_SECRET_KEY = process.env.DOCUSIGN_SECRET_KEY;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DOCUSIGN_BASE_URL = IS_PRODUCTION 
  ? 'https://eu.docusign.net/restapi'
  : 'https://demo.docusign.net/restapi';
const DOCUSIGN_AUTH_URL = IS_PRODUCTION
  ? 'https://account.docusign.com/oauth/token'
  : 'https://account-d.docusign.com/oauth/token';

interface DocuSignEnvelope {
  envelopeId: string;
  status: string;
  statusDateTime: string;
}

interface EnvelopeRecipient {
  email: string;
  name: string;
  recipientId: string;
  routingOrder: string;
  status: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createJwtAssertion(): string {
  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_SECRET_KEY || !DOCUSIGN_USER_ID) {
    throw new Error('DocuSign JWT credentials not configured (need INTEGRATION_KEY, SECRET_KEY as RSA private key, and USER_ID)');
  }

  const now = Math.floor(Date.now() / 1000);
  const authServer = IS_PRODUCTION ? 'account.docusign.com' : 'account-d.docusign.com';
  
  const header = {
    typ: 'JWT',
    alg: 'RS256'
  };
  
  const payload = {
    iss: DOCUSIGN_INTEGRATION_KEY,
    sub: DOCUSIGN_USER_ID,
    aud: authServer,
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };
  
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  let privateKey = DOCUSIGN_SECRET_KEY;
  if (!privateKey.includes('-----BEGIN')) {
    privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey);
  const signatureB64 = base64url(signature);
  
  return `${signatureInput}.${signatureB64}`;
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_SECRET_KEY) {
    throw new Error('DocuSign credentials not configured');
  }

  try {
    const assertion = createJwtAssertion();
    
    const response = await fetch(DOCUSIGN_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[DocuSign] JWT Auth error:', error);
      throw new Error(`DocuSign authentication failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    console.log('[DocuSign] Access token obtained via JWT Grant');
    return cachedAccessToken as string;
  } catch (error: any) {
    console.error('[DocuSign] Authentication error:', error.message);
    throw error;
  }
}

export async function createEnvelope(params: {
  signerEmail: string;
  signerName: string;
  documentName: string;
  documentContent: string;
  subject: string;
  returnUrl?: string;
}): Promise<{ envelopeId: string; embeddedUrl?: string }> {
  const accessToken = await getAccessToken();

  const documentBase64 = Buffer.from(params.documentContent).toString('base64');

  const envelopeDefinition = {
    emailSubject: params.subject,
    documents: [
      {
        documentBase64: documentBase64,
        name: params.documentName,
        fileExtension: 'html',
        documentId: '1',
      },
    ],
    recipients: {
      signers: [
        {
          email: params.signerEmail,
          name: params.signerName,
          recipientId: '1',
          routingOrder: '1',
          clientUserId: params.signerEmail,
          tabs: {
            signHereTabs: [
              {
                anchorString: '/sig1/',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
            dateSignedTabs: [
              {
                anchorString: '/date1/',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
          },
        },
      ],
    },
    status: 'sent',
  };

  const response = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DocuSign] Create envelope error:', error);
    throw new Error(`Failed to create envelope: ${response.status}`);
  }

  const envelope = await response.json();
  console.log('[DocuSign] Envelope created:', envelope.envelopeId);

  let embeddedUrl: string | undefined;
  if (params.returnUrl) {
    embeddedUrl = await getEmbeddedSigningUrl({
      envelopeId: envelope.envelopeId,
      signerEmail: params.signerEmail,
      signerName: params.signerName,
      returnUrl: params.returnUrl,
    });
  }

  return {
    envelopeId: envelope.envelopeId,
    embeddedUrl,
  };
}

export async function getEmbeddedSigningUrl(params: {
  envelopeId: string;
  signerEmail: string;
  signerName: string;
  returnUrl: string;
}): Promise<string> {
  const accessToken = await getAccessToken();

  const recipientViewRequest = {
    returnUrl: params.returnUrl,
    authenticationMethod: 'none',
    email: params.signerEmail,
    userName: params.signerName,
    clientUserId: params.signerEmail,
  };

  const response = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${params.envelopeId}/views/recipient`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipientViewRequest),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DocuSign] Get signing URL error:', error);
    throw new Error(`Failed to get signing URL: ${response.status}`);
  }

  const result = await response.json();
  return result.url;
}

export async function getEnvelopeStatus(envelopeId: string): Promise<DocuSignEnvelope> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DocuSign] Get envelope status error:', error);
    throw new Error(`Failed to get envelope status: ${response.status}`);
  }

  return response.json();
}

export async function getEnvelopeRecipients(envelopeId: string): Promise<EnvelopeRecipient[]> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/recipients`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DocuSign] Get recipients error:', error);
    throw new Error(`Failed to get envelope recipients: ${response.status}`);
  }

  const data = await response.json();
  return data.signers || [];
}

export async function downloadSignedDocument(envelopeId: string): Promise<Buffer> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${DOCUSIGN_BASE_URL}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/combined`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DocuSign] Download document error:', error);
    throw new Error(`Failed to download signed document: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  hmacKey: string
): boolean {
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(payload);
  const computedSignature = hmac.digest('base64');
  return signature === computedSignature;
}

export function generateKycAgreementDocument(params: {
  customerName: string;
  customerEmail: string;
  agreementDate: string;
  companyName?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #8A2BE2; padding-bottom: 10px; }
    h2 { color: #4B0082; margin-top: 30px; }
    .section { margin: 20px 0; }
    .signature-block { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }
    .customer-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Finatrades Customer Agreement</h1>
  
  <div class="customer-info">
    <strong>Customer Name:</strong> ${params.customerName}<br>
    <strong>Email:</strong> ${params.customerEmail}<br>
    <strong>Date:</strong> ${params.agreementDate}<br>
    ${params.companyName ? `<strong>Company:</strong> ${params.companyName}<br>` : ''}
  </div>

  <div class="section">
    <h2>1. Terms of Service</h2>
    <p>By signing this agreement, I acknowledge that I have read, understood, and agree to be bound by the Finatrades Terms of Service, Privacy Policy, and all applicable regulations governing gold trading and digital financial services.</p>
  </div>

  <div class="section">
    <h2>2. KYC/AML Compliance</h2>
    <p>I confirm that all information provided during the Know Your Customer (KYC) verification process is accurate, complete, and up-to-date. I understand that providing false or misleading information may result in account termination and legal action.</p>
  </div>

  <div class="section">
    <h2>3. Risk Acknowledgment</h2>
    <p>I acknowledge that gold prices can fluctuate and that trading in gold-backed digital assets involves financial risk. I understand that past performance is not indicative of future results and that I may lose some or all of my investment.</p>
  </div>

  <div class="section">
    <h2>4. Anti-Money Laundering Declaration</h2>
    <p>I declare that the funds I will use on the Finatrades platform are from legitimate sources and are not connected to any criminal activity, money laundering, or terrorism financing.</p>
  </div>

  <div class="section">
    <h2>5. Account Security</h2>
    <p>I agree to maintain the security of my account credentials and to immediately notify Finatrades of any unauthorized access or suspicious activity.</p>
  </div>

  <div class="section">
    <h2>6. Data Processing Consent</h2>
    <p>I consent to the collection, processing, and storage of my personal data as described in the Finatrades Privacy Policy, including for regulatory compliance, account management, and service improvement purposes.</p>
  </div>

  <div class="signature-block">
    <p><strong>Customer Signature:</strong></p>
    <p>/sig1/</p>
    <br>
    <p><strong>Date Signed:</strong></p>
    <p>/date1/</p>
  </div>
</body>
</html>
  `.trim();
}

export function isDocuSignConfigured(): boolean {
  return !!(DOCUSIGN_INTEGRATION_KEY && DOCUSIGN_SECRET_KEY && DOCUSIGN_ACCOUNT_ID);
}

console.log('[DocuSign] Service initialized, configured:', isDocuSignConfigured());
