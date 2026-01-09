import { Certificate, Invoice, Transaction, User, InsertCertificate } from '@shared/schema';
import { generateCertificatePDF, generateInvoicePDF, generateInvoiceNumber, generateCertificateNumber, TransferParties } from './pdf-generator';
import { sendEmailWithAttachment, EMAIL_TEMPLATES } from './email';
import { storage } from './storage';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

function formatGrams(grams: string | number | null | undefined): string {
  if (!grams) return '0.0000';
  const num = typeof grams === 'string' ? parseFloat(grams) : grams;
  return num.toFixed(4);
}

export async function generateAndSendCertificate(
  certificate: Certificate,
  user: User
): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
  try {
    const pdfBuffer = await generateCertificatePDF(certificate, user);
    
    const emailResult = await sendEmailWithAttachment(
      user.email,
      EMAIL_TEMPLATES.CERTIFICATE_DELIVERY,
      {
        user_name: `${user.firstName} ${user.lastName}`,
        certificate_number: certificate.certificateNumber,
        gold_amount: formatGrams(certificate.goldGrams),
        certificate_type: certificate.type,
        issuer: certificate.issuer,
        issue_date: formatDate(certificate.issuedAt),
        dashboard_url: process.env.APP_URL || 'https://finatrades.com/dashboard',
      },
      {
        filename: `Certificate-${certificate.certificateNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    );

    const delivery = await storage.createCertificateDelivery({
      certificateId: certificate.id,
      userId: user.id,
      deliveryMethod: 'email',
      recipientEmail: user.email,
      status: emailResult.success ? 'Sent' : 'Failed',
      sentAt: emailResult.success ? new Date() : null,
      failureReason: emailResult.error || null,
    });

    if (emailResult.success) {
      console.log(`[DocumentService] Certificate ${certificate.certificateNumber} sent to ${user.email}`);
      return { success: true, deliveryId: delivery.id };
    } else {
      console.error(`[DocumentService] Failed to send certificate ${certificate.certificateNumber}:`, emailResult.error);
      return { success: false, error: emailResult.error };
    }
  } catch (error) {
    console.error(`[DocumentService] Error generating/sending certificate:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateAndSendInvoice(
  transaction: Transaction,
  user: User,
  goldPricePerGram: number
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  try {
    const goldGrams = parseFloat(transaction.amountGold || '0');
    const totalAmount = parseFloat(transaction.amountUsd || '0');
    const subtotal = totalAmount;

    const invoiceNumber = generateInvoiceNumber();
    
    const invoice = await storage.createInvoice({
      userId: user.id,
      transactionId: transaction.id,
      invoiceNumber,
      issuer: 'Wingold and Metals DMCC',
      issuerAddress: 'Dubai Multi Commodities Centre\nDubai, United Arab Emirates',
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      subtotalUsd: subtotal.toFixed(2),
      feesUsd: '0.00',
      totalUsd: totalAmount.toFixed(2),
      paymentMethod: 'Platform',
      paymentReference: transaction.referenceId || transaction.id,
      status: 'Generated',
    });

    const pdfBuffer = await generateInvoicePDF(invoice, user);

    const emailResult = await sendEmailWithAttachment(
      user.email,
      EMAIL_TEMPLATES.INVOICE_DELIVERY,
      {
        user_name: `${user.firstName} ${user.lastName}`,
        invoice_number: invoice.invoiceNumber,
        gold_amount: formatGrams(invoice.goldGrams),
        price_per_gram: formatCurrency(invoice.goldPriceUsdPerGram),
        total_amount: formatCurrency(invoice.totalUsd),
        payment_status: 'Paid',
        dashboard_url: process.env.APP_URL || 'https://finatrades.com/dashboard',
      },
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    );

    if (emailResult.success) {
      await storage.updateInvoice(invoice.id, {
        status: 'Sent',
        emailedAt: new Date(),
      });
      console.log(`[DocumentService] Invoice ${invoice.invoiceNumber} sent to ${user.email}`);
      return { success: true, invoiceId: invoice.id };
    } else {
      await storage.updateInvoice(invoice.id, { status: 'Failed' });
      console.error(`[DocumentService] Failed to send invoice ${invoice.invoiceNumber}:`, emailResult.error);
      return { success: false, invoiceId: invoice.id, error: emailResult.error };
    }
  } catch (error) {
    console.error(`[DocumentService] Error generating/sending invoice:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function processTransactionDocuments(
  transaction: Transaction,
  certificates: Certificate[],
  user: User,
  goldPricePerGram: number
): Promise<{
  invoiceResult: { success: boolean; invoiceId?: string; error?: string };
  certificateResults: { certificateId: string; success: boolean; deliveryId?: string; error?: string }[];
}> {
  const invoiceResult = await generateAndSendInvoice(transaction, user, goldPricePerGram);
  
  const certificateResults: { certificateId: string; success: boolean; deliveryId?: string; error?: string }[] = [];
  
  for (const certificate of certificates) {
    const result = await generateAndSendCertificate(certificate, user);
    certificateResults.push({
      certificateId: certificate.id,
      ...result,
    });
  }
  
  console.log(`[DocumentService] Processed documents for transaction ${transaction.id}: Invoice ${invoiceResult.success ? 'sent' : 'failed'}, ${certificateResults.filter(r => r.success).length}/${certificates.length} certificates sent`);
  
  return { invoiceResult, certificateResults };
}

export async function resendCertificate(certificateId: string): Promise<{ success: boolean; error?: string }> {
  const certificate = await storage.getCertificate(certificateId);
  if (!certificate) {
    return { success: false, error: 'Certificate not found' };
  }

  const user = await storage.getUser(certificate.userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  return generateAndSendCertificate(certificate, user);
}

export async function resendInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  const invoice = await storage.getInvoice(invoiceId);
  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  const user = await storage.getUser(invoice.userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, user);

    const emailResult = await sendEmailWithAttachment(
      user.email,
      EMAIL_TEMPLATES.INVOICE_DELIVERY,
      {
        user_name: `${user.firstName} ${user.lastName}`,
        invoice_number: invoice.invoiceNumber,
        gold_amount: formatGrams(invoice.goldGrams),
        price_per_gram: formatCurrency(invoice.goldPriceUsdPerGram),
        total_amount: formatCurrency(invoice.totalUsd),
        payment_status: invoice.status === 'Sent' ? 'Paid' : 'Pending',
        dashboard_url: process.env.APP_URL || 'https://finatrades.com/dashboard',
      },
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    );

    if (emailResult.success) {
      await storage.updateInvoice(invoice.id, {
        status: 'Sent',
        emailedAt: new Date(),
      });
    }

    return { success: emailResult.success, error: emailResult.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function downloadCertificatePDF(certificateId: string): Promise<{ buffer?: Buffer; filename?: string; error?: string }> {
  const certificate = await storage.getCertificate(certificateId);
  if (!certificate) {
    return { error: 'Certificate not found' };
  }

  const user = await storage.getUser(certificate.userId);
  if (!user) {
    return { error: 'User not found' };
  }

  try {
    const buffer = await generateCertificatePDF(certificate, user);
    return { 
      buffer, 
      filename: `Certificate-${certificate.certificateNumber}.pdf` 
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function downloadInvoicePDF(invoiceId: string): Promise<{ buffer?: Buffer; filename?: string; error?: string }> {
  const invoice = await storage.getInvoice(invoiceId);
  if (!invoice) {
    return { error: 'Invoice not found' };
  }

  const user = await storage.getUser(invoice.userId);
  if (!user) {
    return { error: 'User not found' };
  }

  try {
    const buffer = await generateInvoicePDF(invoice, user);
    return { 
      buffer, 
      filename: `Invoice-${invoice.invoiceNumber}.pdf` 
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateTransferCertificates(
  transactionId: string,
  fromUserId: string,
  toUserId: string,
  goldGrams: number,
  goldPricePerGram: number
): Promise<{ senderCert?: Certificate; recipientCert?: Certificate; error?: string }> {
  try {
    const fromUser = await storage.getUser(fromUserId);
    const toUser = await storage.getUser(toUserId);
    
    if (!fromUser || !toUser) {
      return { error: 'Users not found' };
    }

    const totalValue = goldGrams * goldPricePerGram;

    const senderCertData: InsertCertificate = {
      certificateNumber: generateCertificateNumber('Transfer'),
      userId: fromUserId,
      transactionId,
      type: 'Transfer',
      status: 'Active',
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      totalValueUsd: totalValue.toFixed(2),
      issuer: 'Finatrades Finance SA',
      fromUserId,
      toUserId,
    };

    const recipientCertData: InsertCertificate = {
      certificateNumber: generateCertificateNumber('Transfer'),
      userId: toUserId,
      transactionId,
      type: 'Transfer',
      status: 'Active',
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      totalValueUsd: totalValue.toFixed(2),
      issuer: 'Finatrades Finance SA',
      fromUserId,
      toUserId,
    };

    const senderCert = await storage.createCertificate(senderCertData);
    const recipientCert = await storage.createCertificate(recipientCertData);

    const transferParties: TransferParties = { fromUser, toUser };
    
    await generateAndSendCertificateWithParties(senderCert, fromUser, transferParties);
    await generateAndSendCertificateWithParties(recipientCert, toUser, transferParties);

    console.log(`[DocumentService] Generated transfer certificates for ${fromUser.email} -> ${toUser.email}`);
    return { senderCert, recipientCert };
  } catch (error) {
    console.error('[DocumentService] Error generating transfer certificates:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function generateAndSendCertificateWithParties(
  certificate: Certificate,
  user: User,
  transferParties?: TransferParties
): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
  try {
    const pdfBuffer = await generateCertificatePDF(certificate, user, transferParties);
    
    const emailResult = await sendEmailWithAttachment(
      user.email,
      EMAIL_TEMPLATES.CERTIFICATE_DELIVERY,
      {
        user_name: `${user.firstName} ${user.lastName}`,
        certificate_number: certificate.certificateNumber,
        gold_amount: formatGrams(certificate.goldGrams),
        certificate_type: certificate.type,
        issuer: certificate.issuer,
        issue_date: formatDate(certificate.issuedAt),
        dashboard_url: process.env.APP_URL || 'https://finatrades.com/dashboard',
      },
      {
        filename: `Certificate-${certificate.certificateNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    );

    const delivery = await storage.createCertificateDelivery({
      certificateId: certificate.id,
      userId: user.id,
      deliveryMethod: 'email',
      recipientEmail: user.email,
      status: emailResult.success ? 'Sent' : 'Failed',
      sentAt: emailResult.success ? new Date() : null,
      failureReason: emailResult.error || null,
    });

    return { success: emailResult.success, deliveryId: delivery.id, error: emailResult.error };
  } catch (error) {
    console.error('[DocumentService] Error in generateAndSendCertificateWithParties:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateBNSLLockCertificate(
  bnslPlanId: string,
  userId: string,
  goldGrams: number,
  goldPricePerGram: number,
  lockDate?: Date
): Promise<{ certificate?: Certificate; error?: string }> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { error: 'User not found' };
    }

    const totalValue = goldGrams * goldPricePerGram;

    const certData: InsertCertificate = {
      certificateNumber: generateCertificateNumber('BNSL Lock'),
      userId,
      type: 'BNSL Lock',
      status: 'Active',
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      totalValueUsd: totalValue.toFixed(2),
      issuer: 'Finatrades Finance SA',
      bnslPlanId,
    };

    const certificate = await storage.createCertificate(certData);
    await generateAndSendCertificate(certificate, user);

    console.log(`[DocumentService] Generated BNSL Lock certificate for plan ${bnslPlanId}`);
    return { certificate };
  } catch (error) {
    console.error('[DocumentService] Error generating BNSL Lock certificate:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateTradeLockCertificate(
  tradeCaseId: string,
  userId: string,
  goldGrams: number,
  goldPricePerGram: number
): Promise<{ certificate?: Certificate; error?: string }> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { error: 'User not found' };
    }

    const totalValue = goldGrams * goldPricePerGram;

    const certData: InsertCertificate = {
      certificateNumber: generateCertificateNumber('Trade Lock'),
      userId,
      type: 'Trade Lock',
      status: 'Active',
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      totalValueUsd: totalValue.toFixed(2),
      issuer: 'Finatrades Finance SA',
      tradeCaseId,
    };

    const certificate = await storage.createCertificate(certData);
    await generateAndSendCertificate(certificate, user);

    console.log(`[DocumentService] Generated Trade Lock certificate for case ${tradeCaseId}`);
    return { certificate };
  } catch (error) {
    console.error('[DocumentService] Error generating Trade Lock certificate:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateTradeReleaseCertificate(
  tradeCaseId: string,
  userId: string,
  goldGrams: number,
  goldPricePerGram: number,
  relatedLockCertificateId?: string
): Promise<{ certificate?: Certificate; error?: string }> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { error: 'User not found' };
    }

    const totalValue = goldGrams * goldPricePerGram;

    const certData: InsertCertificate = {
      certificateNumber: generateCertificateNumber('Trade Release'),
      userId,
      type: 'Trade Release',
      status: 'Active',
      goldGrams: goldGrams.toFixed(6),
      goldPriceUsdPerGram: goldPricePerGram.toFixed(2),
      totalValueUsd: totalValue.toFixed(2),
      issuer: 'Finatrades Finance SA',
      tradeCaseId,
      relatedCertificateId: relatedLockCertificateId,
    };

    const certificate = await storage.createCertificate(certData);

    if (relatedLockCertificateId) {
      await storage.updateCertificate(relatedLockCertificateId, {
        status: 'Updated',
        supersededBy: certificate.id,
      });
    }

    await generateAndSendCertificate(certificate, user);

    console.log(`[DocumentService] Generated Trade Release certificate for case ${tradeCaseId}`);
    return { certificate };
  } catch (error) {
    console.error('[DocumentService] Error generating Trade Release certificate:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
