import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WINGOLD_WEBHOOK_SECRET || 'test-secret';
const BASE_URL = 'http://localhost:5000';

function signPayload(payload: object, timestamp: string): string {
  const data = timestamp + '.' + JSON.stringify(payload);
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(data).digest('hex');
}

async function sendWebhook(payload: object) {
  const timestamp = new Date().toISOString();
  const signature = signPayload(payload, timestamp);
  
  console.log(`\n📤 Sending ${(payload as any).event} webhook...`);
  
  const res = await fetch(`${BASE_URL}/api/wingold/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp
    },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log(`   Status: ${res.status}`);
  console.log(`   Response: ${text.substring(0, 200)}`);
  return res.ok;
}

async function testFullFlow() {
  const orderId = `WG-TEST-${Date.now()}`;
  const testUserId = '2a27945d-cef7-49a8-98cd-38452cb7fc1f'; // Use existing test user
  
  console.log('🧪 Testing Wingold Webhook Integration');
  console.log('=====================================');
  console.log(`Order ID: ${orderId}`);
  console.log(`User ID: ${testUserId}`);
  
  // 1. Order Confirmed
  await sendWebhook({
    event: 'order.confirmed',
    orderId,
    timestamp: new Date().toISOString(),
    signature: 'test',
    data: {
      userId: testUserId,
      barSize: '10g',
      barCount: 1,
      totalGrams: '10.000000',
      usdAmount: '1477.00',
      goldPricePerGram: '147.70',
      vaultLocationId: 'DXB-1',
      wingoldReference: orderId
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // 2. Bar Allocated
  await sendWebhook({
    event: 'bar.allocated',
    orderId,
    timestamp: new Date().toISOString(),
    signature: 'test',
    data: {
      barId: `BAR-${Date.now()}`,
      serialNumber: `PAMP-2026-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      barSize: '10g',
      weightGrams: '10.000000',
      purity: '0.9999',
      mint: 'PAMP Suisse',
      vaultLocationId: 'DXB-1',
      vaultLocationName: 'Dubai - Wingold & Metals DMCC'
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // 3. Certificate Issued
  await sendWebhook({
    event: 'certificate.issued',
    orderId,
    timestamp: new Date().toISOString(),
    signature: 'test',
    data: {
      certificateNumber: `PSC-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      certificateType: 'storage',
      barId: `BAR-${Date.now()}`,
      pdfUrl: 'https://wingold.com/certificates/test.pdf',
      jsonData: { holder: 'Test User', goldWeight: '10g' },
      issuedAt: new Date().toISOString(),
      signature: 'cert-signature'
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // 4. Order Fulfilled (triggers wallet credit!)
  await sendWebhook({
    event: 'order.fulfilled',
    orderId,
    timestamp: new Date().toISOString(),
    signature: 'test',
    data: {
      userId: testUserId,
      barSize: '10g',
      barCount: 1,
      totalGrams: '10.000000',
      usdAmount: '1477.00',
      goldPricePerGram: '147.70',
      vaultLocationId: 'DXB-1',
      wingoldReference: orderId,
      fulfillmentDetails: {
        barsAllocated: 1,
        certificatesIssued: 1,
        vaultConfirmation: `VAULT-CONF-${Date.now()}`
      }
    }
  });
  
  console.log('\n✅ Test complete! Check server logs for processing details.');
  console.log('   The user wallet should now be credited with 10g gold.');
}

testFullFlow().catch(console.error);
