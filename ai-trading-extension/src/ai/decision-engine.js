// AI Decision Engine - Advanced trading algorithms and market analysis
// Combines multiple indicators and machine learning for trading decisions

import { TechnicalAnalysis } from './technical-analysis.js';
import { SentimentAnalysis } from './sentiment-analysis.js';
import { MachineLearning } from './machine-learning.js';
import { Logger } from '../utils/logger.js';

export class AIDecisionEngine {
  constructor() {
    this.technicalAnalysis = new TechnicalAnalysis();
    this.sentimentAnalysis = new SentimentAnalysis();
    this.machineLearning = new MachineLearning();
    this.logger = new Logger();
    
    this.models = new Map();
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      await this.machineLearning.loadModels();
      this.isInitialized = true;
      this.logger.info('AI Decision Engine initialized');
    } catch (error) {
      this.logger.error('Failed to initialize AI Decision Engine:', error);
    }
  }

  async analyzeMarket(marketData, timeframe) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const analysis = {
        symbol: marketData.symbol,
        timeframe,
        timestamp: Date.now(),
        signal: 'HOLD',
        confidence: 0,
        orderType: 'MARKET',
        stopLoss: null,
        takeProfit: null,
        analysis: {}
      };

      // Perform technical analysis
      const technicalSignals = await this.performTechnicalAnalysis(marketData);
      analysis.analysis.technical = technicalSignals;

      // Perform sentiment analysis
      const sentimentSignals = await this.performSentimentAnalysis(marketData.symbol);
      analysis.analysis.sentiment = sentimentSignals;

      // Run ML predictions
      const mlPredictions = await this.performMLAnalysis(marketData, timeframe);
      analysis.analysis.machineLearning = mlPredictions;

      // Combine all signals to make final decision
      const finalDecision = this.combineSignals(technicalSignals, sentimentSignals, mlPredictions);
      
      analysis.signal = finalDecision.signal;
      analysis.confidence = finalDecision.confidence;
      analysis.orderType = finalDecision.orderType;
      analysis.stopLoss = finalDecision.stopLoss;
      analysis.takeProfit = finalDecision.takeProfit;
      analysis.reasoning = finalDecision.reasoning;

      this.logger.info(`Analysis complete for ${marketData.symbol}:`, {
        signal: analysis.signal,
        confidence: analysis.confidence
      });

      return analysis;
    } catch (error) {
      this.logger.error('Error in market analysis:', error);
      throw error;
    }
  }

  async performTechnicalAnalysis(marketData) {
    const { prices, volumes, indicators } = marketData;
    
    // Moving Averages
    const sma20 = this.technicalAnalysis.calculateSMA(prices, 20);
    const sma50 = this.technicalAnalysis.calculateSMA(prices, 50);
    const ema12 = this.technicalAnalysis.calculateEMA(prices, 12);
    const ema26 = this.technicalAnalysis.calculateEMA(prices, 26);

    // MACD
    const macd = this.technicalAnalysis.calculateMACD(prices);
    
    // RSI
    const rsi = this.technicalAnalysis.calculateRSI(prices, 14);
    
    // Bollinger Bands
    const bollingerBands = this.technicalAnalysis.calculateBollingerBands(prices, 20, 2);
    
    // Support and Resistance
    const supportResistance = this.technicalAnalysis.findSupportResistance(prices);
    
    // Volume analysis
    const volumeAnalysis = this.technicalAnalysis.analyzeVolume(prices, volumes);

    // Fibonacci retracements
    const fibonacci = this.technicalAnalysis.calculateFibonacci(prices);

    // Chart patterns
    const patterns = this.technicalAnalysis.detectPatterns(prices);

    // Generate signals from technical indicators
    const signals = this.generateTechnicalSignals({
      sma20, sma50, ema12, ema26, macd, rsi, 
      bollingerBands, supportResistance, volumeAnalysis,
      fibonacci, patterns, currentPrice: prices[prices.length - 1]
    });

    return {
      indicators: {
        sma20: sma20[sma20.length - 1],
        sma50: sma50[sma50.length - 1],
        ema12: ema12[ema12.length - 1],
        ema26: ema26[ema26.length - 1],
        macd: macd[macd.length - 1],
        rsi: rsi[rsi.length - 1],
        bollingerBands: bollingerBands[bollingerBands.length - 1],
        supportResistance,
        volumeAnalysis,
        fibonacci,
        patterns
      },
      signals,
      overall: this.evaluateTechnicalSignals(signals)
    };
  }

  generateTechnicalSignals(indicators) {
    const signals = {};
    const currentPrice = indicators.currentPrice;

    // Moving Average signals
    signals.maSignal = this.getMACrossoverSignal(indicators.sma20, indicators.sma50);
    signals.emaSignal = this.getEMACrossoverSignal(indicators.ema12, indicators.ema26);

    // MACD signals
    signals.macdSignal = this.getMACDSignal(indicators.macd);

    // RSI signals
    signals.rsiSignal = this.getRSISignal(indicators.rsi);

    // Bollinger Bands signals
    signals.bbSignal = this.getBollingerSignal(currentPrice, indicators.bollingerBands);

    // Support/Resistance signals
    signals.srSignal = this.getSupportResistanceSignal(currentPrice, indicators.supportResistance);

    // Volume signals
    signals.volumeSignal = this.getVolumeSignal(indicators.volumeAnalysis);

    // Pattern signals
    signals.patternSignal = this.getPatternSignal(indicators.patterns);

    return signals;
  }

  getMACrossoverSignal(sma20, sma50) {
    if (sma20 > sma50 * 1.01) return { signal: 'BUY', strength: 0.7 };
    if (sma20 < sma50 * 0.99) return { signal: 'SELL', strength: 0.7 };
    return { signal: 'HOLD', strength: 0.3 };
  }

  getEMACrossoverSignal(ema12, ema26) {
    if (ema12 > ema26 * 1.005) return { signal: 'BUY', strength: 0.8 };
    if (ema12 < ema26 * 0.995) return { signal: 'SELL', strength: 0.8 };
    return { signal: 'HOLD', strength: 0.4 };
  }

  getMACDSignal(macd) {
    const { macdLine, signalLine, histogram } = macd;
    
    if (macdLine > signalLine && histogram > 0) {
      return { signal: 'BUY', strength: 0.75 };
    }
    if (macdLine < signalLine && histogram < 0) {
      return { signal: 'SELL', strength: 0.75 };
    }
    return { signal: 'HOLD', strength: 0.4 };
  }

  getRSISignal(rsi) {
    if (rsi < 30) return { signal: 'BUY', strength: 0.8 }; // Oversold
    if (rsi > 70) return { signal: 'SELL', strength: 0.8 }; // Overbought
    if (rsi > 45 && rsi < 55) return { signal: 'HOLD', strength: 0.6 }; // Neutral zone
    return { signal: 'HOLD', strength: 0.4 };
  }

  getBollingerSignal(currentPrice, bb) {
    const { upper, middle, lower } = bb;
    
    if (currentPrice <= lower) return { signal: 'BUY', strength: 0.7 }; // Price at lower band
    if (currentPrice >= upper) return { signal: 'SELL', strength: 0.7 }; // Price at upper band
    if (currentPrice > middle) return { signal: 'WEAK_BUY', strength: 0.4 };
    if (currentPrice < middle) return { signal: 'WEAK_SELL', strength: 0.4 };
    return { signal: 'HOLD', strength: 0.3 };
  }

  getSupportResistanceSignal(currentPrice, sr) {
    const { support, resistance } = sr;
    
    // Price breaking above resistance
    if (currentPrice > resistance * 1.002) {
      return { signal: 'BUY', strength: 0.8 };
    }
    // Price breaking below support
    if (currentPrice < support * 0.998) {
      return { signal: 'SELL', strength: 0.8 };
    }
    // Price near support (potential bounce)
    if (currentPrice <= support * 1.01 && currentPrice >= support * 0.99) {
      return { signal: 'BUY', strength: 0.6 };
    }
    // Price near resistance (potential reversal)
    if (currentPrice >= resistance * 0.99 && currentPrice <= resistance * 1.01) {
      return { signal: 'SELL', strength: 0.6 };
    }
    
    return { signal: 'HOLD', strength: 0.3 };
  }

  getVolumeSignal(volumeAnalysis) {
    const { trend, strength, unusualActivity } = volumeAnalysis;
    
    if (unusualActivity && trend === 'INCREASING') {
      return { signal: 'STRONG_SIGNAL', strength: 0.9 };
    }
    if (strength === 'HIGH' && trend === 'INCREASING') {
      return { signal: 'CONFIRMATION', strength: 0.7 };
    }
    if (strength === 'LOW') {
      return { signal: 'WEAK_SIGNAL', strength: 0.3 };
    }
    
    return { signal: 'NEUTRAL', strength: 0.5 };
  }

  getPatternSignal(patterns) {
    if (patterns.length === 0) {
      return { signal: 'NONE', strength: 0 };
    }
    
    const bullishPatterns = ['DOUBLE_BOTTOM', 'HEAD_AND_SHOULDERS_INVERSE', 'ASCENDING_TRIANGLE'];
    const bearishPatterns = ['DOUBLE_TOP', 'HEAD_AND_SHOULDERS', 'DESCENDING_TRIANGLE'];
    
    for (const pattern of patterns) {
      if (bullishPatterns.includes(pattern.type)) {
        return { signal: 'BUY', strength: 0.8, pattern: pattern.type };
      }
      if (bearishPatterns.includes(pattern.type)) {
        return { signal: 'SELL', strength: 0.8, pattern: pattern.type };
      }
    }
    
    return { signal: 'HOLD', strength: 0.4 };
  }

  evaluateTechnicalSignals(signals) {
    const buySignals = [];
    const sellSignals = [];
    const holdSignals = [];

    for (const [key, signal] of Object.entries(signals)) {
      if (signal.signal.includes('BUY')) {
        buySignals.push(signal.strength);
      } else if (signal.signal.includes('SELL')) {
        sellSignals.push(signal.strength);
      } else {
        holdSignals.push(signal.strength);
      }
    }

    const buyScore = buySignals.reduce((sum, strength) => sum + strength, 0);
    const sellScore = sellSignals.reduce((sum, strength) => sum + strength, 0);
    const holdScore = holdSignals.reduce((sum, strength) => sum + strength, 0);

    const totalScore = buyScore + sellScore + holdScore;
    
    if (buyScore > sellScore && buyScore > holdScore) {
      return {
        signal: 'BUY',
        confidence: buyScore / totalScore,
        scores: { buy: buyScore, sell: sellScore, hold: holdScore }
      };
    } else if (sellScore > buyScore && sellScore > holdScore) {
      return {
        signal: 'SELL',
        confidence: sellScore / totalScore,
        scores: { buy: buyScore, sell: sellScore, hold: holdScore }
      };
    } else {
      return {
        signal: 'HOLD',
        confidence: holdScore / totalScore,
        scores: { buy: buyScore, sell: sellScore, hold: holdScore }
      };
    }
  }

  async performSentimentAnalysis(symbol) {
    try {
      const socialSentiment = await this.sentimentAnalysis.analyzeSocialMedia(symbol);
      const newsSentiment = await this.sentimentAnalysis.analyzeNews(symbol);
      const marketSentiment = await this.sentimentAnalysis.analyzeMarketSentiment(symbol);

      return {
        social: socialSentiment,
        news: newsSentiment,
        market: marketSentiment,
        overall: this.combineSentimentScores(socialSentiment, newsSentiment, marketSentiment)
      };
    } catch (error) {
      this.logger.error('Error in sentiment analysis:', error);
      return {
        social: { score: 0, confidence: 0 },
        news: { score: 0, confidence: 0 },
        market: { score: 0, confidence: 0 },
        overall: { score: 0, confidence: 0 }
      };
    }
  }

  combineSentimentScores(social, news, market) {
    const weights = { social: 0.3, news: 0.4, market: 0.3 };
    
    const weightedScore = (social.score * weights.social) + 
                         (news.score * weights.news) + 
                         (market.score * weights.market);
    
    const avgConfidence = (social.confidence + news.confidence + market.confidence) / 3;
    
    return {
      score: weightedScore,
      confidence: avgConfidence,
      signal: this.sentimentToSignal(weightedScore, avgConfidence)
    };
  }

  sentimentToSignal(score, confidence) {
    if (confidence < 0.5) return { signal: 'HOLD', strength: 0.2 };
    
    if (score > 0.6) return { signal: 'BUY', strength: confidence * 0.7 };
    if (score < -0.6) return { signal: 'SELL', strength: confidence * 0.7 };
    return { signal: 'HOLD', strength: confidence * 0.4 };
  }

  async performMLAnalysis(marketData, timeframe) {
    try {
      const features = this.extractFeatures(marketData, timeframe);
      const predictions = await this.machineLearning.predict(features, marketData.symbol);
      
      return {
        priceDirection: predictions.priceDirection,
        volatility: predictions.volatility,
        confidence: predictions.confidence,
        timeHorizon: predictions.timeHorizon,
        signal: this.mlToSignal(predictions)
      };
    } catch (error) {
      this.logger.error('Error in ML analysis:', error);
      return {
        priceDirection: 'NEUTRAL',
        volatility: 'MEDIUM',
        confidence: 0,
        signal: { signal: 'HOLD', strength: 0 }
      };
    }
  }

  extractFeatures(marketData, timeframe) {
    // Extract features for ML model
    const { prices, volumes, indicators } = marketData;
    
    return {
      priceChanges: this.calculateReturns(prices),
      volumeProfile: this.analyzeVolumeProfile(volumes),
      volatility: this.calculateVolatility(prices),
      momentum: this.calculateMomentum(prices),
      timeframe,
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };
  }

  calculateReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  analyzeVolumeProfile(volumes) {
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
    
    return {
      avgVolume,
      recentVolume,
      volumeRatio: recentVolume / avgVolume
    };
  }

  calculateVolatility(prices) {
    const returns = this.calculateReturns(prices);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  calculateMomentum(prices) {
    const shortTerm = prices.slice(-5);
    const longTerm = prices.slice(-20);
    
    const shortAvg = shortTerm.reduce((sum, price) => sum + price, 0) / shortTerm.length;
    const longAvg = longTerm.reduce((sum, price) => sum + price, 0) / longTerm.length;
    
    return (shortAvg - longAvg) / longAvg;
  }

  mlToSignal(predictions) {
    const { priceDirection, confidence } = predictions;
    
    if (confidence < 0.6) {
      return { signal: 'HOLD', strength: 0.3 };
    }
    
    if (priceDirection === 'UP') {
      return { signal: 'BUY', strength: confidence * 0.8 };
    } else if (priceDirection === 'DOWN') {
      return { signal: 'SELL', strength: confidence * 0.8 };
    } else {
      return { signal: 'HOLD', strength: confidence * 0.5 };
    }
  }

  combineSignals(technical, sentiment, ml) {
    const signals = [
      { ...technical.overall, weight: 0.5 },
      { ...sentiment.overall.signal, weight: 0.3 },
      { ...ml.signal, weight: 0.2 }
    ];

    const buyScore = signals
      .filter(s => s.signal === 'BUY')
      .reduce((sum, s) => sum + (s.strength * s.weight), 0);

    const sellScore = signals
      .filter(s => s.signal === 'SELL')
      .reduce((sum, s) => sum + (s.strength * s.weight), 0);

    const holdScore = signals
      .filter(s => s.signal === 'HOLD')
      .reduce((sum, s) => sum + (s.strength * s.weight), 0);

    // Add neutral weight for missing signals
    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const neutralWeight = 1 - totalWeight;
    const adjustedHoldScore = holdScore + (neutralWeight * 0.5);

    let finalSignal = 'HOLD';
    let confidence = 0.5;
    let orderType = 'MARKET';
    let stopLoss = null;
    let takeProfit = null;

    if (buyScore > sellScore && buyScore > adjustedHoldScore && buyScore > 0.6) {
      finalSignal = 'BUY';
      confidence = Math.min(buyScore, 0.95);
      orderType = confidence > 0.8 ? 'MARKET' : 'LIMIT';
    } else if (sellScore > buyScore && sellScore > adjustedHoldScore && sellScore > 0.6) {
      finalSignal = 'SELL';
      confidence = Math.min(sellScore, 0.95);
      orderType = confidence > 0.8 ? 'MARKET' : 'LIMIT';
    } else {
      confidence = Math.max(adjustedHoldScore, 0.3);
    }

    // Calculate stop loss and take profit based on volatility and confidence
    if (finalSignal !== 'HOLD' && ml.volatility) {
      const volatilityMultiplier = ml.volatility === 'HIGH' ? 1.5 : ml.volatility === 'LOW' ? 0.7 : 1.0;
      stopLoss = confidence > 0.8 ? 0.02 * volatilityMultiplier : 0.015 * volatilityMultiplier;
      takeProfit = confidence > 0.8 ? 0.04 * volatilityMultiplier : 0.03 * volatilityMultiplier;
    }

    return {
      signal: finalSignal,
      confidence,
      orderType,
      stopLoss,
      takeProfit,
      reasoning: {
        technicalScore: technical.overall.confidence,
        sentimentScore: sentiment.overall.confidence,
        mlScore: ml.confidence,
        finalScores: { buy: buyScore, sell: sellScore, hold: adjustedHoldScore }
      }
    };
  }
}