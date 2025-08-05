// Sentiment Analysis Module
// Analyzes market sentiment from various sources

export class SentimentAnalysis {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async analyzeSocialMedia(symbol) {
    const cacheKey = `social_${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // In a real implementation, this would integrate with:
      // - Twitter API for tweets
      // - Reddit API for posts
      // - Telegram channels
      // - Discord servers
      // - StockTwits API
      
      const socialData = await this.fetchSocialMediaData(symbol);
      const sentiment = this.analyzeSentimentData(socialData);
      
      this.setCache(cacheKey, sentiment);
      return sentiment;
    } catch (error) {
      console.error('Failed to analyze social media sentiment:', error);
      return this.getDefaultSentiment();
    }
  }

  async analyzeNews(symbol) {
    const cacheKey = `news_${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // In a real implementation, this would integrate with:
      // - News APIs (NewsAPI, Alpha Vantage News, etc.)
      // - Financial news sites (Bloomberg, Reuters, etc.)
      // - Crypto news sites (CoinDesk, CoinTelegraph, etc.)
      // - RSS feeds from major financial publications
      
      const newsData = await this.fetchNewsData(symbol);
      const sentiment = this.analyzeNewsHeadlines(newsData);
      
      this.setCache(cacheKey, sentiment);
      return sentiment;
    } catch (error) {
      console.error('Failed to analyze news sentiment:', error);
      return this.getDefaultSentiment();
    }
  }

