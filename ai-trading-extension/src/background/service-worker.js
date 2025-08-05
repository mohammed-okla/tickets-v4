// AI Trading Extension - Background Service Worker
// This handles the core trading logic, API management, and coordination

import { TradingEngine } from '../trading/trading-engine.js';
import { AIDecisionEngine } from '../ai/decision-engine.js';
import { RiskManager } from '../trading/risk-manager.js';
import { ConfigManager } from '../utils/config-manager.js';
import { Logger } from '../utils/logger.js';

class AITradingService {
  constructor() {
    this.tradingEngine = new TradingEngine();
    this.aiEngine = new AIDecisionEngine();
    this.riskManager = new RiskManager();
    this.configManager = new ConfigManager();
    this.logger = new Logger();
    
    this.isActive = false;
    this.tradingIntervals = new Map();
    this.activePositions = new Map();
    this.platformConnections = new Map();
    
    this.init();
  }

  async init() {
    try {
      // Load configuration
      await this.configManager.loadConfig();
      
      // Initialize trading platforms
      await this.initializePlatforms();
      
      // Set up alarm listeners for periodic trading checks
      this.setupAlarms();
      
      // Set up message listeners
      this.setupMessageListeners();
      
      this.logger.info('AI Trading Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI Trading Service:', error);
    }
  }

  async initializePlatforms() {
    const enabledPlatforms = await this.configManager.getEnabledPlatforms();
    
    for (const platform of enabledPlatforms) {
      try {
        const connection = await this.tradingEngine.connectToPlatform(platform);
        this.platformConnections.set(platform.name, connection);
        this.logger.info(`Connected to ${platform.name}`);
      } catch (error) {
        this.logger.error(`Failed to connect to ${platform.name}:`, error);
      }
    }
  }

  setupAlarms() {
    // Create recurring alarms for different trading intervals
    chrome.alarms.create('trading-check-1m', { periodInMinutes: 1 });
    chrome.alarms.create('trading-check-5m', { periodInMinutes: 5 });
    chrome.alarms.create('trading-check-15m', { periodInMinutes: 15 });
    chrome.alarms.create('portfolio-sync', { periodInMinutes: 10 });
    chrome.alarms.create('risk-assessment', { periodInMinutes: 30 });
  }

