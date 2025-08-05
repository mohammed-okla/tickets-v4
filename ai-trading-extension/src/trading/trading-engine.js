// Trading Engine - Handles API integrations with multiple trading platforms
// Supports both crypto and traditional stock trading platforms

import { BinanceAdapter } from './adapters/binance-adapter.js';
import { CoinbaseAdapter } from './adapters/coinbase-adapter.js';
import { KuCoinAdapter } from './adapters/kucoin-adapter.js';
import { AlpacaAdapter } from './adapters/alpaca-adapter.js';
import { InteractiveBrokersAdapter } from './adapters/ib-adapter.js';
import { KrakenAdapter } from './adapters/kraken-adapter.js';
import { BybitAdapter } from './adapters/bybit-adapter.js';
import { GateAdapter } from './adapters/gate-adapter.js';
import { Logger } from '../utils/logger.js';

export class TradingEngine {
  constructor() {
    this.adapters = new Map();
    this.connections = new Map();
    this.logger = new Logger();
    
    this.initializeAdapters();
  }

  initializeAdapters() {
    // Crypto exchanges
    this.adapters.set('binance', new BinanceAdapter());
    this.adapters.set('coinbase', new CoinbaseAdapter());
    this.adapters.set('kucoin', new KuCoinAdapter());
    this.adapters.set('kraken', new KrakenAdapter());
    this.adapters.set('bybit', new BybitAdapter());
    this.adapters.set('gate', new GateAdapter());
    
    // Traditional brokers
    this.adapters.set('alpaca', new AlpacaAdapter());
    this.adapters.set('interactive_brokers', new InteractiveBrokersAdapter());
    
    this.logger.info('Trading adapters initialized');
  }

  async connectToPlatform(platformConfig) {
    const { name, apiKey, apiSecret, testMode = true } = platformConfig;
    const adapter = this.adapters.get(name);
    
    if (!adapter) {
      throw new Error(`Unsupported platform: ${name}`);
    }

    try {
      const connection = await adapter.connect({
        apiKey,
        apiSecret,
        testMode
      });
      
      this.connections.set(name, connection);
      this.logger.info(`Connected to ${name} (${testMode ? 'testnet' : 'mainnet'})`);
      
      return connection;
    } catch (error) {
      this.logger.error(`Failed to connect to ${name}:`, error);
      throw error;
    }
  }

