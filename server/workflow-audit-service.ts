/**
 * Workflow Audit Service - Replication & Compare System
 * 
 * Tracks workflow steps, compares expected vs actual execution,
 * and provides PASS/FAIL reporting for audit compliance.
 */

import { db } from './db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  workflowAuditLogs,
  workflowAuditSummaries,
  InsertWorkflowAuditLog,
  InsertWorkflowAuditSummary,
  WorkflowAuditLog,
  WorkflowAuditSummary,
} from '@shared/schema';
import { randomUUID } from 'crypto';

export type FlowType = 
  | 'ADD_FUNDS'
  | 'INTERNAL_TRANSFER_MPGW_TO_FPGW'
  | 'INTERNAL_TRANSFER_FPGW_TO_MPGW'
  | 'TRANSFER_USER_TO_USER'
  | 'WITHDRAWAL'
  | 'BNSL_ACTIVATION'
  | 'BNSL_PAYOUT'
  | 'FINABRIDGE_LOCK';

export type StepResult = 'PASS' | 'FAIL' | 'PENDING' | 'SKIPPED';

interface ExpectedStep {
  stepKey: string;
  order: number;
  description: string;
  required: boolean;
  validator?: (actual: string, payload?: Record<string, any>) => boolean;
}

const EXPECTED_STEPS: Record<FlowType, ExpectedStep[]> = {
  ADD_FUNDS: [
    { stepKey: 'add_funds_initiated', order: 1, description: 'User initiates Add Funds request', required: true },
    { stepKey: 'payment_method_selected', order: 2, description: 'User selects payment method (Card/Crypto/Bank)', required: true },
    { stepKey: 'asset_selection_completed', order: 3, description: 'User selects USD or GOLD input mode', required: true },
    { stepKey: 'amount_entered', order: 4, description: 'User enters deposit amount', required: true },
    { stepKey: 'conversion_preview_generated', order: 5, description: 'System shows USD<->GOLD conversion preview', required: true },
    { stepKey: 'txn_created_pending', order: 6, description: 'Pending transaction/deposit request created', required: true },
    { stepKey: 'payment_reference_created', order: 7, description: 'Payment reference or proof submitted', required: true },
    { stepKey: 'admin_approval_received', order: 8, description: 'Admin approves the deposit', required: true },
    { stepKey: 'gold_acquisition_confirmed', order: 9, description: 'Physical gold acquisition confirmed', required: true },
    { stepKey: 'ledger_posted_credit_to_MPGW', order: 10, description: 'Ledger entry: CREDIT to MPGW wallet', required: true,
      validator: (actual) => actual === 'MPGW'
    },
    { stepKey: 'balances_updated_from_ledger', order: 11, description: 'User balances updated from ledger', required: true },
    { stepKey: 'certificate_created', order: 12, description: 'Digital Ownership Certificate issued', required: true },
    { stepKey: 'notify_user_success', order: 13, description: 'User notified of successful deposit', required: true },
  ],
  
  INTERNAL_TRANSFER_MPGW_TO_FPGW: [
    { stepKey: 'validate_user_balance_mpgw', order: 1, description: 'Validate user has sufficient MPGW balance', required: true },
    { stepKey: 'create_pending_txn', order: 2, description: 'Create pending transfer transaction', required: true },
    { stepKey: 'ledger_post_reclass_mpgw_to_fpgw', order: 3, description: 'Ledger: reclassify from MPGW to FPGW', required: true },
    { stepKey: 'fpgw_batch_created', order: 4, description: 'FPGW batch created with fixed price', required: true },
    { stepKey: 'balances_updated', order: 5, description: 'Both MPGW and FPGW balances updated', required: true },
    { stepKey: 'certificate_issued', order: 6, description: 'Conversion certificate issued (optional)', required: false },
    { stepKey: 'notify_user', order: 7, description: 'User notified of successful transfer', required: true },
  ],
  
  INTERNAL_TRANSFER_FPGW_TO_MPGW: [
    { stepKey: 'validate_user_balance_fpgw', order: 1, description: 'Validate user has sufficient FPGW balance', required: true },
    { stepKey: 'create_pending_txn', order: 2, description: 'Create pending transfer transaction', required: true },
    { stepKey: 'fpgw_batches_consumed', order: 3, description: 'FPGW batches consumed via FIFO', required: true },
    { stepKey: 'ledger_post_reclass_fpgw_to_mpgw', order: 4, description: 'Ledger: reclassify from FPGW to MPGW', required: true },
    { stepKey: 'balances_updated', order: 5, description: 'Both FPGW and MPGW balances updated', required: true },
    { stepKey: 'certificate_issued', order: 6, description: 'Conversion certificate issued (optional)', required: false },
    { stepKey: 'notify_user', order: 7, description: 'User notified of successful transfer', required: true },
  ],
  
  TRANSFER_USER_TO_USER: [
    { stepKey: 'validate_sender_balance', order: 1, description: 'Validate sender has sufficient balance', required: true },
    { stepKey: 'validate_recipient', order: 2, description: 'Validate recipient exists and can receive', required: true },
    { stepKey: 'create_pending_txn', order: 3, description: 'Create pending transfer transaction', required: true },
    { stepKey: 'ledger_debit_sender', order: 4, description: 'Ledger: debit sender wallet', required: true },
    { stepKey: 'ledger_credit_recipient', order: 5, description: 'Ledger: credit recipient wallet', required: true },
    { stepKey: 'balances_updated', order: 6, description: 'Both sender and recipient balances updated', required: true },
    { stepKey: 'certificates_issued', order: 7, description: 'Transfer certificates issued to both parties', required: true },
    { stepKey: 'notify_both_users', order: 8, description: 'Both users notified', required: true },
  ],
  
  WITHDRAWAL: [
    { stepKey: 'validate_balance', order: 1, description: 'Validate user has sufficient balance', required: true },
    { stepKey: 'create_pending_txn', order: 2, description: 'Create pending withdrawal transaction', required: true },
    { stepKey: 'admin_approval', order: 3, description: 'Admin approves withdrawal', required: true },
    { stepKey: 'ledger_debit_user', order: 4, description: 'Ledger: debit user wallet', required: true },
    { stepKey: 'balances_updated', order: 5, description: 'User balances updated', required: true },
    { stepKey: 'payout_processed', order: 6, description: 'Payout processed to user', required: true },
    { stepKey: 'notify_user', order: 7, description: 'User notified of successful withdrawal', required: true },
  ],
  
  BNSL_ACTIVATION: [
    { stepKey: 'validate_balance', order: 1, description: 'Validate user has sufficient gold', required: true },
    { stepKey: 'create_bnsl_plan', order: 2, description: 'BNSL plan created', required: true },
    { stepKey: 'ledger_lock_gold', order: 3, description: 'Ledger: lock gold for BNSL', required: true },
    { stepKey: 'balances_updated', order: 4, description: 'Available reduced, locked increased', required: true },
    { stepKey: 'certificate_issued', order: 5, description: 'BNSL lock certificate issued', required: true },
    { stepKey: 'notify_user', order: 6, description: 'User notified of plan activation', required: true },
  ],
  
  BNSL_PAYOUT: [
    { stepKey: 'validate_payout_due', order: 1, description: 'Validate payout is due', required: true },
    { stepKey: 'calculate_payout_amount', order: 2, description: 'Calculate payout amount', required: true },
    { stepKey: 'ledger_credit_user', order: 3, description: 'Ledger: credit payout to user', required: true },
    { stepKey: 'balances_updated', order: 4, description: 'User balances updated', required: true },
    { stepKey: 'notify_user', order: 5, description: 'User notified of payout', required: true },
  ],
  
  FINABRIDGE_LOCK: [
    { stepKey: 'validate_balance', order: 1, description: 'Validate user has sufficient gold', required: true },
    { stepKey: 'create_trade_case', order: 2, description: 'Trade case created', required: true },
    { stepKey: 'ledger_reserve_gold', order: 3, description: 'Ledger: reserve gold for trade', required: true },
    { stepKey: 'balances_updated', order: 4, description: 'Available reduced, reserved increased', required: true },
    { stepKey: 'notify_user', order: 5, description: 'User notified of gold reservation', required: true },
  ],
};

