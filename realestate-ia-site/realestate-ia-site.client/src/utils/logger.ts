// logger.ts - Centralized logging utility that only logs in development
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  isDevelopment: boolean;
  enabledLevels: Set<LogLevel>;
  timestamp: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // ? PRODUÇÃO: Desabilitar TODOS os logs (incluindo errors)
    const isDev = import.meta.env.DEV;
    
    this.config = {
      isDevelopment: isDev,
      enabledLevels: isDev ? new Set(['info', 'warn', 'error', 'debug']) : new Set(), // ? Set vazio em produção
      timestamp: isDev
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // ? PRODUÇÃO: Nunca logar
    return this.config.isDevelopment && this.config.enabledLevels.has(level);
  }

  private formatMessage(prefix: string, message: string, context?: string): string {
    const timestamp = this.config.timestamp ? new Date().toLocaleTimeString() : '';
    const contextStr = context ? ` [${context}]` : '';
    return timestamp ? `[${timestamp}]${contextStr} ${prefix}: ${message}` : `${contextStr} ${prefix}: ${message}`;
  }

  debug(message: string, context?: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, context?: string, error?: Error): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('ERROR', message, context));
      if (error && this.config.isDevelopment) {
        console.error(error);
      }
    }
  }

  // Service-specific loggers with consistent formatting
  properties = {
    info: (message: string) => this.info(message, 'PROPERTIES'),
    warn: (message: string) => this.warn(message, 'PROPERTIES'),
    error: (message: string, error?: Error) => this.error(message, 'PROPERTIES', error),
    debug: (message: string) => this.debug(message, 'PROPERTIES')
  };

  client = {
    info: (message: string) => this.info(message, 'CLIENT'),
    warn: (message: string) => this.warn(message, 'CLIENT'),
    error: (message: string, error?: Error) => this.error(message, 'CLIENT', error),
    debug: (message: string) => this.debug(message, 'CLIENT')
  };

  auth = {
    info: (message: string) => this.info(message, 'AUTH'),
    warn: (message: string) => this.warn(message, 'AUTH'),
    error: (message: string, error?: Error) => this.error(message, 'AUTH', error),
    debug: (message: string) => this.debug(message, 'AUTH')
  };

  personalArea = {
    info: (message: string) => this.info(message, 'PERSONAL_AREA'),
    warn: (message: string) => this.warn(message, 'PERSONAL_AREA'),
    error: (message: string, error?: Error) => this.error(message, 'PERSONAL_AREA', error),
    debug: (message: string) => this.debug(message, 'PERSONAL_AREA')
  };

  recommendations = {
    info: (message: string) => this.info(message, 'RECOMMENDATIONS'),
    warn: (message: string) => this.warn(message, 'RECOMMENDATIONS'),
    error: (message: string, error?: Error) => this.error(message, 'RECOMMENDATIONS', error),
    debug: (message: string) => this.debug(message, 'RECOMMENDATIONS')
  };

  favorites = {
    info: (message: string) => this.info(message, 'FAVORITES'),
    warn: (message: string) => this.warn(message, 'FAVORITES'),
    error: (message: string, error?: Error) => this.error(message, 'FAVORITES', error),
    debug: (message: string) => this.debug(message, 'FAVORITES')
  };
}

// Export singleton instance
export const logger = new Logger();

// Export individual service loggers for convenience
export const { 
  properties, 
  client, 
  auth,
  personalArea,
  recommendations,
  favorites
} = logger;

// Export the main logger as default
export default logger;