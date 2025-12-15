import { storage } from "./storage";
import type { Transaction, AmlMonitoringRule, User, AmlCase } from "@shared/schema";
import { HIGH_RISK_COUNTRIES } from "./risk-scoring";

interface RuleViolation {
  ruleId: string;
  ruleName: string;
  ruleCode: string;
  actionType: string;
  priority: number;
  details: string;
}

interface MonitoringResult {
  passed: boolean;
  violations: RuleViolation[];
  blockedByRule: boolean;
  alertsGenerated: number;
  caseCreated?: string;
}

const DEFAULT_AML_RULES: Array<{
  ruleName: string;
  ruleCode: string;
  description: string;
  ruleType: string;
  conditions: Record<string, unknown>;
  actionType: string;
  priority: number;
}> = [
  {
    ruleName: "Large Transaction Alert",
    ruleCode: "LARGE_TXN_10K",
    description: "Flag transactions over $10,000 USD",
    ruleType: "threshold",
    conditions: { amountThreshold: 10000, currency: "USD" },
    actionType: "alert",
    priority: 5
  },
  {
    ruleName: "Very Large Transaction Block",
    ruleCode: "BLOCK_TXN_50K",
    description: "Block and escalate transactions over $50,000 USD",
    ruleType: "threshold",
    conditions: { amountThreshold: 50000, currency: "USD" },
    actionType: "block",
    priority: 10
  },
  {
    ruleName: "Rapid Transaction Velocity",
    ruleCode: "VELOCITY_5_24H",
    description: "Alert on more than 5 transactions in 24 hours",
    ruleType: "velocity",
    conditions: { transactionCount: 5, timeWindowHours: 24 },
    actionType: "alert",
    priority: 6
  },
  {
    ruleName: "High Velocity Block",
    ruleCode: "VELOCITY_15_24H",
    description: "Block if more than 15 transactions in 24 hours",
    ruleType: "velocity",
    conditions: { transactionCount: 15, timeWindowHours: 24 },
    actionType: "block",
    priority: 9
  },
  {
    ruleName: "Cumulative Daily Threshold",
    ruleCode: "DAILY_CUM_25K",
    description: "Alert when daily cumulative exceeds $25,000",
    ruleType: "threshold",
    conditions: { amountThreshold: 25000, currency: "USD", timeWindowHours: 24 },
    actionType: "alert",
    priority: 7
  },
  {
    ruleName: "High Risk Country",
    ruleCode: "HIGH_RISK_GEO",
    description: "Flag transactions involving high-risk countries",
    ruleType: "geography",
    conditions: { highRiskCountries: HIGH_RISK_COUNTRIES },
    actionType: "flag",
    priority: 8
  },
  {
    ruleName: "Structuring Detection",
    ruleCode: "STRUCTURING",
    description: "Detect potential structuring: multiple transactions just under $10,000",
    ruleType: "pattern",
    conditions: { 
      amountThreshold: 9000, 
      transactionCount: 3, 
      timeWindowHours: 48,
      maxAmount: 9999
    },
    actionType: "escalate",
    priority: 9
  },
  {
    ruleName: "Withdrawal to Deposit Ratio",
    ruleCode: "WD_RATIO",
    description: "Flag if withdrawals exceed 80% of deposits in 7 days",
    ruleType: "pattern",
    conditions: { 
      timeWindowHours: 168,
      withdrawalRatio: 0.8,
      transactionTypes: ["Withdrawal", "Deposit"]
    },
    actionType: "alert",
    priority: 5
  }
];

export async function seedDefaultAmlRules(): Promise<void> {
  const existingRules = await storage.getAllAmlMonitoringRules();
  
  for (const rule of DEFAULT_AML_RULES) {
    const exists = existingRules.find(r => r.ruleCode === rule.ruleCode);
    if (!exists) {
      await storage.createAmlMonitoringRule({
        ruleName: rule.ruleName,
        ruleCode: rule.ruleCode,
        description: rule.description,
        ruleType: rule.ruleType,
        conditions: rule.conditions,
        actionType: rule.actionType,
        priority: rule.priority,
        isActive: true,
        createdBy: "system"
      });
      console.log(`[AML] Created default rule: ${rule.ruleCode}`);
    }
  }
}