export class WorkflowAuditService {
  private replicationModeEnabled: boolean;
  
  constructor() {
    this.replicationModeEnabled = process.env.REPLICATION_COMPARE_MODE === 'true';
  }
  
  isEnabled(): boolean {
    return this.replicationModeEnabled;
  }
  
  async startFlow(
    flowType: FlowType,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const flowInstanceId = randomUUID();
    
    if (!this.replicationModeEnabled) {
      return flowInstanceId;
    }
    
    const expectedSteps = EXPECTED_STEPS[flowType];
    
    const summaryData: InsertWorkflowAuditSummary = {
      flowType,
      flowInstanceId,
      userId,
      totalSteps: expectedSteps.length,
      passedSteps: 0,
      failedSteps: 0,
      pendingSteps: expectedSteps.length,
      overallResult: 'PENDING',
      startedAt: new Date(),
      metadata,
    };
    
    await db.insert(workflowAuditSummaries).values(summaryData);
    
    console.log(`[WorkflowAudit] Started flow ${flowType} with instance ${flowInstanceId}`);
    return flowInstanceId;
  }
  
  async recordStep(
    flowInstanceId: string,
    flowType: FlowType,
    stepKey: string,
    actual: string,
    payload?: Record<string, any>,
    options?: {
      userId?: string;
      transactionId?: string;
      depositRequestId?: string;
      walletCredited?: string;
      ledgerEntryId?: string;
      certificateId?: string;
    }
  ): Promise<StepResult> {
    if (!this.replicationModeEnabled) {
      return 'PASS';
    }
    
    const expectedSteps = EXPECTED_STEPS[flowType];
    const expectedStep = expectedSteps.find(s => s.stepKey === stepKey);
    
    if (!expectedStep) {
      console.warn(`[WorkflowAudit] Unknown step ${stepKey} for flow ${flowType}`);
      return 'SKIPPED';
    }
    
    let result: StepResult = 'PASS';
    let mismatchReason: string | undefined;
    
    if (expectedStep.validator) {
      const isValid = expectedStep.validator(actual, payload);
      if (!isValid) {
        result = 'FAIL';
        mismatchReason = `Expected validator failed for step ${stepKey}. Actual value: ${actual}`;
      }
    }
    
    const logEntry: InsertWorkflowAuditLog = {
      flowType,
      flowInstanceId,
      userId: options?.userId,
      transactionId: options?.transactionId,
      depositRequestId: options?.depositRequestId,
      stepKey,
      stepOrder: expectedStep.order,
      expected: expectedStep.description,
      actual,
      result,
      mismatchReason,
      payloadJson: payload,
      walletCredited: options?.walletCredited,
      ledgerEntryId: options?.ledgerEntryId,
      certificateId: options?.certificateId,
    };
    
    await db.insert(workflowAuditLogs).values(logEntry);
    
    await this.updateSummaryStats(flowInstanceId, result);
    
    console.log(`[WorkflowAudit] Step ${stepKey}: ${result}${mismatchReason ? ` - ${mismatchReason}` : ''}`);
    return result;
  }
  
