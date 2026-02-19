/**
 * In-app debug logger — captures logs so they can be shown in the UI on mobile
 * where DevTools is not accessible.
 * 
 * Usage:
 *   import { debugLog } from '../utils/debugLogger';
 *   debugLog('[Groq] Key present:', true);
 */

type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    level: LogLevel;
    timestamp: string;
    message: string;
}

class DebugLoggerClass {
    private logs: LogEntry[] = [];
    private listeners: Array<(logs: LogEntry[]) => void> = [];
    private maxLogs = 100;

    log(level: LogLevel, ...args: any[]) {
        const message = args
            .map(a => {
                if (typeof a === 'object') {
                    try { return JSON.stringify(a); } catch { return String(a); }
                }
                return String(a);
            })
            .join(' ');

        const entry: LogEntry = {
            id: `${Date.now()}_${Math.random()}`,
            level,
            timestamp: new Date().toLocaleTimeString('es', { hour12: false }),
            message,
        };

        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        this.notify();

        // Also forward to native console
        if (level === 'error') console.error(...args);
        else if (level === 'warn') console.warn(...args);
        else console.log(...args);
    }

    info(...args: any[]) { this.log('info', ...args); }
    warn(...args: any[]) { this.log('warn', ...args); }
    error(...args: any[]) { this.log('error', ...args); }

    getLogs() { return this.logs; }
    clear() { this.logs = []; this.notify(); }

    subscribe(fn: (logs: LogEntry[]) => void) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(l => l !== fn); };
    }

    private notify() {
        this.listeners.forEach(fn => fn(this.logs));
    }
}

export const DebugLogger = new DebugLoggerClass();
export const debugLog = DebugLogger.info.bind(DebugLogger);
