import OpenAI from 'openai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
import { getFromR2, isR2Configured } from '../r2-storage';
import Tesseract from 'tesseract.js';
import { parse as parseMrz } from 'mrz';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// APPROVED ISSUING BANKS LIST
// ============================================================

const APPROVED_BANKS = [
  'HSBC', 'Citibank', 'Deutsche Bank', 'BNP Paribas', 'Standard Chartered',
  'JPMorgan Chase', 'Bank of America', 'Barclays', 'UBS', 'Credit Suisse',
  'Goldman Sachs', 'Morgan Stanley', 'Wells Fargo', 'ABN AMRO', 'ING Group',
  'Societe Generale', 'UniCredit', 'Intesa Sanpaolo', 'Santander', 'BBVA',
  'Rabobank', 'Commerzbank', 'DZ Bank', 'Natixis', 'Credit Agricole',
  'Royal Bank of Canada', 'TD Bank', 'Scotiabank', 'Bank of Montreal', 'CIBC',
  'ANZ', 'National Australia Bank', 'Commonwealth Bank', 'Westpac',
  'DBS Bank', 'OCBC Bank', 'United Overseas Bank', 'Maybank', 'CIMB',
  'Bank of China', 'ICBC', 'China Construction Bank', 'Agricultural Bank of China',
  'Bank of Communications', 'CITIC Bank', 'Mizuho Bank', 'MUFG', 'SMBC',
  'Emirates NBD', 'Abu Dhabi Commercial Bank', 'First Abu Dhabi Bank',
  'Qatar National Bank', 'National Bank of Kuwait', 'Arab Bank',
  'Rand Merchant Bank', 'Standard Bank', 'FirstRand Bank',
];

// ============================================================
// INSTRUMENT-SPECIFIC PROMPTS
// ============================================================