async function checkThresholdRule(
  rule: AmlMonitoringRule,
  transaction: Transaction,
  user: User
): Promise<RuleViolation | null> {
  const conditions = rule.conditions as Record<string, unknown>;
  const threshold = conditions.amountThreshold as number;
  const timeWindowHours = conditions.timeWindowHours as number | undefined;
  
  const txnAmount = parseFloat(transaction.amountUsd || '0');
  
  if (timeWindowHours) {
    const since = new Date();
    since.setHours(since.getHours() - timeWindowHours);
    
    const userTxns = await storage.getUserTransactions(user.id);
    const recentTxns = userTxns.filter(t => 
      new Date(t.createdAt) > since && t.status !== 'Cancelled' && t.status !== 'Failed'
    );
    
    const cumulativeAmount = recentTxns.reduce((sum, t) => {
      return sum + parseFloat(t.amountUsd || '0');
    }, 0) + txnAmount;
    
    if (cumulativeAmount >= threshold) {
      return {
        ruleId: rule.id,
        ruleName: rule.ruleName,
        ruleCode: rule.ruleCode,
        actionType: rule.actionType,
        priority: rule.priority,
        details: `Cumulative amount $${cumulativeAmount.toFixed(2)} exceeds threshold $${threshold} in ${timeWindowHours}h window`
      };
    }
  } else {
    if (txnAmount >= threshold) {
      return {
        ruleId: rule.id,
        ruleName: rule.ruleName,
        ruleCode: rule.ruleCode,
        actionType: rule.actionType,
        priority: rule.priority,
        details: `Transaction amount $${txnAmount.toFixed(2)} exceeds threshold $${threshold}`
      };
    }
  }
  
  return null;
}

async function checkVelocityRule(
  rule: AmlMonitoringRule,
  transaction: Transaction,
  user: User
): Promise<RuleViolation | null> {
  const conditions = rule.conditions as Record<string, unknown>;
  const maxCount = conditions.transactionCount as number;
  const timeWindowHours = conditions.timeWindowHours as number;
  
  const since = new Date();
  since.setHours(since.getHours() - timeWindowHours);
  
  const userTxns = await storage.getUserTransactions(user.id);
  const recentCount = userTxns.filter(t => 
    new Date(t.createdAt) > since && t.status !== 'Cancelled' && t.status !== 'Failed'
  ).length;
  
  if (recentCount + 1 >= maxCount) {
    return {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      ruleCode: rule.ruleCode,
      actionType: rule.actionType,
      priority: rule.priority,
      details: `${recentCount + 1} transactions in ${timeWindowHours}h exceeds limit of ${maxCount}`
    };
  }
  
  return null;
}

async function checkGeographyRule(
  rule: AmlMonitoringRule,
  transaction: Transaction,
  user: User
): Promise<RuleViolation | null> {
  const conditions = rule.conditions as Record<string, unknown>;
  const highRiskCountries = conditions.highRiskCountries as string[];
  
  if (user.country && highRiskCountries.includes(user.country.toUpperCase())) {
    return {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      ruleCode: rule.ruleCode,
      actionType: rule.actionType,
      priority: rule.priority,
      details: `User country ${user.country} is in high-risk list`
    };
  }
  
  return null;
}

async function checkPatternRule(
  rule: AmlMonitoringRule,
  transaction: Transaction,
  user: User
): Promise<RuleViolation | null> {
  const conditions = rule.conditions as Record<string, unknown>;
  
  if (rule.ruleCode === 'STRUCTURING') {
    const minAmount = conditions.amountThreshold as number;
    const maxAmount = conditions.maxAmount as number;
    const count = conditions.transactionCount as number;
    const hours = conditions.timeWindowHours as number;
    
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    const userTxns = await storage.getUserTransactions(user.id);
    const suspiciousTxns = userTxns.filter(t => {
      if (new Date(t.createdAt) <= since) return false;
      if (t.status === 'Cancelled' || t.status === 'Failed') return false;
      const amt = parseFloat(t.amountUsd || '0');
      return amt >= minAmount && amt <= maxAmount;
    });
    
    const currentAmt = parseFloat(transaction.amountUsd || '0');
    if (currentAmt >= minAmount && currentAmt <= maxAmount) {
      if (suspiciousTxns.length + 1 >= count) {
        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          ruleCode: rule.ruleCode,
          actionType: rule.actionType,
          priority: rule.priority,
          details: `Potential structuring detected: ${suspiciousTxns.length + 1} transactions between $${minAmount}-$${maxAmount} in ${hours}h`
        };
      }
    }
  }
  
  if (rule.ruleCode === 'WD_RATIO') {
    const hours = conditions.timeWindowHours as number;
    const ratioThreshold = conditions.withdrawalRatio as number;
    
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    const userTxns = await storage.getUserTransactions(user.id);
    const recentTxns = userTxns.filter(t => 
      new Date(t.createdAt) > since && t.status === 'Completed'
    );
    
    const deposits = recentTxns
      .filter(t => t.type === 'Deposit' || t.type === 'Buy')
      .reduce((sum, t) => sum + parseFloat(t.amountUsd || '0'), 0);
    
    const withdrawals = recentTxns
      .filter(t => t.type === 'Withdrawal' || t.type === 'Sell')
      .reduce((sum, t) => sum + parseFloat(t.amountUsd || '0'), 0);
    
    if (deposits > 0) {
      const ratio = withdrawals / deposits;
      if (ratio >= ratioThreshold) {
        return {
          ruleId: rule.id,
          ruleName: rule.ruleName,
          ruleCode: rule.ruleCode,
          actionType: rule.actionType,
          priority: rule.priority,
          details: `Withdrawal to deposit ratio ${(ratio * 100).toFixed(1)}% exceeds ${(ratioThreshold * 100)}% threshold`
        };
      }
    }
  }
  
  return null;
}

