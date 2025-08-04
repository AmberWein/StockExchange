class SearchForm {
  constructor(element) {
    this.container = element;
    this.searchCallback = null;
    this.isLoading = false;

    this.init();
  }

  init() {
    this.createFormStructure();
    this.bindEvents();
  }

  createFormStructure() {
    this.container.innerHTML = "";
    this.container.className = "search-container";
    this.container.innerHTML = `
            <input
                type="text"
                id="searchInput"
                placeholder="Search for companies (e.g., Apple, Microsoft, Tesla)..."
            />
            <button id="searchButton">Search</button>
        `;

    this.searchInput = this.container.querySelector("#searchInput");
    this.searchButton = this.container.querySelector("#searchButton");
  }

  bindEvents() {
    this.searchButton.addEventListener("click", () => {
      this.handleSearch();
    });

    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleSearch();
      }
    });

    // focus on input (better UX)
    this.searchInput.focus();
  }

  async handleSearch() {
    const query = this.searchInput.value.trim();

    if (!query) {
      this.showError("please enter a search term");
      return;
    }

    if (this.isLoading) return;

    try {
      this.setLoadingState(true);
      const companies = await this.searchCompanies(query);

      // callback with results
      if (this.searchCallback) {
        this.searchCallback(companies);
      }
    } catch (error) {
      console.error("search error:", error);
      this.showError("failed to search companies, please try again");
    } finally {
      this.setLoadingState(false);
    }
  }

  async searchCompanies(query) {
    const url = `${CONFIG.BASE_URL}/search?query=${encodeURIComponent(
      query
    )}&limit=10&exchange=NASDAQ&apikey=${CONFIG.API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const companies = await response.json();

    if (!companies || companies.length === 0) {
      return [];
    }

    const detailedDataPromises = companies.map((company) =>
      fetch(
        `${CONFIG.BASE_URL}/profile/${company.symbol}?apikey=${CONFIG.API_KEY}`
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) =>
          Array.isArray(data) && data.length > 0 ? data[0] : null
        )
        .catch((err) => {
          console.error(`failed to fetch profile for ${company.symbol}:`, err);
          return null;
        })
    );

    const detailedCompanies = await Promise.all(detailedDataPromises);

    // filter null results
    return detailedCompanies.filter((company) => company !== null);
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    this.searchButton.disabled = loading;
    this.searchButton.textContent = loading ? "Searching..." : "Search";

    if (loading) {
      this.searchInput.disabled = true;
    } else {
      this.searchInput.disabled = false;
    }
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    errorDiv.style.marginTop = "10px";

    // remove any existing error messages
    const existingError = this.container.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    this.container.appendChild(errorDiv);

    // remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  onSearch(callback) {
    this.searchCallback = callback;
  }

  getSearchValue() {
    return this.searchInput.value.trim();
  }

  clearSearch() {
    this.searchInput.value = "";
  }

  setSearchValue(value) {
    this.searchInput.value = value;
  }
}

// export
if (typeof module !== "undefined" && module.exports) {
  module.exports = SearchForm;
}