function getExtractionPromptText(instrumentType: string): string {
  const base = `You are a trade finance document verification expert. Analyze the following document text and extract structured data. Respond ONLY with valid JSON matching the schema below. If a field is not found, use null.`;

  if (instrumentType === 'LC' || instrumentType.toLowerCase().includes('letter of credit')) {
    return `${base}

Schema:
{
  "instrument_type": "LC",
  "issuing_bank": string | null,
  "lc_number": string | null,
  "amount": number | null,
  "currency": string | null,
  "expiry_date": string | null,
  "beneficiary_name": string | null,
  "applicant_name": string | null,
  "goods_description": string | null,
  "port_of_loading": string | null,
  "port_of_discharge": string | null,
  "latest_shipment_date": string | null,
  "payment_terms": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  if (instrumentType === 'POL' || instrumentType.toLowerCase().includes('purchase order')) {
    return `${base}

Schema:
{
  "instrument_type": "POL",
  "order_number": string | null,
  "buyer_name": string | null,
  "seller_name": string | null,
  "amount": number | null,
  "currency": string | null,
  "order_date": string | null,
  "delivery_date": string | null,
  "goods_description": string | null,
  "quantity": string | null,
  "unit_price": number | null,
  "payment_terms": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  if (instrumentType === 'WR' || instrumentType.toLowerCase().includes('warehouse')) {
    return `${base}

Schema:
{
  "instrument_type": "WR",
  "warehouse_name": string | null,
  "receipt_number": string | null,
  "depositor_name": string | null,
  "goods_description": string | null,
  "quantity": string | null,
  "weight": string | null,
  "storage_date": string | null,
  "expiry_date": string | null,
  "location": string | null,
  "issuing_authority": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  return `${base}

Schema:
{
  "instrument_type": string | null,
  "issuing_bank": string | null,
  "document_number": string | null,
  "amount": number | null,
  "currency": string | null,
  "expiry_date": string | null,
  "beneficiary_name": string | null,
  "goods_description": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
}

function getExtractionPromptVision(instrumentType: string): string {
  const base = `You are a trade finance document verification expert. Analyze this document image and extract structured data. Respond ONLY with valid JSON matching the schema below. If a field is not found, use null.`;

  if (instrumentType === 'LC' || instrumentType.toLowerCase().includes('letter of credit')) {
    return `${base}

Schema:
{
  "instrument_type": "LC",
  "issuing_bank": string | null,
  "lc_number": string | null,
  "amount": number | null,
  "currency": string | null,
  "expiry_date": string | null,
  "beneficiary_name": string | null,
  "applicant_name": string | null,
  "goods_description": string | null,
  "port_of_loading": string | null,
  "port_of_discharge": string | null,
  "latest_shipment_date": string | null,
  "payment_terms": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  if (instrumentType === 'POL' || instrumentType.toLowerCase().includes('purchase order')) {
    return `${base}

Schema:
{
  "instrument_type": "POL",
  "order_number": string | null,
  "buyer_name": string | null,
  "seller_name": string | null,
  "amount": number | null,
  "currency": string | null,
  "order_date": string | null,
  "delivery_date": string | null,
  "goods_description": string | null,
  "quantity": string | null,
  "unit_price": number | null,
  "payment_terms": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  if (instrumentType === 'WR' || instrumentType.toLowerCase().includes('warehouse')) {
    return `${base}

Schema:
{
  "instrument_type": "WR",
  "warehouse_name": string | null,
  "receipt_number": string | null,
  "depositor_name": string | null,
  "goods_description": string | null,
  "quantity": string | null,
  "weight": string | null,
  "storage_date": string | null,
  "expiry_date": string | null,
  "location": string | null,
  "issuing_authority": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
  }

  return `${base}

Schema:
{
  "instrument_type": string | null,
  "issuing_bank": string | null,
  "document_number": string | null,
  "amount": number | null,
  "currency": string | null,
  "expiry_date": string | null,
  "beneficiary_name": string | null,
  "goods_description": string | null,
  "document_appears_authentic": boolean,
  "anomalies": string[]
}`;
}

// ============================================================
// DOCUMENT DOWNLOAD FROM R2 ONLY (SSRF-safe)
// ============================================================

async function downloadFromR2(documentUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!isR2Configured()) {
    throw new Error('R2 is not configured — cannot download document for AI verification');
  }

  const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

  let key: string | null = null;

  if (R2_PUBLIC_URL && documentUrl.startsWith(R2_PUBLIC_URL + '/')) {
    key = documentUrl.substring(R2_PUBLIC_URL.length + 1);
  } else {
    const r2Pattern = new RegExp(`${R2_ACCOUNT_ID}\\.r2\\.cloudflarestorage\\.com\\/${R2_BUCKET_NAME}\\/(.+)$`);
    const match = documentUrl.match(r2Pattern);
    if (match) key = match[1];
  }

  if (!key) {
    throw new Error(`Cannot resolve R2 key from URL: ${documentUrl.substring(0, 60)}...`);
  }

  const { body, contentType } = await getFromR2(key);
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const urlLower = documentUrl.toLowerCase();
  const inferredMime = urlLower.endsWith('.pdf') ? 'application/pdf'
    : urlLower.endsWith('.png') ? 'image/png'
    : 'image/jpeg';
  return { buffer, mimeType: contentType || inferredMime };
}

// ============================================================
// GPT-4o VISION EXTRACTION
// ============================================================

export interface ExtractedDocumentData {
  instrument_type?: string | null;
  issuing_bank?: string | null;
  lc_number?: string | null;
  order_number?: string | null;
  receipt_number?: string | null;
  document_number?: string | null;
  amount?: number | null;
  currency?: string | null;
  expiry_date?: string | null;
  beneficiary_name?: string | null;
  applicant_name?: string | null;
  buyer_name?: string | null;
  seller_name?: string | null;
  depositor_name?: string | null;
  goods_description?: string | null;
  quantity?: string | null;
  payment_terms?: string | null;
  warehouse_name?: string | null;
  issuing_authority?: string | null;
  document_appears_authentic?: boolean;
  anomalies?: string[];
  [key: string]: unknown;
}

function parseJsonResponse(content: string): ExtractedDocumentData {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in OpenAI response');
  }
  return JSON.parse(jsonMatch[0]) as ExtractedDocumentData;
}

async function extractFromText(text: string, instrumentType: string): Promise<ExtractedDocumentData> {
  const prompt = getExtractionPromptText(instrumentType);
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\nDocument text:\n${text.substring(0, 12000)}`,
      },
    ],
    max_tokens: 1500,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content || '{}';
  return parseJsonResponse(content);
}

async function extractFromImage(base64: string, mimeType: string, instrumentType: string): Promise<ExtractedDocumentData> {
  const prompt = getExtractionPromptVision(instrumentType);
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const imageType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageType};base64,${base64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 1500,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content || '{}';
  return parseJsonResponse(content);
}

export async function extractDocumentData(
  documentUrl: string,
  instrumentType: string
): Promise<ExtractedDocumentData> {
  const { buffer, mimeType } = await downloadFromR2(documentUrl);

  if (mimeType === 'application/pdf' || documentUrl.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buffer);
    const text = parsed.text;
    if (!text || text.trim().length < 50) {
      throw new Error('PDF contains insufficient text for extraction — may be a scanned image PDF');
    }
    return extractFromText(text, instrumentType);
  }

  const base64 = buffer.toString('base64');
  return extractFromImage(base64, mimeType, instrumentType);
}

// ============================================================
// KYC IDENTITY EXTRACTION & MISMATCH DETECTION
// ============================================================

export interface KycOcrResult {
  checked: boolean;
  nameMismatch: boolean;
  dobMismatch: boolean;
  extractedName: string | null;
  extractedDob: string | null;
  similarity: number;
  checkedAt: string;
}

/** Script-aware token-based name similarity (0-1).
 * Handles Latin (incl. accented/diacritic), Arabic, Cyrillic, CJK, etc.
 * - Latin names: NFD decompose + strip diacritics, then lowercase, split on whitespace/punctuation
 * - Non-Latin scripts: Unicode-aware lowercase, split on whitespace/punctuation, preserve script chars
 * Comparison is case-insensitive and diacritic-tolerant; word order independent.
 */
export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const normalize = (s: string): string[] => {
    // NFD decompose + strip combining diacritics (é -> e, ñ -> n, etc.)
    const diacriticStripped = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return diacriticStripped
      .toLowerCase()
      // Split on whitespace and common punctuation; preserve script chars including non-Latin
      .split(/[\s\-_.,/\\|]+/)
      .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')) // trim leading/trailing non-word chars per token
      .filter(Boolean);
  };
  const tokensA = normalize(a);
  const tokensB = normalize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const matched = tokensA.filter(t => tokensB.includes(t));
  return matched.length / Math.max(tokensA.length, tokensB.length);
}

/**
 * Extract name and date of birth from a KYC identity document (passport or ID card)
 * via GPT-4o vision, then compare against the applicant's declared values.
 *
 * Returns a structured KycOcrResult.  Safe to call fire-and-forget — never throws.
 */
/** Extract KYC fields from a document via GPT-4o (text prompt for PDFs, vision for images). */
async function extractKycFieldsFromDocument(
  buffer: Buffer | null,
  base64: string | null,
  mimeType: string,
  documentUrl: string,
): Promise<{ is_identity_document: boolean; full_name: string | null; date_of_birth: string | null; nationality: string | null; document_number: string | null; expiry_date: string | null }> {
  const schema = `{
  "is_identity_document": boolean,
  "full_name": string | null,
  "date_of_birth": "YYYY-MM-DD" | null,
  "nationality": string | null,
  "document_number": string | null,
  "expiry_date": "YYYY-MM-DD" | null
}`;
  const pdfPrompt = `You are a KYC document analyst. The following is extracted text from a document.
Determine if this is a government-issued identity document (passport, national ID, or driver licence).
Extract all available fields. Respond ONLY with valid JSON matching this schema — use null for any field not found:
${schema}
Set "is_identity_document" to false only if clearly not an ID (e.g. invoice, receipt, certificate). No explanations.`;

  const imagePrompt = `You are a KYC document analyst. Examine this identity document image.
Determine if this is a government-issued identity document (passport, national ID, or driver licence).
Extract all visible fields. Respond ONLY with valid JSON matching this schema — use null for any field not found:
${schema}
Set "is_identity_document" to false only if clearly not an ID (e.g. invoice, receipt, photo, certificate). No explanations.`;

  let response;
  if ((mimeType === 'application/pdf' || documentUrl.toLowerCase().endsWith('.pdf')) && buffer) {
    const parsed = await pdfParse(buffer);
    const text = parsed?.text?.trim() || '';
    if (text.length < 30) throw new Error('PDF text too short — may be a scanned image PDF');
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: `${pdfPrompt}\n\nDocument text:\n${text.substring(0, 4000)}` }],
      max_tokens: 300,
      temperature: 0,
    });
  } else if (base64) {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const imageType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: imagePrompt },
          { type: 'image_url', image_url: { url: `data:${imageType};base64,${base64}`, detail: 'high' } },
        ],
      }],
      max_tokens: 300,
      temperature: 0,
    });
  } else {
    throw new Error('No usable document content for OCR extraction');
  }

  const content = response.choices[0]?.message?.content || '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  return {
    is_identity_document: parsed.is_identity_document !== false,
    full_name: parsed.full_name ?? null,
    date_of_birth: parsed.date_of_birth ?? null,
    nationality: parsed.nationality ?? null,
    document_number: parsed.document_number ?? null,
    expiry_date: parsed.expiry_date ?? null,
  };
}
// ============================================================
// TIERED OCR: Tesseract.js + MRZ → GPT-4o fallback
// ============================================================

