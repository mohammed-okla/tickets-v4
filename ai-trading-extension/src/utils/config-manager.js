// Configuration Manager
// Handles all configuration storage and retrieval for the AI trading system

import { Logger } from './logger.js';

export class ConfigManager {
  constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = null;
    this.isLoaded = false;
    this.watchers = new Map();
    this.encryptionKey = null;
  }

  async loadConfig() {
    try {
      const result = await chrome.storage.local.get(['tradingConfig', 'encryptedSecrets']);
      
      this.config = result.tradingConfig || this.getDefaultConfig();
      
      // Load encrypted secrets if available
      if (result.encryptedSecrets) {
        await this.loadEncryptedSecrets(result.encryptedSecrets);
      }
      
      this.isLoaded = true;
      this.logger.info('Configuration loaded successfully');
      
      // Validate config
      const validation = this.validateConfig(this.config);
      if (!validation.valid) {
        this.logger.warn('Configuration validation warnings:', validation.warnings);
      }
      
      return this.config;
    } catch (error) {
      this.logger.error('Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
      this.isLoaded = true;
      return this.config;
    }
  }

  async saveConfig(config = null) {
    try {
      const configToSave = config || this.config;
      
      // Validate before saving
      const validation = this.validateConfig(configToSave);
      if (!validation.valid && validation.errors.length > 0) {
        throw new Error('Configuration validation failed: ' + validation.errors.join(', '));
      }
      
      // Separate sensitive data for encryption
      const { sensitiveData, publicConfig } = this.separateSensitiveData(configToSave);
      
      // Save public config
      await chrome.storage.local.set({ tradingConfig: publicConfig });
      
      // Save encrypted sensitive data
      if (Object.keys(sensitiveData).length > 0) {
        const encrypted = await this.encryptSensitiveData(sensitiveData);
        await chrome.storage.local.set({ encryptedSecrets: encrypted });
      }
      
      this.config = configToSave;
      this.logger.info('Configuration saved successfully');
      
      // Notify watchers
      this.notifyWatchers('configSaved', configToSave);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to save configuration:', error);
      throw error;
    }
  }

  async updateConfig(updates) {
    try {
      if (!this.isLoaded) {
        await this.loadConfig();
      }
      
      // Deep merge updates with existing config
      const updatedConfig = this.deepMerge(this.config, updates);
      
      await this.saveConfig(updatedConfig);
      
      this.logger.info('Configuration updated', { updates });
      
      // Notify watchers
      this.notifyWatchers('configUpdated', updatedConfig);
      
      return updatedConfig;
    } catch (error) {
      this.logger.error('Failed to update configuration:', error);
      throw error;
    }
  }

  getConfig() {
    if (!this.isLoaded) {
      this.logger.warn('Configuration not loaded, returning default config');
      return this.getDefaultConfig();
    }
    return this.config;
  }

  getConfigValue(path, defaultValue = null) {
    const config = this.getConfig();
    return this.getNestedValue(config, path, defaultValue);
  }

  async setConfigValue(path, value) {
    const updates = this.setNestedValue({}, path, value);
    return await this.updateConfig(updates);
  }

  getDefaultConfig() {
    return {
      // Trading Settings
      tradingSettings: {
        enabled: false,
        paperTrading: true,
        activeTimeframes: ['1m', '5m', '15m'],
        maxConcurrentTrades: 3,
        tradingHours: {
          start: '09:00',
          end: '16:00',
          timezone: 'America/New_York'
        }
      },

      // Risk Management
      riskSettings: {
        maxPositionSize: 0.02, // 2% of portfolio
        maxDailyLoss: 0.01, // 1% daily loss limit
        maxTotalExposure: 0.8, // 80% max exposure
        stopLossPercentage: 0.02, // 2% stop loss
        takeProfitPercentage: 0.04, // 4% take profit
        maxDrawdown: 0.1, // 10% max drawdown
        useKellyCriterion: false,
        minTradeValue: 10, // Minimum $10 trade
        maxTradeValue: 1000, // Maximum $1000 trade
        riskPerTrade: 0.01, // 1% risk per trade
        maxCorrelation: 0.7, // Max correlation between positions
        maxSectorExposure: 0.3 // 30% max sector exposure
      },

      // AI Settings
      aiSettings: {
        confidenceThreshold: 0.7,
        strategy: 'balanced', // conservative, balanced, aggressive
        technicalWeight: 0.4,
        sentimentWeight: 0.3,
        fundamentalWeight: 0.2,
        volumeWeight: 0.1,
        enableMachineLearning: true,
        enableSentimentAnalysis: true,
        enablePatternRecognition: true,
        rebalanceFrequency: 'daily' // never, daily, weekly, monthly
      },

      // Platform Settings
      platforms: [],

      // Watchlists
      watchlist: ['BTCUSDT', 'ETHUSDT', 'AAPL', 'TSLA', 'GOOGL'],
      
      // Notification Settings
      notifications: {
        enabled: true,
        tradeExecutions: true,
        riskAlerts: true,
        systemErrors: true,
        dailySummary: true,
        email: null,
        webhookUrl: null
      },

      // UI Settings
      uiSettings: {
        theme: 'light', // light, dark, auto
        compactMode: false,
        showAdvanced: false,
        defaultTab: 'dashboard',
        updateInterval: 30, // seconds
        chartTimeframe: '1h'
      },

      // Logging Settings
      logging: {
        level: 'INFO', // ERROR, WARN, INFO, DEBUG, TRACE
        enableRemoteLogging: false,
        retentionDays: 30
      },

      // Advanced Settings
      advanced: {
        enableBacktesting: true,
        enablePaperTrading: true,
        enableLiveTrading: false,
        apiTimeout: 10000, // 10 seconds
        maxRetries: 3,
        rateLimitBuffer: 0.8, // Use 80% of rate limit
        enableWebsockets: true,
        enableOrderRouting: false
      },

      // Version and metadata
      version: '1.0.0',
      lastUpdated: Date.now(),
      created: Date.now()
    };
  }

  validateConfig(config) {
    const errors = [];
    const warnings = [];

    try {
      // Validate risk settings
      if (config.riskSettings) {
        const risk = config.riskSettings;
        
        if (risk.maxPositionSize <= 0 || risk.maxPositionSize > 0.1) {
          errors.push('Max position size must be between 0.1% and 10%');
        }
        
        if (risk.maxDailyLoss <= 0 || risk.maxDailyLoss > 0.05) {
          errors.push('Max daily loss must be between 0.1% and 5%');
        }
        
        if (risk.maxTotalExposure <= 0 || risk.maxTotalExposure > 1.0) {
          errors.push('Max total exposure must be between 1% and 100%');
        }
        
        if (risk.stopLossPercentage <= 0 || risk.stopLossPercentage > 0.1) {
          errors.push('Stop loss percentage must be between 0.1% and 10%');
        }
        
        if (!risk.paperTrading && config.tradingSettings?.enabled) {
          warnings.push('Live trading is enabled - ensure you understand the risks');
        }
      }

      // Validate AI settings
      if (config.aiSettings) {
        const ai = config.aiSettings;
        
        if (ai.confidenceThreshold < 0.5 || ai.confidenceThreshold > 0.95) {
          warnings.push('Confidence threshold outside recommended range (50%-95%)');
        }
        
        const totalWeight = ai.technicalWeight + ai.sentimentWeight + 
                           ai.fundamentalWeight + ai.volumeWeight;
        if (Math.abs(totalWeight - 1.0) > 0.01) {
          warnings.push('AI weights do not sum to 100%');
        }
      }

      // Validate platforms
      if (config.platforms && config.platforms.length === 0) {
        warnings.push('No trading platforms configured');
      }

      // Validate watchlist
      if (!config.watchlist || config.watchlist.length === 0) {
        warnings.push('Watchlist is empty');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.logger.error('Config validation error:', error);
      return {
        valid: false,
        errors: ['Configuration validation failed'],
        warnings: []
      };
    }
  }

  separateSensitiveData(config) {
    const sensitiveKeys = ['apiKey', 'apiSecret', 'password', 'token', 'privateKey'];
    const sensitiveData = {};
    const publicConfig = this.deepClone(config);

    // Recursively extract sensitive data
    this.extractSensitiveData(publicConfig, sensitiveData, sensitiveKeys);

    return { sensitiveData, publicConfig };
  }

  extractSensitiveData(obj, sensitiveContainer, sensitiveKeys, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (sensitiveKeys.some(sensitiveKey => 
          key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
        sensitiveContainer[currentPath] = value;
        obj[key] = '[ENCRYPTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractSensitiveData(value, sensitiveContainer, sensitiveKeys, currentPath);
      }
    }
  }

  async encryptSensitiveData(data) {
    try {
      // In a real implementation, this would use proper encryption
      // For browser extensions, you might use the Web Crypto API
      const dataString = JSON.stringify(data);
      const encoded = btoa(dataString); // Base64 encoding (not secure!)
      
      // This is just a placeholder - use proper encryption in production
      return {
        encrypted: encoded,
        timestamp: Date.now(),
        version: 1
      };
    } catch (error) {
      this.logger.error('Failed to encrypt sensitive data:', error);
      throw error;
    }
  }

  async loadEncryptedSecrets(encryptedData) {
    try {
      // Decrypt the sensitive data
      const decrypted = atob(encryptedData.encrypted);
      const sensitiveData = JSON.parse(decrypted);
      
      // Merge back into config
      this.mergeSensitiveData(this.config, sensitiveData);
      
      this.logger.debug('Encrypted secrets loaded');
    } catch (error) {
      this.logger.error('Failed to load encrypted secrets:', error);
      // Continue without secrets rather than failing
    }
  }

  mergeSensitiveData(config, sensitiveData) {
    for (const [path, value] of Object.entries(sensitiveData)) {
      this.setNestedValue(config, path, value);
    }
  }

  // Utility methods
  deepMerge(target, source) {
    const result = this.deepClone(target);
    
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
          typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = this.deepClone(value);
    }
    return cloned;
  }

  getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current;
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  }

  // Configuration watchers
  watchConfig(key, callback) {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    this.watchers.get(key).push(callback);
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  notifyWatchers(event, data) {
    if (this.watchers.has(event)) {
      this.watchers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error('Config watcher error:', error);
        }
      });
    }
  }

  // Platform management
  async getEnabledPlatforms() {
    const config = this.getConfig();
    return (config.platforms || []).filter(platform => platform.enabled !== false);
  }

  async addPlatform(platformConfig) {
    const config = this.getConfig();
    const platforms = config.platforms || [];
    
    // Check if platform already exists
    const existingIndex = platforms.findIndex(p => p.name === platformConfig.name);
    if (existingIndex >= 0) {
      platforms[existingIndex] = platformConfig;
    } else {
      platforms.push(platformConfig);
    }
    
    return await this.updateConfig({ platforms });
  }

  async removePlatform(platformName) {
    const config = this.getConfig();
    const platforms = (config.platforms || []).filter(p => p.name !== platformName);
    
    return await this.updateConfig({ platforms });
  }

  // Import/Export
  async exportConfig(includeSecrets = false) {
    try {
      const config = this.getConfig();
      const exportData = {
        config: includeSecrets ? config : this.removeSensitiveData(config),
        metadata: {
          exportDate: new Date().toISOString(),
          version: config.version,
          includesSecrets: includeSecrets
        }
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      this.logger.error('Failed to export config:', error);
      throw error;
    }
  }

  async importConfig(configData, merge = false) {
    try {
      const importData = typeof configData === 'string' ? 
        JSON.parse(configData) : configData;
      
      const validation = this.validateConfig(importData.config);
      if (!validation.valid) {
        throw new Error('Invalid configuration: ' + validation.errors.join(', '));
      }
      
      if (merge) {
        await this.updateConfig(importData.config);
      } else {
        await this.saveConfig(importData.config);
      }
      
      this.logger.info('Configuration imported successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to import config:', error);
      throw error;
    }
  }

  removeSensitiveData(config) {
    const clean = this.deepClone(config);
    const sensitiveKeys = ['apiKey', 'apiSecret', 'password', 'token', 'privateKey'];
    
    const removeSensitive = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(sensitive => 
            key.toLowerCase().includes(sensitive.toLowerCase()))) {
          obj[key] = '[REMOVED]';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          removeSensitive(value);
        }
      }
    };
    
    removeSensitive(clean);
    return clean;
  }

  // Reset and backup
  async resetConfig() {
    const backup = this.getConfig();
    const defaultConfig = this.getDefaultConfig();
    
    await this.saveConfig(defaultConfig);
    
    this.logger.info('Configuration reset to defaults');
    this.notifyWatchers('configReset', { backup, new: defaultConfig });
    
    return backup;
  }

  async createBackup(name = null) {
    const backupName = name || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const config = this.getConfig();
    
    const backups = await chrome.storage.local.get('configBackups');
    const allBackups = backups.configBackups || {};
    
    allBackups[backupName] = {
      config,
      timestamp: Date.now(),
      version: config.version
    };
    
    await chrome.storage.local.set({ configBackups: allBackups });
    
    this.logger.info(`Configuration backup created: ${backupName}`);
    return backupName;
  }

  async restoreBackup(backupName) {
    const backups = await chrome.storage.local.get('configBackups');
    const allBackups = backups.configBackups || {};
    
    if (!allBackups[backupName]) {
      throw new Error(`Backup not found: ${backupName}`);
    }
    
    const currentBackup = await this.createBackup('pre_restore_backup');
    await this.saveConfig(allBackups[backupName].config);
    
    this.logger.info(`Configuration restored from backup: ${backupName}`);
    return currentBackup;
  }

  async listBackups() {
    const backups = await chrome.storage.local.get('configBackups');
    const allBackups = backups.configBackups || {};
    
    return Object.entries(allBackups).map(([name, backup]) => ({
      name,
      timestamp: backup.timestamp,
      date: new Date(backup.timestamp).toISOString(),
      version: backup.version
    })).sort((a, b) => b.timestamp - a.timestamp);
  }
}