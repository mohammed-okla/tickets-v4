// Machine Learning Module
// Implements ML models for price prediction and trading signals

export class MachineLearning {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
    this.trainingData = new Map();
    this.predictions = new Map();
  }

  async loadModels() {
    try {
      // In a real implementation, this would load pre-trained models
      // Using TensorFlow.js, ONNX.js, or similar libraries
      
      await this.initializePriceDirectionModel();
      await this.initializeVolatilityModel();
      await this.initializePatternRecognitionModel();
      await this.initializeRiskAssessmentModel();
      
      this.isInitialized = true;
      console.log('ML models loaded successfully');
    } catch (error) {
      console.error('Failed to load ML models:', error);
      throw error;
    }
  }

  async initializePriceDirectionModel() {
    // Mock model for price direction prediction
    // In reality, this would be a trained neural network or ensemble model
    this.models.set('priceDirection', {
      type: 'ensemble',
      features: [
        'sma_ratio', 'rsi', 'macd_signal', 'volume_ratio',
        'bollinger_position', 'momentum', 'volatility', 'sentiment'
      ],
      weights: {
        technical: 0.4,
        volume: 0.25,
        sentiment: 0.2,
        momentum: 0.15
      },
      predict: this.predictPriceDirection.bind(this)
    });
  }

  async initializeVolatilityModel() {
    // Mock model for volatility prediction
    this.models.set('volatility', {
      type: 'regression',
      features: [
        'historical_volatility', 'volume_changes', 'price_changes',
        'market_cap', 'trading_hours', 'day_of_week'
      ],
      predict: this.predictVolatility.bind(this)
    });
  }

  async initializePatternRecognitionModel() {
    // Mock model for chart pattern recognition
    this.models.set('patterns', {
      type: 'convolutional',
      features: ['price_sequence', 'volume_sequence', 'indicator_values'],
      predict: this.recognizePatterns.bind(this)
    });
  }

  async initializeRiskAssessmentModel() {
    // Mock model for risk assessment
    this.models.set('risk', {
      type: 'classification',
      features: [
        'volatility', 'correlation', 'volume', 'spread',
        'market_conditions', 'position_size'
      ],
      predict: this.assessRisk.bind(this)
    });
  }

  async predict(features, symbol) {
    if (!this.isInitialized) {
      throw new Error('ML models not initialized');
    }

    try {
      const [priceDirection, volatility, patterns, risk] = await Promise.all([
        this.models.get('priceDirection').predict(features, symbol),
        this.models.get('volatility').predict(features, symbol),
        this.models.get('patterns').predict(features, symbol),
        this.models.get('risk').predict(features, symbol)
      ]);

      const combinedPrediction = this.combinePredictions({
        priceDirection,
        volatility,
        patterns,
        risk
      });

      // Cache prediction
      this.predictions.set(symbol, {
        ...combinedPrediction,
        timestamp: Date.now()
      });

      return combinedPrediction;
    } catch (error) {
      console.error('ML prediction failed:', error);
      return this.getFallbackPrediction();
    }
  }

  async predictPriceDirection(features, symbol) {
    // Ensemble model combining multiple approaches
    const technicalScore = this.calculateTechnicalScore(features);
    const volumeScore = this.calculateVolumeScore(features);
    const sentimentScore = features.sentiment || 0;
    const momentumScore = this.calculateMomentumScore(features);

    const weights = this.models.get('priceDirection').weights;
    
    const compositeScore = 
      (technicalScore * weights.technical) +
      (volumeScore * weights.volume) +
      (sentimentScore * weights.sentiment) +
      (momentumScore * weights.momentum);

    // Apply sigmoid to get probability
    const probability = 1 / (1 + Math.exp(-compositeScore * 5));
    
    // Determine direction and confidence
    let direction = 'NEUTRAL';
    let confidence = Math.abs(probability - 0.5) * 2;

    if (probability > 0.6) {
      direction = 'UP';
    } else if (probability < 0.4) {
      direction = 'DOWN';
    }

    // Add some randomness to simulate real model uncertainty
    confidence *= (0.8 + Math.random() * 0.4);
    confidence = Math.min(0.95, Math.max(0.1, confidence));

    return {
      direction,
      probability,
      confidence,
      scores: {
        technical: technicalScore,
        volume: volumeScore,
        sentiment: sentimentScore,
        momentum: momentumScore,
        composite: compositeScore
      }
    };
  }

  async predictVolatility(features, symbol) {
    // Calculate historical volatility features
    const histVol = features.historical_volatility || 0.2;
    const volumeChanges = features.volume_changes || 0;
    const priceChanges = features.price_changes || 0;
    
    // Time-based factors
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Market hours volatility multiplier
    const marketHoursMultiplier = this.getMarketHoursMultiplier(hour, dayOfWeek);
    
    // Base volatility calculation
    let predictedVol = histVol * (1 + volumeChanges * 0.3 + Math.abs(priceChanges) * 0.2);
    predictedVol *= marketHoursMultiplier;
    
    // Add randomness
    predictedVol *= (0.9 + Math.random() * 0.2);
    
    // Classify volatility level
    let level = 'MEDIUM';
    if (predictedVol > 0.4) level = 'HIGH';
    else if (predictedVol < 0.15) level = 'LOW';
    
    return {
      predicted: predictedVol,
      level,
      confidence: 0.7 + Math.random() * 0.2,
      factors: {
        historical: histVol,
        volumeImpact: volumeChanges,
        priceImpact: priceChanges,
        timeMultiplier: marketHoursMultiplier
      }
    };
  }

  async recognizePatterns(features, symbol) {
    // Mock pattern recognition using price sequence analysis
    const priceSequence = features.priceSequence || [];
    
    if (priceSequence.length < 20) {
      return {
        patterns: [],
        confidence: 0.1
      };
    }

    const patterns = [];
    
    // Simple pattern detection algorithms
    if (this.detectTrendPattern(priceSequence)) {
      patterns.push({
        type: 'TRENDING',
        direction: this.getTrendDirection(priceSequence),
        strength: this.getTrendStrength(priceSequence),
        confidence: 0.6 + Math.random() * 0.3
      });
    }

    if (this.detectReversalPattern(priceSequence)) {
      patterns.push({
        type: 'REVERSAL',
        likelihood: 0.6 + Math.random() * 0.3,
        confidence: 0.5 + Math.random() * 0.4
      });
    }

    if (this.detectConsolidationPattern(priceSequence)) {
      patterns.push({
        type: 'CONSOLIDATION',
        range: this.getConsolidationRange(priceSequence),
        confidence: 0.7 + Math.random() * 0.2
      });
    }

    return {
      patterns,
      confidence: patterns.length > 0 ? 
        patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0.1
    };
  }

  async assessRisk(features, symbol) {
    const volatility = features.volatility || 0.2;
    const correlation = features.correlation || 0;
    const volume = features.volume || 1;
    const spread = features.spread || 0.001;
    
    // Risk factors calculation
    const volRisk = Math.min(volatility / 0.5, 1); // Normalize to 0-1
    const corrRisk = Math.abs(correlation); // High correlation = higher risk
    const liquidityRisk = Math.max(0, 1 - volume); // Low volume = higher risk
    const spreadRisk = Math.min(spread / 0.01, 1); // High spread = higher risk
    
    const compositeRisk = (volRisk * 0.4) + (corrRisk * 0.2) + 
                         (liquidityRisk * 0.2) + (spreadRisk * 0.2);
    
    let riskLevel = 'MEDIUM';
    if (compositeRisk > 0.7) riskLevel = 'HIGH';
    else if (compositeRisk < 0.3) riskLevel = 'LOW';
    
    return {
      level: riskLevel,
      score: compositeRisk,
      confidence: 0.6 + Math.random() * 0.3,
      factors: {
        volatility: volRisk,
        correlation: corrRisk,
        liquidity: liquidityRisk,
        spread: spreadRisk
      },
      recommendations: this.getRiskRecommendations(riskLevel, compositeRisk)
    };
  }

  combinePredictions(predictions) {
    const { priceDirection, volatility, patterns, risk } = predictions;
    
    // Adjust confidence based on risk
    let adjustedConfidence = priceDirection.confidence;
    if (risk.level === 'HIGH') {
      adjustedConfidence *= 0.7;
    } else if (risk.level === 'LOW') {
      adjustedConfidence *= 1.1;
    }
    
    // Factor in pattern recognition
    if (patterns.patterns.length > 0) {
      const patternBoost = patterns.confidence * 0.2;
      adjustedConfidence = Math.min(0.95, adjustedConfidence + patternBoost);
    }
    
    // Determine time horizon based on volatility
    let timeHorizon = 'SHORT'; // 1-4 hours
    if (volatility.level === 'LOW') {
      timeHorizon = 'MEDIUM'; // 4-12 hours
    } else if (volatility.level === 'HIGH') {
      timeHorizon = 'VERY_SHORT'; // 15-60 minutes
    }
    
    return {
      priceDirection: priceDirection.direction,
      probability: priceDirection.probability,
      confidence: Math.max(0.1, Math.min(0.95, adjustedConfidence)),
      volatility: volatility.level,
      riskLevel: risk.level,
      patterns: patterns.patterns,
      timeHorizon,
      recommendations: this.generateTradingRecommendations(
        priceDirection, volatility, risk, adjustedConfidence
      ),
      metadata: {
        modelScores: {
          technical: priceDirection.scores.technical,
          volume: priceDirection.scores.volume,
          sentiment: priceDirection.scores.sentiment,
          momentum: priceDirection.scores.momentum
        },
        riskFactors: risk.factors,
        volatilityFactors: volatility.factors
      }
    };
  }

  // Helper methods for feature calculation
  calculateTechnicalScore(features) {
    const smaRatio = features.sma_ratio || 1;
    const rsi = features.rsi || 50;
    const macdSignal = features.macd_signal || 0;
    const bbPosition = features.bollinger_position || 0.5;
    
    // Combine technical indicators
    let score = 0;
    
    // SMA trend score
    score += (smaRatio - 1) * 2; // Positive if price above SMA
    
    // RSI score (oversold/overbought)
    if (rsi < 30) score += 0.5; // Oversold
    else if (rsi > 70) score -= 0.5; // Overbought
    
    // MACD score
    score += macdSignal * 0.3;
    
    // Bollinger Bands position
    if (bbPosition < 0.2) score += 0.3; // Near lower band
    else if (bbPosition > 0.8) score -= 0.3; // Near upper band
    
    return Math.max(-1, Math.min(1, score));
  }

  calculateVolumeScore(features) {
    const volumeRatio = features.volume_ratio || 1;
    const volumeTrend = features.volume_trend || 'STABLE';
    
    let score = 0;
    
    // Volume ratio score
    if (volumeRatio > 1.5) score += 0.3; // High volume
    else if (volumeRatio < 0.5) score -= 0.2; // Low volume
    
    // Volume trend score
    if (volumeTrend === 'INCREASING') score += 0.2;
    else if (volumeTrend === 'DECREASING') score -= 0.1;
    
    return Math.max(-1, Math.min(1, score));
  }

  calculateMomentumScore(features) {
    const momentum = features.momentum || 0;
    const priceVelocity = features.price_velocity || 0;
    
    let score = momentum * 0.5 + priceVelocity * 0.5;
    return Math.max(-1, Math.min(1, score));
  }

  getMarketHoursMultiplier(hour, dayOfWeek) {
    // Weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.7; // Lower volatility on weekends for traditional markets
    }
    
    // Market hours volatility (rough approximation)
    if (hour >= 9 && hour <= 16) {
      return 1.2; // Higher volatility during trading hours
    } else if (hour >= 17 && hour <= 21) {
      return 1.0; // After hours
    } else {
      return 0.8; // Overnight
    }
  }

  // Pattern detection methods
  detectTrendPattern(prices) {
    if (prices.length < 10) return false;
    
    const recent = prices.slice(-10);
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return Math.abs(secondAvg - firstAvg) / firstAvg > 0.02;
  }

  getTrendDirection(prices) {
    const recent = prices.slice(-10);
    const start = recent[0];
    const end = recent[recent.length - 1];
    
    return end > start ? 'UP' : 'DOWN';
  }

  getTrendStrength(prices) {
    const recent = prices.slice(-10);
    const start = recent[0];
    const end = recent[recent.length - 1];
    
    return Math.abs(end - start) / start;
  }

  detectReversalPattern(prices) {
    if (prices.length < 15) return false;
    
    const recent = prices.slice(-15);
    const first5 = recent.slice(0, 5);
    const middle5 = recent.slice(5, 10);
    const last5 = recent.slice(10);
    
    const firstTrend = this.calculateTrend(first5);
    const lastTrend = this.calculateTrend(last5);
    
    // Check for trend reversal
    return (firstTrend > 0 && lastTrend < 0) || (firstTrend < 0 && lastTrend > 0);
  }

  detectConsolidationPattern(prices) {
    if (prices.length < 20) return false;
    
    const recent = prices.slice(-20);
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    const range = (max - min) / min;
    
    return range < 0.05; // Consolidation if range is less than 5%
  }

  getConsolidationRange(prices) {
    const recent = prices.slice(-20);
    const max = Math.max(...recent);
    const min = Math.min(...recent);
    
    return { min, max, range: max - min };
  }

  calculateTrend(prices) {
    if (prices.length < 2) return 0;
    
    const start = prices[0];
    const end = prices[prices.length - 1];
    
    return (end - start) / start;
  }

  getRiskRecommendations(riskLevel, riskScore) {
    const recommendations = [];
    
    if (riskLevel === 'HIGH') {
      recommendations.push('Consider reducing position size');
      recommendations.push('Use tighter stop losses');
      recommendations.push('Monitor position closely');
    } else if (riskLevel === 'LOW') {
      recommendations.push('Opportunity for larger position size');
      recommendations.push('Consider longer holding period');
    }
    
    if (riskScore > 0.8) {
      recommendations.push('Exercise extreme caution');
      recommendations.push('Consider avoiding trade');
    }
    
    return recommendations;
  }

  generateTradingRecommendations(priceDirection, volatility, risk, confidence) {
    const recommendations = [];
    
    // Direction-based recommendations
    if (priceDirection.direction === 'UP' && confidence > 0.7) {
      recommendations.push('Consider long position');
    } else if (priceDirection.direction === 'DOWN' && confidence > 0.7) {
      recommendations.push('Consider short position');
    } else {
      recommendations.push('Hold current positions');
    }
    
    // Volatility-based recommendations
    if (volatility.level === 'HIGH') {
      recommendations.push('Use smaller position sizes');
      recommendations.push('Consider shorter time frames');
    } else if (volatility.level === 'LOW') {
      recommendations.push('Opportunity for swing trading');
    }
    
    // Risk-based recommendations
    recommendations.push(...risk.recommendations);
    
    return recommendations;
  }

  getFallbackPrediction() {
    return {
      priceDirection: 'NEUTRAL',
      probability: 0.5,
      confidence: 0.1,
      volatility: 'MEDIUM',
      riskLevel: 'MEDIUM',
      patterns: [],
      timeHorizon: 'SHORT',
      recommendations: ['Insufficient data for reliable prediction'],
      metadata: {
        error: 'ML prediction failed, using fallback'
      }
    };
  }

  // Training and model update methods (for future implementation)
  async updateModel(modelName, trainingData) {
    // This would retrain or update the specified model
    console.log(`Updating model: ${modelName}`);
  }

  async collectTrainingData(symbol, marketData, outcome) {
    // This would collect data for model retraining
    if (!this.trainingData.has(symbol)) {
      this.trainingData.set(symbol, []);
    }
    
    this.trainingData.get(symbol).push({
      features: marketData,
      outcome,
      timestamp: Date.now()
    });
  }

  getModelInfo() {
    return {
      initialized: this.isInitialized,
      models: Array.from(this.models.keys()),
      trainingDataSize: this.trainingData.size,
      lastPredictions: this.predictions.size
    };
  }
}