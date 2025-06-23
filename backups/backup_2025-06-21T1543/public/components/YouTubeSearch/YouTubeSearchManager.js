// ═══════════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████ REAL YOUTUBE MODULE ██████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════════════
// This module handles all REAL YouTube functionality with actual API calls
// Uses real YouTube Data API v3, real pagination, and actual search results
// Complete segregation from MOCK YouTube module - NO BLEEDING ALLOWED
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * YouTubeSearchManager Component
 * 
 * Handles REAL YouTube functionality with actual API calls to YouTube Data API v3
 * COMPLETELY SEGREGATED from mock YouTube functionality - NO BLEEDING ALLOWED
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

class YouTubeSearchManager {
    constructor() {
        this.savedQueries = new Map();
        this.isInitialized = false;
        this.template = null;
        this.allQueriesHistory = [];
        this.initializePaginationState();
        this.setupEventListeners();
    }

    /**
     * Initialize the YouTubeSearchManager
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📚 [YOUTUBE-DB] Initializing YouTubeSearchManager');
            await this.loadTemplate();
            await this.loadSavedQueries();
            this.isInitialized = true;
        } catch (error) {
            console.error('📚 [YOUTUBE-DB] Initialization error:', error);
        }
    }

    async loadTemplate() {
        try {
            const response = await fetch('/components/YouTubeSearch/YouTubeSearchManager.html');
            const html = await response.text();
            const parser = new DOMParser();
            this.template = parser.parseFromString(html, 'text/html');
        } catch (error) {
            console.error('Failed to load YouTubeSearchManager template:', error);
        }
    }

    /**
     * Load saved queries from the database
     */
    async loadSavedQueries() {
        try {
            const response = await fetch(window.appConfig.getApiUrl(`/api/youtube/saved-searches?userId=${window.sessionId}`));
            const data = await response.json();
            
            if (data.success) {
                this.savedQueries.clear();
                data.searches.forEach(search => {
                    this.savedQueries.set(search.query, search);
                });
                console.log('📚 [YOUTUBE-DB] Loaded', this.savedQueries.size, 'saved queries');
            }
        } catch (error) {
            console.error('📚 [YOUTUBE-DB] Error loading saved queries:', error);
        }
    }

    /**
     * Save a search query to the database
     */
    async saveQuery(query) {
        try {
            console.log('💾 [YOUTUBE-DB] Saving query:', query);
            
            // Get current search metadata
            const searchMetadata = {
                searchType: 'search',
                lastPageViewed: window.youtubePagination.currentPage,
                totalResults: window.youtubePagination.totalPages
            };
            
            // Get cache keys for this query
            const cacheKeys = [];
            let page = 1;
            while (page <= 10) {
                const cacheKey = `yt_${query}_search_${page}`;
                if (localStorage.getItem(cacheKey)) {
                    cacheKeys.push(cacheKey);
                    page++;
                } else {
                    break;
                }
            }
            
            // Prepare request data
            const requestData = {
                query,
                userId: window.sessionId,
                displayName: query.replace(/^youtube\s+search\s+/i, '').trim(),
                totalPages: window.youtubePagination.totalPages,
                videoCount: window.youtubePagination.currentVideos?.length || 0,
                cacheKeys,
                searchMetadata
            };
            
            // Send save request
            const response = await fetch(window.appConfig.getApiUrl('/api/youtube/save-search'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('💾 [YOUTUBE-DB] Successfully saved query:', data.search);
                this.savedQueries.set(query, data.search);
                this.showToast('✅ Search saved to database', 'success');
                this.updateUI();
            } else {
                throw new Error(data.error || 'Failed to save search');
            }
        } catch (error) {
            console.error('💾 [YOUTUBE-DB] Error saving query:', error);
            this.showToast('❌ Failed to save search', 'error');
        }
    }

    /**
     * Check if a query is saved in the database
     */
    isQuerySaved(query) {
        return this.savedQueries.has(query);
    }

    /**
     * Update the UI to reflect saved queries
     */
    updateUI() {
        const historyItems = document.querySelectorAll('.query-history-item');
        historyItems.forEach(item => {
            const query = item.getAttribute('data-query');
            const ledIndicator = item.querySelector('.query-led');
            const saveButton = item.querySelector('.query-history-save');
            
            if (this.isQuerySaved(query)) {
                // Show green LED for saved queries
                if (ledIndicator) {
                    ledIndicator.className = 'query-led green';
                    ledIndicator.innerHTML = '🟢';
                    ledIndicator.title = 'Saved in database';
                }
                // Hide save button for saved queries
                if (saveButton) {
                    saveButton.style.display = 'none';
                }
            } else {
                // Show save button for unsaved queries
                if (saveButton) {
                    saveButton.style.display = 'inline-block';
                }
            }
        });
    }

    /**
     * Get the UI configuration for saved queries
     */
    getUIConfig() {
        return {
            ledIndicators: {
                saved: '🟢',
                unsaved: ''
            },
            saveButton: '💾',
            deleteButton: '❌'
        };
    }

    isQuotaExceeded() {
        if (!window.quotaManager) return false;
        return window.quotaManager.isQuotaExceeded();
    }
    
    /**
     * Check if cache is expired
     */
    isCacheExpired(cachedData, maxAgeHours = 24) {
        if (!cachedData.timestamp) return true; // No timestamp = expired
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
        const age = now - cachedData.timestamp;
        const ageHours = (age / (60 * 60 * 1000)).toFixed(1);
        
        console.log(`⏰ [CACHE-AGE] Cache is ${ageHours} hours old (max: ${maxAgeHours}h)`);
        return age > maxAge;
    }

    /**
     * Sets a key in localStorage with a timestamp and the data payload.
     * The payload should be an object, e.g., { videos: [...], totalPages: 5 }
     */
    setCacheWithTimestamp(key, payload) {
        if (!key || !payload) return;
        const dataToStore = {
            timestamp: Date.now(),
            data: payload // Store the entire payload
        };
        try {
            localStorage.setItem(key, JSON.stringify(dataToStore));
            console.log(`💾 [CACHE-SET] Stored data for key: ${key}`, dataToStore);
        } catch (e) {
            console.error(`Error setting cache for key ${key}:`, e);
        }
    }

    /**
     * Gets data from localStorage if it's not expired.
     * Returns the full cached object: { timestamp, data: { videos, totalPages } }
     */
    getCacheWithAgeCheck(key, maxAgeHours = 24) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) {
            return null;
        }

