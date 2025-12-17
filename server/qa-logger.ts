import { db } from './db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface QALogEntry {
  ts: string;
  level: LogLevel;
  requestId: string;
  suite: string;
  testName: string;
  actorEmail?: string;
  actorRole?: string;
  route?: string;
  event: string;
  details?: Record<string, any>;
  errorStack?: string;
}

const LOG_DIR = './logs';
const MAX_MEMORY_LOGS = 500;

class QALogger {
  private memoryLogs: QALogEntry[] = [];
  private currentLogFile: string = '';

  constructor() {
    this.ensureLogDir();
    this.updateLogFile();
  }

  private ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  private updateLogFile() {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    this.currentLogFile = path.join(LOG_DIR, `qa-${date}.json`);
  }

  private appendToFile(entry: QALogEntry) {
    try {
      this.updateLogFile();
      let logs: QALogEntry[] = [];
      
      if (fs.existsSync(this.currentLogFile)) {
        const content = fs.readFileSync(this.currentLogFile, 'utf-8');
        try {
          logs = JSON.parse(content);
        } catch {
          logs = [];
        }
      }
      
      logs.push(entry);
      fs.writeFileSync(this.currentLogFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('[QA Logger] Failed to write to file:', error);
    }
  }

  log(entry: Omit<QALogEntry, 'ts'>) {
    const fullEntry: QALogEntry = {
      ...entry,
      ts: new Date().toISOString(),
    };

    console.log(`[QA:${entry.level.toUpperCase()}] [${entry.suite}/${entry.testName}] ${entry.event}`, 
      entry.details ? JSON.stringify(entry.details) : '');

    this.memoryLogs.push(fullEntry);
    if (this.memoryLogs.length > MAX_MEMORY_LOGS) {
      this.memoryLogs.shift();
    }

    this.appendToFile(fullEntry);

    return fullEntry;
  }

  info(suite: string, testName: string, event: string, details?: Record<string, any>, actor?: { email?: string; role?: string }) {
    return this.log({
      level: 'info',
      requestId: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      suite,
      testName,
      event,
      details,
      actorEmail: actor?.email,
      actorRole: actor?.role,
    });
  }

  error(suite: string, testName: string, event: string, error: Error | string, details?: Record<string, any>, actor?: { email?: string; role?: string }) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    return this.log({
      level: 'error',
      requestId: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      suite,
      testName,
      event,
      details: { ...details, errorMessage },
      errorStack,
      actorEmail: actor?.email,
      actorRole: actor?.role,
    });
  }

  warn(suite: string, testName: string, event: string, details?: Record<string, any>, actor?: { email?: string; role?: string }) {
    return this.log({
      level: 'warn',
      requestId: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      suite,
      testName,
      event,
      details,
      actorEmail: actor?.email,
      actorRole: actor?.role,
    });
  }

  getRecentLogs(count: number = 200, filters?: { level?: LogLevel; suite?: string; testName?: string; actorEmail?: string }) {
    let logs = [...this.memoryLogs];

    if (filters) {
      if (filters.level) {
        logs = logs.filter(l => l.level === filters.level);
      }
      if (filters.suite) {
        logs = logs.filter(l => l.suite.toLowerCase().includes(filters.suite!.toLowerCase()));
      }
      if (filters.testName) {
        logs = logs.filter(l => l.testName.toLowerCase().includes(filters.testName!.toLowerCase()));
      }
      if (filters.actorEmail) {
        logs = logs.filter(l => l.actorEmail?.toLowerCase().includes(filters.actorEmail!.toLowerCase()));
      }
    }

    return logs.slice(-count).reverse();
  }

  exportLogs(startDate?: string, endDate?: string): QALogEntry[] {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('qa-') && f.endsWith('.json'));
    let allLogs: QALogEntry[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(LOG_DIR, file), 'utf-8');
        const logs = JSON.parse(content) as QALogEntry[];
        allLogs = allLogs.concat(logs);
      } catch (error) {
        console.error(`[QA Logger] Failed to read ${file}:`, error);
      }
    }

    if (startDate) {
      allLogs = allLogs.filter(l => l.ts >= startDate);
    }
    if (endDate) {
      allLogs = allLogs.filter(l => l.ts <= endDate);
    }

    return allLogs.sort((a, b) => a.ts.localeCompare(b.ts));
  }

  clearMemoryLogs() {
    this.memoryLogs = [];
  }
}

export const qaLogger = new QALogger();