  async completeFlow(
    flowInstanceId: string,
    transactionId?: string
  ): Promise<{ overallResult: StepResult; passedSteps: number; failedSteps: number }> {
    if (!this.replicationModeEnabled) {
      return { overallResult: 'PASS', passedSteps: 0, failedSteps: 0 };
    }
    
    const [summary] = await db
      .select()
      .from(workflowAuditSummaries)
      .where(eq(workflowAuditSummaries.flowInstanceId, flowInstanceId));
    
    if (!summary) {
      return { overallResult: 'FAIL', passedSteps: 0, failedSteps: 0 };
    }
    
    const overallResult: StepResult = summary.failedSteps > 0 ? 'FAIL' : 
                                       summary.pendingSteps > 0 ? 'PENDING' : 'PASS';
    
    await db
      .update(workflowAuditSummaries)
      .set({
        overallResult,
        completedAt: new Date(),
        transactionId,
        updatedAt: new Date(),
      })
      .where(eq(workflowAuditSummaries.flowInstanceId, flowInstanceId));
    
    console.log(`[WorkflowAudit] Flow ${flowInstanceId} completed: ${overallResult}`);
    
    return {
      overallResult,
      passedSteps: summary.passedSteps,
      failedSteps: summary.failedSteps,
    };
  }
  
  private async updateSummaryStats(flowInstanceId: string, stepResult: StepResult): Promise<void> {
    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };
    
