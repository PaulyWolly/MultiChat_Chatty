class YouTubeSearchManager {
    constructor(onResultsRendered) {
        this.isInitialized = false;
        this.currentVideoId = null;
        this.videoContainer = null;
        this.isVideoPlaying = false;
        this.onResultsRendered = onResultsRendered || (() => {});
        
        this.pagination = {
            currentPage: 1,
            totalPages: 1,
            originalQuery: null,
                searchType: 'search',
            isActive: false,
            isMinimized: false,
            hasSearched: false,
            lastNextPageToken: null,
            navigationHistory: [],
            currentHistoryIndex: -1,
            restoreLastSearch: null
        };
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.pagination.restoreLastSearch = () => {
            if (this.pagination.navigationHistory && this.pagination.navigationHistory.length > 0) {
                const lastState = this.pagination.navigationHistory[this.pagination.navigationHistory.length - 1];
                if (lastState) {
                    this.renderRealYoutubeResults(
                        lastState.videos,
                        lastState.page,
                        lastState.totalPages,
                        lastState.subject,
                        lastState.type,
                        false, 
                        null,  
                        false  
                    );
                }
            }
        };
        
        this.isInitialized = true;
        console.log('🎬 YouTubeSearchManager initialized');
    }

    renderRealYoutubePaginationBar(page, totalPages, subject) {
        let type = 'search';
        const newSubject = this.pagination.originalQuery || subject;

        if (this.pagination.searchType) {
            type = this.pagination.searchType;
        } else if (
            newSubject &&
            (subject.toLowerCase().includes('channel:') ||
            subject.toLowerCase().startsWith('youtube channel') ||
            subject.toLowerCase().startsWith('youtube search channel'))
        ) {
            type = 'channel';
        }
       
        const existingRealBars = document.querySelectorAll('.real-youtube-pagination-bar');
        existingRealBars.forEach(bar => bar.remove());

        // This function seems to hide the bar it's about to create. Let's show it instead.
        const realBar = document.createElement('div');
        realBar.className = 'real-youtube-pagination-bar';
        realBar.style.display = 'flex'; // Ensure it's visible
        realBar.innerHTML = `
            <div id="pagination-drag-tab" class="drag-tab">
                <img src="/assets/img/drag-me.png" class="drag-me-icon" alt="Drag Me" title="Drag to move pagination bar">
                <button class="query-history-btn" title="View Query History">
                    <span class="query-history-icon">📚</span>
                    <span class="query-history-text">YouTube Query History</span>
                    </button>
                <div class="query-history-dropdown">
                    <div class="query-history-header">Query History</div>
                    <div class="query-history-list"></div>
                </div>
            </div>
            <div class="pagination-bar-content">
                <button class="back-to-top-btn" title="Back to TOP (First Query)">
                    <img src="/assets/img/first-page.svg" alt="|<<" class="btn-icon">
                </button>
                <button class="query-start-btn" title="Back to Query Start">
                    <img src="/assets/img/prev-page.svg" alt="<<" class="btn-icon">
                </button>
                <button class="back-btn" title="Back One Page">
                    <img src="/assets/img/back.svg" alt="<" class="btn-icon">
                </button>
                <button class="more-page-btn" title="More Results">MORE</button>
                <button class="next-btn" title="Next Page">
                    <img src="/assets/img/forward.svg" alt="Next" class="forward-icon">
                    </button>
                </div>
        `;

        document.body.appendChild(realBar);

        const dragTab = realBar.querySelector('#pagination-drag-tab');
        
        if (dragTab) {
            let offsetX = 0, offsetY = 0;
            
            dragTab.onmousedown = function(e) {
                e.preventDefault();
                offsetX = e.clientX - realBar.getBoundingClientRect().left;
                offsetY = e.clientY - realBar.getBoundingClientRect().top;
                realBar.classList.add('dragging');
                
                function onMouseMove(e) {
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;
                    const clampedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - realBar.offsetWidth));
                    const clampedTop = Math.max(0, Math.min(newTop, window.innerHeight - realBar.offsetHeight));
                    realBar.style.left = clampedLeft + 'px';
                    realBar.style.top = clampedTop + 'px';
                    realBar.style.right = 'auto';
                    realBar.style.bottom = 'auto';
                }
                
                function onMouseUp() {
                    realBar.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
        }
        
        realBar.querySelector('.more-page-btn').addEventListener('click', async () => {
            if (!this.pagination.currentPage) this.pagination.currentPage = 1;
            this.pagination.currentPage++;
            await this.handleYoutubeRequest(newSubject, true, null, { action: 'next' });
        });

        realBar.querySelector('.back-btn').addEventListener('click', () => {
            if (this.pagination.currentPage > 1) {
                this.pagination.currentPage--;
                this.handleYoutubeRequest(newSubject, true, null, { action: 'back' });
            }
        });

        realBar.querySelector('.next-btn').addEventListener('click', () => {
            this.pagination.currentPage++;
            this.handleYoutubeRequest(newSubject, true, null, { action: 'next' });
        });

        realBar.querySelector('.query-start-btn').addEventListener('click', () => {
            this.pagination.currentPage = 1;
            this.handleYoutubeRequest(newSubject, true, null, { action: 'start' });
        });

        realBar.querySelector('.back-to-top-btn').addEventListener('click', () => {
            this.pagination.currentPage = 1;
            this.handleYoutubeRequest(newSubject, true, null, { action: 'top' });
        });

        const queryHistoryBtn = realBar.querySelector('.query-history-btn');
        const queryHistoryDropdown = realBar.querySelector('.query-history-dropdown');
        
        if (queryHistoryBtn && queryHistoryDropdown) {
            queryHistoryBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isVisible = queryHistoryDropdown.classList.toggle('show');
                if (isVisible) await this.renderQueryHistory();
            });

            document.addEventListener('click', (e) => {
                if (!queryHistoryDropdown.contains(e.target) && !queryHistoryBtn.contains(e.target)) {
                    queryHistoryDropdown.classList.remove('show');
                }
            });
        }
        this.updatePaginatorToggleIcon();
    }

    renderMinimizedPaginatorBar() {
        if (!this.pagination.hasSearched) {
            const minimizedBar = document.getElementById('minimized-paginator-bar');
            if (minimizedBar) minimizedBar.style.display = 'none';
            return;
        }

        let minimizedBar = document.getElementById('minimized-paginator-bar');
        if (!this.pagination.isMinimized) {
            if (minimizedBar) minimizedBar.style.display = 'none';
            return;
        }
        if (!minimizedBar) {
            minimizedBar = document.createElement('div');
            minimizedBar.id = 'minimized-paginator-bar';
            minimizedBar.className = 'minimized-paginator-bar';
            minimizedBar.innerHTML = '<span>🔄 Restore YouTube Search</span>';
            minimizedBar.title = 'Click to restore YouTube paginator and last search';
            minimizedBar.onclick = () => {
                this.pagination.isMinimized = false;
                minimizedBar.style.display = 'none';
                if (this.pagination.restoreLastSearch) this.pagination.restoreLastSearch();
            };
            document.body.appendChild(minimizedBar);
        }
        minimizedBar.style.display = 'block';
        this.hideAllPaginationBars();
    }

    hideAllPaginationBars() {
        document.querySelectorAll('.real-youtube-pagination-bar, .mock-pagination-bar').forEach(el => el.style.display = 'none');
        setTimeout(() => this.updatePaginatorToggleIcon(), 50);
    }

    togglePaginatorBar() {
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        if (realBar) {
             realBar.style.display = realBar.style.display === 'none' ? 'flex' : 'none';
        }
        this.updatePaginatorToggleIcon();
    }

    updatePaginatorToggleIcon() {
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        let toggleIcon = document.querySelector('.show-paginator-bar');
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble');
        
        if (youtubeContainers.length === 0) {
            if (toggleIcon) toggleIcon.remove();
            return;
        }
        if (!toggleIcon) toggleIcon = this.createPaginatorToggleIcon();
        
        const paginationBarVisible = realBar && realBar.style.display !== 'none';
        if (toggleIcon) toggleIcon.style.display = paginationBarVisible ? 'none' : 'flex';
    }

    createPaginatorToggleIcon() {
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble');
        if (youtubeContainers.length === 0) return null;
        
        const latestContainer = youtubeContainers[youtubeContainers.length - 1];
        if (latestContainer.querySelector('.show-paginator-bar')) return latestContainer.querySelector('.show-paginator-bar');
        
        const toggleIcon = document.createElement('div');
        toggleIcon.className = 'show-paginator-bar';
        toggleIcon.innerHTML = '🔥';
        toggleIcon.title = 'Show/Hide YouTube Paginator';
        toggleIcon.onclick = () => this.togglePaginatorBar();
        
        latestContainer.appendChild(toggleIcon);
        this.updatePaginatorToggleIcon();
        return toggleIcon;
    }

    setYouTubeCacheWithTimestamp(cacheKey, data) {
        try {
            if (!data.timestamp) data.timestamp = Date.now();
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Clearing oldest cache entries and retrying.');
                // Clear a few oldest entries to make some space
                this.clearOldestCacheEntries(5); 
                try {
                    // Retry setting the item
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                } catch (e2) {
                    console.error('Failed to set cache item even after clearing entries:', e2);
                    if (window.showToast) {
                        window.showToast('Cache is full. Could not save search results.', 'error');
                    }
                }
                } else {
                console.error('Error setting YouTube cache:', e);
            }
        }
    }

    clearOldestCacheEntries(count) {
        const youtubeCacheItems = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_')) {
                try {
                    const item = localStorage.getItem(key);
                    const data = JSON.parse(item);
                    if (data && data.timestamp) {
                        youtubeCacheItems.push({ key: key, timestamp: data.timestamp });
                    }
                } catch (err) {
                    console.warn(`Removing invalid cache entry: ${key}`);
            localStorage.removeItem(key);
                }
            }
        }

        youtubeCacheItems.sort((a, b) => a.timestamp - b.timestamp);

        const itemsToRemove = youtubeCacheItems.slice(0, count);
        itemsToRemove.forEach(item => {
            console.log(`Clearing old YouTube cache entry: ${item.key}`);
            localStorage.removeItem(item.key);
        });
    }

    getCacheWithAgeCheck(key, maxAgeHours = 24) {
                const cachedData = localStorage.getItem(key);
        if (!cachedData) return null;
                    try {
                        const data = JSON.parse(cachedData);
            if (!data.timestamp || (Date.now() - data.timestamp) > (maxAgeHours * 3600000)) {
                localStorage.removeItem(key);
                return null;
            }
            return data;
                    } catch (e) {
            return null;
        }
    }

    async handleYoutubeRequest(subject, isPagination = false, messageText = null, options = {}) {
        if (!this.pagination.hasSearched) this.pagination.hasSearched = true;
        
        let type = 'search';
        if (subject.match(/^youtube\s+(?:search\s+)?channel:/i)) type = 'channel';

        let currentPage = this.pagination.currentPage || 1;
        if (isPagination && options.action) {
            if (options.action === 'next') currentPage++;
            else if (options.action === 'back' && currentPage > 1) currentPage--;
            else if (options.action === 'start' || options.action === 'top') currentPage = 1;
        }
        this.pagination.currentPage = currentPage;

        if (!isPagination) {
            this.pagination.originalQuery = subject;
            this.pagination.searchType = type;
            this.cleanupBrokenYouTubeElements();
            await this.addToQueriesHistory(subject);
        }
        
        const cacheKey = `yt_${subject}_${type}_${this.pagination.currentPage}`;
        const cachedData = this.getCacheWithAgeCheck(cacheKey, 24);

        if (cachedData && cachedData.videos) {
            if (window.showToast) window.showToast('⚡ Loaded from cache', 'cache');
            this.renderRealYoutubeResults(cachedData.videos, cachedData.page, cachedData.totalPages, subject, type, true, null, options.isOverwrite);
            return;
        }

        if (window.QuotaMonitor && window.QuotaMonitor.shouldBlockAPICall()) {
            this.onResultsRendered('assistant', 'YouTube API quota exceeded. No cached results available.');
            return;
        }
        
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/youtube/search'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: subject, type, page: this.pagination.currentPage })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();

            if (!data.success) {
                console.error('YouTube search failed:', data.error);
                if (window.showToast) {
                    window.showToast(`YouTube search failed: ${data.error || 'Unknown error'}`, 'error');
                }
                return;
            }

            // Update the Quota Monitor with fresh data from the server
            if (data.quota && window.quotaMonitor && typeof window.quotaMonitor.updateQuota === 'function') {
                window.quotaMonitor.updateQuota(data.quota.used, data.quota.limit);
            }

            // Update cache
            this.setYouTubeCacheWithTimestamp(cacheKey, data);

            

            if (data.isMock) throw new Error('Server returned invalid data format.');

            if (!data.success) throw new Error(data.error || 'API request failed');

            this.setYouTubeCacheWithTimestamp(cacheKey, data);
            if (data.nextPageToken) sessionStorage.setItem('youtube_nextPageToken', data.nextPageToken);
            this.renderRealYoutubeResults(data.videos, this.pagination.currentPage, data.totalPages, subject, type, isPagination, messageText, options.isOverwrite);
        } catch (error) {
            console.error('Error fetching YouTube results:', error);
            this.onResultsRendered('assistant', `Error fetching YouTube results: ${error.message}`);
        }
    }

    async renderRealYoutubeResults(videos, page, totalPages, subject, type, isPagination, originalMessageText, isOverwrite) {
        const validVideos = (videos || []).filter(v => v && v.id);
        if (validVideos.length === 0) {
            this.onResultsRendered('assistant', '❌ No valid YouTube videos found.', { mock: false });
            return;
        }
    
        let youtubeMultiBubble = document.getElementById('youtube-results-bubble');
        const isUpdate = !!youtubeMultiBubble;
        if (!isUpdate || isOverwrite) {
            if (isUpdate && isOverwrite) youtubeMultiBubble.remove();
            youtubeMultiBubble = document.createElement('div');
            youtubeMultiBubble.id = 'youtube-results-bubble';
            youtubeMultiBubble.className = 'youtube-multi-bubble';
        } else {
            youtubeMultiBubble.innerHTML = '';
        }
    
        const cleanSubject = this.extractCleanQuery(subject);
        youtubeMultiBubble.innerHTML = `
            <div class="youtube-header-section">
                <div class="youtube-header-container">
                    <div class="youtube-header-left">
                        <h3 class="youtube-header-title">📺 YouTube Results: "${cleanSubject}"</h3>
            </div>
                    <div class="youtube-header-right">
                        <button class="view-playlists-btn" onclick="window.playlistManager?.show('${subject}');">View Playlists</button>
                        <span class="youtube-page-info">Page ${page || 1} of ${totalPages || 'many'}</span>
                 </div>
            </div>
                </div>
            <ul class="video-list">
                ${validVideos.map(video => `
                    <li class="video-item">
                        <div class="button-thumb-group-MULTI top-buttons">
                            <button class="youtube-action-btn popup-btn" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}');">Play in Popup</button>
                            <button class="add-to-playlist-MULTI-btn" data-video='${JSON.stringify(video)}'><span class="plus-sign">+</span></button>
                        </div>
                        <span class="youtube-thumb-link" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}');">
                            <img class="youtube-thumb-img" src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                        </span>
                        <div class="video-title">${video.title}</div>
                        <div class="button-thumb-group-MULTI bottom-buttons">
                            <button class="youtube-action-btn youtube-direct-link-improved" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank');">
                                <span class="watch-on-youtube-icon">🎬</span> Watch on YouTube
                    </button>
                </div>
                        <div class="video-channel">${video.channelTitle || 'N/A'}</div>
                    </li>
                `).join('')}
            </ul>`;
    
        const renderOptions = { isYoutube: true, subject: subject };
        if (!isUpdate || isOverwrite) {
            this.onResultsRendered('assistant', youtubeMultiBubble.outerHTML, renderOptions);
        } else {
            document.getElementById('youtube-results-bubble').replaceWith(youtubeMultiBubble);
        }

        this.scrollToYouTubeResults();
        this.renderRealYoutubePaginationBar(page, totalPages, subject);
        this.pagination = { ...this.pagination, currentPage: page, totalPages, originalQuery: subject, searchType: type };
        this.pagination.navigationHistory.push({ videos, page, totalPages, subject, type });
        this.updatePaginatorToggleIcon();
    }

    openYoutubePopup(videoId) { this.showVideo(videoId); }

    showVideo(videoId) {
        this.hideVideo();
        this.videoContainer = document.createElement('div');
        this.videoContainer.className = 'video-popup-overlay';
        this.videoContainer.innerHTML = `
            <div class="video-popup">
                <div class="video-popup-header">
                    <h3>YouTube Video</h3>
                    <button class="close-video-btn" onclick="window.youtubeSearchManager.hideVideo()">×</button>
                </div>
                <div class="video-popup-content">
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allowfullscreen></iframe>
                </div>
            </div>`;
        document.body.appendChild(this.videoContainer);
    }

    hideVideo() { if (this.videoContainer) this.videoContainer.remove(); }
    cleanupBrokenYouTubeElements() { document.getElementById('youtube-results-bubble')?.remove(); }

    async addToQueriesHistory(query) {
        const cleanQuery = this.extractCleanQuery(query);
        if (!cleanQuery) return;
        let localHistory = JSON.parse(localStorage.getItem('youtubeQueryHistory')) || [];
        localHistory = [cleanQuery, ...localHistory.filter(item => item !== cleanQuery)].slice(0, 50);
        localStorage.setItem('youtubeQueryHistory', JSON.stringify(localHistory));
        await this.saveQueryToDb(cleanQuery);
    }

    async saveQueryToDb(query) {
        const sessionId = window.sessionId;
        if (!sessionId || !query) return;
        try {
            await fetch('/api/youtube/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, query }),
            });
        } catch (error) { console.error('Error saving query to DB:', error); }
    }

    async deleteQueryFromHistory(query) {
        if (!query) return;
        let localHistory = JSON.parse(localStorage.getItem('youtubeQueryHistory')) || [];
        localStorage.setItem('youtubeQueryHistory', JSON.stringify(localHistory.filter(item => item !== query)));
        const sessionId = window.sessionId;
        if (!sessionId) return;
        try {
            await fetch(`/api/youtube/history/${sessionId}/${encodeURIComponent(query)}`, { method: 'DELETE' });
        } catch (error) { console.error('Error deleting query from DB:', error); }
    }

    async renderQueryHistory() {
        const historyList = document.querySelector('.query-history-list');
        if (!historyList) return;
        historyList.innerHTML = '<div class="query-history-item">Loading...</div>';

        const sessionId = window.sessionId;
        let dbHistory = [];
        if (sessionId) {
            try {
                const response = await fetch(`/api/youtube/history/${sessionId}`);
                if (response.ok) dbHistory = await response.json();
            } catch (error) { console.error('Error fetching DB history:', error); }
        }
        
        const localHistory = JSON.parse(localStorage.getItem('youtubeQueryHistory')) || [];
        const savedQueries = new Set(dbHistory);
        const uniqueQueries = [...new Set([...localHistory, ...dbHistory])];
        
        historyList.innerHTML = uniqueQueries.length 
            ? uniqueQueries.map(query => {
                const isSaved = savedQueries.has(query);
                return `
                    <div class="query-history-item" data-query="${query}">
                        <span class="query-history-item-text">${query}</span>
                        <div class="query-history-item-icons">
                            ${isSaved ? '<span class="history-status-icon saved" title="Saved to cloud"></span>' : ''}
                            ${!isSaved ? `<span class="history-action-icon save-history" title="Save to cloud">💾</span>` : ''}
                            <span class="history-action-icon delete-history" title="Delete from history">🗑️</span>
                        </div>
                    </div>
                `;
            }).join('')
            : '<div class="query-history-item">No history found.</div>';
    
        historyList.querySelectorAll('.query-history-item').forEach(item => {
            const query = item.dataset.query;
            const fullQuery = `youtube search ${query}`;

            item.querySelector('.query-history-item-text').addEventListener('click', () => {
                this.handleYoutubeRequest(fullQuery);
                document.querySelector('.query-history-dropdown')?.classList.remove('show');
            });

            item.querySelector('.save-history')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.saveQueryToDb(query);
                await this.renderQueryHistory();
            });

            item.querySelector('.delete-history')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteQueryFromHistory(query);
                await this.renderQueryHistory();
            });
        });
    }

    getCurrentYouTubeQuery() { return this.pagination.originalQuery; }

    extractCleanQuery(query) {
        if (!query) return '';
        return query.replace(/^youtube\s+(search\s+|channel:)?/i, '').trim();
    }

    scrollToYouTubeResults() {
        document.querySelector('#youtube-results-bubble')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeSearchManager;
}
export default YouTubeSearchManager;