// Base Trading Platform Adapter
// Provides common interface and functionality for all trading platform adapters

export class BaseAdapter {
  constructor(platformName) {
    this.platformName = platformName;
    this.config = null;
    this.eventListeners = new Map();
    this.isConnected = false;
    this.rateLimiter = new RateLimiter();
  }

  // Abstract methods that must be implemented by subclasses
  async connect(config) {
    throw new Error('connect() method must be implemented');
  }

  async getAccountBalance() {
    throw new Error('getAccountBalance() method must be implemented');
  }

  async getMarketData(symbol, timeframe) {
    throw new Error('getMarketData() method must be implemented');
  }

  async createOrder(orderParams) {
    throw new Error('createOrder() method must be implemented');
  }

  async cancelOrder(orderId, symbol) {
    throw new Error('cancelOrder() method must be implemented');
  }

  async getOrderStatus(orderId, symbol) {
    throw new Error('getOrderStatus() method must be implemented');
  }

  async getOpenPositions() {
    throw new Error('getOpenPositions() method must be implemented');
  }

  async getOrderHistory(symbol, limit) {
    throw new Error('getOrderHistory() method must be implemented');
  }

  // Optional methods with default implementations
  async getMarketStatistics(symbol, period) {
    // Default implementation - can be overridden
    const marketData = await this.getMarketData(symbol, '1d');
    return {
      symbol,
      volume: marketData.volume24h || 0,
      high: marketData.high24h || marketData.currentPrice,
      low: marketData.low24h || marketData.currentPrice,
      open: marketData.previousPrice || marketData.currentPrice,
      close: marketData.currentPrice,
      change: marketData.priceChange24h || 0,
      changePercent: marketData.priceChangePercent24h || 0
    };
  }

  async testConnection() {
    try {
      await this.getAccountBalance();
      return true;
    } catch (error) {
      return false;
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.removeAllListeners();
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners() {
    this.eventListeners.clear();
  }

  // Utility methods
  validateOrderParams(params) {
    const required = ['symbol', 'side', 'quantity'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required order parameters: ${missing.join(', ')}`);
    }

    if (!['BUY', 'SELL'].includes(params.side.toUpperCase())) {
      throw new Error('Invalid order side. Must be BUY or SELL');
    }

    if (params.quantity <= 0) {
      throw new Error('Order quantity must be greater than 0');
    }

    if (params.price && params.price <= 0) {
      throw new Error('Order price must be greater than 0');
    }
  }

  normalizeSymbol(symbol) {
    // Different platforms may have different symbol formats
    // Override this method in platform-specific adapters
    return symbol.toUpperCase();
  }

  formatNumber(number, decimals = 8) {
    return parseFloat(number.toFixed(decimals));
  }

  async waitForRateLimit() {
    return this.rateLimiter.wait();
  }

  // Standard order types mapping
  getStandardOrderType(platformType) {
    const typeMap = {
      'MARKET': 'market',
      'LIMIT': 'limit',
      'STOP': 'stop',
      'STOP_MARKET': 'stop_market',
      'STOP_LIMIT': 'stop_limit',
      'TAKE_PROFIT': 'take_profit',
      'TAKE_PROFIT_LIMIT': 'take_profit_limit'
    };
    
    return typeMap[platformType.toUpperCase()] || platformType.toLowerCase();
  }

  // Standard order status mapping
  getStandardOrderStatus(platformStatus) {
    const statusMap = {
      'NEW': 'open',
      'PARTIALLY_FILLED': 'partially_filled',
      'FILLED': 'filled',
      'CANCELED': 'cancelled',
      'CANCELLED': 'cancelled',
      'REJECTED': 'rejected',
      'EXPIRED': 'expired',
      'PENDING_CANCEL': 'pending_cancel'
    };
    
    return statusMap[platformStatus.toUpperCase()] || platformStatus.toLowerCase();
  }

  // Error handling
  handleApiError(error, context = '') {
    const errorMessage = `${this.platformName} API Error${context ? ` (${context})` : ''}: ${error.message}`;
    const standardError = new Error(errorMessage);
    standardError.originalError = error;
    standardError.platform = this.platformName;
    standardError.context = context;
    
    return standardError;
  }

  // Validation helpers
  isValidSymbol(symbol) {
    return typeof symbol === 'string' && symbol.length > 0 && /^[A-Z0-9]+$/.test(symbol);
  }

  isValidTimeframe(timeframe) {
    const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
    return validTimeframes.includes(timeframe);
  }

  // Retry mechanism
  async retry(operation, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
    
    throw lastError;
  }

  // Connection status
  isConnectionHealthy() {
    return this.isConnected;
  }

  getConnectionInfo() {
    return {
      platform: this.platformName,
      connected: this.isConnected,
      config: this.config ? {
        testMode: this.config.testMode,
        hasApiKey: !!this.config.apiKey
      } : null
    };
  }
}

// Rate limiting utility
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.requestsPerSecond = requestsPerSecond;
    this.requests = [];
    this.interval = 1000; // 1 second
  }

  async wait() {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.interval);
    
    // Check if we've hit the rate limit
    if (this.requests.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.interval - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.wait(); // Recursive call to check again
      }
    }
    
    // Add current request to the list
    this.requests.push(now);
  }

  reset() {
    this.requests = [];
  }
}