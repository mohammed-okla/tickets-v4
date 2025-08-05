// Binance API Adapter
// Integrates with Binance REST API and WebSocket streams

import { BaseAdapter } from './base-adapter.js';
import { Logger } from '../../utils/logger.js';

export class BinanceAdapter extends BaseAdapter {
  constructor() {
    super('binance');
    this.logger = new Logger();
    this.baseUrl = 'https://api.binance.com';
    this.testUrl = 'https://testnet.binance.vision';
    this.wsUrl = 'wss://stream.binance.com:9443/ws/';
    this.testWsUrl = 'wss://testnet.binance.vision/ws/';
    
    this.websocket = null;
    this.subscriptions = new Map();
  }

  async connect(config) {
    const { apiKey, apiSecret, testMode = true } = config;
    
    this.config = {
      apiKey,
      apiSecret,
      testMode,
      baseUrl: testMode ? this.testUrl : this.baseUrl,
      wsUrl: testMode ? this.testWsUrl : this.wsUrl
    };

    try {
      // Test connection
      await this.testConnection();
      
      // Initialize WebSocket for real-time data
      await this.initializeWebSocket();
      
      this.logger.info(`Connected to Binance ${testMode ? 'testnet' : 'mainnet'}`);
      
      return this;
    } catch (error) {
      this.logger.error('Failed to connect to Binance:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.makeRequest('GET', '/api/v3/account');
      return response.balances !== undefined;
    } catch (error) {
      throw new Error('Binance connection test failed: ' + error.message);
    }
  }

  async getAccountBalance() {
    try {
      const response = await this.makeRequest('GET', '/api/v3/account');
      
      return response.balances
        .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .map(balance => ({
          currency: balance.asset,
          available: parseFloat(balance.free),
          locked: parseFloat(balance.locked),
          total: parseFloat(balance.free) + parseFloat(balance.locked)
        }));
    } catch (error) {
      this.logger.error('Failed to get Binance account balance:', error);
      throw error;
    }
  }

  async getMarketData(symbol, timeframe = '1m') {
    try {
      const [ticker, klines, depth] = await Promise.all([
        this.makeRequest('GET', '/api/v3/ticker/24hr', { symbol }),
        this.makeRequest('GET', '/api/v3/klines', { 
          symbol, 
          interval: timeframe, 
          limit: 100 
        }),
        this.makeRequest('GET', '/api/v3/depth', { symbol, limit: 100 })
      ]);

      const prices = klines.map(k => parseFloat(k[4])); // Close prices
      const volumes = klines.map(k => parseFloat(k[5])); // Volumes

      return {
        symbol,
        currentPrice: parseFloat(ticker.lastPrice),
        previousPrice: parseFloat(ticker.prevClosePrice),
        volume24h: parseFloat(ticker.volume),
        high24h: parseFloat(ticker.highPrice),
        low24h: parseFloat(ticker.lowPrice),
        priceChange24h: parseFloat(ticker.priceChange),
        priceChangePercent24h: parseFloat(ticker.priceChangePercent),
        prices,
        volumes,
        orderBook: {
          bids: depth.bids.slice(0, 10).map(([price, qty]) => ({
            price: parseFloat(price),
            quantity: parseFloat(qty)
          })),
          asks: depth.asks.slice(0, 10).map(([price, qty]) => ({
            price: parseFloat(price),
            quantity: parseFloat(qty)
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
    const { symbol, side, quantity, type, price, stopPrice, timeInForce = 'GTC' } = orderParams;
    
    try {
      const params = {
        symbol,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: this.formatQuantity(symbol, quantity),
        timeInForce
      };

      // Add price for limit orders
      if (type.toUpperCase() === 'LIMIT') {
        params.price = this.formatPrice(symbol, price);
      }

      // Add stop price for stop orders
      if (type.toUpperCase().includes('STOP')) {
        params.stopPrice = this.formatPrice(symbol, stopPrice);
      }

      const response = await this.makeRequest('POST', '/api/v3/order', params);

      // Handle stop loss and take profit orders
      if (orderParams.stopLoss || orderParams.takeProfit) {
        await this.createConditionalOrders(response, orderParams);
      }

      return {
        id: response.orderId.toString(),
        symbol: response.symbol,
        side: response.side,
        quantity: parseFloat(response.origQty),
        price: parseFloat(response.price || 0),
        status: response.status,
        type: response.type,
        timestamp: response.transactTime,
        fills: response.fills || []
      };
    } catch (error) {
      this.logger.error('Failed to create Binance order:', error);
      throw error;
    }
  }

  async createConditionalOrders(parentOrder, orderParams) {
    const { symbol, side, quantity, stopLoss, takeProfit } = orderParams;
    const oppositeSide = side === 'BUY' ? 'SELL' : 'BUY';

    try {
      const conditionalOrders = [];

      // Create stop loss order
      if (stopLoss) {
        const stopLossPrice = side === 'BUY' ? 
          parentOrder.price * (1 - stopLoss) : 
          parentOrder.price * (1 + stopLoss);

        const stopLossOrder = await this.makeRequest('POST', '/api/v3/order', {
          symbol,
          side: oppositeSide,
          type: 'STOP_MARKET',
          quantity: this.formatQuantity(symbol, quantity),
          stopPrice: this.formatPrice(symbol, stopLossPrice),
          timeInForce: 'GTC'
        });

        conditionalOrders.push({
          type: 'STOP_LOSS',
          orderId: stopLossOrder.orderId,
          price: stopLossPrice
        });
      }

      // Create take profit order
      if (takeProfit) {
        const takeProfitPrice = side === 'BUY' ? 
          parentOrder.price * (1 + takeProfit) : 
          parentOrder.price * (1 - takeProfit);

        const takeProfitOrder = await this.makeRequest('POST', '/api/v3/order', {
          symbol,
          side: oppositeSide,
          type: 'LIMIT',
          quantity: this.formatQuantity(symbol, quantity),
          price: this.formatPrice(symbol, takeProfitPrice),
          timeInForce: 'GTC'
        });

        conditionalOrders.push({
          type: 'TAKE_PROFIT',
          orderId: takeProfitOrder.orderId,
          price: takeProfitPrice
        });
      }

      return conditionalOrders;
    } catch (error) {
      this.logger.error('Failed to create conditional orders:', error);
      // Don't throw here as main order succeeded
      return [];
    }
  }

  async cancelOrder(orderId, symbol) {
    try {
      const response = await this.makeRequest('DELETE', '/api/v3/order', {
        symbol,
        orderId: parseInt(orderId)
      });

      return {
        id: response.orderId.toString(),
        status: 'CANCELLED',
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to cancel Binance order:', error);
      throw error;
    }
  }

  async getOrderStatus(orderId, symbol) {
    try {
      const response = await this.makeRequest('GET', '/api/v3/order', {
        symbol,
        orderId: parseInt(orderId)
      });

      return {
        id: response.orderId.toString(),
        symbol: response.symbol,
        status: response.status,
        side: response.side,
        quantity: parseFloat(response.origQty),
        filled: parseFloat(response.executedQty),
        price: parseFloat(response.price || 0),
        avgPrice: parseFloat(response.avgPrice || 0),
        timestamp: response.time
      };
    } catch (error) {
      this.logger.error('Failed to get order status:', error);
      throw error;
    }
  }

  async getOpenPositions() {
    try {
      const openOrders = await this.makeRequest('GET', '/api/v3/openOrders');
      
      return openOrders.map(order => ({
        orderId: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        quantity: parseFloat(order.origQty),
        filled: parseFloat(order.executedQty),
        remaining: parseFloat(order.origQty) - parseFloat(order.executedQty),
        price: parseFloat(order.price || 0),
        status: order.status,
        type: order.type,
        timestamp: order.time
      }));
    } catch (error) {
      this.logger.error('Failed to get open positions:', error);
      throw error;
    }
  }

  async getOrderHistory(symbol, limit = 100) {
    try {
      const params = { limit };
      if (symbol) params.symbol = symbol;

      const orders = await this.makeRequest('GET', '/api/v3/allOrders', params);
      
      return orders.map(order => ({
        id: order.orderId.toString(),
        symbol: order.symbol,
        side: order.side,
        quantity: parseFloat(order.origQty),
        price: parseFloat(order.price || 0),
        avgPrice: parseFloat(order.avgPrice || 0),
        status: order.status,
        type: order.type,
        timestamp: order.time
      }));
    } catch (error) {
      this.logger.error('Failed to get order history:', error);
      throw error;
    }
  }

  async getMarketStatistics(symbol, period = '24h') {
    try {
      const ticker = await this.makeRequest('GET', '/api/v3/ticker/24hr', { symbol });
      
      return {
        symbol,
        volume: parseFloat(ticker.volume),
        quoteVolume: parseFloat(ticker.quoteVolume),
        high: parseFloat(ticker.highPrice),
        low: parseFloat(ticker.lowPrice),
        open: parseFloat(ticker.openPrice),
        close: parseFloat(ticker.lastPrice),
        change: parseFloat(ticker.priceChange),
        changePercent: parseFloat(ticker.priceChangePercent),
        trades: parseInt(ticker.tradeCount)
      };
    } catch (error) {
      this.logger.error('Failed to get market statistics:', error);
      throw error;
    }
  }

  async initializeWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.wsUrl);
        
        this.websocket.onopen = () => {
          this.logger.info('Binance WebSocket connected');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(JSON.parse(event.data));
        };

        this.websocket.onerror = (error) => {
          this.logger.error('Binance WebSocket error:', error);
          reject(error);
        };

        this.websocket.onclose = () => {
          this.logger.warn('Binance WebSocket disconnected');
          setTimeout(() => this.initializeWebSocket(), 5000); // Reconnect after 5 seconds
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  handleWebSocketMessage(data) {
    // Handle real-time data updates
    if (data.e === 'executionReport') {
      // Order update
      this.emit('orderUpdate', {
        orderId: data.i.toString(),
        symbol: data.s,
        status: data.X,
        side: data.S,
        quantity: parseFloat(data.q),
        price: parseFloat(data.p),
        filled: parseFloat(data.z)
      });
    } else if (data.e === 'outboundAccountPosition') {
      // Balance update
      this.emit('balanceUpdate', {
        currency: data.a,
        available: parseFloat(data.f),
        locked: parseFloat(data.l)
      });
    }
  }

  subscribeToUserData() {
    // This would require obtaining a listen key from Binance
    // Implementation would depend on specific requirements
  }

  async makeRequest(method, endpoint, params = {}) {
    const timestamp = Date.now();
    const url = new URL(this.config.baseUrl + endpoint);
    
    // Add timestamp for signed requests
    if (this.requiresSignature(endpoint)) {
      params.timestamp = timestamp;
      params.recvWindow = 5000;
    }

    // Add API key to headers
    const headers = {
      'X-MBX-APIKEY': this.config.apiKey,
      'Content-Type': 'application/json'
    };

    // Sign request if required
    if (this.requiresSignature(endpoint)) {
      const signature = this.createSignature(params);
      params.signature = signature;
    }

    // Prepare request
    let requestUrl = url.toString();
    let body = null;

    if (method === 'GET' || method === 'DELETE') {
      const queryString = new URLSearchParams(params).toString();
      if (queryString) {
        requestUrl += '?' + queryString;
      }
    } else {
      body = JSON.stringify(params);
    }

    try {
      const response = await fetch(requestUrl, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Binance API error: ${errorData.msg || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Binance API request failed:', error);
      throw error;
    }
  }

  requiresSignature(endpoint) {
    // Endpoints that require HMAC SHA256 signature
    const signedEndpoints = [
      '/api/v3/account',
      '/api/v3/order',
      '/api/v3/openOrders',
      '/api/v3/allOrders'
    ];
    
    return signedEndpoints.some(ep => endpoint.startsWith(ep));
  }

  createSignature(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.hmacSha256(queryString, this.config.apiSecret);
  }

  hmacSha256(message, secret) {
    // This would use crypto library in a real implementation
    // For browser environment, would need Web Crypto API
    // Simplified implementation for demonstration
    return 'mock_signature_' + Date.now();
  }

  formatQuantity(symbol, quantity) {
    // Format quantity according to symbol's step size
    // This would require exchange info from Binance
    return quantity.toFixed(6);
  }

  formatPrice(symbol, price) {
    // Format price according to symbol's tick size
    // This would require exchange info from Binance
    return price.toFixed(2);
  }

  async disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.logger.info('Disconnected from Binance');
  }
}