    if (stepResult === 'PASS') {
      updateFields.passedSteps = sql`${workflowAuditSummaries.passedSteps} + 1`;
      updateFields.pendingSteps = sql`${workflowAuditSummaries.pendingSteps} - 1`;
    } else if (stepResult === 'FAIL') {
      updateFields.failedSteps = sql`${workflowAuditSummaries.failedSteps} + 1`;
      updateFields.pendingSteps = sql`${workflowAuditSummaries.pendingSteps} - 1`;
    }
    
    await db
      .update(workflowAuditSummaries)
      .set(updateFields)
      .where(eq(workflowAuditSummaries.flowInstanceId, flowInstanceId));
  }
  
  async getFlowSummaries(
    filters?: {
      flowType?: FlowType;
      overallResult?: StepResult;
      userId?: string;
      limit?: number;
    }
  ): Promise<WorkflowAuditSummary[]> {
    let query = db.select().from(workflowAuditSummaries);
    
    const conditions = [];
    if (filters?.flowType) {
      conditions.push(eq(workflowAuditSummaries.flowType, filters.flowType));
    }
    if (filters?.overallResult) {
      conditions.push(eq(workflowAuditSummaries.overallResult, filters.overallResult));
    }
    if (filters?.userId) {
      conditions.push(eq(workflowAuditSummaries.userId, filters.userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return query
      .orderBy(desc(workflowAuditSummaries.createdAt))
      .limit(filters?.limit || 100);
  }
  
  async getFlowDetails(flowInstanceId: string): Promise<{
    summary: WorkflowAuditSummary | null;
    steps: WorkflowAuditLog[];
    expectedSteps: ExpectedStep[];
    missingSteps: string[];
  }> {
    const [summary] = await db
      .select()
      .from(workflowAuditSummaries)
      .where(eq(workflowAuditSummaries.flowInstanceId, flowInstanceId));
    
    if (!summary) {
      return { summary: null, steps: [], expectedSteps: [], missingSteps: [] };
    }
    
    const steps = await db
      .select()
      .from(workflowAuditLogs)
      .where(eq(workflowAuditLogs.flowInstanceId, flowInstanceId))
      .orderBy(workflowAuditLogs.stepOrder);
    
    const expectedSteps = EXPECTED_STEPS[summary.flowType as FlowType] || [];
    const recordedStepKeys = new Set(steps.map(s => s.stepKey));
    const missingSteps = expectedSteps
      .filter(es => es.required && !recordedStepKeys.has(es.stepKey))
      .map(es => es.stepKey);
    
    return { summary, steps, expectedSteps, missingSteps };
  }
  
  async compareFlow(flowInstanceId: string): Promise<{
    result: 'PASS' | 'FAIL';
    summary: {
      totalExpected: number;
      recorded: number;
      passed: number;
      failed: number;
      missing: number;
    };
    mismatches: Array<{
      stepKey: string;
      expected: string;
      actual: string;
      reason: string;
    }>;
    missingSteps: string[];
  }> {
    const { summary, steps, expectedSteps, missingSteps } = await this.getFlowDetails(flowInstanceId);
    
    if (!summary) {
      return {
        result: 'FAIL',
        summary: { totalExpected: 0, recorded: 0, passed: 0, failed: 0, missing: 0 },
        mismatches: [],
        missingSteps: [],
      };
    }
    
    const mismatches = steps
      .filter(s => s.result === 'FAIL')
      .map(s => ({
        stepKey: s.stepKey,
        expected: s.expected || '',
        actual: s.actual || '',
        reason: s.mismatchReason || 'Validation failed',
      }));
    
    const hasFailed = mismatches.length > 0 || missingSteps.length > 0;
    
    return {
      result: hasFailed ? 'FAIL' : 'PASS',
      summary: {
        totalExpected: expectedSteps.length,
        recorded: steps.length,
        passed: steps.filter(s => s.result === 'PASS').length,
        failed: steps.filter(s => s.result === 'FAIL').length,
        missing: missingSteps.length,
      },
      mismatches,
      missingSteps,
    };
  }
  
  getExpectedSteps(flowType: FlowType): ExpectedStep[] {
    return EXPECTED_STEPS[flowType] || [];
  }
}

export const workflowAuditService = new WorkflowAuditService();