  async analyzeMarketSentiment(symbol) {
    const cacheKey = `market_${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Market sentiment indicators:
      // - Fear & Greed Index
      // - VIX (for stock markets)
      // - Funding rates (for crypto)
      // - Options put/call ratios
      // - Margin rates
      
      const marketData = await this.fetchMarketSentimentData(symbol);
      const sentiment = this.analyzeMarketIndicators(marketData);
      
      this.setCache(cacheKey, sentiment);
      return sentiment;
    } catch (error) {
      console.error('Failed to analyze market sentiment:', error);
      return this.getDefaultSentiment();
    }
  }

  async fetchSocialMediaData(symbol) {
    // Mock implementation - in reality would call actual APIs
    return {
      twitter: {
        mentions: Math.floor(Math.random() * 1000) + 100,
        sentiment: Math.random() * 2 - 1, // -1 to 1
        volume: Math.random(),
        influencerSentiment: Math.random() * 2 - 1
      },
      reddit: {
        posts: Math.floor(Math.random() * 100) + 10,
        upvoteRatio: Math.random(),
        comments: Math.floor(Math.random() * 500) + 50,
        sentiment: Math.random() * 2 - 1
      },
      telegram: {
        messages: Math.floor(Math.random() * 200) + 20,
        sentiment: Math.random() * 2 - 1,
        memberCount: Math.floor(Math.random() * 10000) + 1000
      }
    };
  }

  async fetchNewsData(symbol) {
    // Mock implementation - in reality would call news APIs
    return {
      headlines: [
        {
          title: `${symbol} shows strong performance amid market uncertainty`,
          sentiment: 0.6,
          source: 'Financial Times',
          timestamp: Date.now() - Math.random() * 86400000
        },
        {
          title: `Analysts remain bullish on ${symbol} despite volatility`,
          sentiment: 0.4,
          source: 'Bloomberg',
          timestamp: Date.now() - Math.random() * 86400000
        },
        {
          title: `${symbol} faces regulatory challenges`,
          sentiment: -0.3,
          source: 'Reuters',
          timestamp: Date.now() - Math.random() * 86400000
        }
      ],
      volume: Math.floor(Math.random() * 50) + 5,
      averageSentiment: Math.random() * 2 - 1
    };
  }

  async fetchMarketSentimentData(symbol) {
    // Mock implementation - in reality would call various market data APIs
    return {
      fearGreedIndex: Math.floor(Math.random() * 100),
      vix: Math.random() * 30 + 10,
      fundingRate: (Math.random() - 0.5) * 0.01,
      putCallRatio: Math.random() * 2 + 0.5,
      marginRates: Math.random() * 0.1,
      institutionalFlow: Math.random() * 2 - 1
    };
  }

  analyzeSentimentData(socialData) {
    const { twitter, reddit, telegram } = socialData;
    
    // Weight different platforms differently
    const weights = {
      twitter: 0.4,
      reddit: 0.35,
      telegram: 0.25
    };
    
    // Calculate weighted sentiment
    const weightedSentiment = 
      (twitter.sentiment * weights.twitter) +
      (reddit.sentiment * weights.reddit) +
      (telegram.sentiment * weights.telegram);
    
    // Calculate volume-weighted confidence
    const totalVolume = twitter.mentions + reddit.posts + telegram.messages;
    const volumeScore = Math.min(totalVolume / 1000, 1); // Normalize to 0-1
    
    // Factor in influencer sentiment
    const influencerBoost = twitter.influencerSentiment * 0.1;
    
    // Calculate final confidence based on volume and consistency
    const sentimentVariance = this.calculateVariance([
      twitter.sentiment,
      reddit.sentiment,
      telegram.sentiment
    ]);
    
    const consistency = Math.max(0, 1 - sentimentVariance);
    const confidence = volumeScore * consistency * 0.8 + 0.2;
    
    return {
      score: Math.max(-1, Math.min(1, weightedSentiment + influencerBoost)),
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      breakdown: {
        twitter: {
          sentiment: twitter.sentiment,
          mentions: twitter.mentions,
          weight: weights.twitter
        },
        reddit: {
          sentiment: reddit.sentiment,
          posts: reddit.posts,
          weight: weights.reddit
        },
        telegram: {
          sentiment: telegram.sentiment,
          messages: telegram.messages,
          weight: weights.telegram
        }
      },
      metadata: {
        totalVolume,
        volumeScore,
        consistency,
        influencerSentiment: twitter.influencerSentiment
      }
    };
  }

  analyzeNewsHeadlines(newsData) {
    const { headlines, volume } = newsData;
    
    if (headlines.length === 0) {
      return this.getDefaultSentiment();
    }
    
    // Analyze sentiment with time decay
    const now = Date.now();
    const timeWeightedSentiments = headlines.map(headline => {
      const age = now - headline.timestamp;
      const hoursAge = age / (1000 * 60 * 60);
      
      // Recent news has more weight (exponential decay)
      const timeWeight = Math.exp(-hoursAge / 24); // Half-life of 24 hours
      
      // Source credibility weights
      const sourceWeights = {
        'Bloomberg': 1.0,
        'Reuters': 1.0,
        'Financial Times': 0.9,
        'Wall Street Journal': 0.9,
        'CNBC': 0.8,
        'MarketWatch': 0.7
      };
      
      const sourceWeight = sourceWeights[headline.source] || 0.6;
      
      return {
        sentiment: headline.sentiment,
        weight: timeWeight * sourceWeight
      };
    });
    
    // Calculate weighted average sentiment
    const totalWeight = timeWeightedSentiments.reduce((sum, item) => sum + item.weight, 0);
    const weightedSentiment = timeWeightedSentiments.reduce(
      (sum, item) => sum + (item.sentiment * item.weight), 0
    ) / totalWeight;
    
    // Calculate confidence based on volume and recency
    const recentNews = headlines.filter(h => (now - h.timestamp) < 24 * 60 * 60 * 1000).length;
    const volumeScore = Math.min(volume / 20, 1); // Normalize to 0-1
    const recencyScore = Math.min(recentNews / 5, 1); // Normalize to 0-1
    
    const confidence = (volumeScore * 0.6) + (recencyScore * 0.4);
    
    return {
      score: Math.max(-1, Math.min(1, weightedSentiment)),
      confidence: Math.max(0.1, Math.min(0.9, confidence)),
      breakdown: {
        totalHeadlines: headlines.length,
        recentHeadlines: recentNews,
        averageSentiment: newsData.averageSentiment,
        timeWeightedSentiment: weightedSentiment
      },
      metadata: {
        volumeScore,
        recencyScore,
        headlines: headlines.slice(0, 5) // Top 5 headlines
      }
    };
  }

  analyzeMarketIndicators(marketData) {
    const {
      fearGreedIndex,
      vix,
      fundingRate,
      putCallRatio,
      marginRates,
      institutionalFlow
    } = marketData;
    
    // Normalize Fear & Greed Index (0-100 to -1 to 1)
    const fgSentiment = (fearGreedIndex - 50) / 50;
    
    // Normalize VIX (typically 10-50, higher = more fear)
    const vixSentiment = -(vix - 20) / 20; // Invert and center around 20
    
    // Funding rate sentiment (positive = bullish, negative = bearish)
    const fundingSentiment = Math.max(-1, Math.min(1, fundingRate * 100));
    
    // Put/Call ratio (higher = more bearish)
    const pcSentiment = -(putCallRatio - 1) / 1; // Center around 1
    
    // Institutional flow sentiment
    const instSentiment = institutionalFlow;
    
    // Weight the different indicators
    const weights = {
      fearGreed: 0.3,
      vix: 0.2,
      funding: 0.2,
      putCall: 0.15,
      institutional: 0.15
    };
    
    const weightedSentiment = 
      (fgSentiment * weights.fearGreed) +
      (vixSentiment * weights.vix) +
      (fundingSentiment * weights.funding) +
      (pcSentiment * weights.putCall) +
      (instSentiment * weights.institutional);
    
    // Calculate confidence based on indicator agreement
    const indicators = [fgSentiment, vixSentiment, fundingSentiment, pcSentiment, instSentiment];
    const variance = this.calculateVariance(indicators);
    const confidence = Math.max(0.3, 1 - variance);
    
    return {
      score: Math.max(-1, Math.min(1, weightedSentiment)),
      confidence: Math.max(0.1, Math.min(0.9, confidence)),
      breakdown: {
        fearGreed: { value: fearGreedIndex, sentiment: fgSentiment },
        vix: { value: vix, sentiment: vixSentiment },
        funding: { value: fundingRate, sentiment: fundingSentiment },
        putCall: { value: putCallRatio, sentiment: pcSentiment },
        institutional: { value: institutionalFlow, sentiment: instSentiment }
      },
      metadata: {
        variance,
        indicatorAgreement: 1 - variance,
        rawData: marketData
      }
    };
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  getDefaultSentiment() {
    return {
      score: 0,
      confidence: 0.1,
      breakdown: {},
      metadata: { error: 'Unable to fetch sentiment data' }
    };
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Sentiment signal interpretation
  interpretSentiment(sentimentScore, confidence) {
    if (confidence < 0.3) {
      return {
        signal: 'UNCERTAIN',
        strength: 'WEAK',
        description: 'Insufficient data for reliable sentiment analysis'
      };
    }

    const absScore = Math.abs(sentimentScore);
    let strength = 'WEAK';
    
    if (absScore > 0.7) strength = 'STRONG';
    else if (absScore > 0.4) strength = 'MODERATE';
    
    let signal = 'NEUTRAL';
    if (sentimentScore > 0.2) signal = 'BULLISH';
    else if (sentimentScore < -0.2) signal = 'BEARISH';
    
    return {
      signal,
      strength,
      score: sentimentScore,
      confidence,
      description: this.getSentimentDescription(signal, strength, sentimentScore)
    };
  }

  getSentimentDescription(signal, strength, score) {
    const descriptions = {
      'BULLISH_STRONG': 'Very positive market sentiment detected',
      'BULLISH_MODERATE': 'Moderately positive market sentiment',
      'BULLISH_WEAK': 'Slightly positive market sentiment',
      'BEARISH_STRONG': 'Very negative market sentiment detected',
      'BEARISH_MODERATE': 'Moderately negative market sentiment',
      'BEARISH_WEAK': 'Slightly negative market sentiment',
      'NEUTRAL_STRONG': 'Strong neutral sentiment',
      'NEUTRAL_MODERATE': 'Moderate neutral sentiment',
      'NEUTRAL_WEAK': 'Weak neutral sentiment',
      'UNCERTAIN': 'Sentiment unclear due to insufficient data'
    };
    
    const key = signal === 'UNCERTAIN' ? 'UNCERTAIN' : `${signal}_${strength}`;
    return descriptions[key] || `${signal} sentiment with ${strength.toLowerCase()} conviction`;
  }

  // Real-time sentiment monitoring
  async startSentimentMonitoring(symbols, callback) {
    const monitoringInterval = 5 * 60 * 1000; // 5 minutes
    
    const monitor = async () => {
      for (const symbol of symbols) {
        try {
          const [social, news, market] = await Promise.all([
            this.analyzeSocialMedia(symbol),
            this.analyzeNews(symbol),
            this.analyzeMarketSentiment(symbol)
          ]);
          
          const combinedSentiment = this.combineSentiments(social, news, market);
          callback(symbol, combinedSentiment);
        } catch (error) {
          console.error(`Error monitoring sentiment for ${symbol}:`, error);
        }
      }
    };
    
    // Initial analysis
    await monitor();
    
    // Set up periodic monitoring
    const intervalId = setInterval(monitor, monitoringInterval);
    
    return () => clearInterval(intervalId); // Return cleanup function
  }

  combineSentiments(social, news, market) {
    const weights = {
      social: 0.4,
      news: 0.35,
      market: 0.25
    };
    
    const weightedScore = 
      (social.score * weights.social * social.confidence) +
      (news.score * weights.news * news.confidence) +
      (market.score * weights.market * market.confidence);
    
    const weightedConfidence = 
      (social.confidence * weights.social) +
      (news.confidence * weights.news) +
      (market.confidence * weights.market);
    
    return {
      score: weightedScore,
      confidence: weightedConfidence,
      components: { social, news, market },
      interpretation: this.interpretSentiment(weightedScore, weightedConfidence)
    };
  }
}