class StockTicker {
  constructor() {
    this.tickerContent = document.getElementById("tickerContent");
    this.stocks = [];
    this.isLoading = false;
  }

  async init() {
    await this.loadStockData();
    this.startTicker();
  }

  async loadStockData() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // use the stock list endpoint to get active stocks
      const url = `${CONFIG.BASE_URL}/stock/list?apikey=${CONFIG.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allStocks = await response.json();

      // filter for NASDAQ stocks and take a subset (size 50) to avoid performance issues
      const nasdaqStocks = allStocks
        .filter(
          (stock) =>
            stock.exchange === "NASDAQ" && stock.price && stock.price > 1
        )
        .slice(0, 50);

      // get detailed info for selected stocks
      const detailedPromises = nasdaqStocks.slice(0, 20).map(async (stock) => {
        try {
          const profileUrl = `${CONFIG.BASE_URL}/profile/${stock.symbol}?apikey=${CONFIG.API_KEY}`;
          const profileResponse = await fetch(profileUrl);

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            return Array.isArray(profileData) ? profileData[0] : profileData;
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
      console.error("error loading stock data:", error);
      this.showError();
    } finally {
      this.isLoading = false;
    }
  }

  renderTicker() {
    if (!this.stocks || this.stocks.length === 0) {
      this.showError();
      return;
    }

    const tickerItems = this.stocks
      .map((stock) => {
        const symbol = stock.symbol || "N/A";
        const price = stock.price ? this.formatCurrency(stock.price) : "N/A";
        const change = stock.changes || stock.changesPercentage || 0;
        const changeValue =
          typeof change === "string" ? parseFloat(change) : change;
        const changeClass = changeValue >= 0 ? "positive" : "negative";
        const changeDisplay = isNaN(changeValue)
          ? "0.00%"
          : `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(2)}%`;

        return `
                <div class="ticker-item">
                    <span class="ticker-symbol">${this.escapeHtml(
                      symbol
                    )}</span>
                    <span class="ticker-price">${price}</span>
                    <span class="ticker-change ${changeClass}">${changeDisplay}</span>
                </div>
            `;
      })
      .join("");

    // duplicate the content for seamless looping
    this.tickerContent.innerHTML = tickerItems + tickerItems;
  }

  startTicker() {
    this.tickerContent.style.animationPlayState = "running";

    // refresh data every 5 minutes
    setInterval(() => {
      this.loadStockData();
    }, 5 * 60 * 1000);
  }

  showError() {
    this.tickerContent.innerHTML = `
            <div class="ticker-item">
                <span class="ticker-symbol">ERROR</span>
                <span class="ticker-price">Failed to load stock data</span>
                <span class="ticker-change">--</span>
            </div>
        `;
  }

  formatCurrency(value) {
    if (!value || isNaN(value)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const ticker = new StockTicker();
  ticker.init();
});
