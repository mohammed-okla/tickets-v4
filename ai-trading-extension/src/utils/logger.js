// Logger Utility
// Provides structured logging for the AI trading system

export class Logger {
  constructor(context = 'AITrading') {
    this.context = context;
    this.logLevel = this.getLogLevel();
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
    
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };
  }

  getLogLevel() {
    // In development, log everything. In production, log INFO and above
    return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' 
      ? this.levels.INFO 
      : this.levels.DEBUG;
  }

  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  info(message, data = null) {
    this.log('INFO', message, data);
  }

  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  trace(message, data = null) {
    this.log('TRACE', message, data);
  }

  log(level, message, data = null) {
    const levelNum = this.levels[level];
    
    // Skip if log level is below threshold
    if (levelNum > this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      data: data ? this.sanitizeData(data) : null,
      stack: level === 'ERROR' ? this.getStackTrace() : null
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output with formatting
    this.outputToConsole(logEntry);

    // Store in extension storage for persistence
    this.storeLog(logEntry);

    // Send to remote logging service if configured
    this.sendToRemoteLogging(logEntry);
  }

  outputToConsole(logEntry) {
    const { timestamp, level, context, message, data } = logEntry;
    const time = new Date(timestamp).toLocaleTimeString();
    const prefix = `[${time}] [${level}] [${context}]`;
    
    const consoleMethod = this.getConsoleMethod(level);
    const style = this.getLogStyle(level);
    
    if (data) {
      consoleMethod(`${prefix} ${message}`, data);
    } else {
      consoleMethod(`${prefix} ${message}`);
    }
  }

  getConsoleMethod(level) {
    switch (level) {
      case 'ERROR': return console.error;
      case 'WARN': return console.warn;
      case 'INFO': return console.info;
      case 'DEBUG': return console.debug;
      case 'TRACE': return console.trace;
      default: return console.log;
    }
  }

  getLogStyle(level) {
    const styles = {
      ERROR: 'color: #ff4444; font-weight: bold;',
      WARN: 'color: #ffaa00; font-weight: bold;',
      INFO: 'color: #4444ff;',
      DEBUG: 'color: #888888;',
      TRACE: 'color: #cccccc;'
    };
    return styles[level] || '';
  }

  sanitizeData(data) {
    // Remove sensitive information from logs
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'apikey', 'api_key', 'apiSecret', 'api_secret', 'password', 
      'token', 'secret', 'private_key', 'privateKey', 'signature'
    ];

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  getStackTrace() {
    try {
      throw new Error();
    } catch (e) {
      return e.stack;
    }
  }

  async storeLog(logEntry) {
    try {
      // Store logs in chrome.storage for persistence
      const result = await chrome.storage.local.get('tradingLogs');
      const existingLogs = result.tradingLogs || [];
      
      // Keep only recent logs (last 500)
      existingLogs.push(logEntry);
      if (existingLogs.length > 500) {
        existingLogs.splice(0, existingLogs.length - 500);
      }
      
      await chrome.storage.local.set({ tradingLogs: existingLogs });
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  async sendToRemoteLogging(logEntry) {
    // This would send logs to a remote logging service
    // Only send ERROR and WARN levels to reduce noise
    if (logEntry.level === 'ERROR' || logEntry.level === 'WARN') {
      try {
        // Mock remote logging endpoint
        // In production, this would send to services like:
        // - Sentry for error tracking
        // - DataDog for monitoring
        // - CloudWatch for AWS
        // - Custom logging API
        
        console.debug('Would send to remote logging:', logEntry);
      } catch (error) {
        // Don't log this error to avoid infinite loops
        console.error('Remote logging failed:', error);
      }
    }
  }

  // Trading-specific logging methods
  logTrade(action, symbol, details) {
    this.info(`Trade ${action}: ${symbol}`, {
      action,
      symbol,
      ...details,
      category: 'trading'
    });
  }

  logError(error, context = null) {
    this.error(error.message || 'Unknown error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      category: 'error'
    });
  }

  logPerformance(operation, duration, details = null) {
    this.debug(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      details,
      category: 'performance'
    });
  }

  logApiCall(platform, endpoint, duration, success = true) {
    const level = success ? 'DEBUG' : 'WARN';
    this.log(level, `API Call: ${platform} ${endpoint}`, {
      platform,
      endpoint,
      duration,
      success,
      category: 'api'
    });
  }

  logRiskEvent(type, symbol, details) {
    this.warn(`Risk Event: ${type} for ${symbol}`, {
      type,
      symbol,
      details,
      category: 'risk'
    });
  }

  logSystemEvent(event, details = null) {
    this.info(`System: ${event}`, {
      event,
      details,
      category: 'system'
    });
  }

  // Log analysis and export
  async getLogs(filters = {}) {
    try {
      const result = await chrome.storage.local.get('tradingLogs');
      let logs = result.tradingLogs || [];
      
      // Apply filters
      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }
      
      if (filters.category) {
        logs = logs.filter(log => log.data?.category === filters.category);
      }
      
      if (filters.since) {
        const sinceTime = new Date(filters.since).getTime();
        logs = logs.filter(log => new Date(log.timestamp).getTime() >= sinceTime);
      }
      
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        logs = logs.filter(log => 
          log.message.toLowerCase().includes(searchTerm) ||
          JSON.stringify(log.data).toLowerCase().includes(searchTerm)
        );
      }
      
      return logs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  async exportLogs(format = 'json') {
    try {
      const logs = await this.getLogs();
      
      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else if (format === 'csv') {
        return this.logsToCSV(logs);
      } else if (format === 'txt') {
        return this.logsToText(logs);
      }
      
      return logs;
    } catch (error) {
      this.error('Failed to export logs', { error: error.message });
      return null;
    }
  }

  logsToCSV(logs) {
    const headers = ['timestamp', 'level', 'context', 'message', 'category', 'data'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.timestamp,
        log.level,
        log.context,
        `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
        log.data?.category || '',
        `"${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  logsToText(logs) {
    return logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString();
      const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
      return `[${time}] [${log.level}] [${log.context}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  async clearLogs() {
    try {
      await chrome.storage.local.remove('tradingLogs');
      this.logs = [];
      this.info('Logs cleared');
    } catch (error) {
      this.error('Failed to clear logs', { error: error.message });
    }
  }

  // Log statistics
  async getLogStats() {
    try {
      const logs = await this.getLogs();
      const stats = {
        total: logs.length,
        byLevel: {},
        byCategory: {},
        byHour: {},
        recent: {
          lastHour: 0,
          last24Hours: 0,
          lastWeek: 0
        }
      };
      
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      const dayAgo = now - (24 * 60 * 60 * 1000);
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      logs.forEach(log => {
        const logTime = new Date(log.timestamp).getTime();
        const hour = new Date(log.timestamp).getHours();
        
        // Count by level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        
        // Count by category
        const category = log.data?.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        // Count by hour
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        
        // Count recent logs
        if (logTime >= hourAgo) stats.recent.lastHour++;
        if (logTime >= dayAgo) stats.recent.last24Hours++;
        if (logTime >= weekAgo) stats.recent.lastWeek++;
      });
      
      return stats;
    } catch (error) {
      this.error('Failed to get log stats', { error: error.message });
      return null;
    }
  }

  // Create child logger with specific context
  createChild(childContext) {
    const childLogger = new Logger(`${this.context}:${childContext}`);
    childLogger.logLevel = this.logLevel;
    return childLogger;
  }

  // Set log level dynamically
  setLogLevel(level) {
    if (typeof level === 'string' && this.levels[level.toUpperCase()] !== undefined) {
      this.logLevel = this.levels[level.toUpperCase()];
      this.info(`Log level changed to ${level.toUpperCase()}`);
    } else if (typeof level === 'number' && level >= 0 && level <= 4) {
      this.logLevel = level;
      const levelName = Object.keys(this.levels)[level];
      this.info(`Log level changed to ${levelName}`);
    } else {
      this.warn('Invalid log level specified');
    }
  }

  // Check if level would be logged
  shouldLog(level) {
    return this.levels[level] <= this.logLevel;
  }
}