/**
 * Debug Mode Configuration for UT-Compass
 *
 * Provides centralized debug mode configuration with environment variable support,
 * feature flags, and integration with the application logger.
 *
 * Environment Variables:
 * - DEBUG: Enable debug mode (any truthy value)
 * - NEXT_PUBLIC_DEBUG: Enable client-side debug mode (for Next.js public env)
 * - DEBUG_LOG_LEVEL: Set log level (debug, info, warn, error, fatal)
 * - DEBUG_API: Enable API debug logging
 * - DEBUG_PIPELINE: Enable pipeline debug logging
 * - DEBUG_ML: Enable ML/enrichment debug logging
 * - DEBUG_AUTH: Enable authentication debug logging
 * - DEBUG_UI: Enable UI debug panel and overlays
 * - DEBUG_PERF: Enable performance timing logs
 * - DEBUG_STORAGE: Enable Firestore/storage debug logging
 * - DEBUG_SCRAPER: Enable scraper debug logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type DebugLevel = 'off' | 'minimal' | 'verbose' | 'full';

interface DebugConfig {
  // Core debug mode
  enabled: boolean;
  clientEnabled: boolean;

  // Log level
  logLevel: LogLevel;
  debugLevel: DebugLevel;

  // Feature-specific debug flags
  api: boolean;
  pipeline: boolean;
  ml: boolean;
  auth: boolean;
  ui: boolean;
  perf: boolean;
  storage: boolean;
  scraper: boolean;

  // UI debug features
  showDebugPanel: boolean;
  showPerfOverlay: boolean;
  logRenderCounts: boolean;
  logStateChanges: boolean;

  // Tag filtering
  enabledTags: string[];
  disabledTags: string[];

  // Console logging controls
  enableConsoleLogging: boolean;
  enablePerfTiming: boolean;
  enableApiLogging: boolean;
  enableDbLogging: boolean;
  enableMlLogging: boolean;
  enableAuthLogging: boolean;
  enableRenderLogging: boolean;

  // Advanced
  traceId: string;
  sessionId: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

function parseBool(envValue: string | undefined, defaultValue = false): boolean {
  if (envValue === undefined) return defaultValue;
  const normalized = envValue.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

function parseStringArray(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue.split(',').map(s => s.trim()).filter(Boolean);
}

function parseLogLevel(envValue: string | undefined, defaultLevel: LogLevel = 'debug'): LogLevel {
  if (!envValue) return defaultLevel;
  const normalized = envValue.toLowerCase().trim();
  if (normalized in LOG_LEVELS) return normalized as LogLevel;
  return defaultLevel;
}

function getDebugLevel(logLevel: LogLevel, debugEnabled: boolean): DebugLevel {
  if (!debugEnabled) return 'off';
  switch (logLevel) {
    case 'debug': return 'full';
    case 'info': return 'verbose';
    case 'warn': return 'minimal';
    default: return 'off';
  }
}

function getEnv(key: string): string | undefined {
  // Support both process.env and window.__ENV__ for client-side
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key];
  }
  return undefined;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// Server-side config (Node.js environment)
function createServerConfig(): DebugConfig {
  const debugEnabled = parseBool(getEnv('DEBUG'), false);
  const clientDebugEnabled = parseBool(getEnv('NEXT_PUBLIC_DEBUG'), false);
  const logLevel = parseLogLevel(getEnv('DEBUG_LOG_LEVEL'), debugEnabled ? 'debug' : 'warn');
  const debugLevel = getDebugLevel(logLevel, debugEnabled);

  return {
    enabled: debugEnabled,
    clientEnabled: clientDebugEnabled,
    logLevel,
    debugLevel,
    api: parseBool(getEnv('DEBUG_API'), debugEnabled),
    pipeline: parseBool(getEnv('DEBUG_PIPELINE'), debugEnabled),
    ml: parseBool(getEnv('DEBUG_ML'), debugEnabled),
    auth: parseBool(getEnv('DEBUG_AUTH'), debugEnabled),
    ui: parseBool(getEnv('DEBUG_UI'), debugEnabled),
    perf: parseBool(getEnv('DEBUG_PERF'), debugEnabled),
    storage: parseBool(getEnv('DEBUG_STORAGE'), debugEnabled),
    scraper: parseBool(getEnv('DEBUG_SCRAPER'), debugEnabled),
    showDebugPanel: parseBool(getEnv('DEBUG_UI'), debugEnabled),
    showPerfOverlay: parseBool(getEnv('DEBUG_PERF'), debugEnabled),
    logRenderCounts: parseBool(getEnv('DEBUG_RENDER'), debugEnabled),
    logStateChanges: parseBool(getEnv('DEBUG_STATE'), debugEnabled),
    enabledTags: parseStringArray(getEnv('DEBUG_TAGS')),
    disabledTags: parseStringArray(getEnv('DEBUG_DISABLED_TAGS')),
    enableConsoleLogging: parseBool(getEnv('DEBUG_CONSOLE'), debugEnabled),
    enablePerfTiming: parseBool(getEnv('DEBUG_PERF'), debugEnabled),
    enableApiLogging: parseBool(getEnv('DEBUG_API'), debugEnabled),
    enableDbLogging: parseBool(getEnv('DEBUG_STORAGE'), debugEnabled),
    enableMlLogging: parseBool(getEnv('DEBUG_ML'), debugEnabled),
    enableAuthLogging: parseBool(getEnv('DEBUG_AUTH'), debugEnabled),
    enableRenderLogging: parseBool(getEnv('DEBUG_RENDER'), debugEnabled),
    traceId: generateId('trace'),
    sessionId: generateId('session'),
  };
}

// Client-side config (browser environment)
function createClientConfig(): DebugConfig {
  // In browser, we read from NEXT_PUBLIC_* env vars or window.__DEBUG_CONFIG__
  const debugEnabled = parseBool(
    getEnv('NEXT_PUBLIC_DEBUG') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enabled : undefined),
    false
  );
  const logLevel = parseLogLevel(
    getEnv('NEXT_PUBLIC_DEBUG_LOG_LEVEL') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.logLevel : undefined),
    debugEnabled ? 'debug' : 'warn'
  );
  const debugLevel = getDebugLevel(logLevel, debugEnabled);

  return {
    enabled: debugEnabled,
    clientEnabled: debugEnabled,
    logLevel,
    debugLevel,
    api: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_API') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.api : undefined),
      debugEnabled
    ),
    pipeline: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_PIPELINE') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.pipeline : undefined),
      debugEnabled
    ),
    ml: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_ML') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.ml : undefined),
      debugEnabled
    ),
    auth: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_AUTH') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.auth : undefined),
      debugEnabled
    ),
    ui: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_UI') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.ui : undefined),
      debugEnabled
    ),
    perf: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_PERF') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.perf : undefined),
      debugEnabled
    ),
    storage: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_STORAGE') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.storage : undefined),
      debugEnabled
    ),
    scraper: false, // Scraper is server-only
    showDebugPanel: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_UI') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.showDebugPanel : undefined),
      debugEnabled
    ),
    showPerfOverlay: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_PERF') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.showPerfOverlay : undefined),
      debugEnabled
    ),
    logRenderCounts: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_RENDER') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.logRenderCounts : undefined),
      debugEnabled
    ),
    logStateChanges: parseBool(
      getEnv('NEXT_PUBLIC_DEBUG_STATE') || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.logStateChanges : undefined),
      debugEnabled
    ),
    enabledTags: parseStringArray(getEnv('NEXT_PUBLIC_DEBUG_TAGS')) || parseStringArray((typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enabledTags : undefined)),
    disabledTags: parseStringArray(getEnv('NEXT_PUBLIC_DEBUG_DISABLED_TAGS')) || parseStringArray((typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.disabledTags : undefined)),
    enableConsoleLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_CONSOLE'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableConsoleLogging : undefined) || debugEnabled,
    enablePerfTiming: parseBool(getEnv('NEXT_PUBLIC_DEBUG_PERF'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enablePerfTiming : undefined) || debugEnabled,
    enableApiLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_API'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableApiLogging : undefined) || debugEnabled,
    enableDbLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_STORAGE'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableDbLogging : undefined) || debugEnabled,
    enableMlLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_ML'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableMlLogging : undefined) || debugEnabled,
    enableAuthLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_AUTH'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableAuthLogging : undefined) || debugEnabled,
    enableRenderLogging: parseBool(getEnv('NEXT_PUBLIC_DEBUG_RENDER'), debugEnabled) || (typeof window !== 'undefined' ? (window as any).__DEBUG_CONFIG__?.enableRenderLogging : undefined) || debugEnabled,
    traceId: generateId('trace'),
    sessionId: generateId('session'),
  };
}

// Singleton config instances
let serverConfig: DebugConfig | null = null;
let clientConfig: DebugConfig | null = null;

/**
 * Get the debug configuration for the current environment.
 * On server: reads from process.env
 * On client: reads from NEXT_PUBLIC_* env vars or window.__DEBUG_CONFIG__
 */
