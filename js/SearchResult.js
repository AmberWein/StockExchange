class SearchResult {
    constructor(element) {
        this.container = element;
        this.companies = [];
        
        this.init();
    }

    init() {
        this.container.className = 'results-container';
        
        this.clearResults();
    }

    renderResults(companies) {
        this.companies = companies;
        
        if (!companies || companies.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHTML = companies.map(company => this.createCompanyItem(company)).join('');
        this.container.innerHTML = resultsHTML;
    }

    createCompanyItem(company) {
        const changeRaw = company.changesPercentage || company.changes || 0;
        const changeValue = parseFloat(changeRaw);
        const changeClass = changeValue >= 0 ? 'positive' : 'negative';
        const changeDisplay = isNaN(changeValue) ? 'N/A' : 
            `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(2)}%`;

        const imageUrl = company.image || '';
        const imageHtml = imageUrl ? 
            `<img class="company-logo" src="${imageUrl}" alt="${this.escapeHtml(company.companyName || 'Company')} Logo" 
             onerror="this.style.display='none'" />` : 
            `<div class="company-logo-placeholder">${(company.symbol || '?').charAt(0)}</div>`;

        return `
            <a href="company.html?symbol=${encodeURIComponent(company.symbol)}" class="company-item">
                ${imageHtml}
                <div class="company-info">
                    <div class="company-name">${this.escapeHtml(company.companyName || 'N/A')}</div>
                    <div class="company-symbol">${this.escapeHtml(company.symbol || 'N/A')}</div>
                </div>
                <div class="stock-change ${changeClass}">${changeDisplay}</div>
            </a>
        `;
    }

    showNoResults() {
        this.container.innerHTML = `
            <div class="no-results">
                No companies found. Try a different search term.
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="error-message">
                ${this.escapeHtml(message)}
            </div>
        `;
    }

    showLoading() {
        this.container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Searching companies...</p>
            </div>
        `;
    }

    clearResults() {
        this.container.innerHTML = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCompanies() {
        return this.companies;
    }

    getCompanyCount() {
        return this.companies.length;
    }

    filterResults(filterFn) {
        const filteredCompanies = this.companies.filter(filterFn);
        this.renderResults(filteredCompanies);
        return filteredCompanies;
    }

    sortResults(sortFn) {
        const sortedCompanies = [...this.companies].sort(sortFn);
        this.renderResults(sortedCompanies);
        return sortedCompanies;
    }

    highlightSearchTerm(term) {
        if (!term) return;
        
        const companyItems = this.container.querySelectorAll('.company-name, .company-symbol');
        companyItems.forEach(item => {
            const text = item.textContent;
            const highlightedText = text.replace(
                new RegExp(`(${term})`, 'gi'),
                '<mark>$1</mark>'
            );
            if (highlightedText !== text) {
                item.innerHTML = highlightedText;
            }
        });
    }
}

// export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchResult;
}