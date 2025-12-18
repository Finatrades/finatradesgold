import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { db } from './db';
import { databaseBackups, backupAuditLogs, users, transactions } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const execAsync = promisify(exec);

const BACKUP_STORAGE_PATH = process.env.BACKUP_STORAGE_PATH || '/tmp/finatrades-backups';
const BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || '';

function ensureBackupDirectory(): void {
  if (!fs.existsSync(BACKUP_STORAGE_PATH)) {
    fs.mkdirSync(BACKUP_STORAGE_PATH, { recursive: true, mode: 0o700 });
  }
}

function generateBackupFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupId = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `finatrades-backup-${dateStr}-${backupId}`;
}

function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function encryptBuffer(buffer: Buffer, key: string): Buffer {
  if (!key || key.length < 32) {
    return buffer;
  }
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(key.slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(buffer: Buffer, key: string): Buffer {
  if (!key || key.length < 32) {
    return buffer;
  }
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  const keyBuffer = Buffer.from(key.slice(0, 32));
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function compressBuffer(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function decompressBuffer(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export interface BackupResult {
  success: boolean;
  backupId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  tablesIncluded?: number;
  totalRows?: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  preRestoreBackupId?: string;
  restoredFromBackupId?: string;
  userCount?: number;
  transactionCount?: number;
  lastTransactionDate?: string;
  error?: string;
}

export async function createBackup(
  adminId: string,
  backupType: 'manual' | 'scheduled' | 'pre_restore' = 'manual'
): Promise<BackupResult> {
  ensureBackupDirectory();
  
  const baseFileName = generateBackupFileName();
  const sqlFileName = `${baseFileName}.sql`;
  const finalFileName = `${baseFileName}.sql.gz.enc`;
  const sqlFilePath = path.join(BACKUP_STORAGE_PATH, sqlFileName);
  const finalFilePath = path.join(BACKUP_STORAGE_PATH, finalFileName);
  
  let backupRecord: any = null;
  
  try {
    backupRecord = await db.insert(databaseBackups).values({
      backupType,
      fileName: finalFileName,
      filePath: finalFilePath,
      status: 'In Progress',
      isEncrypted: !!BACKUP_ENCRYPTION_KEY && BACKUP_ENCRYPTION_KEY.length >= 32,
      isCompressed: true,
      createdBy: adminId,
    }).returning();
    
    const backupId = backupRecord[0].id;
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    
    await execAsync(`pg_dump "${databaseUrl}" --no-owner --no-acl -f "${sqlFilePath}"`, {
      timeout: 300000,
    });
    
    let sqlContent = fs.readFileSync(sqlFilePath);
    
    const tableCountMatch = sqlContent.toString().match(/CREATE TABLE/gi);
    const tablesIncluded = tableCountMatch ? tableCountMatch.length : 0;
    
    const rowCountResult = await db.execute(sql`
      SELECT SUM(n_live_tup) as total_rows 
      FROM pg_stat_user_tables
    `);
    const totalRows = parseInt((rowCountResult as any)?.rows?.[0]?.total_rows || '0', 10);
    
    const compressed = await compressBuffer(sqlContent);
    
    let finalData: Buffer;
    if (BACKUP_ENCRYPTION_KEY && BACKUP_ENCRYPTION_KEY.length >= 32) {
      finalData = encryptBuffer(compressed, BACKUP_ENCRYPTION_KEY);
    } else {
      finalData = compressed;
    }
    
    fs.writeFileSync(finalFilePath, finalData);
    
    fs.unlinkSync(sqlFilePath);
    
    const checksum = await calculateChecksum(finalFilePath);
    const stats = fs.statSync(finalFilePath);
    
    await db.update(databaseBackups)
      .set({
        status: 'Success',
        fileSizeBytes: stats.size,
        checksum,
        tablesIncluded,
        totalRows,
        completedAt: new Date(),
      })
      .where(eq(databaseBackups.id, backupId));
    
    return {
      success: true,
      backupId,
      fileName: finalFileName,
      fileSizeBytes: stats.size,
      tablesIncluded,
      totalRows,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (backupRecord && backupRecord[0]) {
      await db.update(databaseBackups)
        .set({
          status: 'Failed',
          errorMessage: errorMessage.slice(0, 1000),
          completedAt: new Date(),
        })
        .where(eq(databaseBackups.id, backupRecord[0].id));
    }
    
    try {
      if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);
      if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
    } catch {}
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function listBackups() {
  const backups = await db.select({
    id: databaseBackups.id,
    backupType: databaseBackups.backupType,
    fileName: databaseBackups.fileName,
    fileSizeBytes: databaseBackups.fileSizeBytes,
    status: databaseBackups.status,
    tablesIncluded: databaseBackups.tablesIncluded,
    totalRows: databaseBackups.totalRows,
    createdBy: databaseBackups.createdBy,
    createdAt: databaseBackups.createdAt,
    completedAt: databaseBackups.completedAt,
  })
    .from(databaseBackups)
    .orderBy(desc(databaseBackups.createdAt));
  
  const enrichedBackups = await Promise.all(backups.map(async (backup) => {
    let creatorEmail = null;
    if (backup.createdBy) {
      const [creator] = await db.select({ email: users.email })
        .from(users)
        .where(eq(users.id, backup.createdBy));
      creatorEmail = creator?.email || null;
    }
    return { ...backup, creatorEmail };
  }));
  
  return enrichedBackups;
}

export async function getBackup(backupId: string) {
  const [backup] = await db.select()
    .from(databaseBackups)
    .where(eq(databaseBackups.id, backupId));
  return backup || null;
}

export async function getBackupFileStream(backupId: string): Promise<{ stream: fs.ReadStream; fileName: string } | null> {
  const backup = await getBackup(backupId);
  if (!backup || backup.status !== 'Success') {
    return null;
  }
  
  if (!fs.existsSync(backup.filePath)) {
    return null;
  }
  
  return {
    stream: fs.createReadStream(backup.filePath),
    fileName: backup.fileName,
  };
}

export async function verifyBackup(backupId: string): Promise<{ valid: boolean; error?: string }> {
  const backup = await getBackup(backupId);
  if (!backup) {
    return { valid: false, error: 'Backup not found' };
  }
  
  if (backup.status !== 'Success') {
    return { valid: false, error: 'Backup is not in Success status' };
  }
  
  if (!fs.existsSync(backup.filePath)) {
    return { valid: false, error: 'Backup file not found on disk' };
  }
  
  const stats = fs.statSync(backup.filePath);
  if (stats.size === 0) {
    return { valid: false, error: 'Backup file is empty' };
  }
  
  if (backup.checksum) {
    const currentChecksum = await calculateChecksum(backup.filePath);
    if (currentChecksum !== backup.checksum) {
      return { valid: false, error: 'Backup file checksum mismatch - file may be corrupted' };
    }
  }
  
  try {
    let fileData = fs.readFileSync(backup.filePath);
    
    if (backup.isEncrypted && BACKUP_ENCRYPTION_KEY && BACKUP_ENCRYPTION_KEY.length >= 32) {
      fileData = decryptBuffer(fileData, BACKUP_ENCRYPTION_KEY);
    }
    
    if (backup.isCompressed) {
      fileData = await decompressBuffer(fileData);
    }
    
    const sqlPreview = fileData.toString('utf-8', 0, 1000);
    if (!sqlPreview.includes('PostgreSQL') && !sqlPreview.includes('CREATE')) {
      return { valid: false, error: 'Backup file does not appear to be valid SQL' };
    }
  } catch (error) {
    return { valid: false, error: `Failed to decrypt/decompress backup: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
  
  return { valid: true };
}

export async function restoreBackup(
  backupId: string,
  adminId: string
): Promise<RestoreResult> {
  const verification = await verifyBackup(backupId);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }
  
  const backup = await getBackup(backupId);
  if (!backup) {
    return { success: false, error: 'Backup not found' };
  }
  
  const preRestoreResult = await createBackup(adminId, 'pre_restore');
  if (!preRestoreResult.success) {
    return { success: false, error: `Failed to create pre-restore snapshot: ${preRestoreResult.error}` };
  }
  
  try {
    let fileData = fs.readFileSync(backup.filePath);
    
    if (backup.isEncrypted && BACKUP_ENCRYPTION_KEY && BACKUP_ENCRYPTION_KEY.length >= 32) {
      fileData = decryptBuffer(fileData, BACKUP_ENCRYPTION_KEY);
    }
    
    if (backup.isCompressed) {
      fileData = await decompressBuffer(fileData);
    }
    
    const tempSqlPath = path.join(BACKUP_STORAGE_PATH, `restore-temp-${Date.now()}.sql`);
    fs.writeFileSync(tempSqlPath, fileData);
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    
    await execAsync(`psql "${databaseUrl}" -f "${tempSqlPath}"`, {
      timeout: 600000,
    });
    
    fs.unlinkSync(tempSqlPath);
    
    const [userCountResult] = await db.select({ count: sql`count(*)` }).from(users);
    const [txCountResult] = await db.select({ count: sql`count(*)` }).from(transactions);
    const [lastTxResult] = await db.select({ createdAt: transactions.createdAt })
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(1);
    
    return {
      success: true,
      preRestoreBackupId: preRestoreResult.backupId,
      restoredFromBackupId: backupId,
      userCount: parseInt((userCountResult as any)?.count || '0', 10),
      transactionCount: parseInt((txCountResult as any)?.count || '0', 10),
      lastTransactionDate: lastTxResult?.createdAt?.toISOString() || undefined,
    };
    
  } catch (error) {
    return {
      success: false,
      preRestoreBackupId: preRestoreResult.backupId,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

export async function deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  const backup = await getBackup(backupId);
  if (!backup) {
    return { success: false, error: 'Backup not found' };
  }
  
  try {
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }
    
    await db.delete(databaseBackups).where(eq(databaseBackups.id, backupId));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}

export async function logBackupAction(
  action: 'BACKUP_CREATE' | 'BACKUP_DOWNLOAD' | 'BACKUP_RESTORE' | 'BACKUP_DELETE',
  backupId: string | null,
  adminId: string,
  adminEmail: string,
  result: 'SUCCESS' | 'FAILED',
  ipAddress: string,
  userAgent: string,
  errorMessage?: string,
  metadata?: Record<string, any>
) {
  await db.insert(backupAuditLogs).values({
    action,
    backupId,
    actorAdminId: adminId,
    actorEmail: adminEmail,
    ipAddress,
    userAgent,
    result,
    errorMessage: errorMessage?.slice(0, 1000),
    metadata: metadata || null,
  });
}

export async function getBackupAuditLogs(limit = 100) {
  return db.select()
    .from(backupAuditLogs)
    .orderBy(desc(backupAuditLogs.createdAt))
    .limit(limit);
}
