import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { 
  createEnvelope, 
  getEnvelopeStatus, 
  getEmbeddedSigningUrl, 
  downloadSignedDocument,
  generateKycAgreementDocument,
  isDocuSignConfigured 
} from './docusign-service';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    res.json({ 
      configured: isDocuSignConfigured(),
      message: isDocuSignConfigured() 
        ? 'DocuSign is configured and ready' 
        : 'DocuSign credentials not configured'
    });
  } catch (error) {
    console.error('[DocuSign] Status check error:', error);
    res.status(500).json({ error: 'Failed to check DocuSign status' });
  }
});

router.post('/kyc/:kycId/send-agreement', async (req: Request, res: Response) => {
  try {
    if (!isDocuSignConfigured()) {
      return res.status(400).json({ error: 'DocuSign is not configured' });
    }

    const { kycId } = req.params;
    const { kycType } = req.body;

    if (!kycType || !['personal', 'corporate'].includes(kycType)) {
      return res.status(400).json({ error: 'Invalid KYC type. Must be "personal" or "corporate"' });
    }

    let kyc: any;
    if (kycType === 'personal') {
      kyc = await storage.getFinatradesPersonalKycById(kycId);
    } else {
      kyc = await storage.getFinatradesCorporateKycById(kycId);
    }

    if (!kyc) {
      return res.status(404).json({ error: 'KYC submission not found' });
    }

    if (kyc.agreementEnvelopeId && kyc.agreementStatus === 'completed') {
      return res.status(400).json({ error: 'Agreement already signed' });
    }

    const user = await storage.getUser(kyc.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const customerName = kycType === 'personal' 
      ? kyc.fullName || `${user.firstName} ${user.lastName}`
      : kyc.authorizedSignatoryName || kyc.companyName;

    const documentContent = generateKycAgreementDocument({
      customerName,
      customerEmail: user.email,
      agreementDate: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      companyName: kycType === 'corporate' ? kyc.companyName : undefined,
    });

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://demo.finatrades.com';

    const result = await createEnvelope({
      signerEmail: user.email,
      signerName: customerName,
      documentName: 'Finatrades Customer Agreement',
      documentContent,
      subject: 'Please sign your Finatrades Customer Agreement',
      returnUrl: `${baseUrl}/kyc/agreement-signed?kycId=${kycId}&kycType=${kycType}`,
    });

    if (kycType === 'personal') {
      await storage.updateFinatradesPersonalKyc(kycId, {
        agreementEnvelopeId: result.envelopeId,
        agreementStatus: 'sent',
        agreementSentAt: new Date(),
      });
    } else {
      await storage.updateFinatradesCorporateKyc(kycId, {
        agreementEnvelopeId: result.envelopeId,
        agreementStatus: 'sent',
        agreementSentAt: new Date(),
      });
    }

    console.log(`[DocuSign] Agreement sent for KYC ${kycId}, envelope: ${result.envelopeId}`);

    res.json({
      success: true,
      envelopeId: result.envelopeId,
      signingUrl: result.embeddedUrl,
    });
  } catch (error: any) {
    console.error('[DocuSign] Send agreement error:', error);
    res.status(500).json({ error: error.message || 'Failed to send agreement' });
  }
});

router.get('/kyc/:kycId/signing-url', async (req: Request, res: Response) => {
  try {
    if (!isDocuSignConfigured()) {
      return res.status(400).json({ error: 'DocuSign is not configured' });
    }

    const { kycId } = req.params;
    const { kycType } = req.query;

    if (!kycType || !['personal', 'corporate'].includes(kycType as string)) {
      return res.status(400).json({ error: 'Invalid KYC type' });
    }

    let kyc: any;
    if (kycType === 'personal') {
      kyc = await storage.getFinatradesPersonalKycById(kycId);
    } else {
      kyc = await storage.getFinatradesCorporateKycById(kycId);
    }

    if (!kyc || !kyc.agreementEnvelopeId) {
      return res.status(404).json({ error: 'Agreement not found' });
    }

    if (kyc.agreementStatus === 'completed') {
      return res.status(400).json({ error: 'Agreement already signed' });
    }

    const user = await storage.getUser(kyc.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const customerName = kycType === 'personal' 
      ? kyc.fullName || `${user.firstName} ${user.lastName}`
      : kyc.authorizedSignatoryName || kyc.companyName;

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://demo.finatrades.com';

    const signingUrl = await getEmbeddedSigningUrl({
      envelopeId: kyc.agreementEnvelopeId,
      signerEmail: user.email,
      signerName: customerName,
      returnUrl: `${baseUrl}/kyc/agreement-signed?kycId=${kycId}&kycType=${kycType}`,
    });

    res.json({ signingUrl });
  } catch (error: any) {
    console.error('[DocuSign] Get signing URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to get signing URL' });
  }
});

router.get('/kyc/:kycId/agreement-status', async (req: Request, res: Response) => {
  try {
    const { kycId } = req.params;
    const { kycType } = req.query;

    if (!kycType || !['personal', 'corporate'].includes(kycType as string)) {
      return res.status(400).json({ error: 'Invalid KYC type' });
    }

    let kyc: any;
    if (kycType === 'personal') {
      kyc = await storage.getFinatradesPersonalKycById(kycId);
    } else {
      kyc = await storage.getFinatradesCorporateKycById(kycId);
    }

    if (!kyc) {
      return res.status(404).json({ error: 'KYC submission not found' });
    }

    if (!kyc.agreementEnvelopeId) {
      return res.json({
        status: 'pending',
        message: 'Agreement not yet sent',
      });
    }

    if (isDocuSignConfigured() && kyc.agreementStatus !== 'completed') {
      try {
        const envelopeStatus = await getEnvelopeStatus(kyc.agreementEnvelopeId);
        
        if (envelopeStatus.status === 'completed' && kyc.agreementStatus !== 'completed') {
          if (kycType === 'personal') {
            await storage.updateFinatradesPersonalKyc(kycId, {
              agreementStatus: 'completed',
              agreementCompletedAt: new Date(envelopeStatus.statusDateTime),
            });
          } else {
            await storage.updateFinatradesCorporateKyc(kycId, {
              agreementStatus: 'completed',
              agreementCompletedAt: new Date(envelopeStatus.statusDateTime),
            });
          }
          
          return res.json({
            status: 'completed',
            envelopeId: kyc.agreementEnvelopeId,
            completedAt: envelopeStatus.statusDateTime,
          });
        }
        
        return res.json({
          status: envelopeStatus.status,
          envelopeId: kyc.agreementEnvelopeId,
        });
      } catch (error) {
        console.error('[DocuSign] Status check error:', error);
      }
    }

    res.json({
      status: kyc.agreementStatus || 'pending',
      envelopeId: kyc.agreementEnvelopeId,
      sentAt: kyc.agreementSentAt,
      completedAt: kyc.agreementCompletedAt,
    });
  } catch (error: any) {
    console.error('[DocuSign] Get agreement status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get agreement status' });
  }
});

