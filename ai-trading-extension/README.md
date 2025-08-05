# AI Trading Browser Extension

An autonomous AI-powered trading system implemented as a browser extension that supports multiple trading platforms including cryptocurrency exchanges and traditional stock brokers.

## 🚀 Features

### Core Trading Features
- **Autonomous AI Trading** - Advanced machine learning algorithms for market analysis and trade execution
- **Multi-Platform Support** - Integrates with major crypto exchanges (Binance, Coinbase, KuCoin, etc.) and stock brokers (Alpaca, Interactive Brokers)
- **Real-time Market Analysis** - Technical analysis, sentiment analysis, and pattern recognition
- **Risk Management** - Comprehensive risk controls with position sizing, stop losses, and portfolio exposure limits
- **Paper Trading Mode** - Test strategies without real money

### AI & Analysis
- **Technical Analysis** - 15+ technical indicators including SMA, EMA, RSI, MACD, Bollinger Bands
- **Sentiment Analysis** - Social media, news, and market sentiment integration
- **Machine Learning** - Price direction prediction, volatility forecasting, and pattern recognition
- **Chart Pattern Detection** - Automatic detection of double tops/bottoms, head & shoulders, triangles

### Risk Management
- **Position Sizing** - Kelly Criterion and volatility-based position sizing
- **Stop Loss & Take Profit** - Automatic order management
- **Correlation Analysis** - Prevents over-exposure to correlated assets
- **Drawdown Protection** - Real-time portfolio risk monitoring
- **Emergency Stop** - Instant halt of all trading activities

### User Interface
- **Modern Dashboard** - Real-time portfolio overview and trading statistics
- **Configuration Panel** - Easy setup of trading parameters and risk settings
- **Performance Analytics** - Detailed trading performance analysis with charts
- **Activity Monitoring** - Real-time logs of all trading activities

## 📁 Project Structure

```
ai-trading-extension/
├── manifest.json                    # Extension manifest (Manifest V3)
├── src/
│   ├── background/
│   │   └── service-worker.js        # Main background service worker
│   ├── content/
│   │   ├── platform-detector.js     # Detects trading platforms
│   │   └── trading-interface.js     # Injects trading UI
│   ├── popup/
│   │   ├── popup.html              # Main popup interface
│   │   ├── popup.css               # Popup styling
│   │   └── popup.js                # Popup functionality
│   ├── trading/
│   │   ├── trading-engine.js       # Core trading engine
│   │   ├── risk-manager.js         # Risk management system
│   │   └── adapters/               # Platform API adapters
│   │       ├── base-adapter.js     # Base adapter class
│   │       ├── binance-adapter.js  # Binance integration
│   │       └── coinbase-adapter.js # Coinbase integration
│   ├── ai/
│   │   ├── decision-engine.js      # AI decision making
│   │   ├── technical-analysis.js   # Technical indicators
│   │   ├── sentiment-analysis.js   # Sentiment analysis
│   │   └── machine-learning.js     # ML models
│   └── utils/
│       ├── logger.js               # Logging system
│       └── config-manager.js       # Configuration management
├── public/
│   └── icons/                      # Extension icons
└── docs/
    └── API.md                      # API documentation
```

## 🔧 Installation & Setup

