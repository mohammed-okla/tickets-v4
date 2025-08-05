// Risk Manager - Advanced risk management and position sizing
// Implements multiple risk management strategies to protect capital

import { Logger } from '../utils/logger.js';

export class RiskManager {
  constructor() {
    this.logger = new Logger();
    this.riskMetrics = new Map();
    this.portfolioRisk = {
      totalExposure: 0,
      correlationMatrix: new Map(),
      volatilityAdjustment: 1.0,
      drawdownLimit: 0.1 // 10% maximum drawdown
    };
  }

  async validateConfig(config) {
    const validationErrors = [];

    // Validate risk settings
    if (!config.riskSettings) {
      validationErrors.push('Risk settings are required');
    } else {
      const { maxPositionSize, maxDailyLoss, maxTotalExposure, stopLossPercentage } = config.riskSettings;

      if (maxPositionSize <= 0 || maxPositionSize > 0.1) {
        validationErrors.push('Max position size must be between 0 and 10% of portfolio');
      }

      if (maxDailyLoss <= 0 || maxDailyLoss > 0.05) {
        validationErrors.push('Max daily loss must be between 0 and 5% of portfolio');
      }

      if (maxTotalExposure <= 0 || maxTotalExposure > 1.0) {
        validationErrors.push('Max total exposure must be between 0 and 100% of portfolio');
      }

      if (stopLossPercentage <= 0 || stopLossPercentage > 0.1) {
        validationErrors.push('Stop loss percentage must be between 0 and 10%');
      }
    }

    // Validate API settings
    if (!config.platforms || config.platforms.length === 0) {
      validationErrors.push('At least one trading platform must be configured');
    }

    // Validate trading settings
    if (!config.tradingSettings) {
      validationErrors.push('Trading settings are required');
    }

    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }

