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

function displayResults(companies) {
  if (!companies || companies.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No companies found, try a different search term.</div>';
    return;
  }

  const resultsHTML = companies
    .map(
      (company) => `
                <a href="company.html?symbol=${encodeURIComponent(
                  company.symbol
                )}" class="company-item">
                    <div class="company-name">${escapeHtml(
                      company.name || "N/A"
                    )}</div>
                    <div class="company-symbol">${escapeHtml(
                      company.symbol || "N/A"
                    )}</div>
                </a>
            `
    )
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