export async function evaluateTransaction(
  transaction: Transaction,
  userId: string
): Promise<MonitoringResult> {
  const user = await storage.getUser(userId);
  if (!user) {
    return { passed: true, violations: [], blockedByRule: false, alertsGenerated: 0 };
  }
  
  const activeRules = await storage.getActiveAmlMonitoringRules();
  const violations: RuleViolation[] = [];
  
  for (const rule of activeRules) {
    let violation: RuleViolation | null = null;
    
    switch (rule.ruleType) {
      case 'threshold':
        violation = await checkThresholdRule(rule, transaction, user);
        break;
      case 'velocity':
        violation = await checkVelocityRule(rule, transaction, user);
        break;
      case 'geography':
        violation = await checkGeographyRule(rule, transaction, user);
        break;
      case 'pattern':
        violation = await checkPatternRule(rule, transaction, user);
        break;
    }
    
    if (violation) {
      violations.push(violation);
    }
  }
  
  violations.sort((a, b) => b.priority - a.priority);
  
  const blockedByRule = violations.some(v => v.actionType === 'block');
  const alertsGenerated = violations.filter(v => 
    v.actionType === 'alert' || v.actionType === 'flag'
  ).length;
  
  let caseCreated: string | undefined;
  
  const escalations = violations.filter(v => 
    v.actionType === 'escalate' || v.actionType === 'block'
  );
  
  if (escalations.length > 0) {
    const topViolation = escalations[0];
    const caseNumber = `AML-${Date.now().toString(36).toUpperCase()}`;
    
    const amlCase = await storage.createAmlCase({
      caseNumber,
      userId,
      caseType: topViolation.ruleCode === 'STRUCTURING' ? 'suspicious_transaction' : 'threshold_breach',
      status: 'Open',
      priority: topViolation.priority >= 9 ? 'Critical' : topViolation.priority >= 7 ? 'High' : 'Medium',
      triggeredBy: 'system',
      triggerTransactionId: transaction.id,
      triggerDetails: {
        reason: topViolation.details,
        ruleId: topViolation.ruleId,
        amount: parseFloat(transaction.amountUsd || '0')
      }
    });
    
    await storage.createAmlCaseActivity({
      caseId: amlCase.id,
      activityType: 'created',
      description: `Case auto-generated by rule ${topViolation.ruleCode}: ${topViolation.details}`,
      performedBy: 'system',
      performedAt: new Date()
    });
    
    caseCreated = amlCase.caseNumber;
    console.log(`[AML] Case ${caseNumber} created for user ${userId} - ${topViolation.details}`);
  }
  
  if (violations.length > 0) {
    for (const v of violations) {
      await storage.createAmlScreeningLog({
        userId,
        screeningType: `rule_${v.ruleCode}`,
        provider: 'internal_monitoring',
        status: v.actionType === 'block' ? 'Escalated' : 'Match Found',
        matchFound: true,
        matchScore: v.priority * 10,
        matchDetails: {
          matchedEntity: v.ruleName,
          listName: v.ruleCode,
          matchReason: v.details
        }
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
    blockedByRule,
    alertsGenerated,
    caseCreated
  };
}

export async function getAmlAlerts(): Promise<{
  openCases: AmlCase[];
  recentViolations: Awaited<ReturnType<typeof storage.getAllAmlScreeningLogs>>;
  highPriorityCases: AmlCase[];
}> {
  const [allCases, allLogs] = await Promise.all([
    storage.getAllAmlCases(),
    storage.getAllAmlScreeningLogs()
  ]);
  
  const openCases = allCases.filter(c => 
    c.status === 'Open' || c.status === 'Under Investigation'
  );
  
  const highPriorityCases = allCases.filter(c => 
    (c.status === 'Open' || c.status === 'Under Investigation') &&
    (c.priority === 'Critical' || c.priority === 'High')
  );
  
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const recentViolations = allLogs.filter(l => 
    new Date(l.createdAt) > oneDayAgo && l.matchFound
  );
  
  return { openCases, recentViolations, highPriorityCases };
}

export { DEFAULT_AML_RULES };