        try {
            const item = JSON.parse(itemStr);
            if (!item.timestamp || !item.data) {
                console.warn(`[CACHE-WARN] Malformed cache item for key: ${key}`);
                localStorage.removeItem(key);
                return null;
            }

            if (this.isCacheExpired(item, maxAgeHours)) {
                console.log(`🗑️ [CACHE-EXPIRED] Removing stale cache for key: ${key}`);
                localStorage.removeItem(key);
                return null;
            }

            console.log(`✅ [CACHE-HIT] Fresh cache found for key: ${key}`);
            return item; // Return the full object: { timestamp, data }
        } catch (error) {
            console.error(`[CACHE-ERROR] Could not parse cache for key ${key}:`, error);
            localStorage.removeItem(key); // Clear corrupted data
            return null;
        }
    }

    async pruneYouTubeCache(requiredBytes) {
        console.warn(`Pruning YouTube cache. Need to free up at least ${requiredBytes} bytes.`);
        
        const savedQueries = new Set(Array.from(this.savedQueries.keys()));

        let items = Object.keys(localStorage)
            .filter(key => key.startsWith('yt_'))
            .map(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    const query = key.replace(/^yt_/, '').replace(/_search_\d+$/, '');
                    return {
                        key: key,
                        timestamp: item.timestamp,
                        size: localStorage.getItem(key).length,
                        isSaved: savedQueries.has(query) 
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean);

        const savedItems = items.filter(item => item.isSaved);
        let unsavedItems = items.filter(item => !item.isSaved);
        unsavedItems.sort((a, b) => a.timestamp - b.timestamp);

        let bytesFreed = 0;
        
        for (const item of unsavedItems) {
            if (bytesFreed >= requiredBytes) break;
            bytesFreed += item.size;
            localStorage.removeItem(item.key);
        }
        
        if (bytesFreed < requiredBytes) {
            savedItems.sort((a, b) => a.timestamp - b.timestamp);
            for (const item of savedItems) {
                if (bytesFreed >= requiredBytes) break;
                bytesFreed += item.size;
                localStorage.removeItem(item.key);
            }
        }
        return bytesFreed;
    }

    renderYoutubeResults(videos, page, totalPages, subject) {
        let resultsContainer = document.querySelector('.youtube-result-bubble');
        if (!resultsContainer) {
            const bubbleTemplate = this.template.querySelector('.youtube-result-bubble');
            resultsContainer = bubbleTemplate.cloneNode(true);
            const messageElement = addMessageToChat('assistant', '', { allowEmpty: true });
            messageElement.appendChild(resultsContainer);
        }

        resultsContainer.querySelector('.youtube-query-subject').textContent = subject.replace(/^(youtube\s+search|search|youtube)\s+/i, '').trim();
        
        const videoGrid = resultsContainer.querySelector('.youtube-video-grid');
        videoGrid.innerHTML = '';
        videos.forEach(video => {
            const videoElement = this.createVideoElement(video);
            videoGrid.appendChild(videoElement);
        });

        const paginationBarContainer = resultsContainer.querySelector('.youtube-pagination-bar');
        paginationBarContainer.innerHTML = '';
        const paginationBar = this.renderRealYoutubePaginationBar(page, totalPages, subject);
        paginationBarContainer.appendChild(paginationBar);
    }

    createVideoElement(video) {
        const template = this.template.getElementById('youtube-video-item-template').content.cloneNode(true);
        const item = template.querySelector('.youtube-video-item');
        item.querySelector('.youtube-video-thumbnail').src = video.thumbnail;
        item.querySelector('.youtube-video-thumbnail').alt = video.title;
        item.querySelector('.youtube-video-title').textContent = video.title;
        item.onclick = () => this.openYoutubePopup(video.videoId);
        return item;
    }

    // Consolidated and corrected pagination bar rendering function
    renderRealYoutubePaginationBar(page, totalPages, subject) {
        const barId = `real-youtube-pagination-bar-current`;
        
        // Nuke all old bars to prevent duplicates
        document.querySelectorAll('.real-youtube-pagination-bar').forEach(b => b.remove());

        const bar = this.template.querySelector('.real-youtube-pagination-bar').cloneNode(true);
        bar.id = barId;
        bar.style.display = 'flex';
        
        const buttonsContainer = bar.querySelector('.pagination-bar-content-real');
        if (!buttonsContainer) return; // Exit if template is broken

        // Playlist button
        const viewPlaylistsBtn = this.template.querySelector('.view-playlists-btn-real').cloneNode(true);
        viewPlaylistsBtn.onclick = () => {
            if (window.playlistManager) {
                const query = this.getCurrentYouTubeQuery();
                // Pass a contextual object
                window.playlistManager.show({ query: this._extractCleanQuery(query), source: 'youtube' });
            }
        };
        buttonsContainer.appendChild(viewPlaylistsBtn);
        
        // Navigation buttons
        const backToTopBtn = bar.querySelector('.back-to-top-btn');
        const queryStartBtn = bar.querySelector('.query-start-btn');
        const backBtn = bar.querySelector('.back-btn');
        const moreBtn = bar.querySelector('.more-page-btn');
        const nextBtn = bar.querySelector('.next-btn');

        if(backToTopBtn) backToTopBtn.onclick = () => this.handleRealTopNavigation();
        if(queryStartBtn) queryStartBtn.onclick = () => this.handleTopNavigation();
        if(backBtn) backBtn.onclick = () => this.handleBackNavigation();
        if(nextBtn) nextBtn.onclick = () => this.handleNextNavigation();
        if(moreBtn) moreBtn.onclick = async () => {
             // Logic for loading more results...
        };

        document.body.appendChild(bar);
        this.updateButtonStates();
    }
    
    handleNextNavigation() {
        if (window.youtubePagination.currentHistoryIndex < window.youtubePagination.navigationHistory.length - 1) {
            window.youtubePagination.currentHistoryIndex++;
            const nextState = window.youtubePagination.navigationHistory[window.youtubePagination.currentHistoryIndex];
            if (nextState) {
                window.youtubePagination.currentPage = nextState.page || 1;
                window.youtubePagination.totalPages = window.youtubePagination.navigationHistory.length;
                this.renderRealYoutubeResults(
                    nextState.videos,
                    nextState.page,
                    window.youtubePagination.totalPages,
                    nextState.subject,
                    nextState.type,
                    false, null, false
                );
            }
        }
        this.updateButtonStates();
    }

    handleBackNavigation() {
        if (window.youtubePagination.currentHistoryIndex > 0) {
            window.youtubePagination.currentHistoryIndex--;
            const prevState = window.youtubePagination.navigationHistory[window.youtubePagination.currentHistoryIndex];
            if (prevState) {
                window.youtubePagination.currentPage = prevState.page || 1;
                window.youtubePagination.totalPages = window.youtubePagination.navigationHistory.length;
                this.renderRealYoutubeResults(
                    prevState.videos,
                    prevState.page,
                    window.youtubePagination.totalPages,
                    prevState.subject,
                    prevState.type,
                    false, null, false
                );
            }
        }
        this.updateButtonStates();
    }

    handleTopNavigation() {
        if (window.youtubePagination.currentQueryStartIndex >= 0) {
            const topState = window.youtubePagination.navigationHistory[window.youtubePagination.currentQueryStartIndex];
            if (topState) {
                window.youtubePagination.currentHistoryIndex = window.youtubePagination.currentQueryStartIndex;
                window.youtubePagination.currentPage = topState.page || 1;
                window.youtubePagination.totalPages = topState.totalPages || 1;
                this.renderRealYoutubeResults(topState.videos, topState.page, topState.totalPages, topState.subject, topState.type, false, null, false);
            }
        }
        this.updateButtonStates();
    }

    handleRealTopNavigation() {
        if (window.youtubePagination.allQueriesHistory.length > 0) {
            const firstQuery = window.youtubePagination.allQueriesHistory[0];
            if (firstQuery) {
                window.youtubePagination.currentHistoryIndex = 0;
                window.youtubePagination.currentPage = firstQuery.page || 1;
                window.youtubePagination.totalPages = firstQuery.totalPages || 1;
                this.renderRealYoutubeResults(firstQuery.videos, firstQuery.page, firstQuery.totalPages, firstQuery.subject, firstQuery.type, false, null, false);
            }
        }
        this.updateButtonStates();
    }

    createQueryHistoryDropdown() {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'query-history-dropdown';
        dropdownContainer.innerHTML = `
            <button class="query-history-button">📜 Query History</button>
            <div class="query-history-list-container">
                <div class="query-history-list"></div>
            </div>
        `;
        const button = dropdownContainer.querySelector('.query-history-button');
        button.onclick = () => this.onQueryHistoryDropdownOpen();
        return dropdownContainer;
    }

    async onQueryHistoryDropdownOpen() {
        await this.loadSavedQueries(); 
        const localQueries = this.getLocalQueries();
        const allQueries = this.mergeAndDedupeQueries(localQueries, Array.from(this.savedQueries.values()));
        this.renderQueryDropdown(allQueries);
        document.querySelector('.query-history-list-container').classList.toggle('show');
    }

    getLocalQueries() {
        return Object.keys(localStorage)
            .filter(key => key.startsWith('yt_'))
            .map(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    return {
                        query: key.replace(/^yt_/, '').replace(/_search_\d+$/, ''),
                        timestamp: item.timestamp
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean)
            .reduce((acc, current) => {
                const existing = acc.find(item => item.query === current.query);
                if (!existing) {
                    acc.push(current);
                }
                return acc;
            }, []);
    }

    mergeAndDedupeQueries(local, db) {
        const combined = [...db, ...local];
        const unique = new Map();
        combined.forEach(item => {
            if (!unique.has(item.query)) {
                unique.set(item.query, item);
            }
        });
        return Array.from(unique.values()).sort((a,b) => b.timestamp - a.timestamp);
    }
    
    renderQueryDropdown(queries) {
        const list = document.querySelector('.query-history-list');
        if (!list) return;

        list.innerHTML = queries.map(item => this.createQueryHistoryItemHTML(item)).join('');
        
        list.querySelectorAll('.query-history-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleYoutubeRequest(item.dataset.query, false, null, { overwrite: true });
            });
        });
    }

    createQueryHistoryItemHTML(item) {
        const displayQuery = item.query.replace(/^youtube\s+search\s+/i, '').trim();
        const isSaved = this.isQuerySaved(item.query);
        const led = isSaved ? '<span class="query-led green" title="Saved to database">🟢</span>' : '';
        const timeAgo = this.formatTimeAgo(item.timestamp);

        return `
            <div class="query-history-item" data-query="${item.query}">
                <div class="query-history-content">
                    <div class="query-history-query">${led}${displayQuery}</div>
                    <div class="query-history-time">${timeAgo}</div>
                </div>
            </div>`;
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const seconds = Math.floor((now - new Date(timestamp)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    openYoutubePopup(videoId) {
        const width = Math.floor(window.screen.width * 0.9);
        const height = Math.floor(width * (9/16));
        const left = Math.floor((window.screen.width - width) / 2);
        const top = Math.floor((window.screen.height - height) / 2);
    
        const popup = window.open(
            `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&vq=hd1080&hd=1`,
            'YouTubePlayer',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no`
        );
    
        if (popup) {
            popup.focus();
        } else {
            alert('Please allow popups for this site to play videos in a new window.');
        }
    }

    createVideoContainer() {
        if (!this.videoContainer) {
            const container = document.createElement('div');
            container.id = 'youtube-container';
            container.className = 'youtube-container hidden';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'youtube-close-btn';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = () => this.hideVideo();

            const videoWrapper = document.createElement('div');
            videoWrapper.id = 'youtube-video';
            videoWrapper.className = 'youtube-video';

            container.appendChild(closeBtn);
            container.appendChild(videoWrapper);
            document.body.appendChild(container);
            this.videoContainer = container;
        }
    }

    showVideo(videoId) {
        this.createVideoContainer();
        const videoWrapper = document.getElementById('youtube-video');
        videoWrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        this.videoContainer.classList.remove('hidden');
    }

    hideVideo() {
        if (this.videoContainer) {
            const videoWrapper = document.getElementById('youtube-video');
            videoWrapper.innerHTML = '';
            this.videoContainer.classList.add('hidden');
        }
    }

    showFallbackMessage(videoId) {
        const videoWrapper = document.getElementById('youtube-video');
        videoWrapper.innerHTML = `
            <div class="youtube-error">
                <p>Unable to play video in embedded player.</p>
                <p>You can watch it directly on YouTube:</p>
                <a href="https://www.youtube.com/watch?v=${videoId}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   class="youtube-direct-link">
                    Watch on YouTube
                </a>
            </div>
        `;
    }

    renderMultiVideoLayout(videos, page, totalPages, subject, type = 'search') {
        const displayTitle = type === 'play' ? `📺 Found results for "${subject.replace(/youtube\s+/i, "").trim()}"` : '📺 YouTube Results';
        
        const cleanSubject = subject.replace(/^(youtube\s+search|search|youtube)\s+/i, '').trim();
        let dynamicDisplayTitle = displayTitle;
        if (cleanSubject && type !== 'play') {
            dynamicDisplayTitle = `📺 YouTube Results: "${cleanSubject}"`;
        }
        return `<div class="youtube-multi-bubble"><h3>${dynamicDisplayTitle}</h3><span>Page ${page}${totalPages ? ` of ${totalPages}` : ' of many'}</span><ul class="video-list">${videos.map(video => `<li class="video-item"><div>${video.title}</div><img src="${video.thumbnail}" alt="${video.title}"><div>${video.channelTitle}</div></li>`).join('')}</ul></div>`;
    }

    async handleYoutubeRequest(subject, isPagination = false, messageText = null, options = {}) {
        
        const cleanSubject = this._extractCleanQuery(subject);

        const { overwrite = false, page: requestedPage = 1 } = options;

        if (overwrite) {
            this.cleanupOldResults();
        }

        const query = messageText || subject;
        this.addToQueriesHistory(query); // Add to history

        let currentPage = window.youtubePagination.currentPage || 1;
        if (isPagination) {
            currentPage = requestedPage;
        }

        const cacheKey = `yt_${query}_search_${currentPage}`;
        const cachedItem = this.getCacheWithAgeCheck(cacheKey);

        if (cachedItem && !overwrite) {
            console.log('✅ [CACHE-HIT] Rendering from cache:', cachedItem);
            // The cachedItem object contains a `data` property with { videos, totalPages }
            this.renderYoutubeResults(cachedItem.data.videos, currentPage, cachedItem.data.totalPages, query, 'search', true, true);
            return;
        }

        if (this.isQuotaExceeded()) {
            this.showToast('YouTube API quota exceeded. Please try again later.', 'error');
            return;
        }

        try {
            const apiUrl = window.appConfig.getApiUrl(`/api/youtube/search?q=${encodeURIComponent(query)}&page=${currentPage}`);
            console.log('🎬 [YOUTUBE] Making API call to:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('🎬 [YOUTUBE] Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🎬 [YOUTUBE] HTTP Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            console.log('🎬 [YOUTUBE] Content-Type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('🎬 [YOUTUBE] Non-JSON response:', responseText.substring(0, 200));
                throw new Error('Server returned non-JSON response');
            }
            
            const data = await response.json();
            console.log('🎬 [YOUTUBE] API response received:', data);

            if (data.success) {
                // Cache the entire data object which includes videos and totalPages
                this.setCacheWithTimestamp(cacheKey, { videos: data.videos, totalPages: data.totalPages });
                
                this.renderRealYoutubeResults(data.videos, currentPage, data.totalPages, query, 'search', true, isPagination, query);
                
                if (window.quotaManager) {
                    window.quotaManager.updateUsage(1);
                }
            } else {
                throw new Error(data.message || 'Failed to fetch YouTube results');
            }
        } catch (error) {
            console.error('❌ [API-ERROR] Error handling YouTube request:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }

    _extractCleanQuery(query) {
        if (!query) return '';
        // More robustly remove prefixes like "youtube search for", "youtube results:", etc.
        return query
            .replace(/^(youtube\s?(search|results)?\s?(for)?\s?:?)/i, '')
            .replace(/["']/g, '')
            .trim();
    }

    cleanupOldResults() {
        const oldResultBubble = document.querySelector('.youtube-result-bubble');
        if (oldResultBubble) {
            oldResultBubble.remove();
        }
    }

    addToQueriesHistory(query) {
        // Check if this is a new query
        const lastQuery = this.allQueriesHistory[this.allQueriesHistory.length - 1];
        if (!lastQuery || lastQuery.query !== query) {
            this.allQueriesHistory.push({
                query: query,
                timestamp: Date.now()
            });
            console.log('🔍 Added new query to history:', query);
        }
    }

    /**
     * Initialize pagination state
     */
    initPaginationState() {
        this.paginationState = {
            currentPage: 1,
            totalPages: 1,
            originalQuery: '',
            navigationHistory: [],
            currentHistoryIndex: -1,
            allQueriesHistory: []
        };
    }

    /**
     * Update paginator toggle icon visibility
     */
    updatePaginatorToggleIcon() {
        console.log('🔥 [ICON] Simple ternary check');
        
        const mockBar = document.querySelector('.mock-pagination-bar');
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        const toggleIcon = document.querySelector('.show-paginator-bar');
        
        // Check if we have YouTube results - if not, remove icon
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        if (youtubeContainers.length === 0) {
            if (toggleIcon) toggleIcon.remove();
            return;
        }

        // Create icon if missing
        if (!toggleIcon) {
            this.createPaginatorToggleIcon();
            return;
        }

        // SIMPLE TERNARY LOGIC: If pagination bar visible → hide icon, else → show icon
        const paginationBarVisible = (mockBar && mockBar.style.display !== 'none') || 
                                     (realBar && realBar.style.display !== 'none');
        
        toggleIcon.style.display = paginationBarVisible ? 'none' : 'flex';
        toggleIcon.style.visibility = paginationBarVisible ? 'hidden' : 'visible';
        
        console.log('🔥 [ICON] Ternary result:', { 
            paginationBarVisible, 
            iconDisplay: toggleIcon.style.display 
        });
    }

    /**
     * Create and add the paginator toggle icon
     */
    createPaginatorToggleIcon() {
        console.log('📄 [ICON] Creating persistent icon...');
        
        // Find YouTube containers - MUST exist for icon to be created
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        console.log('📄 [ICON] Found YouTube containers:', youtubeContainers.length);
        
        if (youtubeContainers.length === 0) {
            console.log('📄 [ICON] ❌ NO YouTube containers found - NOT creating icon');
            return;
        }
        
        // Get the latest YouTube container
        const latestContainer = youtubeContainers[youtubeContainers.length - 1];
        console.log('📄 [ICON] Using YouTube container:', latestContainer.className);
        
        // Remove any existing icon first
        const existingIcon = document.querySelector('.show-paginator-bar');
        if (existingIcon) {
            console.log('📄 [ICON] Removing existing icon');
            existingIcon.remove();
        }
        
        const toggleIcon = document.createElement('div');
        toggleIcon.className = 'show-paginator-bar';
        toggleIcon.innerHTML = '🔥';
        toggleIcon.title = 'Show/Hide YouTube Paginator';
        toggleIcon.onclick = () => this.togglePaginatorBar();
        
        // IMPORTANT: Icon starts hidden (CSS default is display: none)
        // JavaScript will control visibility based on pagination bar state
        
        // Add ONLY to the YouTube container
        latestContainer.appendChild(toggleIcon);
        
        console.log('📄 [ICON] ✅ ICON CREATED (hidden by default) INSIDE YouTube container!');
        console.log('📄 [ICON] Icon parent:', toggleIcon.parentElement.className);
        
        // Update visibility based on current state
        this.updatePaginatorToggleIcon();
    }

    /**
     * Remove all pagination bars
     */
    hideAllPaginationBars() {
        console.log('🔄 Hiding all pagination bars...');
        document.querySelectorAll('.real-youtube-pagination-bar').forEach(el => el.remove());
        document.querySelectorAll('.mock-pagination-bar').forEach(el => el.remove());
        setTimeout(() => this.updatePaginatorToggleIcon(), 50);
        setTimeout(() => this.updatePaginatorToggleIcon(), 200);
    }

    /**
     * Get all YouTube queries from localStorage
     */
    getLocalStorageQueries() {
        const queries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_') && key.includes('_search_1')) {
                let query = key.replace(/^yt_/, '').replace(/_search_1$/, '');
                const cachedData = localStorage.getItem(key);
                if (cachedData) {
                    try {
                        const data = JSON.parse(cachedData);
                        if (data.timestamp) {
                            queries.push({
                                query: query,
                                timestamp: data.timestamp
                            });
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
        return queries;
    }

    /**
     * Merge and dedupe queries (by query string)
     */
    mergeAndDedupeQueries(localQueries, dbQueries) {
        const map = new Map();
        // Add DB queries first (so they take precedence)
        dbQueries.forEach(q => {
            if (q.query) map.set(q.query, q);
        });
        // Add local queries if not already present
        localQueries.forEach(q => {
            if (q.query && !map.has(q.query)) map.set(q.query, q);
        });
        // Return as array, sorted by timestamp descending if available
        return Array.from(map.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    /**
     * Fetch all saved YouTube queries from MongoDB and cache them in localStorage (once per session)
     */
    async fetchAndCacheAllSavedQueries() {
        if (localStorage.getItem('youtubeSavedQueriesFetched')) {
            console.log('[QUERY-HISTORY] Already fetched all saved queries this session.');
            return;
        }
        try {
            let apiUrl;
            if (window.appConfig && typeof window.appConfig.getApiUrl === 'function') {
                apiUrl = window.appConfig.getApiUrl('/api/youtube/saved-searches');
            } else if (window.appConfig && window.appConfig.backend && window.appConfig.backend.baseUrl) {
                apiUrl = window.appConfig.backend.baseUrl.replace(/\/$/, '') + '/api/youtube/saved-searches';
            } else {
                console.error('[QUERY-HISTORY] No valid API URL found in config. Cannot fetch saved queries.');
                return;
            }
            if (window.userId) {
                apiUrl += (apiUrl.includes('?') ? '&' : '?') + 'userId=' + encodeURIComponent(window.userId);
            }
            console.log('[QUERY-HISTORY] Fetching all saved queries from:', apiUrl);

            const res = await fetch(apiUrl);
            const data = await res.json();
            // Accept both 'searches' and 'savedSearches' for compatibility
            const searches = Array.isArray(data.searches) ? data.searches : (Array.isArray(data.savedSearches) ? data.savedSearches : []);
            if (data.success && Array.isArray(searches)) {
                // Enrich each query with totalPages and cacheKeysLength
                const enriched = searches.map(item => ({
                    ...item,
                    totalPages: item.totalPages || (item.cacheKeys ? item.cacheKeys.length : 0),
                    cacheKeysLength: item.cacheKeys ? item.cacheKeys.length : 0
                }));
                localStorage.setItem('youtubeSavedQueries', JSON.stringify(enriched));
                localStorage.setItem('youtubeSavedQueriesFetched', 'true');
                console.log('[QUERY-HISTORY] Cached all saved queries:', enriched.length);
            } else {
                console.warn('[QUERY-HISTORY] No searches array in backend response');
            }
        } catch (err) {
            console.error('[QUERY-HISTORY] Error fetching all saved queries:', err);
        }
    }

    /**
     * Get all queries for dropdown (merge localStorage and DB cache)
     */
    getAllQueriesForDropdown() {
        let dbQueries = [];
        try {
            dbQueries = JSON.parse(localStorage.getItem('youtubeSavedQueries')) || [];
        } catch (e) {
            dbQueries = [];
        }
        // Get local queries
        const localQueries = this.getLocalStorageQueries();
        // Merge and dedupe
        return this.mergeAndDedupeQueries(localQueries, dbQueries);
    }

    /**
     * Update dropdown open logic to use getAllQueriesForDropdown
     */
    async onQueryHistoryDropdownOpen() {
        console.log('[DEBUG] onQueryHistoryDropdownOpen called!');

        // Remove the session cache check so it always fetches fresh data
        localStorage.removeItem('youtubeSavedQueriesFetched');
        
        await this.fetchAndCacheAllSavedQueries();
        const allQueries = this.getAllQueriesForDropdown();
        this.renderQueryDropdown(allQueries);
    }

    /**
     * Render query dropdown with enhanced functionality
     */
    renderQueryDropdown(queries) {
        const dropdown = document.querySelector('.real-youtube-pagination-bar .query-history-dropdown');
        const list = dropdown ? dropdown.querySelector('.query-history-list') : null;
        if (!dropdown || !list) return;
        if (!queries.length) {
            list.innerHTML = '<div class="query-history-empty">No query history available</div>';
            return;
        }
        list.innerHTML = queries
            .map(item => {
                const pageCount = item.cacheKeysLength || item.totalPages || 0;
                if (pageCount === 0) return ''; // Hide queries with zero pages
                const timeAgo = this.formatTimeAgo(item.timestamp || item.lastSearched || (item.searchMetadata && item.searchMetadata.lastSearched));
                const displayQuery = (item.query || '')
                    .replace(/^youtube\s+search\s+/i, '')
                    .replace(/^youtube\s+/i, '')
                    .replace(/^search\s+/i, '')
                    .trim();
                return `
                    <div class="query-history-item" data-query="${item.query}">
                        <div class="query-history-content">
                            <div class="query-history-query"><span class="query-led green" title="Saved to database">🟢</span>${displayQuery}</div>
                            <div class="query-history-pages-time">
                                <span class="query-history-time">${timeAgo}</span>
                            </div>
                        </div>
                        <div class="query-history-meta">
                            <button class="query-history-save" title="Save to database" disabled style="opacity:0.5;cursor:default;">💾</button>
                            <button class="query-history-delete" title="Delete this query">❌</button>
                        </div>
                    </div>
                `;
            })
            .filter(Boolean)
            .join('');
        // Add click handlers for navigation, save, and delete
        list.querySelectorAll('.query-history-item').forEach(item => {
            item.addEventListener('click', () => {
                const query = item.dataset.query;
                let resultBubble = document.querySelector('.youtube-result-bubble');
                if (resultBubble && this.handleYoutubeRequest) {
                    this.handleYoutubeRequest(query, false, null, { overwrite: true });
                } else if (this.handleYoutubeRequest) {
                    this.handleYoutubeRequest(query, false, null);
                }
            });
        });
        list.querySelectorAll('.query-history-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Save logic here (already saved, so disabled)
            });
        });
        list.querySelectorAll('.query-history-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Delete logic here
            });
        });
    }

    /**
     * Navigate to a query
     */
    navigateToQuery(query) {
        console.log('🔍 [HISTORY] Navigating to query:', query);

        // 1. Find all cached pages for this query
        const pages = [];
        let pageNum = 1;
        while (true) {
            const cacheKey = `yt_${query}_search_${pageNum}`;
            const cached = localStorage.getItem(cacheKey);
            if (!cached) break;
            const data = JSON.parse(cached);
            pages.push({
                videos: data.videos,
                page: pageNum,
                totalPages: pages.length + 1, // or use data.totalPages if available
                subject: query,
                type: 'search',
            });
            pageNum++;
        }

        // 2. Populate navigationHistory
        this.paginationState.navigationHistory = pages;
        this.paginationState.currentHistoryIndex = 0;
        this.paginationState.currentPage = 1;
        this.paginationState.totalPages = pages.length;
        this.paginationState.originalQuery = query;

        // 3. Render the first page
        if (pages.length > 0) {
            this.renderRealYoutubeResults(
                pages[0].videos,
                pages[0].page,
                pages[0].totalPages,
                pages[0].subject,
                pages[0].type,
                false, null, false
            );
        }

        // 4. Update paginator buttons
        this.updateButtonStates();

        // 5. Show toast notification
        if (window.showToast) {
            window.showToast(`📚 Switched to: ${query}`, 'info');
        }

        // 6. Update dynamic header
        if (typeof this.updateAllYouTubeHeaders === 'function') {
            this.updateAllYouTubeHeaders(query);
        }

        // 7. Re-render the dropdown to reflect updated page counts
        if (typeof this.renderQueryDropdown === 'function') {
            this.renderQueryDropdown(this.paginationState.allQueriesHistory);
        }

        // 8. Debug info
        console.log('📚 [PAGINATION] Query navigation state:', {
            query,
            currentPage: 1,
            totalPages: pages.length,
            cachedPages: pages.length
        });
    }

    /**
     * Toggle paginator bar visibility
     */
    togglePaginatorBar() {
        // Example logic: toggle visibility of the real and mock pagination bars
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        const mockBar = document.querySelector('.mock-pagination-bar');
        if (realBar && realBar.style.display !== 'none') {
            realBar.style.display = 'none';
        } else if (realBar) {
            realBar.style.display = '';
        }
        if (mockBar && mockBar.style.display !== 'none') {
            mockBar.style.display = 'none';
        } else if (mockBar) {
            mockBar.style.display = '';
        }
        // Optionally, update the icon's appearance or state here
        this.updatePaginatorToggleIcon();
    }

    /**
     * Update button states for pagination
     */
    updateButtonStates() {
        // Implementation for updating pagination button states
        // This would be called after navigation or page changes
        console.log('🔄 [PAGINATION] Updating button states');
    }

    /**
     * Render real YouTube results (placeholder for now)
     */
    renderRealYoutubeResults(videos, page, totalPages, subject, type = 'search', isPagination = false, originalMessageText = null, isOverwrite = false) {
        
        this.renderRealYoutubePaginationBar(page, totalPages, subject);

        // This is a placeholder - the actual implementation would be in the main render methods
        console.log('🎬 [RENDER] Rendering real YouTube results:', { videos: videos.length, page, totalPages, subject });
        this.renderMultiVideoLayout(videos, page, totalPages, subject, type);
    }

    /**
     * Update all YouTube headers (placeholder for now)
     */
    updateAllYouTubeHeaders(query) {
        // Implementation for updating YouTube result headers
        console.log('📝 [HEADERS] Updating headers for query:', query);
    }

    /**
     * Scroll to YouTube results
     */
    scrollToYouTubeResults() {
        const chatContainer = document.querySelector('#chat-messages');
        if (chatContainer) {
            // Find ALL YouTube-related messages
            const youtubeMessages = document.querySelectorAll('.message');
            let targetMessage = null;
            
            // Find the LAST message that contains YouTube content
            for (let i = youtubeMessages.length - 1; i >= 0; i--) {
                const message = youtubeMessages[i];
                if (message.querySelector('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock')) {
                    targetMessage = message;
                    break;
                }
            }
            
            if (targetMessage) {
                // Get the TOP of the message container (not the bubble inside it)
                const messageTop = targetMessage.offsetTop;
                chatContainer.scrollTop = messageTop - 90;
                console.log('📍 [SCROLL] Scrolled to TOP of YouTube message container');
                
                // FORCE the scroll to stick by setting it again after a tiny delay
                setTimeout(() => {
                    chatContainer.scrollTop = messageTop - 90;
                    console.log('📍 [SCROLL] FORCED scroll to stick at TOP');
                }, 50);
                
            } else {
                chatContainer.scrollTop = 0;
                console.log('📍 [SCROLL] No YouTube message found');
            }
        }
    }

    /**
     * Track icon style changes for debugging
     */
    trackIconStyleChanges() {
        const icons = document.querySelectorAll('.show-paginator-bar');
        icons.forEach((icon, index) => {
            // Use MutationObserver to track style changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        // Style change detected
                    }
                });
            });
            
            observer.observe(icon, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['style']
            });
        });
    }

    /**
     * Extract clean query text from various formats
     */
    extractCleanQuery(query) {
        if (!query) return null;
        
        const cleanQuery = query
            .replace(/^youtube\s+search\s+/i, '')
            .replace(/^youtube\s+/i, '')
            .replace(/^search\s+/i, '')
            .trim();
        
        return cleanQuery || query;
    }

    /**
     * Update ALL YouTube headers dynamically
     */
    updateAllYouTubeHeaders(newQuery) {
        console.log('🎯 [HEADER-UPDATE] Updating all YouTube headers to:', newQuery);
        
        // Store the current query context
        window.currentYouTubeQuery = newQuery;
        const cleanQuery = this.extractCleanQuery(newQuery);
        
        // Find all YouTube header elements and update them
        const headerElements = document.querySelectorAll('.youtube-header-title');
        let updatedCount = 0;
        
        headerElements.forEach(header => {
            const oldText = header.textContent;
            let newText;
            
            if (cleanQuery) {
                // Check if it's a mock or real header by looking at the existing icon
                if (oldText.includes('🎭')) {
                    newText = `🎭 Mock YouTube Results <span style="color: black;">"${cleanQuery}"</span>`;
                } else {
                    newText = `📺 YouTube Results <span style="color: black;">"${cleanQuery}"</span>`;
                }
            } else {
                // Fallback to generic headers
                if (oldText.includes('🎭')) {
                    newText = '🎭 Mock YouTube Results';
                } else {
                    newText = '📺 YouTube Results';
                }
            }
            
            header.innerHTML = newText;
            console.log('🎯 [HEADER-UPDATE] Updated header from:', oldText, 'to:', newText);
            updatedCount++;
        });
        
        console.log('🎯 [HEADER-UPDATE] Updated', updatedCount, 'header(s) to show query:', cleanQuery || 'generic');
        
        // Show user feedback
        if (cleanQuery && window.showToast) {
            window.showToast(`🎯 Now viewing: "${cleanQuery}"`, 'info', 2000);
        }
    }

    /**
     * Debug function for icon state
     */
    debugIconState() {
        console.log('🔥 [MANUAL DEBUG] === CURRENT STATE ===');
        const mockBar = document.querySelector('.mock-pagination-bar');
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        const toggleIcon = document.querySelector('.show-paginator-bar');
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        
        console.log('🔥 [MANUAL DEBUG] mockBar:', mockBar);
        console.log('🔥 [MANUAL DEBUG] realBar:', realBar);
        console.log('🔥 [MANUAL DEBUG] toggleIcon:', toggleIcon);
        console.log('🔥 [MANUAL DEBUG] YouTube containers:', youtubeContainers.length);
        
        if (mockBar) console.log('🔥 [MANUAL DEBUG] mockBar display:', mockBar.style.display);
        if (realBar) console.log('🔥 [MANUAL DEBUG] realBar display:', realBar.style.display);
        if (toggleIcon) console.log('🔥 [MANUAL DEBUG] toggleIcon display:', toggleIcon.style.display);
        
        console.log('🔥 [MANUAL DEBUG] === FORCED UPDATE COMPLETE ===');
    }

    /**
     * Debug function for pagination DOM
     */
    debugPaginationDOM() {
        console.log('🔍 [DIAGNOSTIC] === PAGINATION DOM ANALYSIS ===');
        
        // Check all possible pagination-related elements
        const mockBars = document.querySelectorAll('.mock-pagination-bar');
        const realBars = document.querySelectorAll('.real-youtube-pagination-bar');
        const moreButtons = document.querySelectorAll('.more-page-btn');
        const allButtons = document.querySelectorAll('button');
        const paginationElements = document.querySelectorAll('[class*="pagination"]');
        
        console.log('🔍 [DIAGNOSTIC] Found elements:');
        console.log('  - mockBars:', mockBars.length);
        console.log('  - realBars:', realBars.length);
        console.log('  - moreButtons:', moreButtons.length);
        console.log('  - allButtons:', allButtons.length);
        console.log('  - paginationElements:', paginationElements.length);
        
        // Log details of each type
        console.log('\n🔍 [DIAGNOSTIC] Mock bars:');
        mockBars.forEach((bar, i) => {
            const styles = window.getComputedStyle(bar);
            console.log(`  Mock bar ${i}: display=${styles.display}, visibility=${styles.visibility}, classes=${bar.className}`);
        });
        
        console.log('\n🔍 [DIAGNOSTIC] Real bars:');
        realBars.forEach((bar, i) => {
            const styles = window.getComputedStyle(bar);
            console.log(`  Real bar ${i}: display=${styles.display}, visibility=${styles.visibility}, classes=${bar.className}`);
        });
        
        console.log('\n🔍 [DIAGNOSTIC] MORE buttons:');
        moreButtons.forEach((btn, i) => {
            const styles = window.getComputedStyle(btn);
            console.log(`  MORE button ${i}: display=${styles.display}, visibility=${styles.visibility}, text=${btn.textContent}, classes=${btn.className}`);
        });
        
        // Look for the green MORE button specifically
        const greenButtons = Array.from(allButtons).filter(btn => 
            btn.textContent.includes('MORE') || 
            btn.style.backgroundColor.includes('green') ||
            btn.className.includes('green') ||
            btn.style.color.includes('green')
        );
        
        console.log('\n🔍 [DIAGNOSTIC] Green/MORE-like buttons:');
        greenButtons.forEach((btn, i) => {
            const styles = window.getComputedStyle(btn);
            console.log(`  Green button ${i}: display=${styles.display}, text="${btn.textContent}", classes=${btn.className}`);
            console.log(`    backgroundColor=${styles.backgroundColor}, color=${styles.color}`);
        });
        
        // Check for any pagination-related classes
        console.log('\n🔍 [DIAGNOSTIC] All pagination-related elements:');
        paginationElements.forEach((el, i) => {
            const styles = window.getComputedStyle(el);
            console.log(`  Pagination element ${i}: tag=${el.tagName}, classes=${el.className}, display=${styles.display}`);
        });
        
        // Look for the fire icon
        const fireIcon = document.querySelector('.show-paginator-bar');
        console.log('\n🔍 [DIAGNOSTIC] Fire icon:');
        if (fireIcon) {
            const styles = window.getComputedStyle(fireIcon);
            console.log(`  Fire icon: display=${styles.display}, visibility=${styles.visibility}`);
        } else {
            console.log('  Fire icon: NOT FOUND');
        }
        
        console.log('\n🔍 [DIAGNOSTIC] === END ANALYSIS ===');
    }

    /**
     * Test icon creation for debugging
     */
    testIconCreation() {
        console.log('🔥 [TEST] Manual icon creation test...');
        
        // Check if YouTube results exist
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        console.log('🔥 [TEST] YouTube containers found:', youtubeContainers.length);
        
        if (youtubeContainers.length > 0) {
            console.log('🔥 [TEST] Creating icon manually...');
            this.createPaginatorToggleIcon();
            
            setTimeout(() => {
                const icon = document.querySelector('.show-paginator-bar');
                console.log('🔥 [TEST] Icon after creation:', !!icon);
                if (icon) {
                    console.log('🔥 [TEST] Icon display:', icon.style.display);
                    console.log('🔥 [TEST] Icon computed display:', window.getComputedStyle(icon).display);
                }
            }, 100);
        } else {
            console.log('🔥 [TEST] No YouTube containers - cannot create icon');
        }
    }

    /**
     * Debug headers function
     */
    debugHeaders() {
        console.log('🔍 [HEADER-DEBUG] === HEADER STATE ANALYSIS ===');
        console.log('🔍 [HEADER-DEBUG] Current YouTube query:', window.currentYouTubeQuery);
        console.log('🔍 [HEADER-DEBUG] Pagination original query:', this.paginationState?.originalQuery);
        
        const headers = document.querySelectorAll('.youtube-header-title');
        console.log('🔍 [HEADER-DEBUG] Found', headers.length, 'YouTube headers:');
        
        headers.forEach((header, index) => {
            console.log(`🔍 [HEADER-DEBUG] Header ${index + 1}: "${header.textContent}"`);
        });
        
        console.log('🔍 [HEADER-DEBUG] === END ANALYSIS ===');
        
        return {
            currentQuery: window.currentYouTubeQuery,
            paginationQuery: this.paginationState?.originalQuery,
            headerCount: headers.length,
            headerTexts: Array.from(headers).map(h => h.textContent)
        };
    }

    // === PAGINATION STATE INITIALIZATION ===
    initializePaginationState() {
        // Initialize global pagination state
        window.youtubePagination = {
            history: [], // Array of {videos, pageToken, subject, type}
            currentIndex: 0,
            currentPage: 1, // Add currentPage initialization to prevent NaN
            isMock: false,
            isActive: false, // New flag to track if we're in an active YouTube search
            pageTokens: [], // Store pageTokens for each page
            navigationHistory: [], // Track user navigation for NEXT button
            currentHistoryIndex: 0, // Track current position in navigation history
            allQueriesHistory: [], // Track all YouTube queries ever made
            currentQueryStartIndex: 0, // Track where current query started in navigation history
            lastNextPageToken: null, // Store the nextPageToken for MORE button
            isMinimized: false // Track paginator minimization state
        };

        // Restore the last YouTube search method
        window.youtubePagination.restoreLastSearch = () => {
            if (window.youtubePagination.navigationHistory && window.youtubePagination.navigationHistory.length > 0) {
                const lastState = window.youtubePagination.navigationHistory[window.youtubePagination.navigationHistory.length - 1];
                if (lastState) {
                    this.renderRealYoutubeResults(
                        lastState.videos,
                        lastState.page,
                        lastState.totalPages,
                        lastState.subject,
                        lastState.type,
                        false, // isPagination
                        null,  // originalMessageText
                        false  // isOverwrite
                    );
                }
            }
        };
    }

    // === PAGINATION HELPER FUNCTIONS ===

    // Helper to update totalPages for the current query in allQueriesHistory
    updateQueryHistoryPageCount(query, page) {
        if (!window.youtubePagination.allQueriesHistory) return;
        
        // Update the total pages if the current page is higher
        if (!window.youtubePagination.allQueriesHistory) return;
        let entry = window.youtubePagination.allQueriesHistory.find(q => q.query === query);
        if (!entry) {
            entry = { query, totalPages: 1, timestamp: Date.now() };
            window.youtubePagination.allQueriesHistory.push(entry);
        }

        // Always use the highest cached page count
        const cachedPages = this.countCachedPages(query);
        entry.totalPages = Math.max(entry.totalPages || 1, page, cachedPages);
       
        entry.timestamp = Date.now(); // Update timestamp to reflect latest activity
        
        // Update the global pagination state if this is the current query
        if (window.youtubePagination.originalQuery === query) {
            window.youtubePagination.totalPages = entry.totalPages;
        }
        
        console.log('📚 [PAGINATION] Updated page count for query:', {
            query,
            totalPages: entry.totalPages,
            currentPage: page
        });
    }

    // Count cached pages for a query (helper function)
    countCachedPages(query) {
        if (!query) return 0;
        const cacheKey = `youtube_${query.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return 0;
        
        try {
            const data = JSON.parse(cached);
            return data.totalPages || 1;
        } catch (e) {
            return 0;
        }
    }

    // === REAL YOUTUBE RENDERING FUNCTIONS ===

    // Real YouTube results rendering function
    renderRealYoutubeResults(videos, page, totalPages, subject, type = 'search', isPagination = false, originalMessageText = null, isOverwrite = false) {
        console.log('🌐 [REAL] renderRealYoutubeResults called with:', { videos, page, totalPages, subject, type, isPagination, originalMessageText, isOverwrite });
        
        if (!videos || !Array.isArray(videos)) {
            console.log('🌐 [REAL] ❌ No valid videos array provided to renderRealYoutubeResults, skipping render');
            return;
        }
        
        // Additional validation - check if videos have required properties
        const validVideos = videos.filter(video => video && video.id && video.title);
        if (validVideos.length === 0) {
            console.log('🌐 [REAL] ❌ No videos with valid properties (id, title) found, skipping render');
            return;
        }
        
        console.log('🌐 [REAL] ✅ Valid videos to render:', validVideos.length);
        
        // Update navigation history if this is a new result
        if (!isOverwrite) {
            const newState = {
                videos: validVideos,
                subject,
                type,
                page,
                totalPages,
                pageToken: window.youtubePagination.lastNextPageToken
            };
            
            if (!window.youtubePagination.navigationHistory) {
                window.youtubePagination.navigationHistory = [];
            }
            
            // If we're not overwriting, add to history
            window.youtubePagination.navigationHistory.push(newState);
            window.youtubePagination.currentHistoryIndex = window.youtubePagination.navigationHistory.length - 1;
        }
        
        // Clean up any existing empty bubbles before rendering (SINGLE cleanup call)
        this.cleanupBrokenYouTubeElements();

        // Update the totalPages for the current query in allQueriesHistory
        this.updateQueryHistoryPageCount(subject, page);

        // Re-render the dropdown to reflect updated page counts
        if (typeof renderQueryDropdown === 'function') {
            renderQueryDropdown(window.youtubePagination.allQueriesHistory);
        }
        
        // Use setTimeout to ensure user query renders first (or immediate for pagination)
        setTimeout(() => {
            console.log('🌐 [REAL] 🚀 Starting renderYoutubeResults (no duplicate cleanup)');
            // Use the standard rendering system for real data
            this.renderYoutubeResults(validVideos, page, 'many', subject, type, true, isOverwrite);
            
            // Show pagination bar for multi-video results - use BOTH systems for now
            if (validVideos.length > 1) {
                // 1. The enhanced pagination bar (future)
                this.renderRealYoutubePaginationBar(page, 'many', subject);
                
            }
        }, isPagination ? 0 : 100);
    }

    // Standard YouTube results rendering (used by real data)
    renderYoutubeResults(videos, page, totalPages, subject, type = 'search', isRealData = false, isOverwrite = false) {
        console.log('+++ [REAL] renderYoutubeResults called with:', { videos, page, totalPages, subject, type, isRealData, isOverwrite });

        // Validate and clean video data
        const validVideos = videos.filter(video => {
            if (!video || !video.id || !video.title || !video.thumbnail) {
                console.error('❌ [REAL] No valid videos to render');
                return false;
            }
            return true;
        }).map((video) => {
            try {
                return {
                    id: String(video.id).replace(/[^a-zA-Z0-9-_]/g, ''),
                    title: String(video.title).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                    description: String(video.description || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                    channelTitle: String(video.channelTitle || 'Unknown').replace(/"/g, '&quot;'),
                    thumbnail: String(video.thumbnail || '/assets/img/youtube-placeholder.png')
                };
            } catch (error) {
                console.error('Error processing video:', video, error);
                return null;
            }
        }).filter(video => video !== null);

        if (validVideos.length === 0) {
            this.addMessageToChat('assistant', '❌ No valid YouTube videos found for your search.', { mock: false, isYoutubePagination: true });
            return;
        }

        // Use a unique ID for the results bubble and update in place if it exists
        let youtubeMultiBubble = document.getElementById('youtube-results-bubble');
        const isUpdate = !!youtubeMultiBubble;
        if (!youtubeMultiBubble) {
            youtubeMultiBubble = document.createElement('div');
            youtubeMultiBubble.id = 'youtube-results-bubble';
            youtubeMultiBubble.className = 'youtube-multi-bubble';
        } else {
            youtubeMultiBubble.innerHTML = '';
        }

        // Create header section
        const headerSection = document.createElement('div');
        headerSection.className = 'youtube-header-section';

        // DYNAMIC HEADER: Update with current query context
        let dynamicHeaderTitle;
        if (type === 'channel') {
            const channelPattern1 = /^youtube\s+channel\s+(.+)/i;
            const channelPattern2 = /^youtube\s+search\s+channel:(.+)/i;
            let match = subject.match(channelPattern1) || subject.match(channelPattern2);
            const channelName = match ? match[1].trim() : subject;
            dynamicHeaderTitle = `📺 YouTube Results: "channel: ${channelName}"`;
        } else {
            const cleanSubject = this.extractCleanQuery(subject);
            dynamicHeaderTitle = `📺 YouTube Results: "${cleanSubject}"`;
        }
        const cacheBadge = '<span class="youtube-cache-badge" style="background: #2196f3;">🌐 Real API</span>';

        headerSection.innerHTML = `
             <div class="youtube-header-container">
                <div class="youtube-header-left">
                    <h3 class="youtube-header-title">${dynamicHeaderTitle}</h3>
                </div>
                <div class="youtube-header-right">
                    <button class="view-playlists-btn" onclick="window.playlistManager?.show(youtubeSearchManager._extractCleanQuery(window.getCurrentYouTubeQuery())); return false;" title="View Playlists">
                        <span class="view-playlists-btn-icon">📋</span><span class="view-playlists-btn-text">View Playlists</span>
                    </button>
                    <span class="youtube-page-info">Page ${page}${totalPages !== 'many' ? ` of ${totalPages}` : ' of many'}</span>
                    ${cacheBadge}
                </div>
            </div>
        `;

        // Create video list container (grid)
        const videoList = document.createElement('ul');
        videoList.className = 'video-list';

        // Add each video as a list item
        validVideos.forEach((video) => {
            const videoItem = document.createElement('li');
            videoItem.className = 'video-item';
        
            // Use extractCleanQuery if available, else fallback to subject
            const currentQueryName = this.extractCleanQuery ? this.extractCleanQuery(subject) : subject;
        
            const videoDataEncoded = encodeURIComponent(JSON.stringify({
                id: video.id,
                title: video.title,
                channelTitle: video.channelTitle,
                thumbnail: video.thumbnail
            }));
        
            videoItem.innerHTML = `
                <div class="button-thumb-group-MULTI top-buttons">
                    <button class="youtube-action-btn popup-btn" onclick="handleYoutube.openYoutubePopup('${video.id}'); return false;" title="Play in Popup">Play in Popup</button>
                    <button class="add-to-playlist-MULTI-btn"
                        data-video="${videoDataEncoded}"
                        data-playlist="${encodeURIComponent(currentQueryName)}"
                        title="Add to Playlist">
                        <span class="plus-sign">+</span>
                    </button>
                </div>
                <span class="youtube-thumb-link youtube-popup-thumb" onclick="handleYoutube.openYoutubePopup('${video.id}'); return false;" title="Play video">
                    <img class="youtube-thumb-img" src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                </span>
                <div class="video-title">${video.title}</div>
                <div class="button-thumb-group-MULTI bottom-buttons">
                    <button class="youtube-action-btn youtube-direct-link-improved" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank'); return false;" title="Watch on YouTube">
                        <span class="watch-on-youtube-icon">🎬</span>
                        <span class="watch-on-youtube-text">Watch on YouTube</span>
                    </button>
                </div>
                <div class="video-channel">${video.channelTitle}</div>
            `;
        
            videoList.appendChild(videoItem);
        });

        // Assemble the complete structure
        youtubeMultiBubble.appendChild(headerSection);
        youtubeMultiBubble.appendChild(videoList);

        // Update or add the assistant response bubble
        if (isOverwrite) {
            // Overwrite: remove the old bubble and add the new one
            const oldBubble = document.getElementById('youtube-results-bubble');
            if (oldBubble && oldBubble.parentNode) {
                oldBubble.parentNode.removeChild(oldBubble);
            }
            this.addMessageToChat('assistant', youtubeMultiBubble.outerHTML, {
                mock: false,
                isYoutubePagination: true,
                subject: subject,
                isYoutube: true
            });
        } else if (!isUpdate) {
            this.addMessageToChat('assistant', youtubeMultiBubble.outerHTML, {
                mock: false,
                isYoutubePagination: true,
                subject: subject,
                isYoutube: true
            });
        } else {
            youtubeMultiBubble.replaceWith(youtubeMultiBubble);
        }

        // ALWAYS scroll to TOP of YouTube results (override normal bottom scrolling)
        [100, 300, 600, 1000].forEach(delay => setTimeout(() => this.scrollToYouTubeResults(), delay));

        // ENSURE HEADER CONTEXT: Update header after rendering to ensure correct context
        setTimeout(() => {
            if (window.updateAllYouTubeHeaders && subject) {
                window.updateAllYouTubeHeaders(subject);
            }
        }, 100);
    }

    // === PAGINATOR NAVIGATION LOGIC (ENHANCED) ===

    // DELETED obsolete renderRealYoutubePaginationBar function that was here.
    
    handleNextNavigation() {
        if (window.youtubePagination.currentHistoryIndex < window.youtubePagination.navigationHistory.length - 1) {
            window.youtubePagination.currentHistoryIndex++;
            const nextState = window.youtubePagination.navigationHistory[window.youtubePagination.currentHistoryIndex];
            if (nextState) {
                window.youtubePagination.currentPage = nextState.page || 1;
                window.youtubePagination.totalPages = window.youtubePagination.navigationHistory.length;
                this.renderRealYoutubeResults(
                    nextState.videos,
                    nextState.page,
                    window.youtubePagination.totalPages,
                    nextState.subject,
                    nextState.type,
                    false, null, false
                );
            }
        }
        this.updateButtonStates();
    }

    handleBackNavigation() {
        if (window.youtubePagination.currentHistoryIndex > 0) {
            window.youtubePagination.currentHistoryIndex--;
            const prevState = window.youtubePagination.navigationHistory[window.youtubePagination.currentHistoryIndex];
            if (prevState) {
                window.youtubePagination.currentPage = prevState.page || 1;
                window.youtubePagination.totalPages = window.youtubePagination.navigationHistory.length;
                this.renderRealYoutubeResults(
                    prevState.videos,
                    prevState.page,
                    window.youtubePagination.totalPages,
                    prevState.subject,
                    prevState.type,
                    false, null, false
                );
            }
        }
        this.updateButtonStates();
    }

    handleTopNavigation() {
        if (window.youtubePagination.currentQueryStartIndex >= 0) {
            const topState = window.youtubePagination.navigationHistory[window.youtubePagination.currentQueryStartIndex];
            if (topState) {
                window.youtubePagination.currentHistoryIndex = window.youtubePagination.currentQueryStartIndex;
                window.youtubePagination.currentPage = topState.page || 1;
                window.youtubePagination.totalPages = topState.totalPages || 1;
                this.renderRealYoutubeResults(topState.videos, topState.page, topState.totalPages, topState.subject, topState.type, false, null, false);
            }
        }
        this.updateButtonStates();
    }

    handleRealTopNavigation() {
        if (window.youtubePagination.allQueriesHistory.length > 0) {
            const firstQuery = window.youtubePagination.allQueriesHistory[0];
            if (firstQuery) {
                window.youtubePagination.currentHistoryIndex = 0;
                window.youtubePagination.currentPage = firstQuery.page || 1;
                window.youtubePagination.totalPages = firstQuery.totalPages || 1;
                this.renderRealYoutubeResults(firstQuery.videos, firstQuery.page, firstQuery.totalPages, firstQuery.subject, firstQuery.type, false, null, false);
            }
        }
        this.updateButtonStates();
    }

    // === PAGINATION BAR LOGIC ===
    updateButtonStates() {
        // Only check for the TWO proper pagination bars: mock and real YouTube
        const bar = document.querySelector('.mock-pagination-bar') || 
                    document.querySelector('.real-youtube-pagination-bar');
        
        if (!bar) {
            console.log('🔍 No pagination bar found in updateButtonStates');
            return;
        }
        
        const isMockBar = bar.classList.contains('mock-pagination-bar');
        const isRealYoutubeBar = bar.classList.contains('real-youtube-pagination-bar');
        
        const btnBackToTop = bar.querySelector('.back-to-top-btn');
        const btnQueryStart = bar.querySelector('.query-start-btn');
        const btnBack = bar.querySelector('.back-btn');
        const btnMore = bar.querySelector('.more-page-btn');
        const btnNext = bar.querySelector('.next-btn');

        const currentPage = window.youtubePagination.currentPage || 1;
        const totalPages = window.youtubePagination.totalPages || 1;
        const navigationHistory = window.youtubePagination.navigationHistory || [];
        const currentHistoryIndex = window.youtubePagination.currentHistoryIndex || 0;
        const allQueriesHistory = window.youtubePagination.allQueriesHistory || [];
        
        // Check if we have a nextPageToken from the YouTube API
        const hasNextPageToken = window.youtubePagination.lastNextPageToken || 
                                 (window.handleYoutube && window.handleYoutube.paginationState?.lastNextPageToken);
        
        console.log('🔍 updateButtonStates:', { 
            isMockBar,
            isRealYoutubeBar,
            currentPage, 
            totalPages,
            hasNextPageToken: !!hasNextPageToken,
            lastNextPageToken: window.youtubePagination.lastNextPageToken,
            navigationHistory: navigationHistory.length,
            currentHistoryIndex,
            allQueriesHistory: allQueriesHistory.length
        });
        
        // Disable all buttons by default
        if (btnBackToTop) btnBackToTop.disabled = true;
        if (btnQueryStart) btnQueryStart.disabled = true;
        if (btnBack) btnBack.disabled = true;
        if (btnMore) btnMore.disabled = true;
        if (btnNext) btnNext.disabled = true;

        // Enable BACK TO TOP button if we have multiple queries in history
        if (allQueriesHistory.length > 1) {
            if (btnBackToTop) btnBackToTop.disabled = false;
        }

        // Enable QUERY START button if we're not on the first page of current query
        if (currentPage > 1) {
            if (btnQueryStart) btnQueryStart.disabled = false;
        }

        // Enable BACK button if we're not on the first page
        if (currentPage > 1) {
            if (btnBack) btnBack.disabled = false;
        }

         // Enable MORE button based on bar type
         if (isMockBar) {
            if (currentPage < totalPages) {
                if (btnMore) btnMore.disabled = false;
            }
        } else if (isRealYoutubeBar) {
            if (window.youtubePagination.lastNextPageToken) {
                if (btnMore) btnMore.disabled = false;
            }
        }

        // Enable NEXT button only if user can navigate forward in history
        const canGoForward = navigationHistory.length > 0 && currentHistoryIndex < navigationHistory.length - 1;
        if (canGoForward) {
            if (btnNext) btnNext.disabled = false;
        }
        
        console.log('🔍 Button states updated:', {
            barType: isMockBar ? 'MOCK' : isRealYoutubeBar ? 'REAL_YOUTUBE' : 'UNKNOWN',
            backToTop: btnBackToTop?.disabled,
            queryStart: btnQueryStart?.disabled,
            back: btnBack?.disabled,
            more: btnMore?.disabled,
            next: btnNext?.disabled,
            canGoForward,
            hasNextPageToken
        });
    }

    // === HELPER FUNCTIONS ===

    // Extract clean query (helper function)
    extractCleanQuery(query) {
        if (!query) return '';
        return query.replace(/^youtube\s+/i, '').replace(/^search\s+/i, '').trim();
    }

    // Add message to chat (helper function)
    addMessageToChat(role, content, options = {}) {
        if (window.addMessageToChat) {
            window.addMessageToChat(role, content, options);
        }
    }

    // Scroll to YouTube results (helper function)
    scrollToYouTubeResults() {
        const resultsBubble = document.getElementById('youtube-results-bubble');
        if (resultsBubble) {
            resultsBubble.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Cleanup broken YouTube elements (helper function)
    cleanupBrokenYouTubeElements() {
        console.log('🧹 Starting cleanup of YouTube elements...');
        
        // STEP 1: Remove all existing YouTube containers
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble-mock, .mock-youtube-results, .youtube-results-wrapper-mock, .youtube-multi-bubble, .youtube-single-bubble');
        console.log('🗑️ Found YouTube containers to remove:', youtubeContainers.length);
        youtubeContainers.forEach((el, index) => {
            console.log(`🗑️ Removing container ${index + 1}: ${el.className}`);
            el.remove();
        });
        
        // STEP 2: Remove any assistant-mock messages
        const assistantMockMessages = document.querySelectorAll('.message.assistant-mock');
        console.log('🗑️ Found assistant-mock messages to remove:', assistantMockMessages.length);
        assistantMockMessages.forEach(el => el.remove());
        
        // Remove any assistant messages that contain YouTube content (for real YouTube cleanup)
        const allMessages = document.querySelectorAll('.message.assistant');
        console.log('🔍 Checking assistant messages for YouTube content:', allMessages.length);
        let removedCount = 0;
        for (let msg of allMessages) {
            // Check if message contains YouTube-related content
            const hasYouTubeContent = msg.innerHTML.includes('Found results for') || 
                msg.innerHTML.includes('YouTube Results') || 
                msg.innerHTML.includes('video-list') || 
                msg.innerHTML.includes('youtube-multi-bubble') ||
                msg.innerHTML.includes('📺');
            
            // Check if message is now empty or only contains whitespace/basic structure
            const messageContent = msg.querySelector('.message-content');
            const isEmptyOrBasic = !messageContent || 
                messageContent.innerHTML.trim() === '' || 
                messageContent.innerHTML.trim().length < 20 ||
                messageContent.textContent.trim() === '' || 
                messageContent.textContent.trim().length < 5;
            
            if (hasYouTubeContent || isEmptyOrBasic) {
                console.log('🗑️ Removing assistant message:', hasYouTubeContent ? 'has YouTube content' : 'empty/basic content');
                msg.remove();
                removedCount++;
            }
        }
        console.log('🗑️ Removed', removedCount, 'assistant messages with YouTube content or empty content');
        
        // Remove any text nodes or elements that contain broken HTML
        const brokenPatterns = [
            'data-video-id="mockid',
            'role="button">Play in Popup',
            'class="youtube-action-btn',
            'view-playlists-MULTI-MOCK-btn',
            'style="font-size:18px',
            'tabindex="0">',
            'class="button-thumb-group'
        ];
        
        let brokenElementsRemoved = 0;
        document.querySelectorAll('*').forEach(el => {
            if (el.textContent) {
                for (let pattern of brokenPatterns) {
                    if (el.textContent.includes(pattern)) {
                        console.log('🗑️ Removing broken element containing:', pattern);
                        el.remove();
                        brokenElementsRemoved++;
                        break;
                    }
                }
            }
        });
        console.log('🗑️ Removed', brokenElementsRemoved, 'broken elements');
        console.log('✅ Cleanup complete');
    }

    // Render real YouTube pagination bar (helper function)
    renderRealYoutubePaginationBar(page, type, subject) {
        if (window.renderRealYoutubePaginationBar) {
            window.renderRealYoutubePaginationBar(page, type, subject);
        }
    }

    // Get current YouTube query (helper function)
    getCurrentYouTubeQuery() {
        if (window.getCurrentYouTubeQuery) {
            return window.getCurrentYouTubeQuery();
        }
        return '';
    }

    // === HEADER CONTEXT SYSTEM ===

    // Initialize header context system
    initializeHeaderContext() {
        console.log('🎯 [HEADER-INIT] Setting up header context tracking...');
        
        // Set up global header update function that works immediately
        window.setYouTubeHeaderContext = (query) => {
            console.log('🎯 [HEADER-CONTEXT] Setting YouTube header context to:', query);
            window.currentYouTubeQuery = query;
            
            // Update any existing headers immediately
            if (window.updateAllYouTubeHeaders) {
                this.updateAllYouTubeHeaders(query);
            }
            
            // Also store context for future renders
            if (window.youtubePagination) {
                window.youtubePagination.currentHeaderContext = query;
            }
        };
        
        console.log('🎯 [HEADER-INIT] Header context tracking ready');
    }

    // Update all YouTube headers with new query context
    updateAllYouTubeHeaders(newQuery) {
        if (!newQuery) return;
        
        console.log('🎯 [HEADER-UPDATE] Updating all YouTube headers with query:', newQuery);
        
        // Update the global query context
        window.currentYouTubeQuery = newQuery;
        
        // Find all YouTube header titles and update them
        const headers = document.querySelectorAll('.youtube-header-title');
        console.log('🎯 [HEADER-UPDATE] Found', headers.length, 'headers to update');
        
        headers.forEach((header, index) => {
            const cleanQuery = this.extractCleanQuery(newQuery);
            const newTitle = `📺 YouTube Results: "${cleanQuery}"`;
            
            console.log(`🎯 [HEADER-UPDATE] Updating header ${index + 1}: "${header.textContent}" -> "${newTitle}"`);
            header.textContent = newTitle;
        });
        
        // Also update any cached query context
        if (window.youtubePagination) {
            window.youtubePagination.currentHeaderContext = newQuery;
        }
    }

    // === DEBUG FUNCTIONS ===

    // Debug icon visibility issues
    debugIconIssue() {
        console.log('🔍 [DEBUG] === COMPREHENSIVE ICON ANALYSIS ===');
        // Add any icon-specific debugging logic here
        console.log('🔍 [DEBUG] === END ANALYSIS ===');
    }

    // Test icon creation manually
    testIconCreation() {
        console.log('🔥 [TEST] Manual icon creation test...');
        
        // Check if YouTube results exist
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble, .youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        console.log('🔥 [TEST] YouTube containers found:', youtubeContainers.length);
        
        if (youtubeContainers.length > 0) {
            console.log('🔥 [TEST] Creating icon manually...');
            this.createPaginatorToggleIcon();
            
            setTimeout(() => {
                const icon = document.querySelector('.show-paginator-bar');
                console.log('🔥 [TEST] Icon after creation:', !!icon);
                if (icon) {
                    console.log('🔥 [TEST] Icon display:', icon.style.display);
                    console.log('🔥 [TEST] Icon computed display:', window.getComputedStyle(icon).display);
                }
            }, 100);
        } else {
            console.log('🔥 [TEST] No YouTube containers - cannot create icon');
        }
    }

    // Debug headers state
    debugHeaders() {
        console.log('🔍 [HEADER-DEBUG] === HEADER STATE ANALYSIS ===');
        console.log('🔍 [HEADER-DEBUG] Current YouTube query:', window.currentYouTubeQuery);
        console.log('🔍 [HEADER-DEBUG] Pagination original query:', window.youtubePagination?.originalQuery);
        
        const headers = document.querySelectorAll('.youtube-header-title');
        console.log('🔍 [HEADER-DEBUG] Found', headers.length, 'YouTube headers:');
        
        headers.forEach((header, index) => {
            console.log(`🔍 [HEADER-DEBUG] Header ${index + 1}: "${header.textContent}"`);
        });
        
        console.log('🔍 [HEADER-DEBUG] === END ANALYSIS ===');
        
        return {
            currentQuery: window.currentYouTubeQuery,
            paginationQuery: window.youtubePagination?.originalQuery,
            headerCount: headers.length,
            headerTexts: Array.from(headers).map(h => h.textContent)
        };
    }

    // Create paginator toggle icon (helper function)
    createPaginatorToggleIcon() {
        // Implementation would go here - this is a placeholder for the icon creation logic
        console.log('🎯 [ICON] Creating paginator toggle icon...');
    }

    // === EVENT LISTENERS SETUP ===
    setupEventListeners() {
        // Add any component-specific event listeners here
        console.log('🎯 [REAL] YouTubeSearchManager event listeners initialized');
        
        // Initialize header context system
        this.initializeHeaderContext();
        
        // Make debug functions globally accessible
        window.debugIconIssue = () => this.debugIconIssue();
        window.testIconCreation = () => this.testIconCreation();
        window.debugHeaders = () => this.debugHeaders();
        window.updateAllYouTubeHeaders = (query) => this.updateAllYouTubeHeaders(query);
        window.getCurrentYouTubeQuery = () => this.getCurrentYouTubeQuery();
        window.extractCleanQuery = (query) => this.extractCleanQuery(query);
        
        console.log('🎯 [REAL] YouTubeSearchManager debug functions available globally');

        // === YOUTUBE-SPECIFIC EVENT LISTENERS ===

        // Add event listener for Add to Playlist buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.add-to-playlist-MULTI-btn');
            if (btn) {
                try {
                    const videoData = JSON.parse(decodeURIComponent(btn.dataset.video));
                    const playlistName = decodeURIComponent(btn.dataset.playlist);
                    if (window.playlistManager) {
                        window.playlistManager.show(videoData, playlistName);
                    } else {
                        console.error('PlaylistManager not initialized');
                        this.showToast('Unable to open playlist manager. Please try again.');
                    }
                } catch (error) {
                    console.error('Error parsing video data:', error);
                    this.showToast('Error adding to playlist. Please try again.');
                }
            }
        });

        // Add click handlers for YouTube popup images (SINGLE and MULTI)
        document.addEventListener('click', (e) => {
            console.log('Global click detected on:', e.target);
            // Look for both the span and the img elements, and also the popup button
            const thumb = e.target.closest('.youtube-thumb-link.youtube-popup-thumb, .youtube-popup-thumb, .youtube-popup-btn');
            console.log('Found youtube-popup element:', !!thumb);
            if (thumb && thumb.hasAttribute('data-video-id')) {
                e.preventDefault();
                const videoId = thumb.getAttribute('data-video-id');
                console.log('handleYoutube exists:', !!window.handleYoutube);
                console.log('openYoutubePopup exists:', !!(window.handleYoutube && typeof window.handleYoutube.openYoutubePopup === 'function'));
                if (window.handleYoutube && typeof window.handleYoutube.openYoutubePopup === 'function') {
                    window.handleYoutube.openYoutubePopup(videoId);
                }
            }
        });

        console.log('🎯 [REAL] YouTube-specific event listeners added');
    }

    // Show toast message (helper function)
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.toastManager) {
            window.toastManager.showToast(message, type);
        } else {
            console.log(`[TOAST] ${type.toUpperCase()}: ${message}`);
        }
    }

    // === PUBLIC API METHODS ===

    // Initialize the component
    init() {
        console.log('🎯 [REAL] YouTubeSearchManager initialized');
        this.initializePaginationState();
        this.setupEventListeners();
    }

    // Cleanup the component
    cleanup() {
        console.log('🎯 [REAL] YouTubeSearchManager cleanup completed');
    }

    // === YOUTUBE HELPER FUNCTIONS ===

    // Check if query is a YouTube query
    isYouTubeQuery(query) {
        const patterns = [/youtube/i, /video/i, /search for/i];
        return patterns.some(pattern => pattern.test(query));
    }

    // Get current YouTube query
    getCurrentYouTubeQuery() {
        const headers = document.querySelectorAll('.youtube-header-title');
        if (headers.length > 0) {
            const lastHeader = headers[headers.length - 1];
            return this._extractCleanQuery(lastHeader.textContent);
        }
        return '';
    }

    // Save YouTube query to database
    async saveYouTubeQuery(query) {
        try {
            const displayName = query.replace(/^youtube\s+search\s+/i, '').replace(/^youtube\s+/i, '').replace(/^search\s+/i, '').trim() || query;
            const totalPages = this.countCachedPages(query);
            const cacheKeys = Array.from({ length: totalPages }, (_, i) => `yt_${query}_search_${i + 1}`);
            
            const response = await fetch(window.appConfig.getApiUrl('/api/youtube/save-search'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    userId: window.sessionId,
                    displayName,
                    totalPages,
                    videoCount: 0,
                    cacheKeys,
                    searchMetadata: {
                        searchType: 'search',
                        lastPageViewed: window.youtubePagination?.currentPage || 1,
                        totalResults: window.youtubePagination?.totalPages || 1
                    }
                })
            });
            
            const data = await response.json();
            if (data && data.success) {
                this.showToast('💾 Query saved to database!', 'success');
                console.log('🔍 [HISTORY - SUCCESS] Query saved to database:', query);
                setTimeout(() => this.updateQueryHistoryDisplay(), 300); // Add a short delay for UI update
            } else {
                throw new Error(data.error || 'Failed to save query');
            }
        } catch (error) {
            console.error('🔍 [HISTORY - ERROR] Error saving query:', error);
            this.showToast('Failed to save query', 'error');
            return false;
        }
    }

    // Set YouTube cache with timestamp
    setYouTubeCacheWithTimestamp(cacheKey, data) {
        if (!data.timestamp) data.timestamp = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(data));
    }

    // Migrate YouTube cache timestamps
    migrateYouTubeCacheTimestamps() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_') && key.includes('_search_')) {
                try {
                    const val = localStorage.getItem(key);
                    if (!val) continue;
                    const obj = JSON.parse(val);
                    if (!obj.timestamp) {
                        obj.timestamp = Date.now();
                        localStorage.setItem(key, JSON.stringify(obj));
                        console.log('[MIGRATION] Added timestamp to', key);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }

    // Scroll to YouTube results
    scrollToYouTubeResults() {
        const resultsBubble = document.getElementById('youtube-results-bubble');
        if (resultsBubble) {
            resultsBubble.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Render minimized paginator bar
    renderMinimizedPaginatorBar() {
        if (!window.youtubePagination.hasSearched) {
            // Hide the minimized bar if it exists
            const minimizedBar = document.getElementById('minimized-paginator-bar');
            if (minimizedBar) minimizedBar.style.display = 'none';
            return;
        }

        let minimizedBar = document.getElementById('minimized-paginator-bar');
        if (!window.youtubePagination.isMinimized) {
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
                window.youtubePagination.isMinimized = false;
                minimizedBar.style.display = 'none';
                // Restore the floating paginator bar and last YouTube search
                if (window.youtubePagination.restoreLastSearch) {
                    window.youtubePagination.restoreLastSearch();
                }
            };
            document.body.appendChild(minimizedBar);
        }
        minimizedBar.style.display = 'block';
        // Remove any existing real or mock pagination bars
        this.hideAllPaginationBars();
    }

    // Hide all pagination bars
    hideAllPaginationBars() {
        const bars = document.querySelectorAll('.mock-pagination-bar, .real-youtube-pagination-bar');
        bars.forEach(bar => {
            if (bar && bar.parentNode) {
                bar.parentNode.removeChild(bar);
            }
        });
    }

    // Update query history display
    updateQueryHistoryDisplay() {
        // This would update the query history dropdown if it exists
        if (typeof this.renderQueryDropdown === 'function') {
            this.getAllQueriesForDropdown().then(queries => {
                this.renderQueryDropdown(queries);
            });
        }
    }

    // Extract subject from query
    extractSubject(query) {
        // For channel queries
        const channelPattern1 = /^youtube\s+channel\s+(.+)/i;
        const channelPattern2 = /^youtube\s+search\s+channel:(.+)/i;
        let match = query.match(channelPattern1) || query.match(channelPattern2);
        if (match) {
            return match[1].trim() + ' (c)';
        }
        // For normal queries
        const cleanQuery = query
            .replace(/^youtube\s+search\s+/i, '')
            .replace(/^youtube\s+/i, '')
            .replace(/^search\s+/i, '')
            .trim();
        return cleanQuery || query;
    }

    // Normalize query
    normalizeQuery(query) {
        return (typeof query === 'string' ? query : '').trim().toLowerCase();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeSearchManager;
} else if (typeof window !== 'undefined') {
    window.YouTubeSearchManager = YouTubeSearchManager;
} 

const youtubeSearchManager = new YouTubeSearchManager();
export default youtubeSearchManager;