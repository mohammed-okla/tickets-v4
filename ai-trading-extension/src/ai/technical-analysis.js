// Technical Analysis Module
// Implements various technical indicators and chart pattern recognition

export class TechnicalAnalysis {
  constructor() {
    this.cache = new Map();
  }

  // Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return [];
    
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  // Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length === 0) return [];
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  // Moving Average Convergence Divergence (MACD)
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    if (fastEMA.length === 0 || slowEMA.length === 0) return [];
    
    const macdLine = [];
    const startIndex = Math.max(0, slowPeriod - 1);
    
    for (let i = startIndex; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = [];
    
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }
    
    return macdLine.map((macd, i) => ({
      macdLine: macd,
      signalLine: signalLine[i] || 0,
      histogram: histogram[i] || 0
    }));
  }

  // Relative Strength Index (RSI)
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return [];
    
    const gains = [];
    const losses = [];
    
    // Calculate initial gains and losses
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    
    // Calculate first RSI using SMA
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
    
    // Calculate subsequent RSI values using EMA-like smoothing
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  // Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
    const sma = this.calculateSMA(prices, period);
    if (sma.length === 0) return [];
    
    const bands = [];
    
    for (let i = 0; i < sma.length; i++) {
      const dataIndex = i + period - 1;
      const subset = prices.slice(dataIndex - period + 1, dataIndex + 1);
      
      // Calculate standard deviation
      const mean = sma[i];
      const variance = subset.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      bands.push({
        middle: mean,
        upper: mean + (stdDev * stdDevMultiplier),
        lower: mean - (stdDev * stdDevMultiplier),
        bandwidth: (stdDev * stdDevMultiplier * 2) / mean,
        %b: (prices[dataIndex] - (mean - stdDev * stdDevMultiplier)) / (stdDev * stdDevMultiplier * 2)
      });
    }
    
    return bands;
  }

  // Stochastic Oscillator
  calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    if (highs.length < kPeriod) return [];
    
    const %k = [];
    
    for (let i = kPeriod - 1; i < highs.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const currentClose = closes[i];
      
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      %k.push(k);
    }
    
    const %d = this.calculateSMA(%k, dPeriod);
    
    return %k.map((k, i) => ({
      %k: k,
      %d: %d[i] || 0
    }));
  }

  // Average True Range (ATR)
  calculateATR(highs, lows, closes, period = 14) {
    if (highs.length < 2) return [];
    
    const trueRanges = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return this.calculateEMA(trueRanges, period);
  }

  // Williams %R
  calculateWilliamsR(highs, lows, closes, period = 14) {
    if (highs.length < period) return [];
    
    const williamsR = [];
    
    for (let i = period - 1; i < highs.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentClose = closes[i];
      
      const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      williamsR.push(wr);
    }
    
    return williamsR;
  }

  // Commodity Channel Index (CCI)
  calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period) return [];
    
    const typicalPrices = highs.map((high, i) => (high + lows[i] + closes[i]) / 3);
    const smaTP = this.calculateSMA(typicalPrices, period);
    
    const cci = [];
    
    for (let i = 0; i < smaTP.length; i++) {
      const dataIndex = i + period - 1;
      const subset = typicalPrices.slice(dataIndex - period + 1, dataIndex + 1);
      
      // Calculate mean deviation
      const meanDev = subset.reduce((sum, tp) => sum + Math.abs(tp - smaTP[i]), 0) / period;
      
      const cciValue = (typicalPrices[dataIndex] - smaTP[i]) / (0.015 * meanDev);
      cci.push(cciValue);
    }
    
    return cci;
  }

  // Support and Resistance Levels
  findSupportResistance(prices, window = 20, threshold = 0.02) {
    if (prices.length < window * 2) {
      return { support: Math.min(...prices), resistance: Math.max(...prices) };
    }
    
    const localMaxima = [];
    const localMinima = [];
    
    // Find local maxima and minima
    for (let i = window; i < prices.length - window; i++) {
      const subset = prices.slice(i - window, i + window + 1);
      const max = Math.max(...subset);
      const min = Math.min(...subset);
      
      if (prices[i] === max) {
        localMaxima.push({ price: prices[i], index: i });
      }
      if (prices[i] === min) {
        localMinima.push({ price: prices[i], index: i });
      }
    }
    
    // Cluster similar levels
    const resistanceLevels = this.clusterLevels(localMaxima, threshold);
    const supportLevels = this.clusterLevels(localMinima, threshold);
    
    return {
      support: supportLevels.length > 0 ? supportLevels[0].price : Math.min(...prices),
      resistance: resistanceLevels.length > 0 ? resistanceLevels[0].price : Math.max(...prices),
      supportLevels,
      resistanceLevels
    };
  }

  clusterLevels(levels, threshold) {
    if (levels.length === 0) return [];
    
    const clusters = [];
    const sorted = levels.sort((a, b) => a.price - b.price);
    
    let currentCluster = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const priceDiff = Math.abs(sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price;
      
      if (priceDiff <= threshold) {
        currentCluster.push(sorted[i]);
      } else {
        clusters.push({
          price: currentCluster.reduce((sum, level) => sum + level.price, 0) / currentCluster.length,
          strength: currentCluster.length,
          levels: currentCluster
        });
        currentCluster = [sorted[i]];
      }
    }
    
    // Add the last cluster
    clusters.push({
      price: currentCluster.reduce((sum, level) => sum + level.price, 0) / currentCluster.length,
      strength: currentCluster.length,
      levels: currentCluster
    });
    
    return clusters.sort((a, b) => b.strength - a.strength);
  }

  // Volume Analysis
  analyzeVolume(prices, volumes) {
    if (volumes.length < 20) {
      return {
        trend: 'UNKNOWN',
        strength: 'LOW',
        unusualActivity: false,
        volumeProfile: {}
      };
    }
    
    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
    
    // Volume trend
    const volumeTrend = recentVolume > avgVolume * 1.2 ? 'INCREASING' : 
                       recentVolume < avgVolume * 0.8 ? 'DECREASING' : 'STABLE';
    
    // Volume strength
    const volumeStrength = recentVolume > avgVolume * 2 ? 'HIGH' : 
                          recentVolume > avgVolume * 1.5 ? 'MEDIUM' : 'LOW';
    
    // Unusual activity detection
    const unusualActivity = volumes[volumes.length - 1] > avgVolume * 3;
    
    // Volume-Price Analysis
    const vpt = this.calculateVPT(prices, volumes);
    
    return {
      trend: volumeTrend,
      strength: volumeStrength,
      unusualActivity,
      avgVolume,
      recentVolume,
      volumeRatio: recentVolume / avgVolume,
      vpt: vpt[vpt.length - 1] || 0,
      volumeProfile: this.calculateVolumeProfile(prices, volumes)
    };
  }

  // Volume Price Trend (VPT)
  calculateVPT(prices, volumes) {
    if (prices.length < 2) return [0];
    
    const vpt = [0];
    
    for (let i = 1; i < prices.length; i++) {
      const priceChange = (prices[i] - prices[i - 1]) / prices[i - 1];
      vpt[i] = vpt[i - 1] + (volumes[i] * priceChange);
    }
    
    return vpt;
  }

  // Volume Profile
  calculateVolumeProfile(prices, volumes, bins = 10) {
    if (prices.length !== volumes.length || prices.length === 0) return {};
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;
    
    const profile = {};
    
    for (let i = 0; i < bins; i++) {
      const binStart = minPrice + (i * binSize);
      const binEnd = binStart + binSize;
      const binKey = `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`;
      profile[binKey] = 0;
    }
    
    // Distribute volume across price bins
    for (let i = 0; i < prices.length; i++) {
      const binIndex = Math.min(Math.floor((prices[i] - minPrice) / binSize), bins - 1);
      const binStart = minPrice + (binIndex * binSize);
      const binEnd = binStart + binSize;
      const binKey = `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`;
      profile[binKey] += volumes[i];
    }
    
    return profile;
  }

  // Fibonacci Retracements
  calculateFibonacci(prices, lookback = 50) {
    if (prices.length < lookback) return {};
    
    const recentPrices = prices.slice(-lookback);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    const range = high - low;
    
    const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    return {
      high,
      low,
      range,
      retracements: fibLevels.map(level => ({
        level,
        price: high - (range * level),
        percentage: level * 100
      })),
      extensions: fibLevels.slice(1).map(level => ({
        level,
        price: high + (range * level),
        percentage: level * 100
      }))
    };
  }

  // Chart Pattern Detection
  detectPatterns(prices, window = 20) {
    if (prices.length < window * 3) return [];
    
    const patterns = [];
    
    // Double Top/Bottom
    const doublePatterns = this.detectDoubleTopBottom(prices, window);
    patterns.push(...doublePatterns);
    
    // Head and Shoulders
    const headShoulderPatterns = this.detectHeadAndShoulders(prices, window);
    patterns.push(...headShoulderPatterns);
    
    // Triangles
    const trianglePatterns = this.detectTriangles(prices, window);
    patterns.push(...trianglePatterns);
    
    return patterns;
  }

  detectDoubleTopBottom(prices, window) {
    const patterns = [];
    const peaks = this.findPeaks(prices, window);
    const troughs = this.findTroughs(prices, window);
    
    // Double Top
    for (let i = 0; i < peaks.length - 1; i++) {
      const peak1 = peaks[i];
      const peak2 = peaks[i + 1];
      
      if (Math.abs(peak1.price - peak2.price) / peak1.price < 0.02 && 
          peak2.index - peak1.index > window) {
        patterns.push({
          type: 'DOUBLE_TOP',
          startIndex: peak1.index,
          endIndex: peak2.index,
          price1: peak1.price,
          price2: peak2.price,
          confidence: this.calculatePatternConfidence('DOUBLE_TOP', peak1, peak2)
        });
      }
    }
    
    // Double Bottom
    for (let i = 0; i < troughs.length - 1; i++) {
      const trough1 = troughs[i];
      const trough2 = troughs[i + 1];
      
      if (Math.abs(trough1.price - trough2.price) / trough1.price < 0.02 && 
          trough2.index - trough1.index > window) {
        patterns.push({
          type: 'DOUBLE_BOTTOM',
          startIndex: trough1.index,
          endIndex: trough2.index,
          price1: trough1.price,
          price2: trough2.price,
          confidence: this.calculatePatternConfidence('DOUBLE_BOTTOM', trough1, trough2)
        });
      }
    }
    
    return patterns;
  }

  detectHeadAndShoulders(prices, window) {
    const patterns = [];
    const peaks = this.findPeaks(prices, window);
    
    if (peaks.length < 3) return patterns;
    
    for (let i = 0; i < peaks.length - 2; i++) {
      const leftShoulder = peaks[i];
      const head = peaks[i + 1];
      const rightShoulder = peaks[i + 2];
      
      // Check if middle peak is higher (head)
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Check if shoulders are approximately same height
        if (Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price < 0.05) {
          patterns.push({
            type: 'HEAD_AND_SHOULDERS',
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
            leftShoulder: leftShoulder.price,
            head: head.price,
            rightShoulder: rightShoulder.price,
            confidence: this.calculatePatternConfidence('HEAD_AND_SHOULDERS', leftShoulder, head, rightShoulder)
          });
        }
      }
    }
    
    return patterns;
  }

  detectTriangles(prices, window) {
    const patterns = [];
    
    if (prices.length < window * 2) return patterns;
    
    const recentPrices = prices.slice(-window * 2);
    const highs = [];
    const lows = [];
    
    // Find local highs and lows
    for (let i = 5; i < recentPrices.length - 5; i++) {
      const subset = recentPrices.slice(i - 5, i + 6);
      if (recentPrices[i] === Math.max(...subset)) {
        highs.push({ price: recentPrices[i], index: i });
      }
      if (recentPrices[i] === Math.min(...subset)) {
        lows.push({ price: recentPrices[i], index: i });
      }
    }
    
    if (highs.length >= 2 && lows.length >= 2) {
      // Ascending Triangle
      const highTrend = this.calculateTrend(highs.map(h => h.price));
      const lowTrend = this.calculateTrend(lows.map(l => l.price));
      
      if (Math.abs(highTrend) < 0.001 && lowTrend > 0.001) {
        patterns.push({
          type: 'ASCENDING_TRIANGLE',
          startIndex: Math.min(highs[0].index, lows[0].index),
          endIndex: Math.max(highs[highs.length - 1].index, lows[lows.length - 1].index),
          resistance: highs.reduce((sum, h) => sum + h.price, 0) / highs.length,
          confidence: 0.7
        });
      }
      
      // Descending Triangle
      if (Math.abs(lowTrend) < 0.001 && highTrend < -0.001) {
        patterns.push({
          type: 'DESCENDING_TRIANGLE',
          startIndex: Math.min(highs[0].index, lows[0].index),
          endIndex: Math.max(highs[highs.length - 1].index, lows[lows.length - 1].index),
          support: lows.reduce((sum, l) => sum + l.price, 0) / lows.length,
          confidence: 0.7
        });
      }
    }
    
    return patterns;
  }

  findPeaks(prices, window) {
    const peaks = [];
    
    for (let i = window; i < prices.length - window; i++) {
      const subset = prices.slice(i - window, i + window + 1);
      if (prices[i] === Math.max(...subset)) {
        peaks.push({ price: prices[i], index: i });
      }
    }
    
    return peaks;
  }

  findTroughs(prices, window) {
    const troughs = [];
    
    for (let i = window; i < prices.length - window; i++) {
      const subset = prices.slice(i - window, i + window + 1);
      if (prices[i] === Math.min(...subset)) {
        troughs.push({ price: prices[i], index: i });
      }
    }
    
    return troughs;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  calculatePatternConfidence(patternType, ...points) {
    // Simplified confidence calculation
    // In practice, this would consider volume, price action, and other factors
    let baseConfidence = 0.6;
    
    switch (patternType) {
      case 'DOUBLE_TOP':
      case 'DOUBLE_BOTTOM':
        // Higher confidence if prices are very close
        const priceDiff = Math.abs(points[0].price - points[1].price) / points[0].price;
        baseConfidence += (0.02 - priceDiff) * 10; // Reward similarity
        break;
        
      case 'HEAD_AND_SHOULDERS':
        // Higher confidence if shoulders are similar and head is clearly higher
        const shoulderDiff = Math.abs(points[0].price - points[2].price) / points[0].price;
        const headHeight = (points[1].price - Math.max(points[0].price, points[2].price)) / points[1].price;
        baseConfidence += (0.05 - shoulderDiff) * 5 + headHeight * 2;
        break;
    }
    
    return Math.max(0.3, Math.min(0.95, baseConfidence));
  }
}