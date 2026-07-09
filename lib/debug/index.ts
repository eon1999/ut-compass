/**
 * Debug Module - Main Entry Point
 *
 * Exports all debug utilities for the UT Compass application.
 * Provides configuration, context, logging, and UI components for debugging.
 */

// Configuration
export {
  getDebugConfig,
  shouldLog,
  getDebugFlag,
  createDebugLogger,
  measurePerformance,
  measureSync,
  type DebugConfig,
  type LogLevel,
} from './config';

// Context
export {
  DebugProvider,
  useDebug,
  useDebugLogger,
  withDebugLogger,
} from './context';

// UI Components
export {
  DebugPanel,
  DebugOverlay,
  PerformanceOverlay,
} from './DebugPanel';