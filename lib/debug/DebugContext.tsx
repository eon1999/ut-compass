'use client';

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { getDebugConfig, createDebugLogger, type DebugConfig } from './config';

/**
 * Debug Context for client-side debugging
 * Provides debug logging, performance timing, and render tracking
 */

interface DebugLogger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  perf: (operation: string, durationMs: number, context?: Record<string, unknown>) => void;
  time: (label: string) => () => void;
  timeEnd: (label: string) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  enabled: boolean;
}

interface DebugValue {
  config: DebugConfig;
  loggers: Record<string, DebugLogger>;
  isEnabled: (tag: string) => boolean;
  trackRender: (componentName: string) => { renderCount: number };
  getLogger: (tag: string) => DebugLogger;
}

const DebugContext = createContext<DebugValue | null>(null);

/**
 * Debug Provider Component
 * Wraps the application and provides debug utilities
 */
export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [config] = useState<DebugConfig>(() => getDebugConfig());
  const [loggers, setLoggers] = useState<Record<string, DebugLogger>>({});

  // Initialize loggers based on config
  useEffect(() => {
    const newLoggers: Record<string, DebugLogger> = {};
    const tags = [
      'app',
      'auth',
      'api',
      'db',
      'ml',
      'pipeline',
      'ui',
      'render',
      'perf',
      'events',
      'scoring',
      'filter',
      'calendar',
      'onboarding',
      'profile',
    ];

    // Check if a tag is enabled based on config
    const isTagEnabled = (tag: string): boolean => {
      if (!config.enabled) return false;
      if (config.disabledTags && config.disabledTags.includes(tag)) return false;
      if (config.enabledTags && config.enabledTags.length > 0) {
        return config.enabledTags.includes(tag);
      }
      return true;
    };

    for (const tag of tags) {
      const enabled = isTagEnabled(tag);
      if (config.enableConsoleLogging && enabled) {
        newLoggers[tag] = createDebugLogger(tag, config);
      } else {
        newLoggers[tag] = {
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          perf: () => {},
          time: () => () => {},
          timeEnd: () => {},
          group: () => {},
          groupEnd: () => {},
          enabled: false,
        };
      }
    }
    setLoggers(newLoggers);
  }, [config]);

  const getLogger = useCallback((tag: string): DebugLogger => {
    if (loggers[tag]) return loggers[tag];
    const logger = createDebugLogger(tag, config);
    setLoggers((prev) => ({ ...prev, [tag]: logger }));
    return logger;
  }, [loggers, config]);

  const isEnabled = useCallback(
    (tag: string) => {
      if (!config.enabled) return false;
      if (config.disabledTags && config.disabledTags.includes(tag)) return false;
      if (config.enabledTags && config.enabledTags.length > 0) {
        return config.enabledTags.includes(tag);
      }
      return true;
    },
    [config]
  );

  const trackRender = useCallback(
    (componentName: string) => {
      const logger = loggers.render ?? loggers.ui;
      if (!logger.enabled) return { renderCount: 0 };
      // Use a ref to track render count per component
      // This is a simplified version - in production you'd want a WeakMap
      return { renderCount: 0 };
    },
    [loggers]
  );

  const value = useMemo<DebugValue>(
    () => ({
      config,
      loggers,
      isEnabled,
      trackRender,
      getLogger,
    }),
    [config, loggers, isEnabled, trackRender, getLogger]
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

/**
 * Hook to access debug utilities
 */
export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    // Return no-op debug utilities if not wrapped in provider
    const noopLogger: DebugLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      perf: () => {},
      time: () => () => {},
      timeEnd: () => {},
      group: () => {},
      groupEnd: () => {},
      enabled: false,
    };
    return {
      config: getDebugConfig(),
      loggers: {},
      isEnabled: () => false,
      trackRender: () => ({ renderCount: 0 }),
      getLogger: () => noopLogger,
    };
  }
  return context;
}

/**
 * Hook for component-specific debug logging
 */
export function useComponentDebug(componentName: string) {
  const { getLogger, config } = useDebug();
  const logger = useMemo(() => getLogger(componentName), [getLogger, componentName]);

  return {
    ...logger,
    config,
    componentName,
  };
}

/**
 * Hook for performance timing
 */
export function usePerfTimer(label: string) {
  const { loggers, config } = useDebug();
  const timerRef = React.useRef<ReturnType<DebugLogger['time']> | null>(null);

  const start = useCallback(() => {
    if (!config.enablePerfTiming) return () => {};
    const logger = loggers.perf ?? loggers.ui;
    timerRef.current = logger.time(label);
    return timerRef.current;
  }, [config.enablePerfTiming, loggers, label]);

  const end = useCallback(() => {
    if (timerRef.current) {
      timerRef.current();
      timerRef.current = null;
    }
  }, []);

  return { start, end };
}

export { DebugContext };
export type { DebugLogger, DebugValue };