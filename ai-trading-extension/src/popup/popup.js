// AI Trading Extension - Popup Interface
// Handles user interactions and communication with background service worker

class TradingPopup {
  constructor() {
    this.activeTab = 'dashboard';
    this.config = {};
    this.status = { isActive: false };
    this.positions = [];
    this.analytics = {};
    
    this.init();
  }

  async init() {
    try {
      // Load initial data
      await this.loadConfig();
      await this.loadStatus();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update UI
      this.updateUI();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      console.log('Trading popup initialized');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize trading interface');
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        this.switchTab(button.dataset.tab);
      });
    });

    // Trading controls
    document.getElementById('startTradingBtn').addEventListener('click', () => {
      this.startTrading();
    });

    document.getElementById('stopTradingBtn').addEventListener('click', () => {
      this.stopTrading();
    });

    document.getElementById('emergencyStopBtn').addEventListener('click', () => {
      this.emergencyStop();
    });

    // Paper trading toggle
    document.getElementById('paperTradingMode').addEventListener('change', (e) => {
      this.togglePaperTrading(e.target.checked);
    });

    // Configuration form
    document.getElementById('configForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfig();
    });

    document.getElementById('resetConfigBtn').addEventListener('click', () => {
      this.resetConfig();
    });

    // Platform management
    document.getElementById('addPlatformBtn').addEventListener('click', () => {
      this.showPlatformModal();
    });

    document.getElementById('platformForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addPlatform();
    });

    document.getElementById('cancelPlatformBtn').addEventListener('click', () => {
      this.hidePlatformModal();
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
      this.hidePlatformModal();
    });

    // Manual trading
    document.getElementById('manualTradeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeManualTrade();
    });

    // Range inputs
    document.getElementById('confidenceThreshold').addEventListener('input', (e) => {
      const value = (e.target.value * 100).toFixed(0);
      e.target.nextElementSibling.textContent = `${value}%`;
    });

    // Analytics period
    document.getElementById('analyticsPeriod').addEventListener('change', (e) => {
      this.loadAnalytics(e.target.value);
    });

    // Position filters
    document.getElementById('platformFilter').addEventListener('change', () => {
      this.filterPositions();
    });

    document.getElementById('statusFilter').addEventListener('change', () => {
      this.filterPositions();
    });

    // Modal backdrop click
    document.getElementById('platformModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hidePlatformModal();
      }
    });
  }

  switchTab(tabName) {
    // Update active tab
    this.activeTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabName);
    });

    // Load tab-specific data
    this.loadTabData(tabName);
  }

  async loadTabData(tabName) {
    try {
      switch (tabName) {
        case 'dashboard':
          await this.loadDashboardData();
          break;
        case 'positions':
          await this.loadPositions();
          break;
        case 'analytics':
          await this.loadAnalytics();
          break;
        case 'config':
          await this.loadConfigData();
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${tabName} data:`, error);
    }
  }

  async loadConfig() {
    try {
      const result = await chrome.storage.local.get('tradingConfig');
      this.config = result.tradingConfig || this.getDefaultConfig();
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  async loadStatus() {
    try {
      const response = await this.sendMessage({ type: 'GET_STATUS' });
      if (response.success) {
        this.status = response.data;
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  }

  async loadDashboardData() {
    try {
      // Load market data
      const symbols = this.config.watchlist || ['BTCUSDT', 'ETHUSDT', 'AAPL', 'TSLA'];
      const marketResponse = await this.sendMessage({ 
        type: 'GET_MARKET_DATA', 
        symbols 
      });

      if (marketResponse.success) {
        this.updateMarketGrid(marketResponse.data);
      }

      // Load recent activity
      await this.loadRecentActivity();

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }

  async loadPositions() {
    try {
      const response = await this.sendMessage({ type: 'GET_POSITIONS' });
      if (response.success) {
        this.positions = response.data;
        this.updatePositionsTable();
        this.updatePlatformFilters();
      }
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  }

  async loadAnalytics(period = '7d') {
    try {
      const response = await this.sendMessage({ 
        type: 'GET_ANALYTICS', 
        period 
      });
      
      if (response.success) {
        this.analytics = response.data;
        this.updateAnalyticsDisplay();
        this.updatePerformanceChart();
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }

  async loadConfigData() {
    this.populateConfigForm();
    this.populatePlatformsList();
  }

  async startTrading() {
    try {
      this.showLoading('Starting AI trading system...');
      
      const response = await this.sendMessage({ 
        type: 'START_TRADING', 
        config: this.config 
      });

      if (response.success) {
        this.status.isActive = true;
        this.updateUI();
        this.showSuccess('AI trading started successfully');
      } else {
        this.showError('Failed to start trading: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to start trading:', error);
      this.showError('Failed to start trading system');
    } finally {
      this.hideLoading();
    }
  }

  async stopTrading() {
    try {
      this.showLoading('Stopping AI trading system...');
      
      const response = await this.sendMessage({ type: 'STOP_TRADING' });

      if (response.success) {
        this.status.isActive = false;
        this.updateUI();
        this.showSuccess('AI trading stopped successfully');
      } else {
        this.showError('Failed to stop trading: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to stop trading:', error);
      this.showError('Failed to stop trading system');
    } finally {
      this.hideLoading();
    }
  }

  async emergencyStop() {
    if (!confirm('This will immediately stop all trading and close open positions. Continue?')) {
      return;
    }

    try {
      this.showLoading('Emergency stop in progress...');
      
      const response = await this.sendMessage({ 
        type: 'EMERGENCY_STOP' 
      });

      if (response.success) {
        this.status.isActive = false;
        this.updateUI();
        this.showSuccess('Emergency stop completed');
      } else {
        this.showError('Emergency stop failed: ' + response.error);
      }
    } catch (error) {
      console.error('Emergency stop failed:', error);
      this.showError('Emergency stop failed');
    } finally {
      this.hideLoading();
    }
  }

  async togglePaperTrading(enabled) {
    this.config.paperTrading = enabled;
    await this.saveConfigToStorage();
    
    if (this.status.isActive) {
      // Restart trading with new mode
      await this.stopTrading();
      setTimeout(() => this.startTrading(), 1000);
    }
  }

  async saveConfig() {
    try {
      this.showLoading('Saving configuration...');
      
      // Collect form data
      const formData = this.collectConfigFormData();
      
      // Validate configuration
      const validation = this.validateConfig(formData);
      if (!validation.valid) {
        this.showError('Configuration error: ' + validation.errors.join(', '));
        return;
      }

      // Update config
      this.config = { ...this.config, ...formData };
      
      // Save to storage and backend
      await this.saveConfigToStorage();
      
      const response = await this.sendMessage({ 
        type: 'UPDATE_CONFIG', 
        config: this.config 
      });

      if (response.success) {
        this.showSuccess('Configuration saved successfully');
      } else {
        this.showError('Failed to save configuration: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      this.showError('Failed to save configuration');
    } finally {
      this.hideLoading();
    }
  }

  async resetConfig() {
    if (!confirm('This will reset all settings to defaults. Continue?')) {
      return;
    }

    this.config = this.getDefaultConfig();
    this.populateConfigForm();
    await this.saveConfigToStorage();
    this.showSuccess('Configuration reset to defaults');
  }

  async addPlatform() {
    try {
      this.showLoading('Testing platform connection...');
      
      const platformData = this.collectPlatformFormData();
      
      // Test connection
      const testResponse = await this.sendMessage({
        type: 'TEST_PLATFORM_CONNECTION',
        platform: platformData
      });

      if (!testResponse.success) {
        this.showError('Connection test failed: ' + testResponse.error);
        return;
      }

      // Add to config
      if (!this.config.platforms) {
        this.config.platforms = [];
      }

      this.config.platforms.push(platformData);
      await this.saveConfigToStorage();
      
      this.hidePlatformModal();
      this.populatePlatformsList();
      this.showSuccess(`${platformData.name} platform added successfully`);
      
    } catch (error) {
      console.error('Failed to add platform:', error);
      this.showError('Failed to add platform');
    } finally {
      this.hideLoading();
    }
  }

  async executeManualTrade() {
    try {
      this.showLoading('Executing trade...');
      
      const tradeData = this.collectTradeFormData();
      
      const response = await this.sendMessage({
        type: 'EXECUTE_MANUAL_TRADE',
        trade: tradeData
      });

      if (response.success) {
        this.showSuccess('Trade executed successfully');
        document.getElementById('manualTradeForm').reset();
        await this.loadPositions();
      } else {
        this.showError('Trade failed: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to execute trade:', error);
      this.showError('Failed to execute trade');
    } finally {
      this.hideLoading();
    }
  }

  updateUI() {
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = statusIndicator.querySelector('.status-text');
    
    if (this.status.isActive) {
      statusIndicator.classList.add('active');
      statusText.textContent = 'Active';
    } else {
      statusIndicator.classList.remove('active');
      statusText.textContent = 'Inactive';
    }

    // Update trading controls
    const startBtn = document.getElementById('startTradingBtn');
    const stopBtn = document.getElementById('stopTradingBtn');
    
    startBtn.disabled = this.status.isActive;
    stopBtn.disabled = !this.status.isActive;

    // Update stats
    this.updateQuickStats();
    
    // Update footer
    this.updateFooter();
  }

  updateQuickStats() {
    // These would be populated with real data from the trading system
    document.getElementById('totalPnL').textContent = '+$0.00';
    document.getElementById('activePositions').textContent = this.positions.length || 0;
    document.getElementById('winRate').textContent = '0%';
    document.getElementById('connectedPlatforms').textContent = this.status.connectedPlatforms?.length || 0;
  }

  updateMarketGrid(marketData) {
    const grid = document.getElementById('marketGrid');
    grid.innerHTML = '';

    for (const [symbol, data] of Object.entries(marketData)) {
      if (data.error) continue;

      const item = document.createElement('div');
      item.className = 'market-item';
      
      const change = ((data.currentPrice - data.previousPrice) / data.previousPrice * 100).toFixed(2);
      const changeClass = change >= 0 ? 'positive' : 'negative';
      
      item.innerHTML = `
        <div class="market-symbol">${symbol}</div>
        <div class="market-price">$${data.currentPrice?.toFixed(2) || '0.00'}</div>
        <div class="market-change ${changeClass}">${change >= 0 ? '+' : ''}${change}%</div>
      `;
      
      grid.appendChild(item);
    }
  }

  updatePositionsTable() {
    const tbody = document.getElementById('positionsTableBody');
    tbody.innerHTML = '';

    if (this.positions.length === 0) {
      tbody.innerHTML = '<tr class="no-data"><td colspan="9">No positions found</td></tr>';
      return;
    }

    this.positions.forEach(position => {
      const row = document.createElement('tr');
      const pnl = (position.currentValue - position.entryValue).toFixed(2);
      const pnlClass = pnl >= 0 ? 'positive' : 'negative';
      
      row.innerHTML = `
        <td>${position.symbol}</td>
        <td>${position.platform}</td>
        <td>${position.side}</td>
        <td>${position.quantity}</td>
        <td>$${position.entryPrice?.toFixed(2) || '0.00'}</td>
        <td>$${position.currentPrice?.toFixed(2) || '0.00'}</td>
        <td class="${pnlClass}">$${pnl}</td>
        <td><span class="status-badge ${position.status.toLowerCase()}">${position.status}</span></td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="popup.closePosition('${position.orderId}')">Close</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }

  async closePosition(orderId) {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }

    try {
      const response = await this.sendMessage({
        type: 'CLOSE_POSITION',
        orderId
      });

      if (response.success) {
        this.showSuccess('Position closed successfully');
        await this.loadPositions();
      } else {
        this.showError('Failed to close position: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to close position:', error);
      this.showError('Failed to close position');
    }
  }

  filterPositions() {
    const platformFilter = document.getElementById('platformFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filteredPositions = this.positions;

    if (platformFilter !== 'all') {
      filteredPositions = filteredPositions.filter(p => p.platform === platformFilter);
    }

    if (statusFilter !== 'all') {
      filteredPositions = filteredPositions.filter(p => p.status.toLowerCase() === statusFilter);
    }

    // Update table with filtered positions
    const originalPositions = this.positions;
    this.positions = filteredPositions;
    this.updatePositionsTable();
    this.positions = originalPositions;
  }

  updatePlatformFilters() {
    const platformFilter = document.getElementById('platformFilter');
    const platforms = [...new Set(this.positions.map(p => p.platform))];
    
    platformFilter.innerHTML = '<option value="all">All Platforms</option>';
    platforms.forEach(platform => {
      const option = document.createElement('option');
      option.value = platform;
      option.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      platformFilter.appendChild(option);
    });
  }

  updateAnalyticsDisplay() {
    if (!this.analytics) return;

    document.getElementById('totalTrades').textContent = this.analytics.totalTrades || 0;
    document.getElementById('analyticsWinRate').textContent = `${this.analytics.winRate || 0}%`;
    document.getElementById('avgWin').textContent = `$${this.analytics.avgWin?.toFixed(2) || '0.00'}`;
    document.getElementById('avgLoss').textContent = `$${this.analytics.avgLoss?.toFixed(2) || '0.00'}`;
    document.getElementById('profitFactor').textContent = this.analytics.profitFactor?.toFixed(2) || '0.00';
    document.getElementById('maxDrawdown').textContent = `${this.analytics.maxDrawdown || 0}%`;
  }

  updatePerformanceChart() {
    // This would integrate with a charting library like Chart.js
    // For now, just log the data
    console.log('Performance chart data:', this.analytics.chartData);
  }

  populateConfigForm() {
    // Risk settings
    document.getElementById('maxPositionSize').value = this.config.riskSettings?.maxPositionSize * 100 || 2;
    document.getElementById('maxDailyLoss').value = this.config.riskSettings?.maxDailyLoss * 100 || 1;
    document.getElementById('stopLossPercentage').value = this.config.riskSettings?.stopLossPercentage * 100 || 2;
    document.getElementById('takeProfitPercentage').value = this.config.riskSettings?.takeProfitPercentage * 100 || 4;

    // Trading settings
    document.getElementById('watchlist').value = this.config.watchlist?.join(', ') || '';
    
    // Timeframes
    const timeframes = this.config.tradingSettings?.activeTimeframes || ['1m', '5m', '15m'];
    document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
      checkbox.checked = timeframes.includes(checkbox.value);
    });

    // AI settings
    document.getElementById('confidenceThreshold').value = this.config.aiSettings?.confidenceThreshold || 0.7;
    document.getElementById('aiStrategy').value = this.config.aiSettings?.strategy || 'balanced';

    // Paper trading mode
    document.getElementById('paperTradingMode').checked = this.config.paperTrading !== false;
  }

  populatePlatformsList() {
    const container = document.getElementById('platformsConfig');
    container.innerHTML = '';

    if (!this.config.platforms || this.config.platforms.length === 0) {
      container.innerHTML = '<p class="text-muted">No platforms configured</p>';
      return;
    }

    this.config.platforms.forEach((platform, index) => {
      const item = document.createElement('div');
      item.className = 'platform-item';
      item.innerHTML = `
        <div class="platform-info">
          <strong>${platform.name.charAt(0).toUpperCase() + platform.name.slice(1)}</strong>
          <span class="platform-mode">${platform.testMode ? 'Test Mode' : 'Live Mode'}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="popup.removePlatform(${index})">Remove</button>
      `;
      container.appendChild(item);
    });

    // Update manual trading platform options
    this.updateTradingPlatformOptions();
  }

  updateTradingPlatformOptions() {
    const select = document.getElementById('tradePlatform');
    select.innerHTML = '<option value="">Select Platform</option>';

    if (this.config.platforms) {
      this.config.platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform.name;
        option.textContent = platform.name.charAt(0).toUpperCase() + platform.name.slice(1);
        select.appendChild(option);
      });
    }
  }

  removePlatform(index) {
    if (!confirm('Are you sure you want to remove this platform?')) {
      return;
    }

    this.config.platforms.splice(index, 1);
    this.saveConfigToStorage();
    this.populatePlatformsList();
    this.showSuccess('Platform removed successfully');
  }

  collectConfigFormData() {
    // Collect timeframes
    const activeTimeframes = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
      if (checkbox.value && checkbox.value.match(/\d+[mh]/)) {
        activeTimeframes.push(checkbox.value);
      }
    });

    return {
      riskSettings: {
        maxPositionSize: parseFloat(document.getElementById('maxPositionSize').value) / 100,
        maxDailyLoss: parseFloat(document.getElementById('maxDailyLoss').value) / 100,
        stopLossPercentage: parseFloat(document.getElementById('stopLossPercentage').value) / 100,
        takeProfitPercentage: parseFloat(document.getElementById('takeProfitPercentage').value) / 100,
        maxTotalExposure: 0.8 // 80% max total exposure
      },
      tradingSettings: {
        activeTimeframes
      },
      watchlist: document.getElementById('watchlist').value.split(',').map(s => s.trim()).filter(s => s),
      aiSettings: {
        confidenceThreshold: parseFloat(document.getElementById('confidenceThreshold').value),
        strategy: document.getElementById('aiStrategy').value
      },
      paperTrading: document.getElementById('paperTradingMode').checked
    };
  }

  collectPlatformFormData() {
    return {
      name: document.getElementById('platformName').value,
      apiKey: document.getElementById('apiKey').value,
      apiSecret: document.getElementById('apiSecret').value,
      testMode: document.getElementById('testMode').checked
    };
  }

  collectTradeFormData() {
    return {
      symbol: document.getElementById('tradeSymbol').value.toUpperCase(),
      platform: document.getElementById('tradePlatform').value,
      side: document.getElementById('tradeSide').value,
      quantity: parseFloat(document.getElementById('tradeQuantity').value) / 100
    };
  }

  validateConfig(config) {
    const errors = [];

    if (config.riskSettings.maxPositionSize <= 0 || config.riskSettings.maxPositionSize > 0.1) {
      errors.push('Max position size must be between 0.1% and 10%');
    }

    if (config.riskSettings.maxDailyLoss <= 0 || config.riskSettings.maxDailyLoss > 0.05) {
      errors.push('Max daily loss must be between 0.1% and 5%');
    }

    if (config.watchlist.length === 0) {
      errors.push('At least one symbol must be in the watchlist');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async saveConfigToStorage() {
    await chrome.storage.local.set({ tradingConfig: this.config });
  }

  getDefaultConfig() {
    return {
      riskSettings: {
        maxPositionSize: 0.02, // 2%
        maxDailyLoss: 0.01, // 1%
        stopLossPercentage: 0.02, // 2%
        takeProfitPercentage: 0.04, // 4%
        maxTotalExposure: 0.8 // 80%
      },
      tradingSettings: {
        activeTimeframes: ['1m', '5m', '15m']
      },
      watchlist: ['BTCUSDT', 'ETHUSDT', 'AAPL', 'TSLA'],
      aiSettings: {
        confidenceThreshold: 0.7,
        strategy: 'balanced'
      },
      paperTrading: true,
      platforms: []
    };
  }

  showPlatformModal() {
    document.getElementById('platformModal').classList.add('active');
    document.getElementById('platformForm').reset();
  }

  hidePlatformModal() {
    document.getElementById('platformModal').classList.remove('active');
  }

  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('.loading-text');
    text.textContent = message;
    overlay.classList.add('active');
  }

  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
  }

  showSuccess(message) {
    // Simple success notification (could be enhanced with a toast system)
    console.log('Success:', message);
    alert(message); // Temporary - replace with better notification system
  }

  showError(message) {
    // Simple error notification (could be enhanced with a toast system)
    console.error('Error:', message);
    alert('Error: ' + message); // Temporary - replace with better notification system
  }

  updateFooter() {
    document.getElementById('lastUpdate').textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    document.getElementById('connectionStatus').textContent = this.status.isActive ? 'Connected' : 'Disconnected';
  }

  async loadRecentActivity() {
    // This would load recent trading activity
    // For now, just clear the placeholder
    const activityList = document.getElementById('activityList');
    if (this.status.isActive) {
      activityList.innerHTML = '<div class="activity-item">AI trading system started</div>';
    }
  }

  startPeriodicUpdates() {
    // Update every 30 seconds
    setInterval(() => {
      if (this.activeTab === 'dashboard') {
        this.loadDashboardData();
      } else if (this.activeTab === 'positions') {
        this.loadPositions();
      }
      this.loadStatus();
    }, 30000);
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.popup = new TradingPopup();
});

// Export for global access (for onclick handlers)
window.popup = null;