  async getMarketData(symbol, timeframe = '1m', platform = 'auto') {
    if (platform === 'auto') {
      platform = this.selectBestPlatformForSymbol(symbol);
    }

    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      const marketData = await connection.getMarketData(symbol, timeframe);
      return {
        symbol,
        platform,
        timeframe,
        timestamp: Date.now(),
        ...marketData
      };
    } catch (error) {
      this.logger.error(`Failed to get market data for ${symbol} on ${platform}:`, error);
      throw error;
    }
  }

  async executeTrade(tradeParams) {
    const { symbol, side, quantity, orderType, platforms } = tradeParams;
    const results = [];

    // If no specific platforms specified, use all connected ones that support the symbol
    const targetPlatforms = platforms || this.getPlatformsForSymbol(symbol);

    for (const platform of targetPlatforms) {
      const connection = this.connections.get(platform);
      if (!connection) {
        results.push({
          platform,
          success: false,
          error: 'No connection to platform'
        });
        continue;
      }

      try {
        const order = await connection.createOrder({
          symbol,
          side,
          quantity,
          type: orderType,
          stopLoss: tradeParams.stopLoss,
          takeProfit: tradeParams.takeProfit
        });

        results.push({
          platform,
          success: true,
          orderId: order.id,
          orderDetails: order
        });

        this.logger.info(`Order executed on ${platform}:`, order);
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error.message
        });
        this.logger.error(`Failed to execute order on ${platform}:`, error);
      }
    }

    return results;
  }

  async closePosition(position) {
    const { platform, symbol, orderId, side } = position;
    const connection = this.connections.get(platform);
    
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      // Create opposite order to close position
      const closeOrder = await connection.createOrder({
        symbol,
        side: side === 'BUY' ? 'SELL' : 'BUY',
        quantity: position.quantity,
        type: 'MARKET'
      });

      this.logger.info(`Position closed on ${platform}:`, closeOrder);
      return closeOrder;
    } catch (error) {
      this.logger.error(`Failed to close position on ${platform}:`, error);
      throw error;
    }
  }

  async getAccountBalance(platform) {
    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      return await connection.getAccountBalance();
    } catch (error) {
      this.logger.error(`Failed to get account balance from ${platform}:`, error);
      throw error;
    }
  }

  async getOpenPositions(platform) {
    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      return await connection.getOpenPositions();
    } catch (error) {
      this.logger.error(`Failed to get open positions from ${platform}:`, error);
      throw error;
    }
  }

  async getOrderHistory(platform, symbol, limit = 100) {
    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      return await connection.getOrderHistory(symbol, limit);
    } catch (error) {
      this.logger.error(`Failed to get order history from ${platform}:`, error);
      throw error;
    }
  }

  selectBestPlatformForSymbol(symbol) {
    // Logic to select the best platform based on liquidity, fees, etc.
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'LINK', 'UNI'];
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];

    if (cryptoSymbols.some(crypto => symbol.includes(crypto))) {
      // Prefer Binance for crypto trading due to high liquidity
      if (this.connections.has('binance')) return 'binance';
      if (this.connections.has('coinbase')) return 'coinbase';
      if (this.connections.has('kraken')) return 'kraken';
    } else if (stockSymbols.some(stock => symbol.includes(stock))) {
      // Prefer Alpaca for stock trading
      if (this.connections.has('alpaca')) return 'alpaca';
      if (this.connections.has('interactive_brokers')) return 'interactive_brokers';
    }

    // Return first available connection
    return Array.from(this.connections.keys())[0];
  }

  getPlatformsForSymbol(symbol) {
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'LINK', 'UNI'];
    const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];

    if (cryptoSymbols.some(crypto => symbol.includes(crypto))) {
      return Array.from(this.connections.keys()).filter(platform => 
        ['binance', 'coinbase', 'kucoin', 'kraken', 'bybit', 'gate'].includes(platform)
      );
    } else if (stockSymbols.some(stock => symbol.includes(stock))) {
      return Array.from(this.connections.keys()).filter(platform => 
        ['alpaca', 'interactive_brokers'].includes(platform)
      );
    }

    return Array.from(this.connections.keys());
  }

  async getMarketStatistics(symbol, period = '24h') {
    const platforms = this.getPlatformsForSymbol(symbol);
    const statistics = {};

    for (const platform of platforms) {
      try {
        const connection = this.connections.get(platform);
        if (connection && connection.getMarketStatistics) {
          statistics[platform] = await connection.getMarketStatistics(symbol, period);
        }
      } catch (error) {
        this.logger.error(`Failed to get market statistics from ${platform}:`, error);
      }
    }

    return statistics;
  }

  async cancelOrder(platform, orderId) {
    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      return await connection.cancelOrder(orderId);
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId} on ${platform}:`, error);
      throw error;
    }
  }

  async getOrderStatus(platform, orderId) {
    const connection = this.connections.get(platform);
    if (!connection) {
      throw new Error(`No connection to platform: ${platform}`);
    }

    try {
      return await connection.getOrderStatus(orderId);
    } catch (error) {
      this.logger.error(`Failed to get order status for ${orderId} on ${platform}:`, error);
      throw error;
    }
  }

  getConnectedPlatforms() {
    return Array.from(this.connections.keys());
  }

  async disconnectPlatform(platform) {
    const connection = this.connections.get(platform);
    if (connection && connection.disconnect) {
      await connection.disconnect();
    }
    this.connections.delete(platform);
    this.logger.info(`Disconnected from ${platform}`);
  }

  async disconnectAll() {
    for (const platform of this.connections.keys()) {
      await this.disconnectPlatform(platform);
    }
  }
}