export interface TieredScanResult {
  is_identity_document: boolean;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  document_number: string | null;
  expiry_date: string | null;
  source: 'mrz' | 'gpt';
}

/** Convert MRZ date YYMMDD → YYYY-MM-DD */
function formatMrzDate(yymmdd: string | null | undefined): string | null {
  if (!yymmdd || yymmdd.length < 6) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const year = yy > 30 ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

/** Find MRZ lines in raw text and parse with mrz package */
function findAndParseMrz(text: string): TieredScanResult | null {
  const lines = text
    .split('\n')
    .map(l => l.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9<]/g, ''))
    .filter(l => l.length >= 28 && /^[A-Z0-9<]+$/.test(l));

  if (lines.length < 2) return null;

  // Try consecutive pairs/triples to find a valid MRZ
  for (let i = 0; i <= lines.length - 2; i++) {
    const candidates: string[][] = [
      lines.length > i + 2 ? [lines[i], lines[i + 1], lines[i + 2]] : null,
      [lines[i], lines[i + 1]],
    ].filter(Boolean) as string[][];

    for (const candidate of candidates) {
      try {
        const result = parseMrz(candidate);
        if (result.valid) {
          const f = result.fields as Record<string, string>;
          const firstName = (f.firstName || '').replace(/</g, ' ').trim();
          const lastName = (f.lastName || '').replace(/</g, ' ').trim();
          const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
          return {
            is_identity_document: true,
            full_name: fullName,
            date_of_birth: formatMrzDate(f.birthDate),
            nationality: f.nationalityCode || null,
            document_number: f.documentNumber || null,
            expiry_date: formatMrzDate(f.expirationDate),
            source: 'mrz',
          };
        }
      } catch { /* continue */ }
    }
  }
  return null;
}

