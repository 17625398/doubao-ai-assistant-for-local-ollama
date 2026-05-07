import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const HISTORY_FILE = path.join(os.homedir(), '.opencli', 'history.json');
const MAX_HISTORY_ENTRIES = 1000;

export interface HistoryEntry {
  command: string;
  args: string[];
  timestamp: number;
  success: boolean;
}

function ensureHistoryFileExists(): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, '[]', 'utf-8');
  }
}

export function readHistory(): HistoryEntry[] {
  ensureHistoryFileExists();
  try {
    const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export function writeHistory(entries: HistoryEntry[]): void {
  ensureHistoryFileExists();
  // Limit history size
  const limited = entries.slice(-MAX_HISTORY_ENTRIES);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(limited, null, 2), 'utf-8');
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const history = readHistory();
  // Avoid duplicate consecutive commands
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last.command === entry.command && JSON.stringify(last.args) === JSON.stringify(entry.args)) {
      return;
    }
  }
  history.push(entry);
  writeHistory(history);
}

export function searchHistory(query: string): HistoryEntry[] {
  const history = readHistory();
  return history.filter(entry => {
    const fullCommand = `${entry.command} ${entry.args.join(' ')}`;
    return fullCommand.toLowerCase().includes(query.toLowerCase());
  });
}

export function clearHistory(): void {
  writeHistory([]);
}

export function getHistoryEntry(index: number): HistoryEntry | undefined {
  const history = readHistory();
  return history[history.length - 1 - index];
}
