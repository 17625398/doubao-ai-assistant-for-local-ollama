/**
 * Record browser actions (clicks, typing, navigation) and convert to OpenCLI commands
 */

import chalk from 'chalk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IPage } from './types.js';

/** Path to store recording sessions */
const SESSIONS_DIR = path.join(process.cwd(), '.opencli', 'sessions');

/** Ensure sessions directory exists */
function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

export interface RecordedAction {
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'select';
  timestamp: number;
  target?: string; // element index or selector
  text?: string; // text for typing
  direction?: 'up' | 'down'; // scroll direction
  amount?: number; // scroll amount
  url?: string; // navigation URL
  option?: string; // select option
}

export interface RecordSession {
  id: string;
  startTime: number;
  lastActionTime: number;
  actions: RecordedAction[];
  isPaused: boolean;
  pageUrl: string;
}

/** Load sessions from file system */
function loadSessions(): Map<string, RecordSession> {
  ensureSessionsDir();
  const sessions = new Map<string, RecordSession>();
  
  try {
    const files = fs.readdirSync(SESSIONS_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        const filePath = path.join(SESSIONS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const session = JSON.parse(content) as RecordSession;
        sessions.set(sessionId, session);
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error loading sessions: ${error}`));
  }
  
  return sessions;
}

/** Save session to file system */
function saveSession(session: RecordSession): void {
  ensureSessionsDir();
  const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
}

/** Delete session from file system */
function deleteSession(sessionId: string): void {
  ensureSessionsDir();
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/** Active sessions */
function getActiveSessions(): Map<string, RecordSession> {
  return loadSessions();
}

/** Save all sessions */
function saveAllSessions(sessions: Map<string, RecordSession>): void {
  for (const session of sessions.values()) {
    saveSession(session);
  }
}

/** Generate a unique session ID */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Injected script to capture user actions */
function generateActionCaptureScript(): string {
  return `
    (() => {
      if (window.__opencli_action_capture) return;
      window.__opencli_action_capture = true;
      window.__opencli_actions = [];
      
      // Add reference numbers to interactive elements
      function addElementReferences() {
        const elements = document.querySelectorAll('button, a, input, textarea, select');
        elements.forEach((el, index) => {
          el.setAttribute('data-opencli-ref', index.toString());
        });
      }
      
      // Capture clicks
      document.addEventListener('click', (e) => {
        const target = e.target;
        const ref = target.closest('[data-opencli-ref]')?.getAttribute('data-opencli-ref');
        if (ref) {
          window.__opencli_actions.push({
            type: 'click',
            timestamp: Date.now(),
            target: ref
          });
        }
      }, true);
      
      // Capture typing
      document.addEventListener('input', (e) => {
        const target = e.target;
        const ref = target.getAttribute('data-opencli-ref');
        if (ref) {
          window.__opencli_actions.push({
            type: 'type',
            timestamp: Date.now(),
            target: ref,
            text: target.value
          });
        }
      });
      
      // Capture navigation
      window.addEventListener('popstate', () => {
        window.__opencli_actions.push({
          type: 'navigate',
          timestamp: Date.now(),
          url: window.location.href
        });
      });
      
      // Capture scroll
      let lastScrollY = window.scrollY;
      window.addEventListener('scroll', () => {
        const direction = window.scrollY > lastScrollY ? 'down' : 'up';
        const amount = Math.abs(window.scrollY - lastScrollY);
        if (amount > 50) {
          window.__opencli_actions.push({
            type: 'scroll',
            timestamp: Date.now(),
            direction,
            amount
          });
          lastScrollY = window.scrollY;
        }
      });
      
      // Initial element references
      addElementReferences();
      
      // Re-add references when DOM changes
      const observer = new MutationObserver(addElementReferences);
      observer.observe(document.body, { childList: true, subtree: true });
    })()
  `;
}

/** Read captured actions from the page */
function generateReadActionsScript(): string {
  return `
    (() => {
      const actions = window.__opencli_actions || [];
      window.__opencli_actions = [];
      return actions;
    })()
  `;
}

/** Start recording browser actions */
export async function startRecording(page: IPage): Promise<RecordSession> {
  const sessionId = generateSessionId();
  const pageUrl = await page.getCurrentUrl?.() ?? await page.evaluate('location.href');
  
  // Inject action capture script
  await page.evaluate(generateActionCaptureScript());
  
  const session: RecordSession = {
    id: sessionId,
    startTime: Date.now(),
    lastActionTime: Date.now(),
    actions: [],
    isPaused: false,
    pageUrl
  };
  
  saveSession(session);
  
  console.log(chalk.bold.green('✓ Recording started'));
  console.log(chalk.dim(`Session ID: ${sessionId}`));
  console.log(chalk.dim(`Current URL: ${pageUrl}`));
  console.log(chalk.dim('Perform actions in the browser window...'));
  
  return session;
}

/** Pause recording */
export function pauseRecording(sessionId: string): boolean {
  const sessions = getActiveSessions();
  const session = sessions.get(sessionId);
  if (!session) {
    console.error(chalk.red('Session not found'));
    return false;
  }
  
  session.isPaused = true;
  saveSession(session);
  console.log(chalk.yellow('⏸ Recording paused'));
  return true;
}

/** Resume recording */
export function resumeRecording(sessionId: string): boolean {
  const sessions = getActiveSessions();
  const session = sessions.get(sessionId);
  if (!session) {
    console.error(chalk.red('Session not found'));
    return false;
  }
  
  session.isPaused = false;
  saveSession(session);
  console.log(chalk.green('▶ Recording resumed'));
  return true;
}

/** Stop recording and generate OpenCLI commands */
export async function stopRecording(page: IPage, sessionId: string): Promise<string[]> {
  const sessions = getActiveSessions();
  const session = sessions.get(sessionId);
  if (!session) {
    console.error(chalk.red('Session not found'));
    return [];
  }
  
  // Get any remaining actions
  const remainingActions = await page.evaluate(generateReadActionsScript()) as RecordedAction[];
  if (remainingActions.length > 0) {
    session.actions.push(...remainingActions);
  }
  
  // Generate OpenCLI commands
  const commands = generateOpenCliCommands(session);
  
  // Clean up
  deleteSession(sessionId);
  
  console.log(chalk.bold.green('✓ Recording stopped'));
  console.log(chalk.dim(`Recorded ${session.actions.length} actions`));
  
  return commands;
}

/** Generate OpenCLI commands from recorded actions */
function generateOpenCliCommands(session: RecordSession): string[] {
  const commands: string[] = [];
  
  // Start with navigation to the initial URL
  commands.push(`opencli operate open "${session.pageUrl}"`);
  
  for (const action of session.actions) {
    switch (action.type) {
      case 'click':
        commands.push(`opencli operate click ${action.target}`);
        break;
      case 'type':
        if (action.text) {
          commands.push(`opencli operate type ${action.target} "${action.text}"`);
        }
        break;
      case 'navigate':
        if (action.url) {
          commands.push(`opencli operate open "${action.url}"`);
        }
        break;
      case 'scroll':
        commands.push(`opencli operate scroll ${action.direction} --amount ${action.amount || 500}`);
        break;
      case 'wait':
        commands.push(`opencli operate wait time 2`);
        break;
      case 'select':
        if (action.option) {
          commands.push(`opencli operate select ${action.target} "${action.option}"`);
        }
        break;
    }
  }
  
  return commands;
}

/** List active recording sessions */
export function listRecordingSessions(): RecordSession[] {
  const sessions = getActiveSessions();
  return Array.from(sessions.values());
}

/** Get a recording session by ID */
export function getRecordingSession(sessionId: string): RecordSession | undefined {
  const sessions = getActiveSessions();
  return sessions.get(sessionId);
}