/**
 * Scan a document from raw base64 + mimeType (no R2 upload needed).
 * 1. Tesseract.js (images) or pdf-parse (text PDFs) + MRZ parsing (free, instant)
 * 2. GPT-4o vision fallback when MRZ is not found (handles any real-world ID)
 */
export async function scanDocumentBase64(
  base64: string,
  mimeType: string,
): Promise<TieredScanResult> {
  const isPdf = mimeType === 'application/pdf';

  // Step 1A: Text-based PDF — extract text, try MRZ
  if (isPdf) {
    try {
      const buffer = Buffer.from(base64, 'base64');
      const parsed = await pdfParse(buffer);
      const text = parsed?.text?.trim() || '';
      if (text.length >= 30) {
        const mrzResult = findAndParseMrz(text);
        if (mrzResult) return mrzResult;
      }
    } catch (err) {
      console.warn('[KYC OCR] PDF parse failed:', err instanceof Error ? err.message : err);
    }
  }

  // Step 1B: Image — Tesseract OCR, try MRZ
  if (!isPdf) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        `data:${mimeType};base64,${base64}`,
        'eng',
        { logger: () => {} },
      );
      if (text) {
        const mrzResult = findAndParseMrz(text);
        if (mrzResult) return mrzResult;
      }
    } catch (err) {
      console.warn('[KYC OCR] Tesseract failed:', err instanceof Error ? err.message : err);
    }
  }

  // Step 2: GPT-4o fallback — handles any real-world ID/passport image
  console.log('[KYC OCR] MRZ not found, using GPT-4o vision');
  const buffer: Buffer | null = isPdf ? Buffer.from(base64, 'base64') : null;
  const imgBase64: string | null = isPdf ? null : base64;
  const gptResult = await extractKycFieldsFromDocument(buffer, imgBase64, mimeType, '');
  return {
    is_identity_document: gptResult.is_identity_document,
    full_name: gptResult.full_name,
    date_of_birth: gptResult.date_of_birth,
    nationality: gptResult.nationality,
    document_number: gptResult.document_number,
    expiry_date: gptResult.expiry_date,
    source: 'gpt',
  };
}
export async function checkKycOcrMismatch(
  documentUrl: string,
  declaredName: string,
  declaredDob: string,
): Promise<KycOcrResult> {
  const checkedAt = new Date().toISOString();
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  try {
    let buffer: Buffer | null = null;
    let base64: string | null = null;
    let mimeType: string;

    if (documentUrl.startsWith('data:')) {
      // Handle base64 data URIs (client-side preview URLs, submitted before R2 upload)
      const commaIdx = documentUrl.indexOf(',');
      if (commaIdx === -1) throw new Error('Malformed data URI');
      const header = documentUrl.substring(0, commaIdx);
      const mimeMatch = header.match(/data:([^;]+);base64/);
      mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      if (mimeType === 'application/pdf') {
        // Decode PDF from data URI and extract via pdf-parse
        const pdfBuffer = Buffer.from(documentUrl.substring(commaIdx + 1), 'base64');
        buffer = pdfBuffer;
      } else if (supportedImageTypes.includes(mimeType)) {
        base64 = documentUrl.substring(commaIdx + 1);
      } else {
        return { checked: false, nameMismatch: false, dobMismatch: false, extractedName: null, extractedDob: null, similarity: 1, checkedAt };
      }
    } else {
      const downloaded = await downloadFromR2(documentUrl);
      mimeType = downloaded.mimeType;
      buffer = downloaded.buffer;
      if (supportedImageTypes.includes(mimeType)) {
        base64 = buffer.toString('base64');
        buffer = null; // use base64 path for images
      } else if (mimeType !== 'application/pdf' && !documentUrl.toLowerCase().endsWith('.pdf')) {
        return { checked: false, nameMismatch: false, dobMismatch: false, extractedName: null, extractedDob: null, similarity: 1, checkedAt };
      }
    }

    const extracted = await extractKycFieldsFromDocument(buffer, base64, mimeType, documentUrl);

    const extractedName: string | null = extracted.full_name || null;
    const extractedDob: string | null = extracted.date_of_birth || null;

    // Only flag mismatch when both extracted and declared values are present (avoid false positives on unreadable docs)
    // Threshold is configurable via KYC_OCR_NAME_SIMILARITY_THRESHOLD env var (default: 0.8)
    const nameThreshold = Math.min(1, Math.max(0, parseFloat(process.env.KYC_OCR_NAME_SIMILARITY_THRESHOLD || '0.8')));
    const similarity = (extractedName && declaredName) ? nameSimilarity(extractedName, declaredName) : 1;
    const nameMismatch = !!(extractedName && declaredName && similarity < nameThreshold);
    const dobMismatch = !!(extractedDob && declaredDob && extractedDob !== declaredDob);

    return { checked: true, nameMismatch, dobMismatch, extractedName, extractedDob, similarity, checkedAt };
  } catch (err) {
    console.error('[KYC OCR] Identity extraction failed:', err instanceof Error ? err.message : err);
    return { checked: false, nameMismatch: false, dobMismatch: false, extractedName: null, extractedDob: null, similarity: 0, checkedAt };
  }
}

