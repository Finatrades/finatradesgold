import { storage } from "./storage";
import type { User, KycSubmission, Transaction, UserRiskProfile } from "@shared/schema";

const HIGH_RISK_COUNTRIES = [
  'AF', 'BY', 'MM', 'CF', 'CU', 'CD', 'IR', 'IQ', 'LB', 'LY',
  'ML', 'NI', 'KP', 'RU', 'SO', 'SS', 'SD', 'SY', 'VE', 'YE', 'ZW'
];

const ELEVATED_RISK_COUNTRIES = [
  'AE', 'PK', 'NG', 'PH', 'VN', 'BD', 'KE', 'TZ', 'UG', 'GH',
  'CM', 'MZ', 'ZM', 'SN', 'CI', 'BF', 'NE', 'TD', 'MG', 'AO'
];

type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface RiskScoreResult {
  geographyRisk: number;
  transactionRisk: number;
  behaviorRisk: number;
  screeningRisk: number;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  isPep: boolean;
  isSanctioned: boolean;
  hasAdverseMedia: boolean;
  requiresEnhancedDueDiligence: boolean;
  dailyTransactionLimit: string;
  monthlyTransactionLimit: string;
}

export function calculateGeographyRisk(country: string | null | undefined): number {
  if (!country) return 20;
  
  const countryCode = country.toUpperCase();
  
  if (HIGH_RISK_COUNTRIES.includes(countryCode)) {
    return 80;
  }
  if (ELEVATED_RISK_COUNTRIES.includes(countryCode)) {
    return 50;
  }
  return 10;
}

export function calculateDocumentRisk(kycSubmission: KycSubmission | undefined): number {
  if (!kycSubmission) return 50;
  
  let score = 0;
  
  if (kycSubmission.status === 'Rejected') {
    score += 40;
  } else if (kycSubmission.status === 'In Progress' || kycSubmission.status === 'Pending Review') {
    score += 25;
  } else if (kycSubmission.status === 'Approved') {
    score += 5;
  } else {
    score += 30;
  }
  
  if (kycSubmission.tier === 'tier_1_basic') {
    score += 20;
  } else if (kycSubmission.tier === 'tier_2_enhanced') {
    score += 10;
  } else if (kycSubmission.tier === 'tier_3_corporate') {
    score += 5;
  }
  
  const docs = kycSubmission.documents as Record<string, unknown> | null;
  if (!docs || Object.keys(docs).length === 0) {
    score += 25;
  } else {
    const docCount = Object.keys(docs).length;
    if (docCount < 2) {
      score += 15;
    } else if (docCount < 4) {
      score += 5;
    }
  }
  
  if (kycSubmission.idExpiryDate) {
    const expiry = new Date(kycSubmission.idExpiryDate);
    const now = new Date();
    const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilExpiry < 0) {
      score += 30;
    } else if (monthsUntilExpiry < 3) {
      score += 15;
    } else if (monthsUntilExpiry < 6) {
      score += 5;
    }
  }
  
  return Math.min(score, 100);
}

export async function calculateTransactionRisk(userId: string): Promise<number> {
  const transactions = await storage.getUserTransactions(userId);
  
  if (transactions.length === 0) return 10;
  
  let score = 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTransactions = transactions.filter(t => 
    new Date(t.createdAt) > thirtyDaysAgo
  );
  
  if (recentTransactions.length > 50) {
    score += 30;
  } else if (recentTransactions.length > 20) {
    score += 15;
  } else if (recentTransactions.length > 10) {
    score += 5;
  }
  
  const totalVolume = recentTransactions.reduce((sum, t) => {
    const usd = parseFloat(t.amountUsd || '0');
    return sum + usd;
  }, 0);
  
  if (totalVolume > 100000) {
    score += 35;
  } else if (totalVolume > 50000) {
    score += 25;
  } else if (totalVolume > 20000) {
    score += 15;
  } else if (totalVolume > 10000) {
    score += 5;
  }
  
  const largeTransactions = recentTransactions.filter(t => {
    const usd = parseFloat(t.amountUsd || '0');
    return usd > 10000;
  });
  
  if (largeTransactions.length > 5) {
    score += 20;
  } else if (largeTransactions.length > 2) {
    score += 10;
  }
  
  const failedTransactions = recentTransactions.filter(t => 
    t.status === 'Failed' || t.status === 'Cancelled'
  );
  
  if (failedTransactions.length > 5) {
    score += 15;
  } else if (failedTransactions.length > 2) {
    score += 5;
  }
  
  return Math.min(score, 100);
}

