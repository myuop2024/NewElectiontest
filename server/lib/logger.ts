import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: Date;
  message: string;
  stack?: string;
}

const LOG_RETENTION_MS = 4 * 60 * 60 * 1000; // 4 hours
const logsDir = path.resolve(import.meta.dirname, '..', 'logs');
const logFilePath = path.join(logsDir, 'error.log');

let logs: LogEntry[] = [];

function ensureLogDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function format(entry: LogEntry) {
  return `[${entry.timestamp.toISOString()}] ${entry.message}${entry.stack ? `\n${entry.stack}` : ''}`;
}

function writeToFile(entry: LogEntry) {
  ensureLogDir();
  fs.appendFileSync(logFilePath, format(entry) + '\n', 'utf-8');
}

export function logError(error: unknown) {
  const entry: LogEntry = {
    timestamp: new Date(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  logs.push(entry);
  writeToFile(entry);
}

export function getLogs() {
  purgeOldLogs();
  return [...logs];
}

function purgeOldLogs() {
  const cutoff = Date.now() - LOG_RETENTION_MS;
  logs = logs.filter((l) => l.timestamp.getTime() >= cutoff);
  // Rewrite file to only include retained entries
  ensureLogDir();
  fs.writeFileSync(logFilePath, logs.map(format).join('\n') + '\n', 'utf-8');
}

setInterval(purgeOldLogs, 60 * 1000);