    this.logger.info('Configuration validated successfully');
    return true;
  }

  async evaluateOpportunity(analysis, symbol) {
    try {
      const riskAssessment = {
        approved: false,
        recommendedSize: 0,
        reason: '',
        riskLevel: 'UNKNOWN',
        approvedPlatforms: [],
        conditions: []
      };

      // Check if trading is enabled for this symbol
      if (!await this.isSymbolAllowed(symbol)) {
        riskAssessment.reason = 'Symbol not in allowed trading list';
        return riskAssessment;
      }

      // Check market conditions
      const marketRisk = await this.assessMarketConditions();
      if (marketRisk.level === 'EXTREME') {
        riskAssessment.reason = 'Extreme market conditions detected';
        return riskAssessment;
      }

      // Check portfolio exposure
      const exposureCheck = await this.checkPortfolioExposure(symbol);
      if (!exposureCheck.allowed) {
        riskAssessment.reason = exposureCheck.reason;
        return riskAssessment;
      }

      // Check signal quality
      const signalQuality = this.assessSignalQuality(analysis);
      if (signalQuality.score < 0.6) {
        riskAssessment.reason = 'Signal quality too low for trading';
        return riskAssessment;
      }

      // Calculate position size
      const positionSize = await this.calculatePositionSize(analysis, symbol);
      if (positionSize <= 0) {
        riskAssessment.reason = 'Calculated position size too small to trade';
        return riskAssessment;
      }

      // Check correlation with existing positions
      const correlationRisk = await this.checkCorrelationRisk(symbol);
      if (correlationRisk.level === 'HIGH') {
        riskAssessment.reason = 'High correlation with existing positions';
        return riskAssessment;
      }

      // Determine approved platforms
      const platformRisk = await this.assessPlatformRisk(symbol);
      riskAssessment.approvedPlatforms = platformRisk.approvedPlatforms;

      if (riskAssessment.approvedPlatforms.length === 0) {
        riskAssessment.reason = 'No approved platforms for this trade';
        return riskAssessment;
      }

      // All checks passed
      riskAssessment.approved = true;
      riskAssessment.recommendedSize = positionSize;
      riskAssessment.riskLevel = this.calculateRiskLevel(analysis, exposureCheck, correlationRisk);
      riskAssessment.conditions = this.getTradeConditions(analysis, riskAssessment.riskLevel);

      this.logger.info(`Trade approved for ${symbol}:`, {
        size: positionSize,
        riskLevel: riskAssessment.riskLevel,
        platforms: riskAssessment.approvedPlatforms.length
      });

      return riskAssessment;

    } catch (error) {
      this.logger.error('Error evaluating trading opportunity:', error);
      return {
        approved: false,
        reason: 'Risk evaluation failed',
        recommendedSize: 0,
        riskLevel: 'UNKNOWN',
        approvedPlatforms: []
      };
    }
  }

  async assessMarketConditions() {
    try {
      // Check VIX levels, market volatility, economic calendar events
      const conditions = await this.getMarketConditions();
      
      const riskFactors = [];
      let riskLevel = 'LOW';

      // Volatility assessment
      if (conditions.volatility > 0.4) {
        riskFactors.push('High market volatility');
        riskLevel = 'HIGH';
      } else if (conditions.volatility > 0.25) {
        riskFactors.push('Elevated market volatility');
        riskLevel = 'MEDIUM';
      }

      // Economic events
      if (conditions.majorEvents && conditions.majorEvents.length > 0) {
        riskFactors.push('Major economic events scheduled');
        riskLevel = riskLevel === 'HIGH' ? 'EXTREME' : 'HIGH';
      }

      // Market hours
      if (!conditions.isMarketHours) {
        riskFactors.push('Trading outside market hours');
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      }

      // Liquidity conditions
      if (conditions.liquidityScore < 0.5) {
        riskFactors.push('Low market liquidity');
        riskLevel = riskLevel === 'HIGH' ? 'EXTREME' : 'HIGH';
      }

      return {
        level: riskLevel,
        factors: riskFactors,
        conditions
      };

    } catch (error) {
      this.logger.error('Error assessing market conditions:', error);
      return { level: 'HIGH', factors: ['Market assessment failed'], conditions: {} };
    }
  }

  async getMarketConditions() {
    // This would integrate with market data APIs to get real-time conditions
    // For now, return mock data
    return {
      volatility: 0.2,
      majorEvents: [],
      isMarketHours: this.isMarketHours(),
      liquidityScore: 0.8,
      trendStrength: 0.6
    };
  }

  isMarketHours() {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    
    // Crypto markets are 24/7
    const cryptoHours = true;
    
    // Stock markets (rough approximation for US markets)
    const stockHours = (day >= 1 && day <= 5) && (hour >= 14 && hour <= 21);
    
    return { crypto: cryptoHours, stocks: stockHours };
  }

  async checkPortfolioExposure(symbol) {
    try {
      const config = await this.getConfig();
      const currentExposure = await this.getCurrentExposure();
      
      const maxTotalExposure = config.riskSettings.maxTotalExposure;
      const maxSingleAssetExposure = config.riskSettings.maxPositionSize;

      // Check total portfolio exposure
      if (currentExposure.total >= maxTotalExposure) {
        return {
          allowed: false,
          reason: `Total portfolio exposure (${(currentExposure.total * 100).toFixed(1)}%) exceeds limit (${(maxTotalExposure * 100).toFixed(1)}%)`
        };
      }

      // Check single asset exposure
      const assetExposure = currentExposure.byAsset.get(symbol) || 0;
      if (assetExposure >= maxSingleAssetExposure) {
        return {
          allowed: false,
          reason: `Exposure to ${symbol} (${(assetExposure * 100).toFixed(1)}%) exceeds single asset limit (${(maxSingleAssetExposure * 100).toFixed(1)}%)`
        };
      }

      // Check sector exposure (for stocks)
      const sector = await this.getAssetSector(symbol);
      if (sector) {
        const sectorExposure = currentExposure.bySector.get(sector) || 0;
        const maxSectorExposure = config.riskSettings.maxSectorExposure || 0.3;
        
        if (sectorExposure >= maxSectorExposure) {
          return {
            allowed: false,
            reason: `Exposure to ${sector} sector (${(sectorExposure * 100).toFixed(1)}%) exceeds limit (${(maxSectorExposure * 100).toFixed(1)}%)`
          };
        }
      }

      return {
        allowed: true,
        currentExposure,
        availableCapacity: maxTotalExposure - currentExposure.total
      };

    } catch (error) {
      this.logger.error('Error checking portfolio exposure:', error);
      return {
        allowed: false,
        reason: 'Portfolio exposure check failed'
      };
    }
  }

  async getCurrentExposure() {
    // Get current portfolio data from storage
    const portfolioData = await chrome.storage.local.get('portfolioData');
    const portfolio = portfolioData.portfolioData || {};

    let totalValue = 0;
    const byAsset = new Map();
    const bySector = new Map();

    for (const [platform, data] of Object.entries(portfolio)) {
      if (data.positions) {
        for (const position of data.positions) {
          const value = position.quantity * position.currentPrice;
          totalValue += value;

          // Track by asset
          const currentAssetValue = byAsset.get(position.symbol) || 0;
          byAsset.set(position.symbol, currentAssetValue + value);

          // Track by sector
          const sector = await this.getAssetSector(position.symbol);
          if (sector) {
            const currentSectorValue = bySector.get(sector) || 0;
            bySector.set(sector, currentSectorValue + value);
          }
        }
      }
    }

    // Get total account value
    const totalAccountValue = await this.getTotalAccountValue(portfolio);

    return {
      total: totalAccountValue > 0 ? totalValue / totalAccountValue : 0,
      byAsset: new Map([...byAsset].map(([symbol, value]) => [symbol, value / totalAccountValue])),
      bySector: new Map([...bySector].map(([sector, value]) => [sector, value / totalAccountValue]))
    };
  }

  async getTotalAccountValue(portfolio) {
    let totalValue = 0;

    for (const [platform, data] of Object.entries(portfolio)) {
      if (data.balances) {
        for (const balance of data.balances) {
          if (balance.currency === 'USD' || balance.currency === 'USDT') {
            totalValue += balance.available + balance.locked;
          } else {
            // Convert to USD using current price
            const usdValue = await this.convertToUSD(balance.currency, balance.available + balance.locked);
            totalValue += usdValue;
          }
        }
      }
    }

    return Math.max(totalValue, 1000); // Minimum $1000 to avoid division by zero
  }

  async convertToUSD(currency, amount) {
    // This would use real-time price data
    // For now, return mock conversion
    const exchangeRates = {
      'BTC': 45000,
      'ETH': 3000,
      'BNB': 300,
      'EUR': 1.1,
      'GBP': 1.3
    };

    return amount * (exchangeRates[currency] || 1);
  }

  assessSignalQuality(analysis) {
    let score = 0;
    let factors = [];

    // Confidence score
    score += analysis.confidence * 0.4;
    factors.push(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

    // Technical analysis strength
    if (analysis.analysis.technical && analysis.analysis.technical.overall) {
      score += analysis.analysis.technical.overall.confidence * 0.3;
      factors.push(`Technical: ${(analysis.analysis.technical.overall.confidence * 100).toFixed(1)}%`);
    }

    // Sentiment analysis strength
    if (analysis.analysis.sentiment && analysis.analysis.sentiment.overall) {
      score += analysis.analysis.sentiment.overall.confidence * 0.2;
      factors.push(`Sentiment: ${(analysis.analysis.sentiment.overall.confidence * 100).toFixed(1)}%`);
    }

    // ML analysis strength
    if (analysis.analysis.machineLearning) {
      score += analysis.analysis.machineLearning.confidence * 0.1;
      factors.push(`ML: ${(analysis.analysis.machineLearning.confidence * 100).toFixed(1)}%`);
    }

    return {
      score: Math.min(score, 1.0),
      factors,
      recommendation: score >= 0.7 ? 'HIGH' : score >= 0.6 ? 'MEDIUM' : 'LOW'
    };
  }

  async calculatePositionSize(analysis, symbol) {
    try {
      const config = await this.getConfig();
      const portfolioValue = await this.getTotalPortfolioValue();
      
      // Base position size from config
      let baseSize = config.riskSettings.maxPositionSize;

      // Adjust based on confidence
      const confidenceAdjustment = analysis.confidence * 0.8 + 0.2; // Scale from 0.2 to 1.0
      baseSize *= confidenceAdjustment;

      // Adjust based on volatility
      const volatility = await this.getAssetVolatility(symbol);
      const volatilityAdjustment = Math.max(0.3, 1 - volatility); // Reduce size for high volatility
      baseSize *= volatilityAdjustment;

      // Adjust based on market conditions
      const marketConditions = await this.assessMarketConditions();
      const marketAdjustment = marketConditions.level === 'HIGH' ? 0.5 : 
                              marketConditions.level === 'MEDIUM' ? 0.7 : 1.0;
      baseSize *= marketAdjustment;

      // Kelly Criterion adjustment (if enabled)
      if (config.riskSettings.useKellyCriterion) {
        const kellySize = await this.calculateKellyPosition(analysis, symbol);
        baseSize = Math.min(baseSize, kellySize);
      }

      // Ensure minimum trade size
      const minTradeValue = config.riskSettings.minTradeValue || 10;
      const calculatedValue = baseSize * portfolioValue;
      
      if (calculatedValue < minTradeValue) {
        return 0; // Trade too small
      }

      // Maximum position size check
      const maxTradeValue = config.riskSettings.maxTradeValue || portfolioValue * 0.1;
      const finalSize = Math.min(baseSize, maxTradeValue / portfolioValue);

      this.logger.info(`Position size calculated for ${symbol}:`, {
        baseSize: (baseSize * 100).toFixed(2) + '%',
        adjustments: { confidence: confidenceAdjustment, volatility: volatilityAdjustment, market: marketAdjustment },
        finalSize: (finalSize * 100).toFixed(2) + '%',
        value: (finalSize * portfolioValue).toFixed(2)
      });

      return finalSize;

    } catch (error) {
      this.logger.error('Error calculating position size:', error);
      return 0;
    }
  }

  async calculateKellyPosition(analysis, symbol) {
    // Kelly Criterion: f = (bp - q) / b
    // where f = fraction of capital to bet
    //       b = odds (reward/risk ratio)
    //       p = probability of winning
    //       q = probability of losing (1-p)

    try {
      const winRate = await this.getHistoricalWinRate(symbol, analysis.signal);
      const avgWin = await this.getAverageWin(symbol, analysis.signal);
      const avgLoss = await this.getAverageLoss(symbol, analysis.signal);

      if (avgLoss <= 0) return 0;

      const b = avgWin / avgLoss; // Reward to risk ratio
      const p = winRate;
      const q = 1 - p;

      const kellyFraction = (b * p - q) / b;

      // Cap Kelly at reasonable limits to avoid excessive risk
      return Math.max(0, Math.min(kellyFraction, 0.05)); // Max 5% using Kelly

    } catch (error) {
      this.logger.error('Error calculating Kelly position:', error);
      return 0.02; // Default to 2% if Kelly calculation fails
    }
  }

  async checkCorrelationRisk(symbol) {
    try {
      const currentPositions = await this.getCurrentPositions();
      const correlations = [];

      for (const position of currentPositions) {
        const correlation = await this.getCorrelation(symbol, position.symbol);
        correlations.push({
          symbol: position.symbol,
          correlation,
          exposure: position.exposure
        });
      }

      // Calculate weighted correlation risk
      let totalCorrelatedExposure = 0;
      let maxCorrelation = 0;

      for (const corr of correlations) {
        if (Math.abs(corr.correlation) > 0.7) { // High correlation threshold
          totalCorrelatedExposure += corr.exposure;
          maxCorrelation = Math.max(maxCorrelation, Math.abs(corr.correlation));
        }
      }

      const riskLevel = totalCorrelatedExposure > 0.3 ? 'HIGH' : 
                       totalCorrelatedExposure > 0.15 ? 'MEDIUM' : 'LOW';

      return {
        level: riskLevel,
        totalCorrelatedExposure,
        maxCorrelation,
        correlatedPositions: correlations.filter(c => Math.abs(c.correlation) > 0.7)
      };

    } catch (error) {
      this.logger.error('Error checking correlation risk:', error);
      return { level: 'UNKNOWN', totalCorrelatedExposure: 0, correlatedPositions: [] };
    }
  }

  async assessPlatformRisk(symbol) {
    const config = await this.getConfig();
    const enabledPlatforms = config.platforms || [];
    const approvedPlatforms = [];

    for (const platform of enabledPlatforms) {
      // Check if platform supports the symbol
      if (!await this.platformSupportsSymbol(platform.name, symbol)) {
        continue;
      }

      // Check platform health
      const healthCheck = await this.checkPlatformHealth(platform.name);
      if (!healthCheck.healthy) {
        this.logger.warn(`Platform ${platform.name} failed health check:`, healthCheck.reason);
        continue;
      }

      // Check platform-specific risk factors
      const platformRisk = await this.assessIndividualPlatformRisk(platform.name, symbol);
      if (platformRisk.level !== 'HIGH') {
        approvedPlatforms.push(platform.name);
      }
    }

    return {
      approvedPlatforms,
      totalPlatforms: enabledPlatforms.length,
      riskFactors: []
    };
  }

  calculateRiskLevel(analysis, exposureCheck, correlationRisk) {
    const factors = [];

    // Signal confidence
    if (analysis.confidence < 0.7) factors.push('LOW_CONFIDENCE');

    // Portfolio exposure
    if (exposureCheck.currentExposure && exposureCheck.currentExposure.total > 0.8) {
      factors.push('HIGH_EXPOSURE');
    }

    // Correlation risk
    if (correlationRisk.level === 'HIGH') factors.push('HIGH_CORRELATION');

    // Market volatility
    if (analysis.analysis.machineLearning && analysis.analysis.machineLearning.volatility === 'HIGH') {
      factors.push('HIGH_VOLATILITY');
    }

    // Determine overall risk level
    if (factors.includes('HIGH_EXPOSURE') || factors.includes('HIGH_CORRELATION')) {
      return 'HIGH';
    } else if (factors.length >= 2) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  getTradeConditions(analysis, riskLevel) {
    const conditions = [];

    // Risk-based conditions
    if (riskLevel === 'HIGH') {
      conditions.push('Reduced position size due to high risk');
      conditions.push('Tighter stop loss required');
    }

    // Signal-based conditions
    if (analysis.confidence < 0.8) {
      conditions.push('Limit order recommended due to lower confidence');
    }

    // Market conditions
    if (analysis.analysis.machineLearning && analysis.analysis.machineLearning.volatility === 'HIGH') {
      conditions.push('Extra caution due to high volatility');
    }

    return conditions;
  }

  async evaluateManualTrade(trade) {
    // Similar to evaluateOpportunity but for manual trades
    // May have different risk tolerance
    const mockAnalysis = {
      confidence: 0.7,
      signal: trade.side,
      analysis: {
        technical: { overall: { confidence: 0.6 } },
        sentiment: { overall: { confidence: 0.5 } },
        machineLearning: { confidence: 0.5, volatility: 'MEDIUM' }
      }
    };

    return await this.evaluateOpportunity(mockAnalysis, trade.symbol);
  }

  async assessPortfolio(portfolioData) {
    // Comprehensive portfolio risk assessment
    try {
      const assessment = {
        riskLevel: 'LOW',
        recommendations: [],
        riskyPositions: [],
        metrics: {}
      };

      // Calculate portfolio metrics
      assessment.metrics = await this.calculatePortfolioMetrics(portfolioData);

      // Check various risk factors
      const checks = await Promise.all([
        this.checkDrawdown(portfolioData),
        this.checkConcentration(portfolioData),
        this.checkCorrelationMatrix(portfolioData),
        this.checkLeverageRisk(portfolioData)
      ]);

      // Combine results
      for (const check of checks) {
        if (check.riskLevel === 'HIGH') {
          assessment.riskLevel = 'HIGH';
        } else if (check.riskLevel === 'MEDIUM' && assessment.riskLevel !== 'HIGH') {
          assessment.riskLevel = 'MEDIUM';
        }

        assessment.recommendations.push(...check.recommendations);
        assessment.riskyPositions.push(...check.riskyPositions);
      }

      return assessment;

    } catch (error) {
      this.logger.error('Error assessing portfolio:', error);
      return {
        riskLevel: 'UNKNOWN',
        recommendations: ['Portfolio assessment failed'],
        riskyPositions: [],
        metrics: {}
      };
    }
  }

  // Helper methods (implementations would be more complex in production)
  async isSymbolAllowed(symbol) {
    const config = await this.getConfig();
    const whitelist = config.tradingSettings?.allowedSymbols;
    const blacklist = config.tradingSettings?.blockedSymbols;

    if (blacklist && blacklist.includes(symbol)) return false;
    if (whitelist && whitelist.length > 0) return whitelist.includes(symbol);
    return true;
  }

  async getConfig() {
    const result = await chrome.storage.local.get('tradingConfig');
    return result.tradingConfig || {};
  }

  async getTotalPortfolioValue() {
    const portfolioData = await chrome.storage.local.get('portfolioData');
    return await this.getTotalAccountValue(portfolioData.portfolioData || {});
  }

  async getAssetVolatility(symbol) {
    // Would calculate from historical data
    return 0.3; // Mock 30% volatility
  }

  async getAssetSector(symbol) {
    // Would look up asset sector from database
    const sectorMap = {
      'AAPL': 'Technology',
      'GOOGL': 'Technology',
      'MSFT': 'Technology',
      'BTC': 'Cryptocurrency',
      'ETH': 'Cryptocurrency'
    };
    return sectorMap[symbol] || null;
  }

  async getHistoricalWinRate(symbol, signal) {
    // Would calculate from historical trading data
    return 0.55; // Mock 55% win rate
  }

  async getAverageWin(symbol, signal) {
    // Would calculate from historical trading data
    return 0.03; // Mock 3% average win
  }

  async getAverageLoss(symbol, signal) {
    // Would calculate from historical trading data
    return 0.02; // Mock 2% average loss
  }

  async getCurrentPositions() {
    // Would get from portfolio data
    return [];
  }

  async getCorrelation(symbol1, symbol2) {
    // Would calculate from historical price data
    return Math.random() * 2 - 1; // Mock correlation between -1 and 1
  }

  async platformSupportsSymbol(platform, symbol) {
    // Would check platform's supported trading pairs
    return true;
  }

  async checkPlatformHealth(platform) {
    // Would check platform API status, latency, etc.
    return { healthy: true, reason: null };
  }

  async assessIndividualPlatformRisk(platform, symbol) {
    // Would assess platform-specific risks
    return { level: 'LOW', factors: [] };
  }

  async calculatePortfolioMetrics(portfolioData) {
    return {
      totalValue: 0,
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0
    };
  }

  async checkDrawdown(portfolioData) {
    return {
      riskLevel: 'LOW',
      recommendations: [],
      riskyPositions: []
    };
  }

  async checkConcentration(portfolioData) {
    return {
      riskLevel: 'LOW',
      recommendations: [],
      riskyPositions: []
    };
  }

  async checkCorrelationMatrix(portfolioData) {
    return {
      riskLevel: 'LOW',
      recommendations: [],
      riskyPositions: []
    };
  }

  async checkLeverageRisk(portfolioData) {
    return {
      riskLevel: 'LOW',
      recommendations: [],
      riskyPositions: []
    };
  }
}