export function getDebugConfig(): DebugConfig {
  if (typeof window === 'undefined') {
    // Server-side
    if (!serverConfig) {
      serverConfig = createServerConfig();
    }
    return serverConfig;
  } else {
    // Client-side
    if (!clientConfig) {
      clientConfig = createClientConfig();
    }
    return clientConfig;
  }
}

/**
 * Check if debug logging should occur for a given level
 */
export function shouldLog(level: LogLevel): boolean {
  const config = getDebugConfig();
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
}

/**
 * Get a debug flag by name
 */
export function getDebugFlag<K extends keyof DebugConfig>(key: K): DebugConfig[K] {
  const config = getDebugConfig();
  return config[key];
}

/**
 * Check if a specific debug tag is enabled
 */
export function isDebugTagEnabled(tag: string, config: DebugConfig): boolean {
  if (!config.enabled) return false;
  if (config.disabledTags && config.disabledTags.includes(tag)) return false;
  if (config.enabledTags && config.enabledTags.length > 0) {
    return config.enabledTags.includes(tag);
  }
  return true;
}

/**
 * Create a namespaced debug logger that respects feature flags
 */
export function createDebugLogger(namespace: string, config?: DebugConfig) {
  const cfg = config || getDebugConfig();
  const enabled = cfg.enableConsoleLogging && isDebugTagEnabled(namespace, cfg);

  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      if (enabled && shouldLog('debug')) {
        console.debug(`[DEBUG:${namespace}]`, message, context ?? '');
      }
    },
    info: (message: string, context?: Record<string, unknown>) => {
      if (enabled && shouldLog('info')) {
        console.info(`[INFO:${namespace}]`, message, context ?? '');
      }
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      if (enabled && shouldLog('warn')) {
        console.warn(`[WARN:${namespace}]`, message, context ?? '');
      }
    },
    error: (message: string, context?: Record<string, unknown>) => {
      if (enabled && shouldLog('error')) {
        console.error(`[ERROR:${namespace}]`, message, context ?? '');
      }
    },
    time: (label: string) => {
      if (enabled) {
        console.time(`[DEBUG:${namespace}] ${label}`);
      }
      return () => {
        if (enabled) console.timeEnd(`[DEBUG:${namespace}] ${label}`);
      };
    },
    timeEnd: (label: string) => {
      if (enabled) console.timeEnd(`[DEBUG:${namespace}] ${label}`);
    },
    group: (label: string) => {
      if (enabled) console.group(`[DEBUG:${namespace}] ${label}`);
    },
    groupEnd: () => {
      if (enabled) console.groupEnd();
    },
    perf: (operation: string, durationMs: number, context?: Record<string, unknown>) => {
      if (cfg.enablePerfTiming && shouldLog('debug')) {
        console.debug(`[PERF:${namespace}] ${operation} took ${durationMs.toFixed(2)}ms`, context ?? '');
      }
    },
    isEnabled: () => enabled,
    enabled,
  };
}

/**
 * Time a function execution and log performance if enabled
 */
export async function measurePerformance<T>(
  namespace: keyof DebugConfig,
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const config = getDebugConfig();
  if (!config.perf || !(config[namespace] as boolean)) {
    return fn();
  }

  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    createDebugLogger(namespace).perf(operation, duration, context);
  }
}

/**
 * Synchronous version of measurePerformance
 */
export function measureSync<T>(
  namespace: keyof DebugConfig,
  operation: string,
  fn: () => T,
  context?: Record<string, unknown>
): T {
  const config = getDebugConfig();
  if (!config.perf || !(config[namespace] as boolean)) {
    return fn();
  }

  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    createDebugLogger(namespace).perf(operation, duration, context);
  }
}

export type { DebugConfig, LogLevel };