/**
 * Comprehensive Logging Utility for UT-Compass Debug Branch
 *
 * Provides structured logging with multiple levels, context enrichment,
 * and pretty formatting for debugging the event ingestion pipeline.
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogContext {
  [key: string]: unknown;
  timestamp?: string;
  level?: LogLevel;
  component?: string;
  operation?: string;
  durationMs?: number;
  traceId?: string;
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableColors: boolean;
  enableJson: boolean;
  enableConsole: boolean;
  context: LogContext;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",    // cyan
  info: "\x1b[32m",     // green
  warn: "\x1b[33m",     // yellow
  error: "\x1b[31m",    // red
  fatal: "\x1b[35m",    // magenta
};

const RESET_COLOR = "\x1b[0m";

function formatTimestamp(): string {
  return new Date().toISOString();
}

function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context: LogContext,
  config: LoggerConfig
): string {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padStart(5);
  const component = context.component ? `[${context.component}]` : "";
  const operation = context.operation ? `{${context.operation}}` : "";

  let formatted = "";

  if (config.enableJson) {
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  if (config.enableColors) {
    const color = LEVEL_COLORS[level];
    formatted += `${color}${levelStr}${RESET_COLOR} `;
  } else {
    formatted += `${levelStr} `;
  }

  formatted += `${timestamp} `;

  if (component) formatted += `${component} `;
  if (operation) formatted += `${operation} `;

  formatted += message;

  // Add context fields (excluding internal ones)
  const { timestamp: _, level: __, component: ___, operation: ____, ...extra } = context;
  if (Object.keys(extra).length > 0) {
    const contextStr = Object.entries(extra)
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" ");
    formatted += ` | ${contextStr}`;
  }

  return formatted;
}

class Logger {
  private config: LoggerConfig;
  private childContext: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: (process.env.LOG_LEVEL as LogLevel) || "debug",
      enableColors: process.env.NODE_ENV !== "production",
      enableJson: process.env.LOG_JSON === "true",
      enableConsole: true,
      context: {
        service: "ut-compass",
        environment: process.env.NODE_ENV || "development",
      },
      ...config,
    };
  }

  child(context: LogContext): Logger {
    const childLogger = new Logger({ ...this.config });
    childLogger.childContext = { ...this.childContext, ...context };
    return childLogger;
  }

  private log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (!shouldLog(level, this.config.minLevel)) return;
    if (!this.config.enableConsole) return;

    const mergedContext = {
      ...this.config.context,
      ...this.childContext,
      ...context,
      timestamp: formatTimestamp(),
      level,
    };

    const formatted = formatMessage(level, message, mergedContext, this.config);
    console.log(formatted);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  fatal(message: string, context?: LogContext): void {
    this.log("fatal", message, context);
  }

  // Timing utilities
  time(operation: string): () => void {
    const start = Date.now();
    const traceId = generateTraceId();

    this.debug(`Started ${operation}`, { operation, traceId, phase: "start" });

    return () => {
      const durationMs = Date.now() - start;
      this.info(`Completed ${operation}`, { operation, traceId, durationMs, phase: "end" });
    };
  }

  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.time(operation);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  // Structured logging for specific operations
  pipelineStep(step: string, details: LogContext = {}): void {
    this.info(`Pipeline step: ${step}`, { operation: "pipeline", step, ...details });
  }

  apiCall(service: string, endpoint: string, details: LogContext = {}): void {
    this.debug(`API call: ${service} ${endpoint}`, { operation: "api", service, endpoint, ...details });
  }

  apiResponse(service: string, endpoint: string, status: number, durationMs: number, details: LogContext = {}): void {
    const level = status >= 400 ? "error" : status >= 300 ? "warn" : "debug";
    this.log(level, `API response: ${service} ${endpoint} - ${status}`, {
      operation: "api",
      service,
      endpoint,
      status,
      durationMs,
      ...details
    });
  }

  dbOperation(operation: string, collection: string, details: LogContext = {}): void {
    this.debug(`DB operation: ${operation} on ${collection}`, { operation: "db", dbOperation: operation, collection, ...details });
  }

  dbResult(operation: string, collection: string, count: number, durationMs: number, details: LogContext = {}): void {
    this.info(`DB result: ${operation} on ${collection} - ${count} records`, {
      operation: "db",
      dbOperation: operation,
      collection,
      count,
      durationMs,
      ...details
    });
  }

  mlInference(model: string, inputSize: number, details: LogContext = {}): void {
    this.debug(`ML inference: ${model}`, { operation: "ml", model, inputSize, ...details });
  }

  mlResult(model: string, outputKeys: string[], durationMs: number, details: LogContext = {}): void {
    this.info(`ML result: ${model} - keys: ${outputKeys.join(", ")}`, {
      operation: "ml",
      model,
      outputKeys,
      durationMs,
      ...details
    });
  }

  scrapeStart(source: string, details: LogContext = {}): void {
    this.info(`Scraping started: ${source}`, { operation: "scrape", source, phase: "start", ...details });
  }

  scrapeComplete(source: string, count: number, durationMs: number, details: LogContext = {}): void {
    this.info(`Scraping complete: ${source} - ${count} items`, {
      operation: "scrape",
      source,
      count,
      durationMs,
      phase: "complete",
      ...details
    });
  }

  scrapeError(source: string, error: Error, details: LogContext = {}): void {
    this.error(`Scraping failed: ${source}`, {
      operation: "scrape",
      source,
      error: error.message,
      stack: error.stack,
      phase: "error",
      ...details
    });
  }
}

// Singleton instance
let defaultLogger: Logger | null = null;

export function getLogger(context?: LogContext): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger();
  }
  return context ? defaultLogger.child(context) : defaultLogger;
}

export function createLogger(context: LogContext): Logger {
  return new Logger().child(context);
}

// Convenience exports for common components
export const pipelineLogger = () => getLogger({ component: "pipeline" });
export const scraperLogger = () => getLogger({ component: "scraper" });
export const mlLogger = () => getLogger({ component: "ml" });
export const dbLogger = () => getLogger({ component: "db" });
export const apiLogger = () => getLogger({ component: "api" });
export const authLogger = () => getLogger({ component: "auth" });
export const uiLogger = () => getLogger({ component: "ui" });

export type { LogLevel, LogContext, LoggerConfig };