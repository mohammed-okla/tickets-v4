// Coinbase Advanced API Adapter
// Integrates with Coinbase Advanced Trade API

import { BaseAdapter } from './base-adapter.js';
import { Logger } from '../../utils/logger.js';

export class CoinbaseAdapter extends BaseAdapter {
  constructor() {
    super('coinbase');
    this.logger = new Logger();
    this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    this.sandboxUrl = 'https://api-public.sandbox.exchange.coinbase.com';
    
    this.websocket = null;
    this.products = new Map(); // Cache for product information
  }

  async connect(config) {
    const { apiKey, apiSecret, testMode = true } = config;
    
    this.config = {
      apiKey,
      apiSecret,
      testMode,
      baseUrl: testMode ? this.sandboxUrl : this.baseUrl
    };

    try {
      // Test connection and load account info
      await this.testConnection();
      
      // Load available products
      await this.loadProducts();
      
      // Initialize WebSocket for real-time data
      await this.initializeWebSocket();
      
      this.isConnected = true;
      this.logger.info(`Connected to Coinbase ${testMode ? 'sandbox' : 'production'}`);
      
      return this;
    } catch (error) {
      this.logger.error('Failed to connect to Coinbase:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.makeRequest('GET', '/accounts');
      return Array.isArray(response.accounts);
    } catch (error) {
      throw new Error('Coinbase connection test failed: ' + error.message);
    }
  }

  async loadProducts() {
    try {
      const response = await this.makeRequest('GET', '/products');
      
      response.products.forEach(product => {
        this.products.set(product.product_id, {
          id: product.product_id,
          baseCurrency: product.base_currency_id,
          quoteCurrency: product.quote_currency_id,
          baseIncrement: parseFloat(product.base_increment),
          quoteIncrement: parseFloat(product.quote_increment),
          minMarketFunds: parseFloat(product.min_market_funds || 0),
          status: product.status,
          tradingDisabled: product.trading_disabled
        });
      });
      
      this.logger.info(`Loaded ${this.products.size} Coinbase products`);
    } catch (error) {
      this.logger.error('Failed to load Coinbase products:', error);
      throw error;
    }
  }

  async getAccountBalance() {
    try {
      const response = await this.makeRequest('GET', '/accounts');
      
      return response.accounts
        .filter(account => parseFloat(account.available_balance.value) > 0 || 
                          parseFloat(account.hold.value) > 0)
        .map(account => ({
          currency: account.currency,
          available: parseFloat(account.available_balance.value),
          locked: parseFloat(account.hold.value),
          total: parseFloat(account.available_balance.value) + parseFloat(account.hold.value)
        }));
    } catch (error) {
      this.logger.error('Failed to get Coinbase account balance:', error);
      throw error;
    }
  }

  async getMarketData(symbol, timeframe = '1m') {
    try {
      const productId = this.normalizeSymbol(symbol);
      
      // Get ticker data
      const ticker = await this.makeRequest('GET', `/products/${productId}/ticker`);
      
      // Get 24hr stats
      const stats = await this.makeRequest('GET', `/products/${productId}/stats`);
      
      // Get candles (historical data)
      const granularity = this.timeframeToGranularity(timeframe);
      const end = new Date();
      const start = new Date(end.getTime() - 100 * granularity * 1000); // 100 periods
      
      const candles = await this.makeRequest('GET', `/products/${productId}/candles`, {
        start: start.toISOString(),
        end: end.toISOString(),
        granularity
      });

      // Get order book
      const orderBook = await this.makeRequest('GET', `/products/${productId}/book`, {
        level: 2
      });

      const prices = candles.candles.map(candle => parseFloat(candle.close));
      const volumes = candles.candles.map(candle => parseFloat(candle.volume));

      return {
        symbol: productId,
        currentPrice: parseFloat(ticker.price),
        previousPrice: parseFloat(stats.open),
        volume24h: parseFloat(stats.volume),
        high24h: parseFloat(stats.high),
        low24h: parseFloat(stats.low),
        priceChange24h: parseFloat(ticker.price) - parseFloat(stats.open),
        priceChangePercent24h: ((parseFloat(ticker.price) - parseFloat(stats.open)) / parseFloat(stats.open)) * 100,
        prices: prices.reverse(), // Coinbase returns newest first
        volumes: volumes.reverse(),
        orderBook: {
          bids: orderBook.pricebook.bids.slice(0, 10).map(bid => ({
            price: parseFloat(bid.price),
            quantity: parseFloat(bid.size)
          })),
          asks: orderBook.pricebook.asks.slice(0, 10).map(ask => ({
            price: parseFloat(ask.price),
            quantity: parseFloat(ask.size)
          }))
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`Failed to get market data for ${symbol}:`, error);
      throw error;
    }
  }

  async createOrder(orderParams) {
    this.validateOrderParams(orderParams);
    
    const { symbol, side, quantity, type, price, stopPrice } = orderParams;
    const productId = this.normalizeSymbol(symbol);
    
    try {
      const orderConfig = {
        product_id: productId,
        side: side.toLowerCase(),
        order_configuration: {}
      };

      // Configure order based on type
      switch (type.toUpperCase()) {
        case 'MARKET':
          if (side.toUpperCase() === 'BUY') {
            orderConfig.order_configuration.market_market_ioc = {
              quote_size: (quantity * price).toString() // For market buy, use quote size
            };
          } else {
            orderConfig.order_configuration.market_market_ioc = {
              base_size: quantity.toString()
            };
          }
          break;
          
        case 'LIMIT':
          orderConfig.order_configuration.limit_limit_gtc = {
            base_size: quantity.toString(),
            limit_price: price.toString()
          };
          break;
          
        case 'STOP':
          orderConfig.order_configuration.stop_limit_stop_limit_gtc = {
            base_size: quantity.toString(),
            limit_price: price.toString(),
            stop_price: stopPrice.toString(),
            stop_direction: side.toUpperCase() === 'BUY' ? 'STOP_DIRECTION_STOP_UP' : 'STOP_DIRECTION_STOP_DOWN'
          };
          break;
          
        default:
          throw new Error(`Unsupported order type: ${type}`);
      }

      const response = await this.makeRequest('POST', '/orders', orderConfig);

      // Handle conditional orders
      if (orderParams.stopLoss || orderParams.takeProfit) {
        await this.createConditionalOrders(response, orderParams);
      }

      return {
        id: response.order_id,
        symbol: productId,
        side: side.toUpperCase(),
        quantity: parseFloat(quantity),
        price: parseFloat(price || 0),
        status: this.mapOrderStatus(response.order_status),
        type: type.toUpperCase(),
        timestamp: new Date(response.created_time).getTime(),
        fills: []
      };
    } catch (error) {
      this.logger.error('Failed to create Coinbase order:', error);
      throw error;
    }
  }

  async createConditionalOrders(parentOrder, orderParams) {
    const { symbol, side, quantity, stopLoss, takeProfit } = orderParams;
    const productId = this.normalizeSymbol(symbol);
    const oppositeSide = side.toUpperCase() === 'BUY' ? 'sell' : 'buy';

    try {
      const conditionalOrders = [];

      // Create stop loss order
      if (stopLoss) {
        const stopLossPrice = side.toUpperCase() === 'BUY' ? 
          parentOrder.avgPrice * (1 - stopLoss) : 
          parentOrder.avgPrice * (1 + stopLoss);

        const stopOrderConfig = {
          product_id: productId,
          side: oppositeSide,
          order_configuration: {
            stop_limit_stop_limit_gtc: {
              base_size: quantity.toString(),
              limit_price: stopLossPrice.toString(),
              stop_price: stopLossPrice.toString(),
              stop_direction: oppositeSide === 'buy' ? 'STOP_DIRECTION_STOP_UP' : 'STOP_DIRECTION_STOP_DOWN'
            }
          }
        };

        const stopLossOrder = await this.makeRequest('POST', '/orders', stopOrderConfig);
        conditionalOrders.push({
          type: 'STOP_LOSS',
          orderId: stopLossOrder.order_id,
          price: stopLossPrice
        });
      }

      // Create take profit order
      if (takeProfit) {
        const takeProfitPrice = side.toUpperCase() === 'BUY' ? 
          parentOrder.avgPrice * (1 + takeProfit) : 
          parentOrder.avgPrice * (1 - takeProfit);

        const profitOrderConfig = {
          product_id: productId,
          side: oppositeSide,
          order_configuration: {
            limit_limit_gtc: {
              base_size: quantity.toString(),
              limit_price: takeProfitPrice.toString()
            }
          }
        };

        const takeProfitOrder = await this.makeRequest('POST', '/orders', profitOrderConfig);
        conditionalOrders.push({
          type: 'TAKE_PROFIT',
          orderId: takeProfitOrder.order_id,
          price: takeProfitPrice
        });
      }

      return conditionalOrders;
    } catch (error) {
      this.logger.error('Failed to create conditional orders:', error);
      return [];
    }
  }

  async cancelOrder(orderId) {
    try {
      const response = await this.makeRequest('DELETE', `/orders/batch_cancel`, {
        order_ids: [orderId]
      });

      return {
        id: orderId,
        status: 'CANCELLED',
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to cancel Coinbase order:', error);
      throw error;
    }
  }

  async getOrderStatus(orderId) {
    try {
      const response = await this.makeRequest('GET', `/orders/historical/${orderId}`);
      const order = response.order;

      return {
        id: order.order_id,
        symbol: order.product_id,
        status: this.mapOrderStatus(order.status),
        side: order.side.toUpperCase(),
        quantity: parseFloat(order.order_configuration.limit_limit_gtc?.base_size || 
                           order.order_configuration.market_market_ioc?.base_size || 0),
        filled: parseFloat(order.filled_size || 0),
        price: parseFloat(order.order_configuration.limit_limit_gtc?.limit_price || 0),
        avgPrice: parseFloat(order.average_filled_price || 0),
        timestamp: new Date(order.created_time).getTime()
      };
    } catch (error) {
      this.logger.error('Failed to get order status:', error);
      throw error;
    }
  }

  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/orders/historical/batch', {
        order_status: 'OPEN'
      });

      return response.orders.map(order => ({
        orderId: order.order_id,
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        quantity: parseFloat(order.order_configuration.limit_limit_gtc?.base_size || 
                           order.order_configuration.market_market_ioc?.base_size || 0),
        filled: parseFloat(order.filled_size || 0),
        remaining: parseFloat(order.order_configuration.limit_limit_gtc?.base_size || 0) - 
                  parseFloat(order.filled_size || 0),
        price: parseFloat(order.order_configuration.limit_limit_gtc?.limit_price || 0),
        status: this.mapOrderStatus(order.status),
        type: this.getOrderType(order.order_configuration),
        timestamp: new Date(order.created_time).getTime()
      }));
    } catch (error) {
      this.logger.error('Failed to get open positions:', error);
      throw error;
    }
  }

  async getOrderHistory(symbol, limit = 100) {
    try {
      const params = { limit };
      if (symbol) {
        params.product_id = this.normalizeSymbol(symbol);
      }

      const response = await this.makeRequest('GET', '/orders/historical/batch', params);

      return response.orders.map(order => ({
        id: order.order_id,
        symbol: order.product_id,
        side: order.side.toUpperCase(),
        quantity: parseFloat(order.order_configuration.limit_limit_gtc?.base_size || 
                           order.order_configuration.market_market_ioc?.base_size || 0),
        price: parseFloat(order.order_configuration.limit_limit_gtc?.limit_price || 0),
        avgPrice: parseFloat(order.average_filled_price || 0),
        status: this.mapOrderStatus(order.status),
        type: this.getOrderType(order.order_configuration),
        timestamp: new Date(order.created_time).getTime()
      }));
    } catch (error) {
      this.logger.error('Failed to get order history:', error);
      throw error;
    }
  }

  async initializeWebSocket() {
    // Coinbase Advanced API uses WebSocket for real-time data
    // Implementation would depend on authentication requirements
    this.logger.info('WebSocket initialization for Coinbase (placeholder)');
  }

  normalizeSymbol(symbol) {
    // Coinbase uses format like BTC-USD, ETH-USD
    if (symbol.includes('USDT')) {
      return symbol.replace('USDT', '-USD');
    }
    if (symbol.includes('BTC') && !symbol.includes('-')) {
      return symbol.replace('BTC', '') + '-BTC';
    }
    if (!symbol.includes('-') && symbol.length > 3) {
      // Assume it's a crypto pair, add -USD
      return symbol.replace(/USDC?$/, '') + '-USD';
    }
    return symbol;
  }

  timeframeToGranularity(timeframe) {
    const granularityMap = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400
    };
    
    return granularityMap[timeframe] || 3600; // Default to 1 hour
  }

  mapOrderStatus(status) {
    const statusMap = {
      'PENDING': 'open',
      'OPEN': 'open',
      'FILLED': 'filled',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'expired',
      'FAILED': 'rejected',
      'UNKNOWN_ORDER_STATUS': 'unknown'
    };
    
    return statusMap[status] || status.toLowerCase();
  }

  getOrderType(orderConfig) {
    if (orderConfig.market_market_ioc) return 'MARKET';
    if (orderConfig.limit_limit_gtc) return 'LIMIT';
    if (orderConfig.stop_limit_stop_limit_gtc) return 'STOP_LIMIT';
    return 'UNKNOWN';
  }

  async makeRequest(method, endpoint, params = {}) {
    await this.waitForRateLimit();
    
    const url = new URL(this.config.baseUrl + endpoint);
    const timestamp = Math.floor(Date.now() / 1000);
    
    let body = '';
    if (method === 'GET' && Object.keys(params).length > 0) {
      url.search = new URLSearchParams(params).toString();
    } else if (method !== 'GET') {
      body = JSON.stringify(params);
    }

    // Create signature (simplified for demonstration)
    const message = timestamp + method + url.pathname + url.search + body;
    const signature = this.createSignature(message);

    const headers = {
      'CB-ACCESS-KEY': this.config.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method !== 'GET' ? body : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Coinbase API error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Coinbase API request failed:', error);
      throw error;
    }
  }

  createSignature(message) {
    // This would use HMAC SHA256 with the API secret
    // Simplified implementation for demonstration
    return 'mock_coinbase_signature_' + Date.now();
  }

  async disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
    this.logger.info('Disconnected from Coinbase');
  }
}