### Prerequisites
- Chrome/Edge browser (Manifest V3 support)
- Trading platform accounts with API access
- Node.js (for development)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/ai-trading-extension.git
   cd ai-trading-extension
   ```

2. **Load the extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

3. **Configure trading platforms**
   - Click the extension icon in the browser toolbar
   - Go to the "Config" tab
   - Add your trading platform API credentials
   - **Start with paper trading mode for testing**

### API Key Setup

#### Binance
1. Go to Binance API Management
2. Create new API key with "Enable Trading" permission
3. Add IP restrictions for security
4. Copy API Key and Secret to extension config

#### Coinbase Advanced
1. Go to Coinbase Advanced Trade API
2. Create new API key with trading permissions
3. Add API credentials to extension config

#### Alpaca (Stocks)
1. Sign up for Alpaca Paper Trading account
2. Generate API keys from dashboard
3. Configure in extension (uses paper trading by default)

## ⚙️ Configuration

### Risk Settings
```javascript
{
  maxPositionSize: 0.02,        // 2% max position size
  maxDailyLoss: 0.01,          // 1% daily loss limit
  stopLossPercentage: 0.02,    // 2% stop loss
  takeProfitPercentage: 0.04,  // 4% take profit
  maxTotalExposure: 0.8        // 80% max portfolio exposure
}
```

### AI Settings
```javascript
{
  confidenceThreshold: 0.7,    // 70% minimum confidence
  strategy: 'balanced',        // conservative, balanced, aggressive
  technicalWeight: 0.4,        // Technical analysis weight
  sentimentWeight: 0.3,        // Sentiment analysis weight
  fundamentalWeight: 0.2       // Fundamental analysis weight
}
```

### Trading Settings
```javascript
{
  activeTimeframes: ['1m', '5m', '15m'],
  maxConcurrentTrades: 3,
  paperTrading: true,          // Start with paper trading!
  watchlist: ['BTCUSDT', 'ETHUSDT', 'AAPL', 'TSLA']
}
```

## 🔒 Security Features

### API Key Protection
- Keys encrypted using Web Crypto API
- Stored separately from configuration
- Never logged or transmitted

### Risk Controls
- Emergency stop functionality
- Real-time risk monitoring
- Position size limits
- Correlation checks

### Audit Trail
- Complete logging of all trades
- Risk events tracking
- Performance analytics
- Export capabilities

## 🚨 Important Warnings

### ⚠️ Financial Risk
- **ALWAYS START WITH PAPER TRADING**
- Trading involves significant financial risk
- Only trade with money you can afford to lose
- Past performance does not guarantee future results

### 🔐 Security
- Never share your API keys
- Use IP restrictions on exchange APIs
- Regularly review trading logs
- Enable all available 2FA options

### 🧪 Testing
- Thoroughly test with paper trading first
- Start with small position sizes
- Monitor performance closely
- Have exit strategies

## 📊 Usage Guide

### Getting Started
1. Install and configure the extension
2. Set up API keys for your preferred platforms
3. Configure risk parameters (start conservative)
4. Enable paper trading mode
5. Add symbols to your watchlist
6. Start the AI trading system

### Monitoring
- Check the dashboard regularly
- Review trading logs
- Monitor risk metrics
- Adjust settings based on performance

### Stopping Trading
- Use "Stop Trading" for normal shutdown
- Use "Emergency Stop" to immediately close all positions
- Trading can be paused and resumed

## 🛠️ Development

### Architecture
The extension follows a modular architecture:

- **Service Worker**: Main background process handling trading logic
- **Trading Engine**: Manages platform connections and order execution
- **AI Engine**: Handles market analysis and decision making
- **Risk Manager**: Monitors and controls trading risk
- **UI Components**: User interface for monitoring and control

### Adding New Platforms
1. Create new adapter extending `BaseAdapter`
2. Implement required methods (connect, getMarketData, createOrder, etc.)
3. Add platform to the trading engine
4. Update UI with new platform options

### Machine Learning Models
The system includes placeholder ML models that can be replaced with:
- TensorFlow.js models
- ONNX.js models
- Custom prediction algorithms

## 📈 Performance Analytics

### Metrics Tracked
- Total trades executed
- Win/loss ratio
- Average profit/loss
- Maximum drawdown
- Sharpe ratio
- Portfolio performance

### Reporting
- Real-time dashboard
- Historical performance charts
- Trade history export
- Risk analysis reports

## 🔄 API Integration

### Supported Platforms
- **Binance** - Spot and futures trading
- **Coinbase Advanced** - Professional crypto trading
- **KuCoin** - Spot trading
- **Alpaca** - US stock trading
- **Interactive Brokers** - Global markets (planned)

### Rate Limiting
- Automatic rate limit management
- Request queuing and throttling
- Platform-specific optimizations

## 🐛 Troubleshooting

### Common Issues
1. **API Connection Failed**
   - Check API credentials
   - Verify IP restrictions
   - Check platform status

2. **No Trading Activity**
   - Verify confidence threshold settings
   - Check watchlist symbols
   - Review risk parameters

3. **High CPU Usage**
   - Adjust update intervals
   - Reduce active timeframes
   - Check for WebSocket issues

### Debug Mode
Enable debug logging in configuration:
```javascript
{
  logging: {
    level: 'DEBUG',
    enableRemoteLogging: false
  }
}
```

## 📚 Additional Resources

- [Technical Analysis Guide](docs/technical-analysis.md)
- [Risk Management Best Practices](docs/risk-management.md)
- [API Documentation](docs/API.md)
- [Trading Strategies](docs/strategies.md)

## 📄 License

This project is for educational purposes. Trading involves significant risk. Use at your own risk.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## ⚠️ Disclaimer

This software is provided for educational and research purposes only. The authors are not responsible for any financial losses incurred through the use of this software. Always do your own research and never invest more than you can afford to lose.

Trading cryptocurrency and stocks involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. Please consult with a qualified financial advisor before making any investment decisions.