export function calculateScreeningRisk(kycSubmission: KycSubmission | undefined): { 
  score: number; 
  isPep: boolean; 
  isSanctioned: boolean;
  hasAdverseMedia: boolean;
} {
  if (!kycSubmission) {
    return { score: 30, isPep: false, isSanctioned: false, hasAdverseMedia: false };
  }
  
  let score = 0;
  const isPep = kycSubmission.isPep || false;
  const isSanctioned = kycSubmission.isSanctioned || false;
  const screeningResults = kycSubmission.screeningResults as Record<string, { matchFound?: boolean }> | null;
  const hasAdverseMedia = screeningResults?.adverseMedia?.matchFound || false;
  
  if (isSanctioned) {
    score += 100;
  }
  
  if (isPep) {
    score += 40;
  }
  
  if (hasAdverseMedia) {
    score += 30;
  }
  
  if (kycSubmission.screeningStatus === 'Match Found') {
    score += 25;
  } else if (kycSubmission.screeningStatus === 'Manual Review' || kycSubmission.screeningStatus === 'Escalated') {
    score += 15;
  } else if (kycSubmission.screeningStatus === 'Pending') {
    score += 10;
  }
  
  return { score: Math.min(score, 100), isPep, isSanctioned, hasAdverseMedia };
}

function calculateOverallRisk(
  geographyRisk: number,
  documentRisk: number,
  transactionRisk: number,
  screeningRisk: number
): number {
  const weights = {
    geography: 0.20,
    document: 0.25,
    transaction: 0.30,
    screening: 0.25
  };
  
  const weightedScore = 
    (geographyRisk * weights.geography) +
    (documentRisk * weights.document) +
    (transactionRisk * weights.transaction) +
    (screeningRisk * weights.screening);
  
  return Math.round(weightedScore);
}

