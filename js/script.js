const API_KEY = CONFIG.API_KEY;
const BASE_URL = CONFIG.BASE_URL;

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const loadingIndicator = document.getElementById("loadingIndicator");
const resultsContainer = document.getElementById("resultsContainer");

async function searchCompanies(query) {
  if (!query.trim()) {
    showError("Please enter a search term");
    return;
  }

  showLoading(true);
  clearResults();

  try {
    const url = `${BASE_URL}/search?query=${encodeURIComponent(
      query
    )}&limit=10&exchange=NASDAQ&apikey=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const companies = await response.json();
    displayResults(companies);
  } catch (error) {
    console.error("Search error:", error);
    showError(
      "Failed to search companies, please check your API key and try again."
    );
  } finally {
    showLoading(false);
  }
}

async function displayResults(companies) {
  if (!companies || companies.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No companies found, try a different search term.</div>';
    return;
  }

  // fetch detailed profiles for each company
  const detailedDataPromises = companies.map((company) =>
    fetch(`${BASE_URL}/profile/${company.symbol}?apikey=${API_KEY}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => (Array.isArray(data) && data.length > 0 ? data[0] : null))
      .catch((err) => {
        console.error(`Failed to fetch profile for ${company.symbol}:`, err);
        return null;
      })
  );

  const detailedCompanies = await Promise.all(detailedDataPromises);

  // filter out null results and create HTML
  const validCompanies = detailedCompanies.filter(company => company !== null);

  if (validCompanies.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No detailed company information found.</div>';
    return;
  }

  const resultsHTML = validCompanies
    .map((company) => {
      // handle stock change percentage
      const changeRaw = company.changesPercentage || company.changes || 0;
      const changeValue = parseFloat(changeRaw);
      const changeClass = changeValue >= 0 ? "positive" : "negative";
      const changeDisplay = isNaN(changeValue) ? "N/A" : 
        `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(2)}%`;

      // handle company image with fallback
      const imageUrl = company.image || '';
      const imageHtml = imageUrl ? 
        `<img class="company-logo" src="${imageUrl}" alt="${escapeHtml(company.companyName || 'Company')} Logo" 
         onerror="this.style.display='none'" />` : 
        `<div class="company-logo-placeholder">${(company.symbol || '?').charAt(0)}</div>`;

      return `
        <a href="company.html?symbol=${encodeURIComponent(company.symbol)}" class="company-item">
          ${imageHtml}
          <div class="company-info">
            <div class="company-name">${escapeHtml(company.companyName || "N/A")}</div>
            <div class="company-symbol">${escapeHtml(company.symbol || "N/A")}</div>
          </div>
          <div class="stock-change ${changeClass}">${changeDisplay}</div>
        </a>
      `;
    })
    .join("");

  resultsContainer.innerHTML = resultsHTML;
}

function showLoading(show) {
  loadingIndicator.style.display = show ? "block" : "none";
  searchButton.disabled = show;
  searchButton.textContent = show ? "Searching..." : "Search";
}

function clearResults() {
  resultsContainer.innerHTML = "";
}

function showError(message) {
  resultsContainer.innerHTML = `<div class="error-message">${escapeHtml(
    message
  )}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  searchCompanies(query);
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    searchCompanies(query);
  }
});

searchInput.focus();
