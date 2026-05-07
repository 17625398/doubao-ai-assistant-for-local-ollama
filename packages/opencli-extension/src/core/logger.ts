/**
 * Unified logging for opencli.
 *
 * All framework output (warnings, debug info, errors) should go through
 * this module so that verbosity levels are respected consistently.
 */

import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';

function isVerbose(): boolean {
  return !!process.env.OPENCLI_VERBOSE;
}

function isDebug(): boolean {
  return !!process.env.DEBUG?.includes('opencli');
}

function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function getCallerInfo(): string {
  // Skip caller info in production for performance
  if (!isDebug() && !isVerbose()) return '';
  
  try {
    const stack = new Error().stack;
    if (!stack) return '';
    
    const lines = stack.split('\n');
    // Find the first line that's not from this file
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(__filename)) {
        const match = line.match(/\((.+?):(\d+):(\d+)\)/);
        if (match) {
          const [, file, line] = match;
          const relativePath = path.relative(process.cwd(), file);
          return `[${relativePath}:${line}]`;
        }
        break;
      }
    }
  } catch (err) {
    // Ignore errors in caller info extraction
  }
  return '';
}

function shouldLogToFile(): boolean {
  return !!process.env.OPENCLI_LOG_FILE;
}

function logToFile(level: string, message: string): void {
  const logFile = process.env.OPENCLI_LOG_FILE;
  if (!logFile) return;
  
  try {
    const logMessage = `[${getTimestamp()}] [${level}] ${message}\n`;
    fs.appendFileSync(logFile, logMessage, 'utf8');
  } catch (err) {
    // Ignore log file errors
  }
}

export const log = {
  /** Informational message (always shown) */
  info(msg: string): void {
    const timestamp = getTimestamp();
    const caller = getCallerInfo();
    const message = `${chalk.blue('ℹ')}  [${timestamp}] ${msg} ${chalk.dim(caller)}`;
    process.stderr.write(`${message}\n`);
    logToFile('INFO', msg);
  },

  /** Warning (always shown) */
  warn(msg: string): void {
    const timestamp = getTimestamp();
    const caller = getCallerInfo();
    const message = `${chalk.yellow('⚠')}  [${timestamp}] ${msg} ${chalk.dim(caller)}`;
    process.stderr.write(`${message}\n`);
    logToFile('WARN', msg);
  },

  /** Error (always shown) */
  error(msg: string): void {
    const timestamp = getTimestamp();
    const caller = getCallerInfo();
    const message = `${chalk.red('✖')}  [${timestamp}] ${msg} ${chalk.dim(caller)}`;
    process.stderr.write(`${message}\n`);
    logToFile('ERROR', msg);
  },

  /** Verbose output (only when OPENCLI_VERBOSE is set or -v flag) */
  verbose(msg: string): void {
    if (isVerbose()) {
      const timestamp = getTimestamp();
      const caller = getCallerInfo();
      const message = `${chalk.dim('[verbose]')} [${timestamp}] ${msg} ${chalk.dim(caller)}`;
      process.stderr.write(`${message}\n`);
      logToFile('VERBOSE', msg);
    }
  },

  /** Debug output (only when DEBUG includes 'opencli') */
  debug(msg: string): void {
    if (isDebug()) {
      const timestamp = getTimestamp();
      const caller = getCallerInfo();
      const message = `${chalk.dim('[debug]')} [${timestamp}] ${msg} ${chalk.dim(caller)}`;
      process.stderr.write(`${message}\n`);
      logToFile('DEBUG', msg);
    }
  },

  /** Step-style debug (for pipeline steps, etc.) */
  step(stepNum: number, total: number, op: string, preview: string = ''): void {
    const timestamp = getTimestamp();
    const message = `  ${chalk.dim(`[${stepNum}/${total}]`)} ${chalk.bold.cyan(op)}${preview}`;
    process.stderr.write(`${message}\n`);
    logToFile('STEP', `${stepNum}/${total} ${op}${preview}`);
  },

  /** Step result summary */
  stepResult(summary: string): void {
    const message = `       ${chalk.dim(`→ ${summary}`)}`;
    process.stderr.write(`${message}\n`);
    logToFile('STEP_RESULT', summary);
  },

  /** Command execution start */
  commandStart(cmd: string, args: any): void {
    if (isVerbose()) {
      const timestamp = getTimestamp();
      const message = `${chalk.dim('[command]')} [${timestamp}] Starting: ${cmd} ${JSON.stringify(args)}`;
      process.stderr.write(`${message}\n`);
      logToFile('COMMAND', `Starting: ${cmd} ${JSON.stringify(args)}`);
    }
  },

  /** Command execution end */
  commandEnd(cmd: string, duration: number): void {
    if (isVerbose()) {
      const timestamp = getTimestamp();
      const message = `${chalk.dim('[command]')} [${timestamp}] Completed: ${cmd} in ${duration}ms`;
      process.stderr.write(`${message}\n`);
      logToFile('COMMAND', `Completed: ${cmd} in ${duration}ms`);
    }
  },
};