function determineRiskLevel(score: number, isSanctioned: boolean): RiskLevel {
  if (isSanctioned) return 'Critical';
  if (score >= 70) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

function calculateTransactionLimits(riskLevel: RiskLevel): { daily: string; monthly: string } {
  switch (riskLevel) {
    case 'Critical':
      return { daily: '0', monthly: '0' };
    case 'High':
      return { daily: '2000', monthly: '10000' };
    case 'Medium':
      return { daily: '10000', monthly: '50000' };
    case 'Low':
    default:
      return { daily: '50000', monthly: '250000' };
  }
}

export async function calculateUserRiskScore(userId: string): Promise<RiskScoreResult> {
  const user = await storage.getUser(userId);
  const kycSubmission = await storage.getKycSubmission(userId);
  
  const geographyRisk = calculateGeographyRisk(user?.country);
  const documentRisk = calculateDocumentRisk(kycSubmission);
  const transactionRisk = await calculateTransactionRisk(userId);
  const { score: screeningRisk, isPep, isSanctioned, hasAdverseMedia } = calculateScreeningRisk(kycSubmission);
  
  const overallRiskScore = calculateOverallRisk(geographyRisk, documentRisk, transactionRisk, screeningRisk);
  const riskLevel = determineRiskLevel(overallRiskScore, isSanctioned);
  const limits = calculateTransactionLimits(riskLevel);
  
  const requiresEnhancedDueDiligence = 
    riskLevel === 'High' || 
    riskLevel === 'Critical' || 
    isPep || 
    geographyRisk >= 50;
  
  return {
    geographyRisk,
    transactionRisk,
    behaviorRisk: documentRisk,
    screeningRisk,
    overallRiskScore,
    riskLevel,
    isPep,
    isSanctioned,
    hasAdverseMedia,
    requiresEnhancedDueDiligence,
    dailyTransactionLimit: limits.daily,
    monthlyTransactionLimit: limits.monthly
  };
}

export async function updateUserRiskProfile(userId: string, assessedBy?: string): Promise<UserRiskProfile> {
  const riskScore = await calculateUserRiskScore(userId);
  
  const existingProfile = await storage.getUserRiskProfile(userId);
  
  const nextReviewDate = new Date();
  switch (riskScore.riskLevel) {
    case 'Critical':
      nextReviewDate.setDate(nextReviewDate.getDate() + 30);
      break;
    case 'High':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
      break;
    case 'Medium':
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);
      break;
    default:
      nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
  }
  
  const profileData = {
    userId,
    overallRiskScore: riskScore.overallRiskScore,
    riskLevel: riskScore.riskLevel,
    geographyRisk: riskScore.geographyRisk,
    transactionRisk: riskScore.transactionRisk,
    behaviorRisk: riskScore.behaviorRisk,
    screeningRisk: riskScore.screeningRisk,
    isPep: riskScore.isPep,
    isSanctioned: riskScore.isSanctioned,
    hasAdverseMedia: riskScore.hasAdverseMedia,
    requiresEnhancedDueDiligence: riskScore.requiresEnhancedDueDiligence,
    dailyTransactionLimit: riskScore.dailyTransactionLimit,
    monthlyTransactionLimit: riskScore.monthlyTransactionLimit,
    lastAssessedAt: new Date(),
    lastAssessedBy: assessedBy || 'system',
    nextReviewDate
  };
  
  if (existingProfile) {
    const updated = await storage.updateUserRiskProfile(existingProfile.id, profileData);
    return updated!;
  } else {
    return await storage.createUserRiskProfile(profileData);
  }
}

export async function checkTransactionAgainstLimits(
  userId: string, 
  amountUsd: number
): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
  const profile = await storage.getUserRiskProfile(userId);
  
  if (!profile) {
    return { allowed: true };
  }
  
  const dailyLimit = parseFloat(profile.dailyTransactionLimit || '50000');
  const monthlyLimit = parseFloat(profile.monthlyTransactionLimit || '250000');
  
  if (dailyLimit === 0 || monthlyLimit === 0) {
    return { 
      allowed: false, 
      reason: 'Account is restricted due to risk assessment',
      limit: 0
    };
  }
  
  const transactions = await storage.getUserTransactions(userId);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTransactions = transactions.filter(t => 
    t.status === 'Completed' && new Date(t.createdAt) >= today
  );
  
  const todayVolume = todayTransactions.reduce((sum, t) => {
    return sum + parseFloat(t.amountUsd || '0');
  }, 0);
  
  if (todayVolume + amountUsd > dailyLimit) {
    return {
      allowed: false,
      reason: `Transaction would exceed daily limit of $${dailyLimit.toLocaleString()}`,
      limit: dailyLimit
    };
  }
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const monthTransactions = transactions.filter(t => 
    t.status === 'Completed' && new Date(t.createdAt) >= thirtyDaysAgo
  );
  
  const monthVolume = monthTransactions.reduce((sum, t) => {
    return sum + parseFloat(t.amountUsd || '0');
  }, 0);
  
  if (monthVolume + amountUsd > monthlyLimit) {
    return {
      allowed: false,
      reason: `Transaction would exceed monthly limit of $${monthlyLimit.toLocaleString()}`,
      limit: monthlyLimit
    };
  }
  
  return { allowed: true };
}

export { HIGH_RISK_COUNTRIES, ELEVATED_RISK_COUNTRIES };