// ============================================================
// FRAUD SCORING ENGINE (6 checks)
// ============================================================

export interface FraudCheckResult {
  checkName: string;
  passed: boolean;
  score: number;
  maxScore: number;
  detail: string;
}

export interface FraudScoringResult {
  totalScore: number;
  checks: FraudCheckResult[];
  recommendation: 'pass' | 'reject';
  summary: string;
}

interface TradeDeclarationData {
  tradeValueUsd?: string | number;
  buyerName?: string | null;
  sellerName?: string | null;
  companyName?: string | null;
  [key: string]: unknown;
}

export function calculateFraudScore(
  extracted: ExtractedDocumentData,
  tradeData: TradeDeclarationData
): FraudScoringResult {
  const checks: FraudCheckResult[] = [];

  // Check 1: Amount vs declared value (max 20 points)
  (() => {
    const maxScore = 20;
    const declaredValue = parseFloat(String(tradeData.tradeValueUsd || 0));
    const extractedAmount = extracted.amount;

    if (!extractedAmount || !declaredValue) {
      checks.push({ checkName: 'Amount Consistency', passed: false, score: 0, maxScore, detail: 'Could not verify amount — document or declaration missing' });
      return;
    }

    const deviation = Math.abs(extractedAmount - declaredValue) / declaredValue;
    if (deviation <= 0.1) {
      checks.push({ checkName: 'Amount Consistency', passed: true, score: maxScore, maxScore, detail: `Document amount $${extractedAmount} matches declared $${declaredValue} (within 10%)` });
    } else if (deviation <= 0.25) {
      checks.push({ checkName: 'Amount Consistency', passed: false, score: 10, maxScore, detail: `Document amount $${extractedAmount} deviates ${(deviation * 100).toFixed(1)}% from declared $${declaredValue}` });
    } else {
      checks.push({ checkName: 'Amount Consistency', passed: false, score: 0, maxScore, detail: `Document amount $${extractedAmount} deviates ${(deviation * 100).toFixed(1)}% from declared $${declaredValue} — HIGH RISK` });
    }
  })();

  // Check 2: Expiry date validity (max 15 points)
  (() => {
    const maxScore = 15;
    const expiryStr = extracted.expiry_date;

    if (!expiryStr) {
      checks.push({ checkName: 'Expiry Date Validity', passed: false, score: 5, maxScore, detail: 'No expiry date found in document' });
      return;
    }

    const expiry = new Date(expiryStr);
    const now = new Date();
    if (isNaN(expiry.getTime())) {
      checks.push({ checkName: 'Expiry Date Validity', passed: false, score: 0, maxScore, detail: `Cannot parse expiry date: ${expiryStr}` });
      return;
    }

    if (expiry < now) {
      checks.push({ checkName: 'Expiry Date Validity', passed: false, score: 0, maxScore, detail: `Document expired on ${expiryStr}` });
    } else {
      const daysToExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysToExpiry < 30) {
        checks.push({ checkName: 'Expiry Date Validity', passed: true, score: 10, maxScore, detail: `Document expires in ${Math.round(daysToExpiry)} days — expires soon` });
      } else {
        checks.push({ checkName: 'Expiry Date Validity', passed: true, score: maxScore, maxScore, detail: `Document valid until ${expiryStr}` });
      }
    }
  })();

  // Check 3: KYC name match (max 20 points)
  (() => {
    const maxScore = 20;
    const kycName = (tradeData.companyName || tradeData.buyerName || tradeData.sellerName || '').toLowerCase().trim();
    const docBeneficiary = (extracted.beneficiary_name || extracted.buyer_name || extracted.depositor_name || '').toLowerCase().trim();

    if (!kycName || !docBeneficiary) {
      checks.push({ checkName: 'KYC Name Match', passed: false, score: 10, maxScore, detail: 'Unable to verify — missing name in document or KYC data' });
      return;
    }

    const kycWords = kycName.split(/\s+/);
    const docWords = docBeneficiary.split(/\s+/);
    const matchedWords = kycWords.filter(w => docWords.some(d => d.includes(w) || w.includes(d)));
    const matchRatio = matchedWords.length / Math.max(kycWords.length, docWords.length);

    if (matchRatio >= 0.7) {
      checks.push({ checkName: 'KYC Name Match', passed: true, score: maxScore, maxScore, detail: `Name match confirmed: "${docBeneficiary}" vs KYC "${kycName}"` });
    } else if (matchRatio >= 0.4) {
      checks.push({ checkName: 'KYC Name Match', passed: false, score: 10, maxScore, detail: `Partial name match: "${docBeneficiary}" vs KYC "${kycName}"` });
    } else {
      checks.push({ checkName: 'KYC Name Match', passed: false, score: 0, maxScore, detail: `Name mismatch: document "${docBeneficiary}" vs KYC "${kycName}"` });
    }
  })();

  // Check 4: Issuing bank on approved list (max 20 points)
  (() => {
    const maxScore = 20;
    const issuingBank = (extracted.issuing_bank || extracted.issuing_authority || '').toLowerCase().trim();

    if (!issuingBank) {
      checks.push({ checkName: 'Approved Issuing Bank', passed: false, score: 5, maxScore, detail: 'No issuing bank found in document' });
      return;
    }

    const onApprovedList = APPROVED_BANKS.some(b => issuingBank.includes(b.toLowerCase()) || b.toLowerCase().includes(issuingBank));
    if (onApprovedList) {
      checks.push({ checkName: 'Approved Issuing Bank', passed: true, score: maxScore, maxScore, detail: `Issuing institution "${issuingBank}" is on the approved list` });
    } else {
      checks.push({ checkName: 'Approved Issuing Bank', passed: false, score: 0, maxScore, detail: `Issuing institution "${issuingBank}" is NOT on the approved bank list` });
    }
  })();

  // Check 5: Internal document consistency (max 15 points)
  (() => {
    const maxScore = 15;
    const issues: string[] = [];

    if (extracted.amount !== null && extracted.amount !== undefined && extracted.amount <= 0) issues.push('Amount is zero or negative');
    if (extracted.currency && extracted.currency.length > 5) issues.push('Invalid currency code');
    if (extracted.anomalies && extracted.anomalies.length > 3) issues.push(`Multiple anomalies detected (${extracted.anomalies.length})`);
    if (extracted.document_appears_authentic === false) issues.push('Document appears inauthentic according to AI analysis');

    if (issues.length === 0) {
      checks.push({ checkName: 'Document Consistency', passed: true, score: maxScore, maxScore, detail: 'Document fields are internally consistent' });
    } else if (issues.length === 1) {
      checks.push({ checkName: 'Document Consistency', passed: false, score: 8, maxScore, detail: `Minor inconsistency: ${issues.join(', ')}` });
    } else {
      checks.push({ checkName: 'Document Consistency', passed: false, score: 0, maxScore, detail: `Multiple inconsistencies: ${issues.join(', ')}` });
    }
  })();

  // Check 6: AI-flagged anomalies (max 10 points)
  (() => {
    const maxScore = 10;
    const anomalies = extracted.anomalies || [];

    if (anomalies.length === 0) {
      checks.push({ checkName: 'AI Anomaly Detection', passed: true, score: maxScore, maxScore, detail: 'No anomalies detected by AI analysis' });
    } else if (anomalies.length <= 2) {
      checks.push({ checkName: 'AI Anomaly Detection', passed: false, score: 5, maxScore, detail: `Minor anomalies detected: ${anomalies.join('; ')}` });
    } else {
      checks.push({ checkName: 'AI Anomaly Detection', passed: false, score: 0, maxScore, detail: `Significant anomalies: ${anomalies.join('; ')}` });
    }
  })();

  const passScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = checks.reduce((sum, c) => sum + c.maxScore, 0);
  // Fraud score: 0 = clean document, 100 = highly fraudulent
  const fraudScore = Math.round(100 - (passScore / maxPossible) * 100);

  // Score < 50 → Tier 1 Review (moderately suspicious, needs human review)
  // Score >= 50 → AI Rejected (highly suspicious, automatically rejected)
  const recommendation: 'pass' | 'reject' = fraudScore >= 50 ? 'reject' : 'pass';

  const summary = recommendation === 'reject'
    ? `Fraud score ${fraudScore}/100. Failed ${checks.filter(c => !c.passed).length} of ${checks.length} checks. Document automatically rejected by AI.`
    : `Fraud score ${fraudScore}/100. Passed ${checks.filter(c => c.passed).length} of ${checks.length} checks. Forwarding to Tier 1 human review.`;

  return { totalScore: fraudScore, checks, recommendation, summary };
}