  setupMessageListeners() {
    // Listen for messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });

    // Listen for alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Listen for tab updates to inject trading interfaces
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.checkForTradingPlatform(tab);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_TRADING':
          await this.startTrading(message.config);
          sendResponse({ success: true });
          break;

        case 'STOP_TRADING':
          await this.stopTrading();
          sendResponse({ success: true });
          break;

        case 'GET_STATUS':
          const status = await this.getTradingStatus();
          sendResponse({ success: true, data: status });
          break;

        case 'UPDATE_CONFIG':
          await this.configManager.updateConfig(message.config);
          sendResponse({ success: true });
          break;

        case 'GET_POSITIONS':
          const positions = await this.getActivePositions();
          sendResponse({ success: true, data: positions });
          break;

        case 'EXECUTE_MANUAL_TRADE':
          const result = await this.executeManualTrade(message.trade);
          sendResponse({ success: true, data: result });
          break;

        case 'GET_MARKET_DATA':
          const marketData = await this.getMarketData(message.symbols);
          sendResponse({ success: true, data: marketData });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAlarm(alarm) {
    if (!this.isActive) return;

    try {
      switch (alarm.name) {
        case 'trading-check-1m':
          await this.performTradingAnalysis('1m');
          break;
        case 'trading-check-5m':
          await this.performTradingAnalysis('5m');
          break;
        case 'trading-check-15m':
          await this.performTradingAnalysis('15m');
          break;
        case 'portfolio-sync':
          await this.syncPortfolioData();
          break;
        case 'risk-assessment':
          await this.performRiskAssessment();
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling alarm ${alarm.name}:`, error);
    }
  }

  async startTrading(config) {
    if (this.isActive) {
      throw new Error('Trading is already active');
    }

    // Validate configuration
    await this.riskManager.validateConfig(config);

    // Start trading systems
    this.isActive = true;
    await this.configManager.updateConfig(config);
    
    this.logger.info('AI Trading started with config:', config);
    
    // Notify all connected tabs
    this.broadcastMessage({
      type: 'TRADING_STATUS_CHANGED',
      isActive: true
    });
  }

  async stopTrading() {
    this.isActive = false;
    
    // Close all open positions if configured to do so
    const config = await this.configManager.getConfig();
    if (config.closePositionsOnStop) {
      await this.closeAllPositions();
    }
    
    this.logger.info('AI Trading stopped');
    
    // Notify all connected tabs
    this.broadcastMessage({
      type: 'TRADING_STATUS_CHANGED',
      isActive: false
    });
  }

  async performTradingAnalysis(timeframe) {
    const config = await this.configManager.getConfig();
    const watchlist = config.watchlist || [];

    for (const symbol of watchlist) {
      try {
        // Get market data for analysis
        const marketData = await this.tradingEngine.getMarketData(symbol, timeframe);
        
        // Run AI analysis
        const analysis = await this.aiEngine.analyzeMarket(marketData, timeframe);
        
        // Check risk parameters
        const riskCheck = await this.riskManager.evaluateOpportunity(analysis, symbol);
        
        if (riskCheck.approved && analysis.signal !== 'HOLD') {
          // Execute trade
          await this.executeTrade(analysis, symbol, riskCheck);
        }
        
      } catch (error) {
        this.logger.error(`Error analyzing ${symbol}:`, error);
      }
    }
  }

  async executeTrade(analysis, symbol, riskCheck) {
    const tradeParams = {
      symbol,
      side: analysis.signal, // BUY or SELL
      quantity: riskCheck.recommendedSize,
      orderType: analysis.orderType || 'MARKET',
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
      platforms: riskCheck.approvedPlatforms
    };

    const results = await this.tradingEngine.executeTrade(tradeParams);
    
    // Track the position
    for (const result of results) {
      if (result.success) {
        this.activePositions.set(result.orderId, {
          ...tradeParams,
          orderId: result.orderId,
          platform: result.platform,
          timestamp: Date.now(),
          status: 'OPEN'
        });
      }
    }

    this.logger.info('Trade executed:', { symbol, results });
  }

  async syncPortfolioData() {
    const portfolioData = new Map();
    
    for (const [platformName, connection] of this.platformConnections) {
      try {
        const balances = await connection.getAccountBalance();
        const positions = await connection.getOpenPositions();
        
        portfolioData.set(platformName, {
          balances,
          positions,
          lastSync: Date.now()
        });
        
      } catch (error) {
        this.logger.error(`Failed to sync portfolio from ${platformName}:`, error);
      }
    }

    // Store portfolio data
    await chrome.storage.local.set({ portfolioData: Object.fromEntries(portfolioData) });
  }

  async performRiskAssessment() {
    const portfolioData = await chrome.storage.local.get('portfolioData');
    const assessment = await this.riskManager.assessPortfolio(portfolioData.portfolioData || {});
    
    if (assessment.riskLevel === 'HIGH') {
      this.logger.warn('High risk detected, reducing trading activity');
      // Implement risk mitigation strategies
      await this.mitigateRisk(assessment);
    }
  }

  async checkForTradingPlatform(tab) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Check if this is a supported trading platform
    const supportedPlatforms = [
      'binance.com', 'coinbase.com', 'kucoin.com', 'kraken.com',
      'bybit.com', 'gate.io', 'mexc.com', 'okx.com', 'htx.com',
      'crypto.com', 'bitfinex.com', 'bitget.com', 'bingx.com',
      'alpaca.markets', 'interactivebrokers.com', 'schwab.com',
      'td-ameritrade.com', 'robinhood.com'
    ];

    if (supportedPlatforms.some(platform => domain.includes(platform))) {
      // Inject trading interface
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/trading-interface.js']
        });
      } catch (error) {
        this.logger.error('Failed to inject trading interface:', error);
      }
    }
  }

  broadcastMessage(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors for tabs that can't receive messages
        });
      });
    });
  }

  async getTradingStatus() {
    return {
      isActive: this.isActive,
      connectedPlatforms: Array.from(this.platformConnections.keys()),
      activePositions: this.activePositions.size,
      lastUpdate: Date.now()
    };
  }

  async getActivePositions() {
    return Array.from(this.activePositions.values());
  }

  async executeManualTrade(trade) {
    const riskCheck = await this.riskManager.evaluateManualTrade(trade);
    if (!riskCheck.approved) {
      throw new Error(riskCheck.reason);
    }
    
    return await this.tradingEngine.executeTrade(trade);
  }

  async getMarketData(symbols) {
    const data = {};
    for (const symbol of symbols) {
      try {
        data[symbol] = await this.tradingEngine.getMarketData(symbol);
      } catch (error) {
        this.logger.error(`Failed to get market data for ${symbol}:`, error);
        data[symbol] = { error: error.message };
      }
    }
    return data;
  }

  async closeAllPositions() {
    for (const [orderId, position] of this.activePositions) {
      try {
        await this.tradingEngine.closePosition(position);
        this.activePositions.delete(orderId);
      } catch (error) {
        this.logger.error(`Failed to close position ${orderId}:`, error);
      }
    }
  }

  async mitigateRisk(assessment) {
    // Implement risk mitigation strategies
    if (assessment.recommendations.includes('REDUCE_POSITION_SIZE')) {
      // Reduce position sizes for new trades
      const config = await this.configManager.getConfig();
      config.riskSettings.maxPositionSize *= 0.5;
      await this.configManager.updateConfig(config);
    }
    
    if (assessment.recommendations.includes('CLOSE_RISKY_POSITIONS')) {
      // Close positions that exceed risk thresholds
      for (const [orderId, position] of this.activePositions) {
        if (assessment.riskyPositions.includes(orderId)) {
          await this.tradingEngine.closePosition(position);
          this.activePositions.delete(orderId);
        }
      }
    }
  }
}

// Initialize the AI Trading Service
const aiTradingService = new AITradingService();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('AI Trading Extension started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Trading Extension installed');
});