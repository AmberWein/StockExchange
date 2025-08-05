class CompanyInfo {
  constructor(element, symbol) {
    this.container = element;
    this.symbol = symbol;
    this.companyData = null;
    this.chart = null;
    
    this.init();
  }

  init() {
    this.createStructure();
  }

  createStructure() {
    this.container.innerHTML = `
      <div class="container">
        <a href="index.html" class="back-button">← Back to Search</a>

        <div class="loading" id="companyLoading">
          <div class="spinner"></div>
          <p>Loading company information...</p>
        </div>

        <div id="companyContent" style="display: none">
          <div class="company-header">
            <img
              id="companyLogo"
              src=""
              alt="Company Logo"
              class="company-logo"
              style="display: none"
            />
            <div class="company-basic-info">
              <h1 id="companyName">-</h1>
              <div id="companySymbol" class="company-symbol">-</div>
              <a
                id="companyWebsite"
                href="#"
                target="_blank"
                class="company-website"
                style="display: none"
                >Visit Website</a
              >
            </div>
          </div>

          <div class="stock-info">
            <div class="stock-card">
              <div class="stock-price" id="stockPrice">-</div>
              <div>Current Price</div>
            </div>
            <div class="stock-card">
              <div id="stockChange" class="stock-change">-</div>
              <div>Change (%)</div>
            </div>
            <div class="stock-card">
              <div id="marketCap">-</div>
              <div>Market Cap</div>
            </div>
          </div>

          <div class="company-description">
            <h3>About the Company</h3>
            <p id="companyDesc">Loading company description...</p>
          </div>

          <div class="chart-container">
            <h3>Stock Price History</h3>
            <div class="chart-loading" id="chartLoading">
              <div class="spinner"></div>
              <p>Loading stock price history...</p>
            </div>
            <canvas id="stockChart" style="display: none"></canvas>
          </div>
        </div>

        <div id="errorContainer"></div>
      </div>
    `;
  }

  async load() {
    if (!this.symbol) {
      this.showError("No company symbol provided");
      return;
    }

    try {
      this.showLoading(true);
      
      const company = await this.fetchCompanyProfile(this.symbol);
      
      if (!company) {
        throw new Error("Company not found");
      }

      this.companyData = company;
      this.displayCompanyInfo(company);
      this.showLoading(false);
      this.showContent(true);

    } catch (error) {
      console.error("Error loading company data:", error);
      this.showLoading(false);
      this.showError("Failed to load company information. Please check the company symbol and try again.");
    }
  }

  async addChart() {
    if (!this.symbol) return;

    try {
      const historyData = await this.fetchStockHistory(this.symbol);

      if (historyData && historyData.length > 0) {
        this.createStockChart(historyData);
        this.showChart(true);
      } else {
        this.showChartError("No historical data available");
      }
    } catch (chartError) {
      console.error("Chart loading error:", chartError);
      this.showChartError("Failed to load chart data");
    }
  }

  async fetchCompanyProfile(symbol) {
    const endpoint = `${CONFIG.BASE_URL}/profile/${symbol}?apikey=${CONFIG.API_KEY}`;
    
    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        const errorMsg = `Failed to fetch company profile, status: ${response.status}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
        return Array.isArray(data) ? data[0] : data;
      } else {
        throw new Error("No company data found for this symbol");
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
      throw error;
    }
  }

  async fetchStockHistory(symbol) {
    try {
      const url = `${CONFIG.BASE_URL}/historical-price-full/${symbol}?serietype=line&apikey=${CONFIG.API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.historical || [];
    } catch (error) {
      console.error("Error fetching stock history:", error);
      throw error;
    }
  }

  displayCompanyInfo(company) {
    const elements = {
      companyName: this.container.querySelector("#companyName"),
      companySymbol: this.container.querySelector("#companySymbol"),
      companyLogo: this.container.querySelector("#companyLogo"),
      companyWebsite: this.container.querySelector("#companyWebsite"),
      stockPrice: this.container.querySelector("#stockPrice"),
      stockChange: this.container.querySelector("#stockChange"),
      marketCap: this.container.querySelector("#marketCap"),
      companyDesc: this.container.querySelector("#companyDesc")
    };

    elements.companyName.textContent = company.companyName || "N/A";
    elements.companySymbol.textContent = company.symbol || "N/A";

    if (company.image) {
      elements.companyLogo.src = company.image;
      elements.companyLogo.style.display = "block";
      elements.companyLogo.onerror = () => (elements.companyLogo.style.display = "none");
    }

    if (company.website) {
      elements.companyWebsite.href = company.website;
      elements.companyWebsite.style.display = "inline-block";
    }

    const price = company.price ?? "N/A";
    elements.stockPrice.textContent = this.formatCurrency(price);

    const changePercent = company.changes ?? null;
    if (changePercent !== undefined && changePercent !== null) {
      const change = parseFloat(changePercent);
      elements.stockChange.textContent = `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;

      if (change >= 0) {
        elements.stockChange.className = "stock-change positive";
      } else {
        elements.stockChange.className = "stock-change negative";
      }
    } else {
      elements.stockChange.textContent = "N/A";
      elements.stockChange.className = "stock-change";
    }

    const marketCap = company.mktCap ?? null;
    elements.marketCap.textContent = this.formatLargeNumber(marketCap);

    const description = company.description ?? "No description available.";
    elements.companyDesc.textContent = description;
  }

  createStockChart(historicalData) {
    const ctx = this.container.querySelector("#stockChart").getContext("2d");

    const sortedData = historicalData
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-90); // last 90 days

    const labels = sortedData.map((item) => item.date);
    const prices = sortedData.map((item) => item.close);

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Stock Price",
            data: prices,
            borderColor: "#667eea",
            backgroundColor: "rgba(102, 126, 234, 0.1)",
            borderWidth: 2,
            fill: true,
            pointRadius: 1,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: "Price (USD)",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  showLoading(show) {
    const loading = this.container.querySelector("#companyLoading");
    loading.style.display = show ? "block" : "none";
  }

  showContent(show) {
    const content = this.container.querySelector("#companyContent");
    content.style.display = show ? "block" : "none";
  }

  showChart(show) {
    const chartLoading = this.container.querySelector("#chartLoading");
    const stockChart = this.container.querySelector("#stockChart");
    
    chartLoading.style.display = show ? "none" : "block";
    stockChart.style.display = show ? "block" : "none";
  }

  showChartError(message) {
    const chartLoading = this.container.querySelector("#chartLoading");
    chartLoading.innerHTML = `<p>${message}</p>`;
  }

  showError(message) {
    this.showLoading(false);
    const errorContainer = this.container.querySelector("#errorContainer");
    errorContainer.innerHTML = `
      <div class="error-message">
        ${this.escapeHtml(message)}
      </div>
    `;
  }

  formatCurrency(value) {
    if (!value || isNaN(value)) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  formatLargeNumber(value) {
    if (!value || isNaN(value)) return "N/A";
    if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
    return value.toLocaleString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getCompanyData() {
    return this.companyData;
  }

  getSymbol() {
    return this.symbol;
  }

  // cleanup
  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}

// export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompanyInfo;
}