router.post('/kyc/:kycId/mark-signed', async (req: Request, res: Response) => {
  try {
    const { kycId } = req.params;
    const { kycType, event } = req.body;

    if (!kycType || !['personal', 'corporate'].includes(kycType)) {
      return res.status(400).json({ error: 'Invalid KYC type' });
    }

    if (event === 'signing_complete') {
      if (kycType === 'personal') {
        await storage.updateFinatradesPersonalKyc(kycId, {
          agreementStatus: 'completed',
          agreementCompletedAt: new Date(),
        });
      } else {
        await storage.updateFinatradesCorporateKyc(kycId, {
          agreementStatus: 'completed',
          agreementCompletedAt: new Date(),
        });
      }

      console.log(`[DocuSign] Agreement marked as signed for KYC ${kycId}`);
      res.json({ success: true });
    } else {
      res.json({ success: true, message: 'Event acknowledged' });
    }
  } catch (error: any) {
    console.error('[DocuSign] Mark signed error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark agreement as signed' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log('[DocuSign] Webhook received:', JSON.stringify(event, null, 2));

    if (event.event === 'envelope-completed' || event.status === 'completed') {
      const envelopeId = event.envelopeId || event.data?.envelopeId;
      
      if (envelopeId) {
        const personalKyc = await storage.getFinatradesPersonalKycByEnvelopeId(envelopeId);
        if (personalKyc) {
          await storage.updateFinatradesPersonalKyc(personalKyc.id, {
            agreementStatus: 'completed',
            agreementCompletedAt: new Date(),
          });
          console.log(`[DocuSign] Personal KYC ${personalKyc.id} agreement marked as completed via webhook`);
        }

        const corporateKyc = await storage.getFinatradesCorporateKycByEnvelopeId(envelopeId);
        if (corporateKyc) {
          await storage.updateFinatradesCorporateKyc(corporateKyc.id, {
            agreementStatus: 'completed',
            agreementCompletedAt: new Date(),
          });
          console.log(`[DocuSign] Corporate KYC ${corporateKyc.id} agreement marked as completed via webhook`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[DocuSign] Webhook error:', error);
    res.status(200).send('OK');
  }
});

export default router;
