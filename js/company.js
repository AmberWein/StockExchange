function getSymbolFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("symbol");
}

function formatCurrency(value) {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatLargeNumber(value) {
  if (!value) return "N/A";
  if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
  if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
  return value.toLocaleString();
}

async function fetchCompanyProfile(symbol) {
  const endpoint = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${CONFIG.API_KEY}`;
  
  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      const errorMsg = `failed to fetch company profile, status: ${response.status}`;
      console.error(errorMsg);
      showError(errorMsg); 
      return null;
    }

    const data = await response.json();
    // console.log("endpoint returned data:", data); // debug log

    if (
      data &&
      (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
    ) {
      return Array.isArray(data) ? data[0] : data;
    } else {
      const noDataMsg = "no company data found for this symbol.";
      console.warn(noDataMsg);
      showError(noDataMsg);
      return null;
    }
  } catch (error) {
    console.error("error fetching company profile:", error);
    showError("an error occurred while fetching the company profile.");
    return null;
  }
}

async function fetchStockHistory(symbol) {
  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${CONFIG.API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log("Stock history data:", data); // debug log
    return data.historical || [];
  } catch (error) {
    console.error("Error fetching stock history:", error);
    throw error;
  }
}

function displayCompanyInfo(company) {
  // console.log("Full company object:", company); // debug log
  // console.log("Available keys:", Object.keys(company || {})); // debug log

  document.getElementById("companyName").textContent = company.companyName;
  document.getElementById("companySymbol").textContent = company.symbol;

  if (company.image) {
    const logo = document.getElementById("companyLogo");
    logo.src = company.image;
    logo.style.display = "block";
    logo.onerror = () => (logo.style.display = "none");
  }

  if (company.website) {
    const website = document.getElementById("companyWebsite");
    website.href = company.website;
    website.style.display = "inline-block";
  }

  const price = company.price ?? "N/A";
  console.log("Final price value:", price);
  document.getElementById("stockPrice").textContent = formatCurrency(price);

  const changeElement = document.getElementById("stockChange");
  const changePercent = company.changes ?? null;
  console.log("Final change value:", changePercent);

  if (changePercent !== undefined && changePercent !== null) {
    const change = parseFloat(changePercent);
    changeElement.textContent = `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;

    if (change >= 0) {
      changeElement.className = "stock-change positive";
    } else {
      changeElement.className = "stock-change negative";
    }
  } else {
    changeElement.textContent = "N/A";
    changeElement.className = "stock-change";
  }

  const marketCap = company.mktCap ?? null;
  console.log("Final market cap value:", marketCap);
  document.getElementById("marketCap").textContent =
    formatLargeNumber(marketCap);

  const description = company.description ?? "No description available.";
  console.log("Description:", description);
  document.getElementById("companyDesc").textContent = description;
}

function createStockChart(historicalData) {
  const ctx = document.getElementById("stockChart").getContext("2d");

  const sortedData = historicalData
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-90); // last 90 days

  const labels = sortedData.map((item) => item.date);
  const prices = sortedData.map((item) => item.close);

  new Chart(ctx, {
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

async function loadCompanyData() {
  const symbol = getSymbolFromURL();

  if (!symbol) {
    showError("No company symbol provided in URL");
    return;
  }

  try {
    document.getElementById("companyLoading").style.display = "block";

    const company = await fetchCompanyProfile(symbol);

    if (!company) {
      throw new Error("Company not found");
    }

    displayCompanyInfo(company);

    document.getElementById("companyLoading").style.display = "none";
    document.getElementById("companyContent").style.display = "block";

    try {
      const historyData = await fetchStockHistory(symbol);

      if (historyData && historyData.length > 0) {
        createStockChart(historyData);
        document.getElementById("chartLoading").style.display = "none";
        document.getElementById("stockChart").style.display = "block";
      } else {
        document.getElementById("chartLoading").innerHTML =
          "<p>No historical data available</p>";
      }
    } catch (chartError) {
      console.error("Chart loading error:", chartError);
      document.getElementById("chartLoading").innerHTML =
        "<p>Failed to load chart data</p>";
    }
  } catch (error) {
    console.error("Error loading company data:", error);
    document.getElementById("companyLoading").style.display = "none";
    showError(
      "Failed to load company information. Please check the company symbol and try again."
    );
  }
}

// Load data when page loads
document.addEventListener("DOMContentLoaded", loadCompanyData);
