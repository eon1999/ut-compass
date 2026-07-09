/**
 * Debug Context Provider
 *
 * Provides debug configuration and utilities to all components in the app.
 * Wraps the app in a context that makes debug config accessible everywhere.
 */

'use client';

import React, { createContext, useContext, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { getDebugConfig, createDebugLogger, type DebugConfig, type LogLevel } from './config';

interface DebugLogger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
  time: (label: string) => () => void;
  timeEnd: (label: string) => void;
  group: (label: string) => void;
  groupEnd: () => void;
  enabled: boolean;
}

interface DebugContextValue {
  config: DebugConfig;
  isEnabled: boolean;
  logger: DebugLogger;
  getLogger: (tag: string) => DebugLogger;
}

const DebugContext = createContext<DebugContextValue | null>(null);

/**
 * Debug Provider - Wraps the app to provide debug context
 */
interface DebugProviderProps {
  children: ReactNode;
  /** Optional config override */
  configOverride?: Partial<DebugConfig>;
}

export function DebugProvider({ children, configOverride }: DebugProviderProps) {
  const baseConfig = getDebugConfig();

  const config = useMemo<DebugConfig>(
    () => ({
      ...baseConfig,
      ...configOverride,
      // Ensure enabled is true if any debug feature is explicitly enabled
      enabled: baseConfig.enabled || (configOverride ? Object.values(configOverride).some((v) => v === true) : false),
    }),
    [baseConfig, configOverride]
  );

  const isEnabled = config.enabled;

  // Create a default logger for the app
  const logger = useMemo(() => createDebugLogger('app', config), [config]);

  const getLogger = useCallback(
    (tag: string) => createDebugLogger(tag, config),
    [config]
  );

  const value = useMemo<DebugContextValue>(
    () => ({
      config,
      isEnabled,
      logger,
      getLogger,
    }),
    [config, isEnabled, logger, getLogger]
  );

  // Log config on mount in debug mode
  useEffect(() => {
    if (config.enableConsoleLogging && config.enabled) {
      logger.info('Debug mode initialized', {
        level: config.logLevel,
        features: {
          console: config.enableConsoleLogging,
          perf: config.enablePerfTiming,
          api: config.enableApiLogging,
          db: config.enableDbLogging,
          ml: config.enableMlLogging,
          auth: config.enableAuthLogging,
          render: config.enableRenderLogging,
          panel: config.showDebugPanel,
        },
      });
    }
  }, [config, logger]);

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

/**
 * Hook to access debug context
 * Must be used within a DebugProvider
 */
export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext);
  if (!context) {
    // Return a no-op context if not wrapped in provider
    const noopLogger: DebugLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      time: () => () => {},
      timeEnd: () => {},
      group: () => {},
      groupEnd: () => {},
      enabled: false,
    };
    return {
      config: getDebugConfig(),
      isEnabled: false,
      logger: noopLogger,
      getLogger: () => noopLogger,
    };
  }
  return context;
}

/**
 * Hook to get a logger for a specific tag
 */
export function useDebugLogger(tag: string) {
  const { getLogger, isEnabled } = useDebug();
  return useMemo(() => (isEnabled ? getLogger(tag) : createDebugLogger(tag, { enabled: false } as DebugConfig)), [getLogger, isEnabled, tag]);
}

/**
 * HOC to inject debug logger into a component
 */
export function withDebugLogger<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tag: string
) {
  function WithDebugLogger(props: P) {
    const { getLogger } = useDebug();
    const logger = getLogger(tag);
    return <WrappedComponent {...props} debugLogger={logger} />;
  }

  WithDebugLogger.displayName = `withDebugLogger(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithDebugLogger;
}