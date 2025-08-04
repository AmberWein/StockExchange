class Marquee {
    constructor(element) {
        this.container = element;
        this.stocks = [];
        this.isLoading = false;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.createMarqueeStructure();
        
        this.loadStockData();
        this.setupAutoRefresh();
    }

    createMarqueeStructure() {
        this.container.innerHTML = '';
        this.container.className = 'stock-ticker';
        this.container.innerHTML = `
            <div class="ticker-wrapper">
                <div class="ticker-content" id="tickerContent">
                    <div class="ticker-item ticker-loading">Loading stock data...</div>
                </div>
            </div>
        `;

        this.tickerContent = this.container.querySelector('#tickerContent');
    }

    async loadStockData() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            this.showLoading();
            
            const url = `${CONFIG.BASE_URL}/stock/list?apikey=${CONFIG.API_KEY}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const allStocks = await response.json();
            
            const nasdaqStocks = allStocks
                .filter(stock => 
                    stock.exchange === 'NASDAQ' && 
                    stock.price && 
                    stock.price > 1 &&
                    stock.symbol
                )
                .slice(0, 50); // limit for performance

            const detailedPromises = nasdaqStocks.slice(0, 20).map(async (stock) => {
                try {
                    const profileUrl = `${CONFIG.BASE_URL}/profile/${stock.symbol}?apikey=${CONFIG.API_KEY}`;
                    const profileResponse = await fetch(profileUrl);
                    
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                        return profile || stock;
                    }
                    return stock;
                } catch (error) {
                    console.warn(`failed to fetch profile for ${stock.symbol}:`, error);
                    return stock;
                }
            });

            this.stocks = await Promise.all(detailedPromises);
            this.renderTicker();

        } catch (error) {
            console.error('error loading stock data:', error);
            this.showError('failed to load stock data');
        } finally {
            this.isLoading = false;
        }
    }

    renderTicker() {
        if (!this.stocks || this.stocks.length === 0) {
            this.showError('no stock data available');
            return;
        }

        const tickerItems = this.stocks.map(stock => this.createTickerItem(stock)).join('');
        
        // duplicate content for seamless looping
        this.tickerContent.innerHTML = tickerItems + tickerItems;
        
        this.startAnimation();
    }

    createTickerItem(stock) {
        const symbol = stock.symbol || 'N/A';
        const price = stock.price ? this.formatCurrency(stock.price) : 'N/A';
        const change = stock.changes || stock.changesPercentage || 0;
        const changeValue = typeof change === 'string' ? parseFloat(change) : change;
        const changeClass = changeValue >= 0 ? 'positive' : 'negative';
        const changeDisplay = isNaN(changeValue) ? '0.00%' : 
            `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(2)}%`;

        return `
            <div class="ticker-item">
                <span class="ticker-symbol">${this.escapeHtml(symbol)}</span>
                <span class="ticker-price">${price}</span>
                <span class="ticker-change ${changeClass}">${changeDisplay}</span>
            </div>
        `;
    }

    startAnimation() {
        this.tickerContent.classList.remove('ticker-loading');
        this.tickerContent.style.animationPlayState = 'running';
    }

    showLoading() {
        this.tickerContent.innerHTML = `
            <div class="ticker-item ticker-loading">
                <span class="ticker-symbol">Loading...</span>
                <span class="ticker-price">Please wait</span>
                <span class="ticker-change">--</span>
            </div>
        `;
    }

    showError(message = 'error loading data') {
        this.tickerContent.innerHTML = `
            <div class="ticker-item">
                <span class="ticker-symbol">ERROR</span>
                <span class="ticker-price">${this.escapeHtml(message)}</span>
                <span class="ticker-change">--</span>
            </div>
        `;
    }

    setupAutoRefresh() {
        // refresh data every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadStockData();
        }, 5 * 60 * 1000);
    }

    formatCurrency(value) {
        if (!value || isNaN(value)) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    pause() {
        if (this.tickerContent) {
            this.tickerContent.style.animationPlayState = 'paused';
        }
    }

    resume() {
        if (this.tickerContent) {
            this.tickerContent.style.animationPlayState = 'running';
        }
    }

    refresh() {
        this.loadStockData();
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.container.innerHTML = '';
    }
}

// export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Marquee;
}