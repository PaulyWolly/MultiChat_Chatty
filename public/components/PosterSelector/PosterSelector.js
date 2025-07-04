// PosterSelector.js
// Modular component for selecting and saving TMDB posters for TV or movies

export default class PosterSelector {
    constructor(mode = 'tv') {
        this.mode = mode;
        this.isInitialized = false;
        this.htmlTemplate = null;
        this.containerElement = null;
        this.init = this.init.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.destroy = this.destroy.bind(this);
        this.handleEvent = this.handleEvent.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handlePosterClick = this.handlePosterClick.bind(this);
    }

    async init() {
        if (this.isInitialized) return;
        await Promise.all([
            this.loadCSS(),
            this.loadHTML()
        ]);
        this.createFromTemplate();
        this.setupElements();
        this.setupEventListeners();
        this.isInitialized = true;
        this.show();
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="PosterSelector.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/PosterSelector/PosterSelector.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/PosterSelector/PosterSelector.html');
                if (!response.ok) throw new Error('Failed to fetch PosterSelector.html');
                this.htmlTemplate = await response.text();
                resolve();
            } catch (err) { reject(err); }
        });
    }

    createFromTemplate() {
        const existing = document.getElementById('poster-selector-container');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
    }

    setupElements() {
        this.containerElement = document.getElementById('poster-selector-container');
        this.closeBtn = document.getElementById('poster-selector-close');
        this.searchBtn = document.getElementById('poster-selector-search');
        this.queryInput = document.getElementById('poster-selector-query');
        this.feedback = document.getElementById('poster-selector-feedback');
        this.grid = document.getElementById('poster-selector-grid');
    }

    setupEventListeners() {
        if (this.closeBtn) this.closeBtn.onclick = this.destroy;
        if (this.searchBtn) this.searchBtn.onclick = this.handleSearch;
    }

    show() {
        if (this.containerElement) this.containerElement.style.display = 'block';
    }

    hide() {
        if (this.containerElement) this.containerElement.style.display = 'none';
    }

    destroy() {
        if (this.containerElement) this.containerElement.remove();
    }

    async handleSearch() {
        const query = this.queryInput.value.trim();
        this.feedback.textContent = '';
        this.grid.innerHTML = '';
        if (!query) {
            this.feedback.textContent = 'Please enter a search query.';
            return;
        }
        this.feedback.textContent = 'Searching...';
        let url = `/api/tmdb/posters/${this.mode}?query=${encodeURIComponent(query)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!data.posters || data.posters.length === 0) {
                this.feedback.textContent = 'No posters found.';
                return;
            }
            this.feedback.textContent = '';
            this.grid.innerHTML = data.posters.map((poster, idx) => `
                <div class="poster-selector-item" style="display:inline-block;margin:10px;text-align:center;">
                    <img src="${poster.poster_url}" alt="Poster" style="width:140px;height:auto;border-radius:6px;box-shadow:0 2px 8px #0002;cursor:pointer;" data-idx="${idx}" />
                    <div style="margin-top:6px;font-size:14px;">${poster.name || poster.title} (${poster.year})</div>
                </div>
            `).join('');
            Array.from(this.grid.querySelectorAll('img')).forEach((img, i) => {
                img.onclick = () => this.handlePosterClick(data.posters[i]);
            });
        } catch (err) {
            this.feedback.textContent = 'Error fetching posters.';
        }
    }

    async handlePosterClick(poster) {
        this.feedback.textContent = 'Saving selection...';
        try {
            const res = await fetch('/api/tmdb/posters/selection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: this.mode, id: poster.id || poster.title, poster })
            });
            const data = await res.json();
            if (data.success) {
                this.feedback.style.color = '#090';
                this.feedback.textContent = 'Poster selection saved!';
                setTimeout(() => this.destroy(), 1200);
            } else {
                this.feedback.style.color = '#c00';
                this.feedback.textContent = data.error || 'Failed to save selection.';
            }
        } catch (err) {
            this.feedback.style.color = '#c00';
            this.feedback.textContent = 'Error saving selection.';
        }
    }
}
