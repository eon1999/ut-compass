/**
 * Debug Panel UI Component
 *
 * Provides a collapsible debug panel with log capture, filtering, and status display.
 * Integrates with the debug context for real-time debugging.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebug } from './context';
import { DebugConfig } from './config';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error';
  tag: string;
  message: string;
  context?: Record<string, unknown>;
}

interface DebugPanelProps {
  /** Custom position for the panel */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Initial open state */
  defaultOpen?: boolean;
}

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let logId = 0;
const capturedLogs: LogEntry[] = [];
let captureEnabled = false;

function captureConsole() {
  if (captureEnabled) return;
  captureEnabled = true;

  console.log = (...args: unknown[]) => {
    capturedLogs.push({
      id: logId++,
      timestamp: new Date(),
      level: 'log',
      tag: 'CONSOLE',
      message: args.map(formatArg).join(' '),
    });
    originalConsole.log(...args);
  };

  console.info = (...args: unknown[]) => {
    capturedLogs.push({
      id: logId++,
      timestamp: new Date(),
      level: 'info',
      tag: 'CONSOLE',
      message: args.map(formatArg).join(' '),
    });
    originalConsole.info(...args);
  };

  console.warn = (...args: unknown[]) => {
    capturedLogs.push({
      id: logId++,
      timestamp: new Date(),
      level: 'warn',
      tag: 'CONSOLE',
      message: args.map(formatArg).join(' '),
    });
    originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    capturedLogs.push({
      id: logId++,
      timestamp: new Date(),
      level: 'error',
      tag: 'CONSOLE',
      message: args.map(formatArg).join(' '),
    });
    originalConsole.error(...args);
  };
}

function formatArg(arg: unknown): string {
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

export function DebugPanel({ position = 'bottom-right', defaultOpen = false }: DebugPanelProps) {
  const { config, isEnabled } = useDebug();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | 'log' | 'info' | 'warn' | 'error'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const logCountRef = useRef(0);

  // Capture console when debug is enabled
  useEffect(() => {
    if (config.enableConsoleLogging) {
      captureConsole();
      const interval = setInterval(() => {
        if (capturedLogs.length !== logCountRef.current) {
          logCountRef.current = capturedLogs.length;
          setLogs([...capturedLogs]);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [config.enableConsoleLogging]);

  // Get available tags from logs
  const availableTags = Array.from(new Set(logs.map((l) => l.tag))).sort();

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (selectedTags.length > 0 && !selectedTags.includes(log.tag)) return false;
    if (filterText && !log.message.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const clearLogs = useCallback(() => {
    capturedLogs.length = 0;
    logId = 0;
    setLogs([]);
  }, []);

  if (!isEnabled) return null;

  const positionStyles: Record<string, string> = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[9999] ${positionStyles[position]} px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all ${
          isOpen
            ? 'bg-amber-900 text-amber-100 border-amber-600'
            : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-amber-600 hover:text-amber-300'
        }`}
        aria-label={isOpen ? 'Close debug panel' : 'Open debug panel'}
      >
        {isOpen ? '■ DEBUG' : '□ DEBUG'}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div
          className={`fixed z-[9999] ${positionStyles[position]} w-96 max-h-[70vh] bg-gray-950 border border-gray-700 rounded-xl shadow-2xl overflow-hidden font-mono text-[11px]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">UT-Compass Debug</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                config.debugLevel === 'full' ? 'bg-amber-600' :
                config.debugLevel === 'verbose' ? 'bg-blue-600' :
                config.debugLevel === 'minimal' ? 'bg-green-600' : 'bg-gray-600'
              }`}>
                {config.debugLevel.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearLogs}
                className="px-2 py-0.5 text-[10px] hover:bg-gray-800 rounded transition"
                title="Clear logs"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 text-[10px] hover:bg-gray-800 rounded transition"
                title="Close panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-2 bg-gray-900 border-b border-gray-700 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as typeof filterLevel)}
                className="flex-1 min-w-0 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="all">All Levels</option>
                <option value="log">Log</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
              <input
                type="text"
                placeholder="Filter messages..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded text-[10px] transition ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-600 text-amber-50'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="h-[50vh] overflow-auto p-2 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-[11px]">
                No logs captured yet.{config.enableConsoleLogging ? '' : ' Enable console logging in env.'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`px-2 py-1 rounded border ${
                    log.level === 'error'
                      ? 'bg-red-900/30 border-red-800 text-red-300'
                      : log.level === 'warn'
                      ? 'bg-yellow-900/30 border-yellow-800 text-yellow-300'
                      : log.level === 'info'
                      ? 'bg-blue-900/30 border-blue-800 text-blue-300'
                      : 'bg-gray-800 border-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-1">
                    <span className="text-gray-500 whitespace-nowrap shrink-0">
                      {log.timestamp.toLocaleTimeString()}.{String(log.timestamp.getMilliseconds()).padStart(3, '0')}
                    </span>
                    <span className={`whitespace-nowrap shrink-0 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'info' ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-amber-400 whitespace-nowrap shrink-0">[{log.tag}]</span>
                    <span className="truncate break-all">{log.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Status Bar */}
          <div className="px-3 py-2 bg-gray-900 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-400">
            <span>{filteredLogs.length} / {logs.length} logs</span>
            <div className="flex items-center gap-3">
              <span className={config.enableConsoleLogging ? 'text-green-400' : 'text-red-400'}>● Console</span>
              <span className={config.enablePerfTiming ? 'text-green-400' : 'text-red-400'}>● Perf</span>
              <span className={config.showDebugPanel ? 'text-green-400' : 'text-red-400'}>● Panel</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Debug Overlay - Minimal status indicator
 */
export function DebugOverlay() {
  const { config, isEnabled } = useDebug();

  if (!isEnabled) return null;

  return (
    <div
      className="fixed bottom-2 right-2 z-[9998] px-2 py-1 text-[10px] font-mono bg-gray-900/90 text-amber-300 rounded border border-amber-800 backdrop-blur-sm pointer-events-none"
      aria-hidden="true"
    >
      DEBUG: {config.logLevel.toUpperCase()} | {Object.entries(config)
        .filter(([_, v]) => v === true && typeof v === 'boolean')
        .map(([k]) => k)
        .slice(0, 4)
        .join(', ')}
    </div>
  );
}

/**
 * Performance Overlay - Shows render timing
 */
export function PerformanceOverlay() {
  const { config } = useDebug();
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  if (!config.enabled || !config.showPerfOverlay) return null;

  // This would be populated by a render tracking HOC
  return (
    <div className="fixed top-4 right-4 z-[9998] px-3 py-2 text-[10px] font-mono bg-gray-900/90 text-gray-300 rounded border border-gray-700 backdrop-blur-sm pointer-events-none">
      <div className="font-bold text-amber-300 mb-1">Performance</div>
      {Object.entries(metrics).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4">
          <span>{key}</span>
          <span className="text-amber-300">{value.toFixed(2)}ms</span>
        </div>
      ))}
    </div>
  );
}