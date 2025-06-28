/**
 * YouTubeSearchManager Component
 * 
 * Handles saving and retrieving YouTube searches from the database
 * Manages the UI for saved searches and provides visual indicators
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

export default class YouTubeSearchManager {
    constructor() {
        this.savedQueries = new Map();
        this.isInitialized = false;
        this.hasYouTubeSearch = false;
        this.currentQuery = null; // Track current search query
        this.currentSearchResults = null; // Track current search results
        this.queryAccessHistory = []; // Array to track query access order with timestamps
        this.pagination = {
            hasSearched: false,
            currentPage: 1,
            navigationHistory: [],
            currentHistoryIndex: 0,
            searchType: 'search',
            originalQuery: '',
            isActive: false,
            lastNextPageToken: null
        };
        this.cacheService = {
            get: (key, hours) => {
                const item = localStorage.getItem(key);
                if (!item) return null;
                const data = JSON.parse(item);
                const now = Date.now();
                const expiry = hours * 60 * 60 * 1000;
                if (now - data.timestamp > expiry) {
                    localStorage.removeItem(key);
                    return null;
                }
                return data;
            },
            set: (key, data, hours) => {
                const item = {
                    data,
                    timestamp: Date.now()
                };
                try {
                    localStorage.setItem(key, JSON.stringify(item));
                } catch (error) {
                    if (error.name === 'QuotaExceededError') {
                        console.warn(`⚠️ [CACHE] localStorage quota exceeded, clearing old cache entries`);
                        this.clearOldCacheEntries();
                        // Try again after clearing
                        try {
                            localStorage.setItem(key, JSON.stringify(item));
                            console.log(`✅ [CACHE] Saved to localStorage after cleanup: ${key}`);
                        } catch (retryError) {
                            console.error(`❌ [CACHE] Still failed after cleanup: ${key}`, retryError);
                        }
                    } else {
                        console.error(`❌ [CACHE] Failed to save to localStorage: ${key}`, error);
                    }
                }
            },
            clearOldCacheEntries: () => {
                console.log(`🧹 [CACHE] Clearing old cache entries to free up space`);
                const keys = Object.keys(localStorage);
                const ytCacheKeys = keys.filter(key => key.startsWith('yt_'));
                
                // Sort by timestamp (oldest first) and remove oldest 25%
                const cacheEntries = ytCacheKeys.map(key => {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        return { key, timestamp: item.timestamp || 0 };
                    } catch {
                        return { key, timestamp: 0 };
                    }
                }).sort((a, b) => a.timestamp - b.timestamp);
                
                const toRemove = Math.ceil(cacheEntries.length * 0.25);
                for (let i = 0; i < toRemove; i++) {
                    localStorage.removeItem(cacheEntries[i].key);
                    console.log(`🗑️ [CACHE] Removed old cache entry: ${cacheEntries[i].key}`);
                }
            }
        };
        this.services = {
            showToast: window.showToast,
            addMessageToChat: window.addMessageToChat,
            quotaMonitor: window.quotaMonitor
        };
        this.apiService = {
            searchYouTube: async (params) => {
                const response = await fetch('/api/youtube/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                const data = await response.json();
                return {
                    success: response.ok,
                    data,
                    error: data.error,
                    cacheKey: `yt_${params.type}_${params.query.toLowerCase().replace(/\s+/g, '_')}_p${params.page}_${params.pageToken || 'none'}`
                };
            }
        };
    }

    /**
     * Initialize the YouTubeSearchManager
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📚 [YOUTUBE-DB] Initializing YouTubeSearchManager');
            await this.loadSavedQueries();
            this.rebuildAccessHistoryFromLocalStorage();
        this.isInitialized = true;
        } catch (error) {
            console.error('📚 [YOUTUBE-DB] Initialization error:', error);
        }
    }

    /**
     * Load saved queries from the database
     */
    async loadSavedQueries() {
        try {
            // Use the correct endpoint to load saved queries from the database
            const response = await fetch(`/api/youtube/history/${window.sessionId}`);
            const queries = await response.json();
            
            if (response.ok && Array.isArray(queries)) {
                this.savedQueries.clear();
                queries.forEach(query => {
                    // Store queries in the expected format
                    this.savedQueries.set(query, {
                        query: query,
                        timestamp: Date.now(),
                        isSaved: true
                    });
                });
                console.log('📚 [YOUTUBE-DB] Loaded', this.savedQueries.size, 'saved queries from database');
                console.log('📚 [YOUTUBE-DB] Queries:', queries);
            } else {
                console.log('📚 [YOUTUBE-DB] No saved queries found or invalid response');
            }
        } catch (error) {
            console.error('📚 [YOUTUBE-DB] Error loading saved queries:', error);
        }
    }

    /**
     * Rebuild access history from localStorage timestamps after initialization
     */
    rebuildAccessHistoryFromLocalStorage() {
        try {
            console.log('🔄 [ACCESS-HISTORY] Rebuilding access history from localStorage');
            
            // Get all queries from localStorage with their timestamps
            const localQueries = this.getLocalStorageQueries();
            
            // Sort by timestamp (newest first) to rebuild access order
            const sortedQueries = localQueries.sort((a, b) => {
                const timestampA = a.timestamp || 0;
                const timestampB = b.timestamp || 0;
                return timestampB - timestampA; // Newest first
            });
            
            // Clear existing access history
            this.queryAccessHistory = [];
            
            // Rebuild access history from sorted queries
            sortedQueries.forEach(queryData => {
                const cleanQuery = this.cleanQueryForDisplay(queryData.query);
                
                // Add to access history (most recent first)
                this.queryAccessHistory.push({
                    query: queryData.query,
                    cleanQuery: cleanQuery,
                    timestamp: queryData.timestamp || Date.now(),
                    source: 'localStorage'
                });
            });
            
            // Limit to 20 entries
            if (this.queryAccessHistory.length > 20) {
                this.queryAccessHistory = this.queryAccessHistory.slice(0, 20);
            }
            
            console.log('🔄 [ACCESS-HISTORY] Rebuilt access history with', this.queryAccessHistory.length, 'entries');
            console.log('🔄 [ACCESS-HISTORY] Order:', this.queryAccessHistory.slice(0, 5).map(item => ({
                query: item.cleanQuery,
                timestamp: new Date(item.timestamp).toLocaleTimeString()
            })));
            
        } catch (error) {
            console.error('🔄 [ACCESS-HISTORY] Error rebuilding access history:', error);
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
                lastPageViewed: this.pagination?.currentPage || 1,
                totalResults: 'many' // Always use "many" instead of exact count
            };
            
            // Get cache keys for this query
            const cacheKeys = [];
            let page = 1;
            while (page <= 10) {
                const cacheKey = `yt_search_${query.toLowerCase().replace(/\s+/g, '_')}_p${page}_none`;
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
                totalPages: 'many', // Always use "many" instead of exact count
                videoCount: this.pagination?.currentVideos?.length || 0,
                cacheKeys,
                searchMetadata
            };
            
            // Send save request using proper configuration
            const apiUrl = window.appConfig.getApiUrl('youtube.saveSearch');
            if (!apiUrl) {
                console.error('💾 [YOUTUBE-DB] Configuration error: youtube.saveSearch endpoint not found');
                throw new Error('API configuration error: youtube.saveSearch endpoint not configured');
            }
            console.log('💾 [YOUTUBE-DB] Using configured API URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('💾 [YOUTUBE-DB] Server returned non-JSON response, skipping save');
                return;
            }
            
            const data = await response.json();

            if (data.success) {
                console.log('💾 [YOUTUBE-DB] Successfully saved query:', data.search);
                // Update the savedQueries Map so isQuerySaved() returns true
                this.savedQueries.set(query, data.search);
                console.log('💾 [YOUTUBE-DB] Updated savedQueries Map, query is now saved');
            } else {
                throw new Error(data.error || 'Failed to save search');
            }
        } catch (error) {
            console.error('💾 [YOUTUBE-DB] Error saving query:', error);
            // Let the caller handle the error toast to avoid duplicates
            throw error;
        }
    }

    /**
     * Check if a query is saved in the database
     */
    isQuerySaved(query) {
        return this.savedQueries.has(query);
    }

    /**
     * Update the UI to reflect saved queries (updated for new dropdown system)
     */
    updateUI() {
        const historyItems = document.querySelectorAll('.query-history-item');
        historyItems.forEach(item => {
            const query = item.getAttribute('data-query');
            
            // Use the NEW system: .history-status-icon instead of .query-led
            const ledIndicator = item.querySelector('.history-status-icon');
            const saveButton = item.querySelector('.save-icon');
            
            if (this.isQuerySaved(query)) {
                // Show green LED emoji for saved queries (NEW system)
                if (ledIndicator) {
                    ledIndicator.classList.add('saved');
                    ledIndicator.classList.remove('unsaved');
                    ledIndicator.innerHTML = '🟢'; // Keep the emoji LED
                    ledIndicator.title = 'Saved to database';
                    ledIndicator.style.opacity = '1';
                }
                // Disable save button for saved queries
                if (saveButton) {
                    saveButton.classList.add('disabled');
                    saveButton.title = 'Already saved to database';
                    saveButton.style.opacity = '0.3';
                    saveButton.style.cursor = 'not-allowed';
                    saveButton.onclick = null;
                }
            } else {
                // Hide LED for unsaved queries
                if (ledIndicator) {
                    ledIndicator.classList.add('unsaved');
                    ledIndicator.classList.remove('saved');
                    ledIndicator.innerHTML = '';
                    ledIndicator.title = 'Not saved to database';
                    ledIndicator.style.opacity = '0';
                }
                // Enable save button for unsaved queries
                if (saveButton) {
                    saveButton.classList.remove('disabled');
                    saveButton.title = 'Save to database';
                    saveButton.style.opacity = '1';
                    saveButton.style.cursor = 'pointer';
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

    /**
     * Scroll to YouTube results - targeting the grey container (20px higher than white div)
     */
    scrollToYouTubeResults() {
        console.log('📍 [SCROLL] Scrolling to YouTube results - targeting grey container');
        try {
            const chatContainer = document.querySelector('#chat-messages');
            if (chatContainer) {
                // Find ALL YouTube-related messages
                const youtubeMessages = document.querySelectorAll('.message');
                let targetMessage = null;
                
                // Find the LAST message that contains YouTube content
                for (let i = youtubeMessages.length - 1; i >= 0; i--) {
                    const message = youtubeMessages[i];
                    if (message.querySelector('.youtube-multi-bubble, .youtube-single-bubble, .youtube-results')) {
                        targetMessage = message;
                        break;
                    }
                }
                
                if (targetMessage) {
                    // Get the TOP of the message container (grey container) - 20px higher than white div
                    const messageTop = targetMessage.offsetTop;
                    // Changed from -90 to -110 to target grey container (20px higher)
                    chatContainer.scrollTop = messageTop - 85;
                    console.log('📍 [SCROLL] Scrolled to TOP of grey YouTube message container');
                    
                    // FORCE the scroll to stick by setting it again after a tiny delay
                    setTimeout(() => {
                        chatContainer.scrollTop = messageTop - 85;
                        console.log('📍 [SCROLL] FORCED scroll to stick at TOP of grey container');
                    }, 50);
                    
                } else {
                    // Fallback to top of page if no YouTube message found
                    chatContainer.scrollTop = 0;
                    console.log('📍 [SCROLL] No YouTube message found, scrolled to top of page');
                }
            } else {
                // Ultimate fallback: scroll window to top
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
                console.log('📍 [SCROLL] No chat container found, scrolled window to top');
            }
        } catch (error) {
            console.error('📍 [SCROLL] Error scrolling to YouTube results:', error);
            // Fallback: try immediate scroll without smooth behavior
            try {
                window.scrollTo(0, 0);
                console.log('📍 [SCROLL] Fallback scroll to top completed');
            } catch (fallbackError) {
                console.error('📍 [SCROLL] Fallback scroll also failed:', fallbackError);
            }
        }
    }

    /**
     * Force scroll to YouTube results immediately (synchronous) - targeting grey container
     */
    forceScrollToTop() {
        console.log('📍 [FORCE-SCROLL] Forcing immediate scroll to YouTube results - targeting grey container');
        try {
            const chatContainer = document.querySelector('#chat-messages');
            if (chatContainer) {
                // Find ALL YouTube-related messages
                const youtubeMessages = document.querySelectorAll('.message');
                let targetMessage = null;
                
                // Find the LAST message that contains YouTube content
                for (let i = youtubeMessages.length - 1; i >= 0; i--) {
                    const message = youtubeMessages[i];
                    if (message.querySelector('.youtube-multi-bubble, .youtube-single-bubble, .youtube-results')) {
                        targetMessage = message;
                        break;
                    }
                }
                
                if (targetMessage) {
                    // Get the TOP of the message container (grey container) - 20px higher than white div
                    const messageTop = targetMessage.offsetTop;
                    // Immediate scroll to grey container (20px higher than white div)
                    chatContainer.scrollTop = messageTop - 85;
                    console.log('📍 [FORCE-SCROLL] Immediate scroll to grey YouTube container completed');
                } else {
                    // Fallback to top of chat if no YouTube message found
                    chatContainer.scrollTop = 0;
                    console.log('📍 [FORCE-SCROLL] No YouTube message found, scrolled to top of chat');
                }
            } else {
                // Ultimate fallback: scroll window and document to top
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                console.log('📍 [FORCE-SCROLL] No chat container found, scrolled window to top');
            }
        } catch (error) {
            console.error('📍 [FORCE-SCROLL] Error with force scroll:', error);
            // Final fallback
            try {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            } catch (fallbackError) {
                console.error('📍 [FORCE-SCROLL] Final fallback also failed:', fallbackError);
            }
        }
    }

    /**
     * Update button states (placeholder for compatibility)
     */
    updateButtonStates() {
        console.log('🎯 [BUTTONS] updateButtonStates called');
        
        // Update pagination buttons
        const prevBtn = document.querySelector('.youtube-prev-btn, .restored-paginator-bar .prev-btn');
        const nextBtn = document.querySelector('.youtube-next-btn, .restored-paginator-bar .next-btn');
        const moreBtn = document.querySelector('.youtube-more-btn, .restored-paginator-bar .more-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.pagination.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = false; // Always enabled since we don't know exact total
        }
        
        if (moreBtn) {
            moreBtn.disabled = !this.pagination.nextPageToken;
            moreBtn.style.display = this.pagination.nextPageToken ? 'inline-block' : 'none';
        }
        
        // Update page display
        const pageDisplay = document.querySelector('.youtube-page-display, .restored-paginator-bar .page-display');
        if (pageDisplay) {
            pageDisplay.textContent = `Page ${this.pagination.currentPage} of many`;
        }
        
        console.log('🎯 [BUTTONS] Button states updated:', {
            currentPage: this.pagination.currentPage,
            totalPages: 'many',
            hasNextToken: !!this.pagination.nextPageToken
        });
    }

    /**
     * Comprehensive YouTube search handler
     */
    async handleYoutubeRequest(subject, isPagination = false, messageText = null, options = {}) {    
        
        this.hasYouTubeSearch = true;
        
        // Store the current query for dropdown sorting and video click tracking
        this.lastQuery = subject;
        this.currentQuery = subject;
        
        // PATCH: Ensure youtubePagination exists and set hasSearched flag to true after first search
        if (!this.pagination) {
            this.pagination = {
                hasSearched: false,
                currentPage: 1,
                navigationHistory: [],
                currentHistoryIndex: 0,
                searchType: 'search',
                originalQuery: subject,
                isActive: false,
                lastNextPageToken: null
            };
        }
        if (!this.pagination.hasSearched) {
            this.pagination.hasSearched = true;
            console.log('🎯 [PAGINATION] First search detected, setting hasSearched flag to true');
        }

        // --- BEGIN: Update dropdown helper ---
        const updateDropdownWithCurrentQuery = async () => {
            const allQueries = this.getAllQueriesForDropdown();
            await this.renderQueryDropdown(allQueries, subject);
        };
        // --- END: Update dropdown helper ---

        // Detect search type using switch statement
        let type = 'search';
        let channelQuery = null;
        let cleanSubject = subject;
        
        // Channel patterns
        const channelPattern1 = /^youtube\s+channel\s+(.+)/i;
        const channelPattern2 = /^youtube\s+search\s+channel:(.+)/i;
        
        // Movies & TV patterns - more comprehensive detection
        const moviesPattern = /youtube.*(movies?|films?)|movies?.*youtube|films?.*youtube|youtube.*movie|movie.*youtube/i;
        const tvPattern = /youtube.*(tv|television|series|shows?)|tv.*youtube|television.*youtube|series.*youtube|shows?.*youtube/i;
        
        const match1 = subject.match(channelPattern1);
        const match2 = subject.match(channelPattern2);
        
        switch (true) {
            case !!match1:
                type = 'channel';
                channelQuery = match1[1].trim();
                cleanSubject = channelQuery;
                break;
            case !!match2:
                type = 'channel';
                channelQuery = match2[1].trim();
                cleanSubject = channelQuery;
                break;
            case moviesPattern.test(subject):
                type = 'movies';
                cleanSubject = subject.replace(/youtube|movies?|films?|movie|search/gi, '').trim();
                break;
            case tvPattern.test(subject):
                type = 'tv';
                cleanSubject = subject.replace(/youtube|tv|television|series|shows?|search/gi, '').trim();
                break;
            default:
                break;
        }

        // PATCH: Update currentPage for pagination actions using switch statement
        let currentPage = this.pagination?.currentPage || 1;
        
        // If forcePage is provided, use it directly (for BACK/NEXT button navigation)
        if (options.forcePage) {
            currentPage = options.forcePage;
            this.pagination.currentPage = currentPage;
            console.log('🎯 [FORCE-PAGE] Using forced page number:', currentPage);
        } else if (isPagination && options && options.action) {
            switch (options.action) {
                case 'more':
                    // MORE button: Page is already incremented by the button handler, don't override it
                    console.log('🌐 [MORE] Using already incremented page:', this.pagination.currentPage);
                    currentPage = this.pagination.currentPage;
                    // DON'T reassign - keep the incremented value
                    break;
                case 'next':
                    currentPage++;
                    this.pagination.currentPage = currentPage;
                    break;
                case 'back':
                    if (currentPage > 1) {
                        currentPage--;
                        this.pagination.currentPage = currentPage;
                    }
                    break;
                case 'start':
                case 'top':
                    currentPage = 1;
                    this.pagination.currentPage = currentPage;
                    break;
            }
        }

        const pageToken = null;

        // IMMEDIATE HEADER UPDATE: Show query context before any processing
        if (!isPagination && this.updateAllYouTubeHeaders) {
            this.updateAllYouTubeHeaders(subject);
            console.log('🎯 [HEADER-UPDATE] Updated header immediately for:', subject);
        }

        // CRITICAL: For new searches (not pagination), reset pagination state completely
        if (!isPagination) {
            console.log('NEW-SEARCH: Resetting pagination state for new query:', subject);
            this.pagination.currentPage = 1;
            this.pagination.originalQuery = subject;
            this.pagination.searchType = type;
            // Update currentPage after reset for new searches
            currentPage = 1;
            this.updateAllYouTubeHeaders(subject);
            this.cleanupBrokenYouTubeElements();
            this.addToQueriesHistory(subject);
            
            // CRITICAL: ALWAYS scroll to top for NEW YouTube searches
            console.log('🎯 [NEW-SEARCH] NEW YouTube search - SCROLLING TO TOP immediately!');
            this.forceScrollToTop();
            
            // CRITICAL: Ensure this query gets added to access history immediately for dropdown
            console.log('🎯 [NEW-SEARCH] Adding to access history for dropdown:', subject, 'type:', type);
            this.addToAccessHistory(subject, type);
            
            // IMMEDIATE: Update dropdown to show current query at top
            console.log('🔄 [DROPDOWN-IMMEDIATE] Updating dropdown immediately after adding to access history');
            // Add small delay to ensure access history update completes
            setTimeout(() => {
                updateDropdownWithCurrentQuery().catch(error => {
                    console.error('Error updating dropdown immediately after access history:', error);
                });
            }, 100);
        } else {
            type = this.pagination.searchType || 'search';
            console.log('PAGINATION: Continuing with existing query:', this.pagination.originalQuery, 'page:', currentPage, 'type:', type);
        }

        // Generate cache key - ALWAYS check cache first
        const actualPage = isPagination ? currentPage : 1;
        // Use the correct cache key format: yt_query_type_page (e.g., yt_fender_search_1, yt_fender_channel_1)
        // Build cache key for this search (use server format for consistency)
        const normalizedSubject = this.cleanQueryForDisplay(subject);
        const cacheKey = `yt_${type}_${normalizedSubject.toLowerCase().replace(/\s+/g, '_')}_p${actualPage}_none`;
        console.log('🔍 [CACHE-FIRST] Checking cache with key:', cacheKey);
        console.log('🔍 [CACHE-FIRST] Original subject:', subject, '→ Normalized:', normalizedSubject);
        console.log('🔍 [CACHE-FIRST] Page numbers - currentPage:', currentPage, 'actualPage:', actualPage, 'isPagination:', isPagination);

        // STEP 1: CHECK CACHE FIRST (for ALL requests - new searches AND pagination)
        // Skip cache when explicitly requested via skipCache option
        const shouldSkipCache = options.skipCache;
        let cachedData = null;
        
        if (!shouldSkipCache) {
            cachedData = this.cacheService.get(cacheKey, 24);
            
            // FALLBACK: If new format cache miss, try old formats for backward compatibility
            if (!cachedData) {
                const fallbackKeys = [
                    `yt_${normalizedSubject}_${type}_${actualPage}`, // Old format 1: yt_Fender_search_1
                    `yt_${subject}_${type}_${actualPage}`,           // Old format 2: yt_YouTube search Fender_search_1
                ];
                
                for (const fallbackKey of fallbackKeys) {
                    console.log('🔄 [CACHE-FALLBACK] Trying fallback key:', fallbackKey);
                    cachedData = this.cacheService.get(fallbackKey, 24);
        if (cachedData) {
                        console.log('✅ [CACHE-FALLBACK] Found data with old format key:', fallbackKey);
                        break;
                    }
                }
            }
        } else {
            console.log('🌐 [SKIP-CACHE] Skipping cache check for fresh API call');
        }
        
        if (cachedData && !shouldSkipCache) {
            console.log('⚡ [FUTURE-SAVINGS] Found cached results for:', subject, 'page:', currentPage);
            console.log('🔍 [CACHE-DEBUG] Cache data structure:', cachedData);
            
            let videos = [];
            // Handle nested data structure: {data: {success: true, videos: [...]}}
            const actualData = cachedData.data || cachedData; // Support both nested and flat structures
            
            switch (true) {
                case !!actualData.video:
                    videos = [actualData.video];
                    break;
                case !!actualData.videos:
                    videos = actualData.videos;
                    break;
            }
            
            console.log('🔍 [CACHE-DEBUG] Extracted videos:', videos.length, 'videos');
            
            // If cache has no videos, clear it and make fresh API call
            if (!videos || videos.length === 0) {
                console.log('🗑️ [CACHE-CLEANUP] Cache contains 0 videos, clearing and making fresh API call');
                localStorage.removeItem(cacheKey);
                // Continue to API call below
            } else {
                const cacheAge = Date.now() - cachedData.timestamp;
                const ageMinutes = Math.round(cacheAge / 1000 / 60);
                if (this.services.showToast) {
                    this.services.showToast(`⚡ Loaded from cache (${ageMinutes}m old) - No API call needed!`, 'cache', 4000);
                }
                
                // Update timestamp for recently accessed queries (for chronological ordering)
                if (!isPagination) {
                    this.updateQueryTimestamp(subject);
                    this.addToAccessHistory(subject); // Add to access history for dropdown ordering
                }
                
                // For cache hits, use actualPage (which is 1 for new searches, currentPage for pagination)
                this.renderRealYoutubeResults(videos, cachedData.page || actualPage, 'many', subject, type, isPagination, null, options.isOverwrite);
                // --- BEGIN: Update dropdown after cache hit ---
                if (typeof updateDropdownWithCurrentQuery === 'function') {
                    updateDropdownWithCurrentQuery().catch(error => {
                        console.error('Error updating dropdown after cache hit:', error);
                    });
                }
                // --- END: Update dropdown after cache hit ---
                this.setPaginatorBar('restored');
                this.hasYouTubeSearch = true;

                console.log('[HANDLE-YOUTUBE-REQUEST] hasYouTubeSearch:', this.hasYouTubeSearch);
                return;
            }
        }

        // STEP 2: CHECK QUOTA BEFORE API CALL
        if (this.services.quotaMonitor && this.services.quotaMonitor.shouldBlockAPICall && this.services.quotaMonitor.shouldBlockAPICall()) {
            console.log('⚠️ [QUOTA] API call blocked due to quota limits');
            
            // Try to find any cached results for this query (even old ones)
            const fallbackVideos = this.findFallbackCachedResults(subject, type);
            if (fallbackVideos.length > 0) {
                console.log('⚠️ [QUOTA] Using fallback cached results:', fallbackVideos.length, 'videos');
                if (this.services.showToast) {
                    this.services.showToast('⚠️ Using older cached results (YouTube API quota exceeded)', 'warning', 5000);
                }
                this.renderRealYoutubeResults(fallbackVideos, 1, 'many', subject, type, isPagination, null, options.isOverwrite);
                this.setPaginatorBar('restored');
                this.hasYouTubeSearch = true;
            return;
            } else {
                console.log('❌ [QUOTA] No fallback cached results available');
                if (typeof window.addMessageToChat === 'function') {
                    window.addMessageToChat('assistant', 'YouTube API quota has been exceeded and no cached results are available. Please try searching for a different term or try again later.');
                } else if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', 'YouTube API quota has been exceeded and no cached results are available. Please try searching for a different term or try again later.');
                }
                return;
            }
        }

        // STEP 3: MAKE API CALL using the new API service
        console.log('🌐 [API] Making fresh API call for:', subject, 'page:', currentPage);

        try {
            const apiResult = await this.apiService.searchYouTube({
                query: normalizedSubject, // Use normalized subject for consistency
                type,
                page: actualPage,
                pageToken,
                options
            });

            if (!apiResult.success) {
                console.error('❌ [API-ERROR] API call failed:', apiResult.error);
                return;
            }

            const data = apiResult.data;
            const cacheKey = apiResult.cacheKey;

            // Cache the successful response with current timestamp for chronological ordering
            const cacheData = {
                ...data,
                timestamp: Date.now(), // Ensure fresh timestamp for new searches
                lastAccessed: Date.now()
            };
            this.cacheService.set(cacheKey, cacheData, 24);
            console.log('⚡ [FUTURE-SAVINGS] This search will use cache next time!');
            console.log('🔑 [CACHE-KEY] Saved with key format:', cacheKey);
            
            // Update the query timestamp to ensure it appears at top of dropdown
            this.updateQueryTimestamp(subject);
            this.addToAccessHistory(subject); // Add to access history for dropdown ordering

            // Handle pagination tokens
            if (data.nextPageToken) {
                sessionStorage.setItem('youtube_nextPageToken', data.nextPageToken);
                console.log('🔑 [PAGINATION] Stored nextPageToken for NEXT button:', data.nextPageToken);
            } else {
                sessionStorage.removeItem('youtube_nextPageToken');
                console.log('🔑 [PAGINATION] No nextPageToken in response - removed from storage');
            }

            // Process videos from response
            let videos = [];
            switch (true) {
                case !!data.video:
                    videos = [data.video];
                    break;
                case !!data.videos:
                    videos = data.videos;
                    break;
            }

            // Render results based on response type
            switch (true) {
                case data.isMock:
                    console.error('❌ [SEGREGATION-ERROR] REAL system received mock data from API');
                    if (typeof window.addMessageToChat === 'function') {
                        window.addMessageToChat('assistant', 'Error: Invalid data format received. Please try your search again.');
                    } else if (typeof addMessageToChat === 'function') {
                        addMessageToChat('assistant', 'Error: Invalid data format received. Please try your search again.');
                    }
                    return;
                case data.resultType === 'MULTI':
                    this.pagination.isActive = true;
                    console.log('🎯 [RENDER] Rendering page:', actualPage, 'from API response');
                    // CRITICAL: Use actualPage (our calculated page) instead of data.page from server
                    this.renderRealYoutubeResults(videos, actualPage, 'many', subject, type, false, messageText, options.isOverwrite);
                    // --- BEGIN: Update dropdown after API search ---
                    console.log('🔄 [DROPDOWN-UPDATE] Updating dropdown after API search for:', subject);
                    // IMMEDIATE dropdown update to show current query at top
                    updateDropdownWithCurrentQuery().catch(error => {
                        console.error('Error updating dropdown after API search:', error);
                    });
                    // --- END: Update dropdown after API search ---
                    this.setPaginatorBar('restored');
                    this.hasYouTubeSearch = true;
                    break;
            }

        } catch (error) {
            console.error('❌ [API-ERROR] Error handling YouTube request:', error);
            if (typeof window.addMessageToChat === 'function') {
                window.addMessageToChat('assistant', `Error: ${error.message}`);
            } else if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', `Error: ${error.message}`);
            }
        }
    }

    /**
     * Helper methods for the comprehensive YouTube search functionality
     */
    getAllQueriesForDropdown() {
        // Get database queries from the savedQueries Map (loaded from MongoDB)
        const dbQueries = Array.from(this.savedQueries.values()).map(savedQuery => ({
            query: savedQuery.query,
            timestamp: savedQuery.timestamp || Date.now(),
            source: 'database',
            hasDBRecord: true,
            hasLocalCache: false
        }));
        
        console.log('📚 [DROPDOWN] Database queries:', dbQueries.length);
        
        // Get local queries from localStorage cache
        const localQueries = this.getLocalStorageQueries();
        console.log('📚 [DROPDOWN] LocalStorage queries:', localQueries.length);
        
        // Merge and dedupe queries
        const mergedQueries = this.mergeAndDedupeQueries(localQueries, dbQueries);
        
        // If no queries exist, add some sample queries for demonstration
        if (mergedQueries.length === 0) {
            const sampleQueries = [
                { query: 'Tonkinese cats', timestamp: Date.now() - 3600000, source: 'sample', hasLocalCache: false, hasDBRecord: true },
                { query: 'guitarlessons365', timestamp: Date.now() - 7200000, source: 'sample', hasLocalCache: false, hasDBRecord: false },
                { query: 'thewhoxevo', timestamp: Date.now() - 10800000, source: 'sample', hasLocalCache: false, hasDBRecord: true },
                { query: 'the who', timestamp: Date.now() - 14400000, source: 'sample', hasLocalCache: false, hasDBRecord: false },
                { query: 'pete townshend', timestamp: Date.now() - 18000000, source: 'sample', hasLocalCache: false, hasDBRecord: true },
                { query: 'larry carlton', timestamp: Date.now() - 21600000, source: 'sample', hasLocalCache: false, hasDBRecord: false }
            ];
            return sampleQueries;
        }
        
        return mergedQueries;
    }

    /**
     * Get queries from localStorage cache
     */
    getLocalStorageQueries() {
        const localQueries = [];
        const allYouTubeKeys = [];
        
        try {
            // Count YouTube-related keys for summary
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('yt_')) {
                    allYouTubeKeys.push(key);
                }
            }
            
            console.log('🔍 [DEBUG] All YouTube cache keys found:', `(${allYouTubeKeys.length}) [abbreviated list - check localStorage for details]`);
            
            // Scan localStorage for YouTube query cache keys (both old and new formats)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Check for both OLD format (yt_query_search_page) and NEW format (yt_search_query_p1_none)
                const isOldFormat = key && key.startsWith('yt_') && (key.includes('_search_') || key.includes('_channel_'));
                const isNewFormat = key && key.startsWith('yt_search_') && key.includes('_p') && key.includes('_none');
                const isNewChannelFormat = key && key.startsWith('yt_channel_') && key.includes('_p') && key.includes('_none');
                
                if (isOldFormat || isNewFormat || isNewChannelFormat) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        
                        // Try multiple ways to get the query
                        let query = null;
                        let type = 'search'; // default type
                        if (item && item.query) {
                            query = item.query;
                            type = item.type || 'search';
                        } else {
                            const extracted = this.extractQueryFromCacheKey(key);
                            if (extracted) {
                                query = extracted.query;
                                type = extracted.type || 'search';
                            }
                        }
                        
                        if (query && !localQueries.find(q => q.query === query)) {
                            localQueries.push({
                                query,
                                type, // Store the type for dropdown display
                                timestamp: item.timestamp || Date.now(),
                                source: 'localStorage',
                                cacheKey: key
                            });
                        }
                    } catch (parseError) {
                        console.warn('Error parsing localStorage item:', key, parseError);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning localStorage for queries:', error);
        }
        
        console.log('🔍 [DEBUG] Final localQueries list:', `(${localQueries.length}) queries processed`);
        
        // Sort by timestamp (newest first)
        return localQueries.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Extract query from cache key format: yt_[query]_[type]_[page]
     * Updated to handle new format where type can be 'search' or 'channel'
     */
    extractQueryFromCacheKey(cacheKey) {
        try {
            if (!cacheKey.startsWith('yt_')) {
                return null;
            }
            
            // NEW FORMAT: yt_search_santanavevo_p1_none or yt_channel_santanavevo_p1_none
            if (cacheKey.startsWith('yt_search_') || cacheKey.startsWith('yt_channel_') || cacheKey.startsWith('yt_movies_') || cacheKey.startsWith('yt_tv_')) {
                const parts = cacheKey.split('_');
                // Format: ['yt', 'search'/'channel'/'movies'/'tv', 'query', 'p1', 'none']
                if (parts.length >= 5 && parts[3].startsWith('p') && parts[4] === 'none') {
                    const type = parts[1]; // The type is the second part
                    const query = parts[2]; // The query is the third part
                    
                    // Debug for SantanaVEVO
                    if (query.toLowerCase().includes('santana')) {
                        console.log('🎸 [EXTRACT-NEW] Extracted Santana query from NEW format:', {
                            cacheKey: cacheKey,
                            parts: parts,
                            extractedQuery: query,
                            extractedType: type
                        });
                    }
                    
                    return { query: query, type: type };
                }
            }
            
            // LEGACY FORMAT: yt_Youtube search privettricker_search_21
            // This is the actual format in your localStorage dump
            if (cacheKey.includes('_search_')) {
                // Split by '_search_' to separate query from page number
                const parts = cacheKey.split('_search_');
                if (parts.length === 2) {
                    // Remove 'yt_' prefix from the first part to get the query
                    const query = parts[0].substring(3); // Remove 'yt_'
                    
                    // Debug for SantanaVEVO
                    if (query.toLowerCase().includes('santana')) {
                        console.log('🎸 [EXTRACT-LEGACY] Extracted Santana query from LEGACY format:', {
                            cacheKey: cacheKey,
                            parts: parts,
                            extractedQuery: query
                        });
                    }
                    
                    return { query: query, type: 'search' }; // Legacy format defaults to 'search' type
                }
            }
            
            // LEGACY FORMAT: yt_Youtube search privettricker_channel_1
            if (cacheKey.includes('_channel_')) {
                // Split by '_channel_' to separate query from page number
                const parts = cacheKey.split('_channel_');
                if (parts.length === 2) {
                    // Remove 'yt_' prefix from the first part to get the query
                    const query = parts[0].substring(3); // Remove 'yt_'
                    return { query: query, type: 'channel' }; // Legacy channel format
                }
            }
            
            // Only log if we can't extract (this is an actual error worth knowing about)
            console.log('🔍 [EXTRACT] Could not extract query from cache key:', cacheKey);
        } catch (error) {
            console.warn('Error extracting query from cache key:', cacheKey, error);
        }
        return null;
    }

    /**
     * Format query display name with type indicator (ch), (mv), (tv)
     */
    formatQueryDisplayName(query, type = 'search') {
        const cleanQuery = this.cleanQueryForDisplay(query);
        
        // Add type indicators based on search type
        switch (type) {
            case 'channel':
                return `${cleanQuery} (ch)`;
            case 'movies':
                return `${cleanQuery} (mv)`;
            case 'tv':
                return `${cleanQuery} (tv)`;
            case 'search':
            default:
                return cleanQuery; // No indicator for regular searches
        }
    }

    /**
     * Clean query text for display by removing "youtube search" prefix
     */
    cleanQueryForDisplay(query) {
        if (!query) return '';
        
        // Remove common prefixes that take up space
        const cleanQuery = query
            .replace(/^youtube\s+search\s+/i, '')
            .replace(/^youtube\s+/i, '')
            .replace(/^search\s+/i, '')
            .trim();
            
        const result = cleanQuery || query; // Return original if cleaning results in empty string
        
        // Debug logging for SantanaVEVO specifically
        if (query.toLowerCase().includes('santana')) {
            console.log('🎸 [CLEAN-QUERY] Santana query cleaning:', {
                original: query,
                cleaned: cleanQuery,
                result: result
            });
        }
        
        return result;
    }

    /**
     * Get the actual number of cached pages for a query from localStorage
     */
    getCachedPageCount(query) {
        // Handle both string queries and query objects
        let baseQuery;
        if (typeof query === 'string') {
            baseQuery = query;
        } else if (query && query.query) {
            baseQuery = query.query;
        } else {
            return 1;
        }
        
        // Try multiple cache key formats to handle both old and new formats
        let count = 0;
        let page = 1;
        
        while (page <= 50) { // Check up to 50 pages max
            // Try multiple formats:
            // 1. New format: yt_[cleanQuery]_search_[page]
            // 2. Old format: yt_[fullQuery]_search_[page] 
            // 3. Legacy format: yt_Youtube search [query]_search_[page]
            
            const cleanedQuery = this.cleanQueryForDisplay(baseQuery);
            const possibleKeys = [
                `yt_search_${baseQuery.toLowerCase().replace(/\s+/g, '_')}_p${page}_none`,             // New format (priority)
                `yt_${baseQuery}_search_${page}`,             // Legacy format (fallback)
                `yt_${cleanedQuery}_search_${page}`,          // Clean format (fallback)
                `yt_Youtube search ${cleanedQuery}_search_${page}`, // Old legacy format (fallback)
                `yt_youtube search ${cleanedQuery}_search_${page}`  // Lowercase legacy (fallback)
            ];
            
            let found = false;
            for (const cacheKey of possibleKeys) {
                if (localStorage.getItem(cacheKey)) {
                    found = true;
                    break;
                }
            }
            
            if (found) {
                count++;
                page++;
                } else {
                break;
            }
        }
        
        // If no cache found but query is in database, show "DB" instead of "1 pg"
        if (count === 0 && this.isQuerySaved(baseQuery)) {
            console.log('🔍 [PAGE-COUNT] Query:', baseQuery, '-> In database but no cache (showing "DB")');
            return 'DB'; // Special indicator for database queries without cache
        }
        
        console.log('🔍 [PAGE-COUNT] Query:', baseQuery, '-> Found', count, 'cached pages');
        
        return Math.max(1, count);
    }

    /**
     * Sort queries with current query at top, then by timestamp (most recent first)
     */
    sortQueriesWithCurrentFirst(queries, currentQuery) {
        if (!currentQuery) {
            // No current query, use access history order if available, otherwise timestamp
            return this.sortByAccessHistory(queries);
        }
        
        const cleanCurrentQuery = this.cleanQueryForDisplay(currentQuery);
        console.log('🔄 [SORT] Sorting queries using access history with current query at top:', cleanCurrentQuery);
        
        const sorted = queries.sort((a, b) => {
            const aClean = this.cleanQueryForDisplay(a.query);
            const bClean = this.cleanQueryForDisplay(b.query);
            
            // Current query always goes to top (#1)
            if (aClean === cleanCurrentQuery) return -1;
            if (bClean === cleanCurrentQuery) return 1;
            
            // For all other queries, use access history order
            return this.compareByAccessHistory(a, b);
        });
        
        console.log('🔄 [SORT] Sorted queries using access history:', sorted.slice(0, 5).map(q => ({
            query: this.cleanQueryForDisplay(q.query),
            accessOrder: this.getAccessHistoryIndex(q.query),
            timestamp: q.timestamp,
            timeAgo: this.formatTimestamp(q.timestamp)
        })));
        
        return sorted;
    }
    
    /**
     * Sort queries by access history order
     */
    sortByAccessHistory(queries) {
        return queries.sort((a, b) => this.compareByAccessHistory(a, b));
    }
    
    /**
     * Compare two queries by their position in access history
     */
    compareByAccessHistory(a, b) {
        const aIndex = this.getAccessHistoryIndex(a.query);
        const bIndex = this.getAccessHistoryIndex(b.query);
        
        // If both are in access history, sort by access order (lower index = more recent)
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        }
        
        // If only one is in access history, it comes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither is in access history, fall back to timestamp
        const aTime = a.timestamp || a.lastAccessed || 0;
        const bTime = b.timestamp || b.lastAccessed || 0;
        return bTime - aTime;
    }
    
    /**
     * Get the index of a query in the access history (lower index = more recent)
     */
    getAccessHistoryIndex(query) {
        const cleanQuery = this.cleanQueryForDisplay(query);
        const index = this.queryAccessHistory.findIndex(item => item.cleanQuery === cleanQuery);
        
        console.log('🔍 [ACCESS-INDEX] Looking for query:', cleanQuery);
        console.log('🔍 [ACCESS-INDEX] In access history:', this.queryAccessHistory.map(item => item.cleanQuery));
        console.log('🔍 [ACCESS-INDEX] Found at index:', index);
        
        return index;
    }

    /**
     * Update query timestamp for chronological ordering (called on new searches)
     */
    updateQueryTimestamp(query) {
        console.log('⏰ [TIMESTAMP] Updating timestamp for query:', query);
        this.updateQueryTimestampWithSpecificTime(query, Date.now());
    }
    
    updateQueryTimestampWithSpecificTime(query, timestamp) {
        console.log('⏰ [TIMESTAMP] Updating timestamp for query:', query, 'to:', new Date(timestamp));
        
        const normalizedQuery = this.cleanQueryForDisplay(query);
        
        // Update timestamp in localStorage cache entries
        const cacheKeys = Object.keys(localStorage).filter(key => {
            return key.startsWith('yt_') && 
                   (key.includes(`_${normalizedQuery.toLowerCase().replace(/\s+/g, '_')}_`) ||
                    key.includes(`_${query.toLowerCase().replace(/\s+/g, '_')}_`));
        });
        
        console.log('⏰ [TIMESTAMP] Found cache keys to update:', cacheKeys.length);
        
        cacheKeys.forEach(cacheKey => {
            try {
                const cachedData = JSON.parse(localStorage.getItem(cacheKey));
                if (cachedData) {
                    cachedData.timestamp = timestamp;
                    cachedData.lastAccessed = timestamp;
                    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                    console.log('⏰ [TIMESTAMP] Updated timestamp for cache key:', cacheKey);
                }
            } catch (error) {
                console.warn('⏰ [TIMESTAMP] Error updating cache timestamp:', error);
            }
        });
        
        // Also update saved queries if it exists there
        if (this.savedQueries && this.savedQueries.has(query)) {
            const savedQuery = this.savedQueries.get(query);
            savedQuery.timestamp = timestamp;
            this.savedQueries.set(query, savedQuery);
            console.log('⏰ [TIMESTAMP] Updated saved query timestamp');
        }
    }

    /**
     * Add or update a query in the access history array
     */
    addToAccessHistory(query, type = 'search') {
        const cleanQuery = this.cleanQueryForDisplay(query);
        const currentTime = Date.now();
        
        console.log('📈 [ACCESS-HISTORY] Adding query to access history:', cleanQuery, 'type:', type);
        
        // Remove existing entry if it exists
        this.queryAccessHistory = this.queryAccessHistory.filter(item => 
            this.cleanQueryForDisplay(item.query) !== cleanQuery
        );
        
        // Add to front of array with current timestamp and type
        this.queryAccessHistory.unshift({
            query: query,
            cleanQuery: cleanQuery,
            type: type, // Store the search type
            accessTimestamp: currentTime,
            accessTime: new Date(currentTime).toLocaleString()
        });
        
        // Keep only last 20 accessed queries to prevent unlimited growth
        if (this.queryAccessHistory.length > 20) {
            this.queryAccessHistory = this.queryAccessHistory.slice(0, 20);
        }
        
        console.log('📈 [ACCESS-HISTORY] Updated access history:', 
            this.queryAccessHistory.slice(0, 5).map(item => ({
                query: item.cleanQuery,
                accessTime: item.accessTime
            }))
        );
    }
    
    /**
     * Move a query to the top of the list (called when user clicks a query)
     */
    moveQueryToTop(clickedQuery) {
        console.log('📍 [MOVE-TO-TOP] Moving query to top:', clickedQuery);
        
        // Add to access history array (this tracks the order of access)
        this.addToAccessHistory(clickedQuery);
        
        // Also update the query's cache timestamp for other purposes
        this.updateQueryTimestamp(clickedQuery);
        
        console.log('📍 [MOVE-TO-TOP] Added to access history and updated cache timestamp');
    }

    /**
     * Merge and deduplicate queries from different sources
     */
    mergeAndDedupeQueries(localQueries, dbQueries) {
        const merged = new Map();
        
        // Add local queries first (they have cached data and are prioritized)
        localQueries.forEach(query => {
            // Normalize query by removing prefixes and converting to lowercase
            const normalizedQuery = this.cleanQueryForDisplay(query.query).toLowerCase().trim();
            merged.set(normalizedQuery, {
                ...query,
                hasLocalCache: true,
                priority: 'cache', // Highest priority
                normalizedQuery
            });
        });
        
        // Add DB queries ONLY if no cached version exists
        dbQueries.forEach(query => {
            const queryText = query.query || query.displayName || query;
            // Normalize DB query the same way as cache queries
            const normalizedQuery = this.cleanQueryForDisplay(queryText).toLowerCase().trim();
            
            if (!merged.has(normalizedQuery)) {
                // Only add DB entry if no cached version exists
                merged.set(normalizedQuery, {
                    query: queryText,
                    timestamp: query.timestamp || query.createdAt || Date.now(),
                    source: 'database',
                    hasLocalCache: false,
                    priority: 'database', // Lower priority
                    normalizedQuery,
                    ...query
                });
            } else {
                // Update existing cached entry with DB metadata (but keep cache priority)
                const existing = merged.get(normalizedQuery);
                merged.set(normalizedQuery, {
                    ...existing,
                    hasDBRecord: true,
                    dbData: query,
                    priority: 'cache' // Keep cache priority
                });
            }
        });
        
        // Convert back to array, with more inclusive filtering, and sort
        const result = Array.from(merged.values())
            .filter(query => {
                // Always keep cache entries
                if (query.priority === 'cache') {
                    return true;
                }
                
                // For database entries, be more inclusive
                if (query.priority === 'database') {
                    // Always show database queries - let the user decide what to do with them
                    return true;
                }
                
                return true; // Keep all entries by default
            })
            .sort((a, b) => {
                // Sort by priority first (cache > database), then by timestamp
                if (a.priority !== b.priority) {
                    return a.priority === 'cache' ? -1 : 1;
                }
                return b.timestamp - a.timestamp;
            });
        
        console.log('🔀 [MERGE] Merged queries:', {
            total: result.length,
            cached: result.filter(q => q.priority === 'cache').length,
            dbOnly: result.filter(q => q.priority === 'database').length,
            queries: result.map(q => q.query).slice(0, 10) // Show first 10 queries for debugging
        });
        
        // Special debug for Santana query
        const santanaQueries = result.filter(q => q.query.toLowerCase().includes('santana'));
        if (santanaQueries.length > 0) {
            console.log('🎸 [SANTANA] Found Santana queries:', santanaQueries);
        } else {
            console.log('🎸 [SANTANA] No Santana queries found in merged results');
        }
        
        // Apply access history sorting to ensure recently searched queries appear at top
        const sortedResult = this.sortByAccessHistory(result);
        
        console.log('📊 [SORT] Applied access history sorting, top 5 queries:', 
            sortedResult.slice(0, 5).map(q => q.query)
        );
        
        return sortedResult;
    }

    /**
     * Refresh cache from MongoDB when localStorage is empty or stale
     */
    async refreshCacheFromMongoDB() {
        console.log('🔄 [CACHE-REFRESH] Refreshing localStorage cache from MongoDB');
        
        try {
            // Load saved queries from MongoDB
            await this.loadSavedQueries();
            
            // Convert savedQueries Map to array and store in localStorage
            const dbQueries = Array.from(this.savedQueries.values());
            localStorage.setItem('youtubeSavedQueries', JSON.stringify(dbQueries));
            
            console.log('✅ [CACHE-REFRESH] Successfully refreshed cache with', dbQueries.length, 'queries from MongoDB');
            return dbQueries;
        } catch (error) {
            console.error('❌ [CACHE-REFRESH] Error refreshing cache from MongoDB:', error);
            return [];
        }
    }

    /**
     * Repopulate search results cache for database queries
     * This will actually search for and cache results for queries that show "DB"
     */
    async repopulateSearchCache(maxQueries = 10) {
        console.log('🔄 [CACHE-REPOPULATE] Starting cache repopulation for database queries');
        
        if (window.showToast) {
            window.showToast('Repopulating cache from database queries...', 'info');
        }
        
        try {
            // Get all database queries
            await this.loadSavedQueries();
            const dbQueries = Array.from(this.savedQueries.values());
            
            // Filter to queries that don't have cache (show "DB")
            const uncachedQueries = dbQueries.filter(query => {
                const pageCount = this.getCachedPageCount(query.query);
                return pageCount === 'DB';
            });
            
            console.log('🔄 [CACHE-REPOPULATE] Found', uncachedQueries.length, 'uncached database queries');
            
            if (uncachedQueries.length === 0) {
                if (window.showToast) {
                    window.showToast('All database queries already have cache', 'success');
                }
                return;
            }
            
            // Limit to avoid API quota issues
            const queriesToCache = uncachedQueries.slice(0, maxQueries);
            let successCount = 0;
            let errorCount = 0;
            
            for (const [index, queryObj] of queriesToCache.entries()) {
                try {
                    console.log(`🔄 [CACHE-REPOPULATE] Processing ${index + 1}/${queriesToCache.length}: ${queryObj.query}`);
                    
                    if (window.showToast) {
                        window.showToast(`Caching ${index + 1}/${queriesToCache.length}: ${this.cleanQueryForDisplay(queryObj.query)}`, 'info');
                    }
                    
                    // Perform actual search to populate cache
                    await this.handleYoutubeRequest(queryObj.query, false, null, { skipUIUpdate: true });
                    
                    successCount++;
                    
                    // Small delay to avoid overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`🔄 [CACHE-REPOPULATE] Error caching query ${queryObj.query}:`, error);
                    errorCount++;
                }
            }
            
            console.log(`✅ [CACHE-REPOPULATE] Completed: ${successCount} success, ${errorCount} errors`);
            
            if (window.showToast) {
                window.showToast(`Cache repopulation complete: ${successCount} queries cached, ${errorCount} errors`, 
                    errorCount === 0 ? 'success' : 'warning');
            }
            
            // Refresh the dropdown to show updated page counts
            const updatedQueries = this.getAllQueriesForDropdown();
            await this.renderQueryDropdown(updatedQueries, null);
            
        } catch (error) {
            console.error('❌ [CACHE-REPOPULATE] Error during cache repopulation:', error);
            if (window.showToast) {
                window.showToast('Error during cache repopulation', 'error');
            }
        }
    }

    /**
     * Repopulate cache using clicked videos from MongoDB (no API calls needed!)
     */
    async repopulateCacheFromClickedVideos(maxQueries = 10) {
        console.log('💾 [CLICKED-CACHE] Starting cache repopulation from clicked videos');
        
        if (window.showToast) {
            window.showToast('Repopulating cache from clicked videos...', 'info');
        }
        
        try {
            // Get all database queries
            await this.loadSavedQueries();
            const dbQueries = Array.from(this.savedQueries.values());
            
            // Filter to queries that don't have cache (show "DB")
            const uncachedQueries = dbQueries.filter(query => {
                const pageCount = this.getCachedPageCount(query.query);
                return pageCount === 'DB';
            });
            
            console.log('💾 [CLICKED-CACHE] Found', uncachedQueries.length, 'uncached database queries');
            
            if (uncachedQueries.length === 0) {
                if (window.showToast) {
                    window.showToast('All database queries already have cache', 'success');
                }
                return;
            }
            
            // Limit to avoid overwhelming the system
            const queriesToCache = uncachedQueries.slice(0, maxQueries);
            let successCount = 0;
            let errorCount = 0;
            let noClicksCount = 0;
            
            for (const [index, queryObj] of queriesToCache.entries()) {
                try {
                    console.log(`💾 [CLICKED-CACHE] Processing ${index + 1}/${queriesToCache.length}: ${queryObj.query}`);
                    
                    if (window.showToast) {
                        window.showToast(`Checking clicked videos ${index + 1}/${queriesToCache.length}: ${this.cleanQueryForDisplay(queryObj.query)}`, 'info');
                    }
                    
                    // Get clicked videos for this query from MongoDB
                    const response = await fetch(`/api/youtube/clicked-videos/query/${encodeURIComponent(queryObj.query)}`);
                    
                    if (response.ok) {
                        const clickedVideos = await response.json();
                        
                        if (clickedVideos.length > 0) {
                            // Convert clicked videos to cache format
                            const cacheVideos = clickedVideos.map(cv => ({
                                id: cv.videoId,
                                title: cv.title,
                                description: cv.description,
                                thumbnail: cv.thumbnail,
                                channelTitle: cv.channelTitle,
                                publishedAt: cv.publishedAt,
                                duration: cv.duration
                            }));
                            
                            // Cache the clicked videos
                            const cacheKey = `yt_search_${queryObj.query.toLowerCase().replace(/\s+/g, '_')}_p1_none`;
                            this.cacheService.set(cacheKey, {
                                videos: cacheVideos,
                                page: 1,
                                timestamp: Date.now(),
                                fromClickedVideos: true // Mark as populated from clicked videos
                            }, 24);
                            
                            console.log(`✅ [CLICKED-CACHE] Successfully cached ${cacheVideos.length} clicked videos for: ${queryObj.query}`);
                            successCount++;
                        } else {
                            console.log(`⚠️ [CLICKED-CACHE] No clicked videos found for: ${queryObj.query}`);
                            noClicksCount++;
                        }
                    } else {
                        console.error(`❌ [CLICKED-CACHE] Failed to fetch clicked videos for: ${queryObj.query}`);
                        errorCount++;
                    }
                    
                } catch (error) {
                    console.error(`❌ [CLICKED-CACHE] Error processing query ${queryObj.query}:`, error);
                    errorCount++;
                }
            }
            
            console.log(`🎯 [CLICKED-CACHE] Completed: ${successCount} cached, ${noClicksCount} no clicks, ${errorCount} errors`);
            
            if (window.showToast) {
                if (successCount > 0) {
                    window.showToast(`Clicked video cache complete: ${successCount} queries cached from clicked videos`, 'success');
                } else if (noClicksCount > 0) {
                    window.showToast(`No clicked videos found for any queries. Click videos to build cache!`, 'info');
                } else {
                    window.showToast(`Error repopulating from clicked videos`, 'error');
                }
            }
            
            // Refresh the dropdown to show updated page counts
            const updatedQueries = this.getAllQueriesForDropdown();
            await this.renderQueryDropdown(updatedQueries, null);
            
            return { successCount, noClicksCount, errorCount, totalProcessed: queriesToCache.length };
            
        } catch (error) {
            console.error('❌ [CLICKED-CACHE] Error during clicked video cache repopulation:', error);
            if (window.showToast) {
                window.showToast('Error during clicked video cache repopulation', 'error');
            }
            return { successCount: 0, noClicksCount: 0, errorCount: 1, totalProcessed: 0 };
        }
    }

    async renderQueryHistory() {
        const listContainer = document.querySelector('.query-history-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div>Loading...</div>';

        try {
            const response = await fetch('/api/youtube/history/list');
            const result = await response.json();

            if (!result.success || result.queries.length === 0) {
                listContainer.innerHTML = '<div>No history found.</div>';
                return;
            }

            listContainer.innerHTML = '';
            for (const item of result.queries) {
                const historyItemEl = document.createElement('div');
                historyItemEl.className = 'query-history-item';
                historyItemEl.dataset.query = item.query;

                // Main content container (text and status)
                const mainContent = document.createElement('div');
                mainContent.className = 'query-history-main';

                // Status icon
                const statusIcon = document.createElement('div');
                statusIcon.className = 'history-status-icon';
                if (item.isSaved) {
                    statusIcon.classList.add('saved');
                }
                mainContent.appendChild(statusIcon);
                
                // Query text
                const textEl = document.createElement('span');
                textEl.className = 'query-history-item-text';
                textEl.textContent = item.displayName || item.query;
                textEl.title = `Run search for: "${item.query}"`;
                textEl.onclick = () => {
                    this.handleYoutubeRequest(item.query, false);
                    document.querySelector('.query-history-dropdown').classList.remove('show');
                };
                mainContent.appendChild(textEl);
                
                historyItemEl.appendChild(mainContent);

                // Icons container
                const iconsContainer = document.createElement('div');
                iconsContainer.className = 'query-history-item-icons';

                // Delete Icon
                const deleteIcon = document.createElement('span');
                deleteIcon.className = 'history-action-icon delete-icon';
                deleteIcon.innerHTML = '🗑️';
                deleteIcon.title = 'Delete from history';
                deleteIcon.onclick = (e) => {
                    e.stopPropagation();
                    this.deleteQueryFromHistory(item.query);
                };
                iconsContainer.appendChild(deleteIcon);
                
                historyItemEl.appendChild(iconsContainer);
                listContainer.appendChild(historyItemEl);
            }
        } catch (error) {
            console.error('Error rendering query history:', error);
            listContainer.innerHTML = '<div>Error loading history.</div>';
        }
    }

    async deleteQueryFromHistory(query) {
        try {
            const cleanQuery = this.extractCleanQuery(query);
            await fetch(`/api/youtube/history/delete/${encodeURIComponent(cleanQuery)}`, {
                method: 'DELETE'
            });
            await this.renderQueryHistory();
        } catch (error) {
            console.error('Error deleting query from history:', error);
        }
    }

    async renderQueryDropdown(queries, currentQuery) {
        console.log('📝 [DROPDOWN] Rendering query dropdown for:', currentQuery);
        
        // If no queries found, try to refresh from MongoDB
        if (queries.length === 0) {
            console.log('📝 [DROPDOWN] No queries found, attempting to refresh from MongoDB');
            queries = await this.refreshCacheFromMongoDB();
        }
        
        // Sort queries with current query at top
        if (currentQuery) {
            queries = this.sortQueriesWithCurrentFirst(queries, currentQuery);
        }
        
        // Find the dropdown list container (not the whole dropdown)
        const listContainer = document.querySelector('.restored-paginator-bar .query-history-list');
        if (!listContainer) {
            console.warn('📝 [DROPDOWN] Dropdown list container not found');
            return;
        }
        
        // Clear existing content
        listContainer.innerHTML = '';
        
        if (queries.length === 0) {
            listContainer.innerHTML = '<div class="query-history-empty">No search history found</div>';
            return;
        }
        
        // Create dropdown items
        queries.slice(0, 20).forEach((query, index) => {
            const item = document.createElement('div');
            item.className = 'query-history-item';
            
            // Store both the original full query and formatted display name with type indicator
            const formattedDisplayName = this.formatQueryDisplayName(query.query, query.type);
            item.setAttribute('data-query', query.query); // Full original query
            item.setAttribute('data-display-name', formattedDisplayName); // Formatted display name with type indicator
            
            // Define the click handler function for columns 1 and 2
            const handleQueryClick = async (e) => {
                console.log('🖱️ [CLICK] User clicked query:', query.query);
                console.log('🖱️ [CLICK] Formatted display name:', formattedDisplayName);
                console.log('🖱️ [CLICK] Query object:', query);
                
                try {
                    // Move this query to the top of the list using the FULL query
                    this.moveQueryToTop(query.query);
                    
                    // Load the query results using the FULL query
                    console.log('🖱️ [CLICK] About to load query from history with full query:', query.query);
                    await this.loadQueryFromHistory(query.query);
                    console.log('🖱️ [CLICK] Query loaded successfully');
                    
                    // CRITICAL: Ensure scroll to YouTube results after query loads
                    setTimeout(() => {
                        console.log('🖱️ [CLICK] ENSURING SCROLL TO YOUTUBE RESULTS after dropdown click');
                        
                        // Look for YouTube results in the chat
                        const youtubeResults = document.querySelector('.youtube-multi-bubble, .youtube-single-bubble, .youtube-results');
                        
                        if (youtubeResults) {
                            console.log('🖱️ [CLICK] Found YouTube results, scrolling to them');
                            youtubeResults.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                            });
                            
                            // Backup: Also force scroll to top after a short delay
                            setTimeout(() => {
                                this.forceScrollToTop();
                            }, 300);
                        } else {
                            console.log('🖱️ [CLICK] No YouTube results found, forcing scroll to top');
                            this.forceScrollToTop();
                        }
                    }, 200);
                    
                    // Re-render dropdown to show new order after a short delay
                    setTimeout(async () => {
                        console.log('🖱️ [CLICK] Re-rendering dropdown...');
                        const updatedQueries = this.getAllQueriesForDropdown();
                        await this.renderQueryDropdown(updatedQueries, query.query);
                    }, 500);
                    
                } catch (error) {
                    console.error('🖱️ [CLICK] Error in click handler:', error);
                }
                
                // Close dropdown
                document.querySelector('.query-history-dropdown').classList.remove('show');
            };
            
            // Create 4-column table structure
            const table = document.createElement('div');
            table.className = 'query-table';
            
            // Column 1: Status LED and page count (stacked vertically) - clickable
            const col1 = document.createElement('div');
            col1.className = 'query-col query-col-status clickable';
            col1.onclick = handleQueryClick;
            
            // Status LED icon (only show for saved queries)
            const statusIcon = document.createElement('div');
            statusIcon.className = 'history-status-icon';
            // Check both the query object properties AND the savedQueries Map
            const isSavedInDB = query.hasDBRecord || query.source === 'database' || this.isQuerySaved(query.query);
            if (isSavedInDB) {
                statusIcon.classList.add('saved');
                statusIcon.innerHTML = '🟢'; // Show green LED for saved queries
                statusIcon.title = 'Saved to database';
                statusIcon.style.opacity = '1'; // Make sure it's visible
            } else {
                statusIcon.classList.add('unsaved');
                statusIcon.title = 'Not saved to database';
                statusIcon.style.opacity = '0'; // Hide for unsaved queries
            }
            col1.appendChild(statusIcon);
            
            // Page count below the LED
            const pageCount = this.getCachedPageCount(query);
            const pageCountEl = document.createElement('div');
            pageCountEl.className = 'query-page-count';
            if (pageCount === 'DB') {
                pageCountEl.textContent = 'DB';
                pageCountEl.title = 'Database query - click to search and cache';
            } else {
            pageCountEl.textContent = pageCount === 1 ? '1 pg' : `${pageCount} pgs`;
            }
            col1.appendChild(pageCountEl);
            
            // Column 2: Query name and time ago (stacked vertically) - clickable
            const col2 = document.createElement('div');
            col2.className = 'query-col query-col-text clickable';
            col2.onclick = handleQueryClick;
            
            // Query name
            const queryName = document.createElement('div');
            queryName.className = 'query-text';
            queryName.textContent = formattedDisplayName;
            queryName.title = `Run search for: "${formattedDisplayName}"`;
            col2.appendChild(queryName);
            
            // Time ago below query name
            const timeAgoEl = document.createElement('div');
            timeAgoEl.className = 'query-time-ago';
            timeAgoEl.textContent = this.formatTimestamp(query.timestamp);
            col2.appendChild(timeAgoEl);
            
            // Column 3: Save icon (always present)
            const col3 = document.createElement('div');
            col3.className = 'query-col query-col-save';
            
            const saveIcon = document.createElement('span');
            // Check both the query object properties AND the savedQueries Map
            const isSaved = query.hasDBRecord || query.source === 'database' || this.isQuerySaved(query.query);
            
            // Always show the save icon, but disable it if already saved
            saveIcon.className = 'history-action-icon save-icon';
            saveIcon.innerHTML = '💾';
            
            if (isSaved) {
                // Already saved - show disabled save icon (but keep it visible)
                saveIcon.classList.add('disabled');
                saveIcon.title = 'Already saved to database';
                saveIcon.style.opacity = '0.3';
                saveIcon.style.cursor = 'not-allowed';
                // Remove any existing click handler
                saveIcon.onclick = null;
            } else {
                // Not saved - show active save icon
                saveIcon.title = 'Save to database';
                saveIcon.style.opacity = '1';
                saveIcon.style.cursor = 'pointer';
                saveIcon.onclick = async (e) => {
                    e.stopPropagation();
                    console.log('💾 [SAVE-CLICK] Save icon clicked for query:', query.query);
                    
                    // Show immediate visual feedback
                    saveIcon.style.opacity = '0.5';
                    saveIcon.title = 'Saving...';
                    saveIcon.style.cursor = 'wait';
                    
                    try {
                        // Wait for save to complete
                        await this.saveQuery(query.query);
                        console.log('💾 [SAVE-CLICK] Save completed successfully');
                        
                        // Update the LED immediately to show it's saved
                        const statusIcon = item.querySelector('.history-status-icon');
                        if (statusIcon) {
                            statusIcon.classList.add('saved');
                            statusIcon.classList.remove('unsaved');
                            statusIcon.innerHTML = '🟢'; // Show emoji LED immediately
                            statusIcon.title = 'Saved to database';
                            statusIcon.style.opacity = '1';
                        }
                        
                        // Disable the save icon immediately
                        saveIcon.classList.add('disabled');
                        saveIcon.title = 'Already saved to database';
                        saveIcon.style.opacity = '0.3';
                        saveIcon.style.cursor = 'not-allowed';
                        saveIcon.onclick = null;
                        
                        // Show success toast
                        if (window.showToast) {
                            window.showToast(`✅ "${this.cleanQueryForDisplay(query.query)}" saved to database`, 'success');
                        }
                        
                        console.log('💾 [SAVE-CLICK] UI updated to show saved state');
                        
                    } catch (error) {
                        console.error('💾 [SAVE-CLICK] Save failed:', error);
                        
                        // Reset visual feedback on error
                        saveIcon.style.opacity = '1';
                        saveIcon.title = 'Save to database';
                        saveIcon.style.cursor = 'pointer';
                        
                        if (window.showToast) {
                            window.showToast(`❌ Failed to save "${this.cleanQueryForDisplay(query.query)}"`, 'error');
                        }
                    }
                };
            }
            col3.appendChild(saveIcon);
            
            // Column 4: Delete icon
            const col4 = document.createElement('div');
            col4.className = 'query-col query-col-delete';
            
            const deleteIcon = document.createElement('span');
            deleteIcon.className = 'history-action-icon delete-icon';
            deleteIcon.innerHTML = '🗑️';
            deleteIcon.title = 'Delete from history';
            deleteIcon.onclick = (e) => {
                e.stopPropagation();
                // Remove from localStorage
                if (query.cacheKey) {
                    localStorage.removeItem(query.cacheKey);
                }
                // Re-render dropdown
                const updatedQueries = this.getAllQueriesForDropdown();
                this.renderQueryDropdown(updatedQueries, currentQuery);
            };
            col4.appendChild(deleteIcon);
            
            // Assemble the table
            table.appendChild(col1);
            table.appendChild(col2);
            table.appendChild(col3);
            table.appendChild(col4);
            
            item.appendChild(table);
            listContainer.appendChild(item);
        });
        
        console.log('📝 [DROPDOWN] Rendered', queries.length, 'query items');
        console.log('📝 [DROPDOWN] Queries being rendered:', queries.map(q => q.query).slice(0, 10));
        
        // Special debug for Santana query in dropdown
        const santanaInDropdown = queries.filter(q => q.query.toLowerCase().includes('santana'));
        if (santanaInDropdown.length > 0) {
            console.log('🎸 [DROPDOWN-SANTANA] Santana queries in dropdown:', santanaInDropdown);
        } else {
            console.log('🎸 [DROPDOWN-SANTANA] No Santana queries found in dropdown queries');
        }
    }
    
    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    }
    
    /**
     * Load a query from history and display its cached results
     * @param {string} query - The query to load
     */
    async loadQueryFromHistory(query) {
        console.log('📥 [HISTORY] Loading query from history:', query);
        
        // CRITICAL: ALWAYS scroll to top when loading YouTube queries from history
        console.log('📥 [HISTORY] SCROLLING TO TOP for history query load!');
        this.forceScrollToTop();
        
        try {
            // Use navigateToQuery method based on reference implementation
            await this.navigateToQuery(query);
            console.log('✅ [HISTORY] Successfully loaded query from history');
            
            // Double-check scroll after navigation completes
            setTimeout(() => {
                this.scrollToYouTubeResults();
            }, 200);
        } catch (error) {
            console.error('❌ [HISTORY] Error loading query from history:', error);
        }
    }

    /**
     * Navigate to a specific query by loading all its cached pages
     * Based on reference implementation from _ref_repo-DEV1
     * @param {string} query - The query to navigate to
     */
    async navigateToQuery(query) {
        console.log('🔍 [HISTORY] Navigating to query:', query);

        // Try to find the actual cache key format by checking variations
        const possibleQueries = [
            query, // exact query
            `youtube search ${query}`, // full format
            `Youtube search ${query}`, // capital Y format
            `youtube ${query}`, // youtube prefix
            `Youtube ${query}`, // capital Y prefix
        ];
        
        console.log('🔍 [DEBUG] Trying query variations:', possibleQueries);
        
        let actualQuery = null;
        let foundPages = 0;
        
        // Find which query format has cached data by scanning all localStorage keys
        // This is more robust than guessing format variations
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_') && (key.includes('_search_') || key.includes('_channel_'))) {
                const extracted = this.extractQueryFromCacheKey(key);
                if (extracted) {
                    const extractedQuery = extracted.query;
                    const cleanedExtractedQuery = this.cleanQueryForDisplay(extractedQuery);
                    
                    // Check if this cache key matches our target query
                    if (extractedQuery === query || cleanedExtractedQuery === query) {
                        actualQuery = extractedQuery; // Use the exact format from the cache
                console.log('🔍 [DEBUG] Found cache with query format:', actualQuery);
                break;
                    }
                }
            }
        }
        
        if (!actualQuery) {
            console.log('🔍 [DEBUG] No cache found for any query variation');
            console.log('🔍 [DEBUG] This appears to be a DB-only query, checking quota before fresh search for:', query);
            
            // Check quota status before making API call
            const quotaMonitor = window.quotaMonitor;
            if (quotaMonitor && quotaMonitor.shouldBlockAPICall && quotaMonitor.shouldBlockAPICall()) {
                console.log('🚫 [QUOTA] API call blocked due to quota limits');
            if (window.showToast) {
                    window.showToast(`🚫 Cannot load "${this.cleanQueryForDisplay(query)}" - quota limit reached (${quotaMonitor.getCurrentUsage()}/10000). Please use cached queries only.`, 'error', 8000);
                }
                return;
            }
            
            // Check if quota usage is above 90% (9000) - emergency brake
            const currentUsage = quotaMonitor ? quotaMonitor.getCurrentUsage() : 0;
            if (currentUsage > 9000) {
                console.log('🚫 [QUOTA-EMERGENCY] API call blocked - usage above 90%:', currentUsage);
                if (window.showToast) {
                    window.showToast(`🚫 Cannot load "${this.cleanQueryForDisplay(query)}" - quota critically high (${currentUsage}/10000). Server blocks API calls above 90%.`, 'error', 8000);
                }
                return;
            }
            
            // CRITICAL: Reset pagination to page 1 for dropdown clicks before fresh search
            this.pagination.currentPage = 1;
            this.pagination.originalQuery = query;
            this.pagination.searchType = 'search';
            
            // For DB-only queries that haven't been cached yet, trigger a fresh search
            await this.handleYoutubeRequest(query, false, null, { isOverwrite: true });
            return;
        }

        // 1. Find all cached pages for this query using the correct format
        const pages = [];
        let pageNum = 1;
        while (pageNum <= 20) { // Don't run forever
            const cacheKey = `yt_search_${actualQuery.toLowerCase().replace(/\s+/g, '_')}_p${pageNum}_none`;
            const cached = localStorage.getItem(cacheKey);
            console.log(`🔍 [DEBUG] Checking cache key: ${cacheKey}, found: ${!!cached}`);
            
            if (!cached) {
                pageNum++;
                continue; // Don't break, keep looking for more pages
            }
            
            try {
                const data = JSON.parse(cached);
                console.log(`🔍 [DEBUG] Parsed data for page ${pageNum}:`, data);
                
                let videos = [];
                if (data.video) {
                    videos = [data.video];
                } else if (data.videos) {
                    videos = data.videos;
                } else if (data.items) {
                    videos = data.items; // Some cache formats use 'items'
                }
                
                if (videos.length > 0) {
                    pages.push({
                        videos: videos,
                        page: pageNum,
                        totalPages: pages.length + 1, // Will be updated after we know total
                        subject: actualQuery,
                        type: 'search',
                    });
                    console.log(`🔍 [DEBUG] Added page ${pageNum} with ${videos.length} videos`);
                }
                pageNum++;
            } catch (error) {
                console.error('🔍 [HISTORY] Error parsing cached data for', cacheKey, ':', error);
                pageNum++;
            }
        }

        console.log('🔍 [HISTORY] Found', pages.length, 'cached pages for query:', actualQuery);

        // 2. Update pagination state
        this.pagination.currentPage = 1;
        this.pagination.totalPages = 'many'; // Always use "many" instead of calculating exact count
        this.pagination.originalQuery = actualQuery;
        this.pagination.searchType = 'search';

        // Update total pages for all page objects to use "many"
        pages.forEach(page => {
            page.totalPages = 'many';
        });

        // 3. Render page 1 if we have results (always start at page 1 for dropdown clicks)
        if (pages.length > 0) {
            // CRITICAL: Always force to page 1 for dropdown navigation
            const page1 = pages.find(p => p.page === 1);
            if (page1) {
                console.log('🎯 [HISTORY] Found page 1, rendering with', page1.videos.length, 'videos');
                this.renderRealYoutubeResults(
                    page1.videos,
                    1, // Always start at page 1 for dropdown navigation
                    page1.totalPages,
                    page1.subject,
                    page1.type,
                    false, // isPagination
                    null,  // messageText
                    true   // isOverwrite - replace existing results
                );
            } else {
                // If no page 1 cached, check quota before making fresh API call
                console.log('🎯 [HISTORY] No page 1 cached, checking quota before fresh API call');
                
                const quotaMonitor = window.quotaMonitor;
                const currentUsage = quotaMonitor ? quotaMonitor.getCurrentUsage() : 0;
                
                if (currentUsage > 9000) {
                    console.log('🚫 [QUOTA-EMERGENCY] Cannot fetch page 1 - usage above 90%:', currentUsage);
                    if (window.showToast) {
                        window.showToast(`🚫 Cannot load page 1 of "${this.cleanQueryForDisplay(actualQuery)}" - quota critically high (${currentUsage}/10000). Only cached pages available.`, 'error', 8000);
                    }
                    return;
                }
                
                await this.handleYoutubeRequest(actualQuery, false, null, { isOverwrite: true });
                return; // Exit early since handleYoutubeRequest will handle the rest
            }

            // 4. Update button states
            this.updateButtonStates();

            // 5. Show restored paginator bar
            this.setPaginatorBar('restored');
            this.renderRestoredPaginatorBar(1, 'many', actualQuery);

            // 6. Show toast notification
            if (window.showToast) {
                window.showToast(`📚 Switched to: ${actualQuery}`, 'info');
            }

            // 7. Update dynamic header
            this.updateAllYouTubeHeaders(actualQuery);

            console.log('📚 [PAGINATION] Query navigation state:', {
                query: actualQuery,
                currentPage: 1, // Always start at page 1 for dropdown clicks
                totalPages: 'many',
                cachedPages: pages.length
            });
        } else {
            console.log('🔍 [HISTORY] ❌ No cached results found for query:', query);
            console.log('🔍 [HISTORY] Checking quota before triggering fresh search for DB query:', query);
            
            // Check quota before making API call
            const quotaMonitor = window.quotaMonitor;
            const currentUsage = quotaMonitor ? quotaMonitor.getCurrentUsage() : 0;
            
            if (currentUsage > 9000) {
                console.log('🚫 [QUOTA-EMERGENCY] Cannot search for DB query - usage above 90%:', currentUsage);
            if (window.showToast) {
                    window.showToast(`🚫 Cannot search for "${this.cleanQueryForDisplay(query)}" - quota critically high (${currentUsage}/10000). This query has no cached results.`, 'error', 8000);
                }
                return;
            }
            
            // CRITICAL: Reset pagination to page 1 for dropdown clicks before fresh search
            this.pagination.currentPage = 1;
            this.pagination.originalQuery = query;
            this.pagination.searchType = 'search';
            
            // Trigger a fresh search for this query
            await this.handleYoutubeRequest(query, false, null, { isOverwrite: true });
        }
    }

    updateAllYouTubeHeaders(query) {
        console.log('🎯 [HEADER-UPDATE] Updating all YouTube headers to:', query);
        const cleanQuery = query.replace(/^youtube\s+search\s+/i, '').trim();
        const headers = document.querySelectorAll('.youtube-header, .youtube-search-header');
        console.log('🎯 [HEADER-UPDATE] Updated', headers.length, 'header(s) to show query:', cleanQuery);
        headers.forEach(header => {
            if (header.textContent.includes('YouTube')) {
                header.textContent = `YouTube: ${cleanQuery}`;
            }
        });
    }

    cleanupBrokenYouTubeElements() {
        console.log('🧹 [CLEANUP] Cleaning up broken YouTube elements');
        // Remove any broken or incomplete YouTube elements
        const brokenElements = document.querySelectorAll('.youtube-results:empty, .video-list:empty');
        brokenElements.forEach(el => el.remove());
    }

    addToQueriesHistory(query) {
        console.log('💾 [YOUTUBE-DB] Saving query:', query);
        this.saveQuery(query).catch(error => {
            console.error('💾 [YOUTUBE-DB] Error saving query:', error);
        });
    }

    renderRealYoutubeResults(videos, page, totalPages, query, type, isPagination, messageText, isOverwrite) {
        console.log('🎯 [YOUTUBE] Rendering', videos?.length || 0, 'videos for page', page, 'of', totalPages);
        console.log('🎯 [YOUTUBE] Videos array:', videos);
        console.log('🎯 [YOUTUBE] isPagination:', isPagination, 'isOverwrite:', isOverwrite);
        
        // Update pagination state with current results
        this.pagination.currentPage = page;
        this.pagination.totalPages = 'many'; // Always use "many" instead of calculating exact count
        this.pagination.currentVideos = videos;
        this.pagination.searchType = type; // Track search type for navigation cache keys
        this.pagination.originalQuery = query; // Track original query for navigation
        
        // Store current search results for video click tracking
        this.currentSearchResults = videos;
        
        try {
            // Try to use templates first
            this.renderWithTemplates(videos, page, totalPages, query, type, isPagination, messageText, isOverwrite);
        } catch (error) {
            console.log('🎯 [YOUTUBE] Template rendering failed, falling back to legacy method:', error.message);
            this.renderWithLegacyMethod(videos, page, totalPages, query, type, isPagination, messageText, isOverwrite);
        }
    }

    renderWithTemplates(videos, page, totalPages, query, type, isPagination, messageText, isOverwrite) {
        console.log('🎯 [YOUTUBE] youtubeResultsContainer template not found, falling back to legacy method');
        throw new Error('Template not found');
    }

    renderWithLegacyMethod(videos, page, totalPages, query, type, isPagination, messageText, isOverwrite) {
        console.log('🎯 [LEGACY] Using legacy rendering method for', videos?.length || 0, 'videos');
        console.log('🎯 [LEGACY] Videos received:', videos);
        
        // Create the proper HTML structure matching the reference implementation
        const cleanQuery = query.replace(/^youtube\s+search\s+/i, '').trim();
        
        let html = `
            <div class="youtube-multi-bubble">
                <div class="youtube-header-section">
                    <div class="youtube-header-container">
                        <div class="youtube-header-left">
                            <h3 class="youtube-header-title">📺 YouTube Results: <span class="youtube-header-query">"${cleanQuery}"</span></h3>
                        </div>
                        <div class="youtube-header-right">
                            <button class="view-playlists-btn" onclick="window.playlistManager?.show('${query}');">View Playlists</button>
                            <span class="youtube-page-info">Page ${page || 1} of many</span>
                        </div>
                    </div>
                </div>
                <ul class="video-list">
        `;
        
        videos.forEach(video => {
            const thumbnail = video.thumbnail || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
            // Properly encode video data to prevent HTML attribute issues
            const videoDataEncoded = encodeURIComponent(JSON.stringify({
                id: video.id,
                title: video.title,
                channelTitle: video.channelTitle,
                thumbnail: video.thumbnail
            }));
            html += `
                <li class="video-item">
                    <div class="button-thumb-group-MULTI top-buttons">
                        <button class="youtube-action-btn popup-btn" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}');">Play in Popup</button>
                        <button class="add-to-playlist-MULTI-btn" data-video="${videoDataEncoded}"><span class="plus-sign">+</span></button>
                    </div>
                    <span class="youtube-thumb-link" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}');">
                        <img class="youtube-thumb-img" src="${thumbnail}" alt="${video.title}" loading="lazy" 
                             onerror="this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg'" />
                    </span>
                    <div class="video-title">${video.title}</div>
                    <div class="button-thumb-group-MULTI bottom-buttons">
                        <button class="youtube-action-btn youtube-direct-link-improved" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank');">
                            <span class="watch-on-youtube-icon">🎬</span> Watch on YouTube
                        </button>
                    </div>
                    <div class="video-channel">${video.channelTitle || 'N/A'}</div>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
        
        // Add to chat - handle overwrite for dropdown clicks
        console.log('🎯 [RENDER] Adding YouTube results to chat, isOverwrite:', isOverwrite);
        
        // If this is an overwrite (from dropdown click), remove existing YouTube results first
        if (isOverwrite) {
            console.log('🔄 [RENDER] Overwriting existing YouTube results');
            const existingYouTubeMessages = document.querySelectorAll('.message.assistant .youtube-multi-bubble, .message.assistant .youtube-results');
            console.log('🔄 [RENDER] Found', existingYouTubeMessages.length, 'existing YouTube messages to remove');
            existingYouTubeMessages.forEach((element, index) => {
                console.log(`🗑️ [RENDER] Removing existing YouTube result ${index + 1}`);
                const messageElement = element.closest('.message');
                if (messageElement) {
                    messageElement.remove();
                } else {
                    element.remove();
                }
            });
        }
        
        if (typeof window.addMessageToChat === 'function') {
            window.addMessageToChat('assistant', html, {
                type: 'youtube-list',
                messageType: 'youtube'
            });
            console.log('✅ [RENDER] Successfully added YouTube results to chat');
        } else if (typeof addMessageToChat === 'function') {
            addMessageToChat('assistant', html, {
                type: 'youtube-list',
                messageType: 'youtube'
            });
            console.log('✅ [RENDER] Successfully added YouTube results to chat (global)');
        } else {
            console.error('❌ [RENDER] addMessageToChat function not found');
        }
        
        // Update button states and add event handlers after rendering
        setTimeout(() => {
            this.updateButtonStates();
            this.addVideoEventHandlers();
            // Render the pagination bar
            this.renderRestoredPaginatorBar(page, 'many', query);
            
            // If this was an overwrite, scroll to the new results (ALWAYS to TOP)
            if (isOverwrite) {
                console.log('📍 [SCROLL] Overwrite detected - SCROLLING TO TOP for YouTube results');
                this.scrollToYouTubeResults();
            }
        }, 100);
    }

    setPaginatorBar(state) {
        console.log('🔄 [PAG-SWITCH] Setting paginator bar state:', state);
        
        if (state === 'restored') {
            // YouTube action: Show RESTORED, hide MINIMIZED
            this.showRestoredPaginatorBar();
            this.hideMinimizedPaginatorBar();
        } else if (state === 'minimized') {
            // Non-YouTube action: Show MINIMIZED, hide RESTORED
            this.hideRestoredPaginatorBar();
            this.showMinimizedPaginatorBar();
        }
    }

    showRestoredPaginatorBar() {
        console.log('🔄 [PAG-SWITCH] Showing RESTORED paginator bar');
        const restoredBar = document.querySelector('.restored-paginator-bar');
        if (restoredBar) {
            restoredBar.style.display = 'block';
        }
    }

    hideRestoredPaginatorBar() {
        console.log('🔄 [PAG-SWITCH] Hiding RESTORED paginator bar');
        const restoredBar = document.querySelector('.restored-paginator-bar');
        if (restoredBar) {
            restoredBar.style.display = 'none';
        }
    }

    showMinimizedPaginatorBar() {
        console.log('🔄 [PAG-SWITCH] Showing MINIMIZED paginator bar');
        let minimizedBar = document.getElementById('minimized-paginator-bar');
        
        if (!minimizedBar) {
            // Create minimized bar if it doesn't exist
            minimizedBar = document.createElement('div');
            minimizedBar.id = 'minimized-paginator-bar';
            minimizedBar.className = 'minimized-paginator-bar';
            minimizedBar.innerHTML = '<span>🔄 Switch to YouTube Search</span>';
            minimizedBar.title = 'Click to switch back to YouTube paginator';
            minimizedBar.onclick = () => {
                console.log('🔄 [PAG-SWITCH] Minimized paginator clicked - SCROLLING TO YOUTUBE RESULTS');
                
                // STEP 1: First restore the paginator bar
                this.setPaginatorBar('restored');
                
                // STEP 2: Find and scroll to the YouTube results specifically
                setTimeout(() => {
                    console.log('🔄 [PAG-SWITCH] Looking for YouTube results to scroll to...');
                    
                    // Look for YouTube results in the chat
                    const youtubeResults = document.querySelector('.youtube-multi-bubble, .youtube-single-bubble, .youtube-results');
                    
                    if (youtubeResults) {
                        console.log('🔄 [PAG-SWITCH] Found YouTube results, scrolling to them');
                        youtubeResults.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start',
                            inline: 'nearest'
                        });
                        
                        // Backup: Also scroll to top after a short delay
                        setTimeout(() => {
                            this.forceScrollToTop();
                        }, 500);
                    } else {
                        console.log('🔄 [PAG-SWITCH] No YouTube results found, scrolling to top');
                        this.forceScrollToTop();
                    }
                    
                    // STEP 3: Also try handleScroll as additional backup
                    if (typeof window.handleScroll === 'function') {
                        setTimeout(() => {
                            window.handleScroll({ 
                                content: 'YouTube Results', 
                                options: { isYoutube: true },
                                role: 'assistant' 
                            });
                        }, 100);
                    }
                }, 100);
            };
            document.body.appendChild(minimizedBar);
        }
        
        minimizedBar.style.display = 'block';
    }

    hideMinimizedPaginatorBar() {
        console.log('🔄 [PAG-SWITCH] Hiding MINIMIZED paginator bar');
        const minimizedBar = document.getElementById('minimized-paginator-bar');
        if (minimizedBar) {
            minimizedBar.style.display = 'none';
        }
    }

    /**
     * Global Pag-switch function that can be called from main app
     * @param {string} actionType - 'youtube' or 'non-youtube'
     */
    triggerPagSwitch(actionType) {
        console.log('🔄 [PAG-SWITCH] Global trigger called with action type:', actionType);
        
        if (actionType === 'youtube') {
            // YouTube action: Show RESTORED paginator bar
            this.setPaginatorBar('restored');
        } else if (actionType === 'non-youtube') {
            // Non-YouTube action: Show MINIMIZED paginator bar
            this.setPaginatorBar('minimized');
        }
    }

    renderRestoredPaginatorBar(page, totalPages, subject) {
        console.log('🎯 [PAGINATION] Rendering restored paginator bar:', { page, totalPages, subject });
        
        // Remove any existing pagination bars
        const existingBars = document.querySelectorAll('.restored-paginator-bar');
        existingBars.forEach(bar => bar.remove());

        // Create the pagination bar
        const restoredBar = document.createElement('div');
        restoredBar.className = 'restored-paginator-bar';
        restoredBar.innerHTML = `
            <div class="pagination-drag-tab">
                <img src="/assets/img/drag-me.png" class="drag-me-icon" alt="Drag Me" title="Drag to move pagination bar">
               
                <div>
                    <div >
                       <img class="youtube-legend" src="/assets/img/youtube-legend2.png" alt="YouTube Legend" class="youtube-legend-icon">
                    </div>
                </div>
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
                <button class="back-to-top-btn" title="SCROLL TO TOP + Back to TOP (First Query)">
                    <img src="/assets/img/first-page.svg" alt="|<<" class="btn-icon">
                </button>
                <button class="query-start-btn" title="Back to Query Start">
                    <img src="/assets/img/prev-page.svg" alt="<<" class="btn-icon">
                </button>
                <button class="back-btn" title="Back One Page">
                    <img src="/assets/img/back.svg" alt="<" class="btn-icon">
                </button>
                <button class="next-btn" title="Next Page / More Results">
                    <img src="/assets/img/forward.svg" alt="Next" class="forward-icon">
                </button>
            </div>
        `;

        // Add to document
        document.body.appendChild(restoredBar);

        // Add drag functionality - focus on the drag-me image area
        const dragImage = restoredBar.querySelector('.drag-me-icon');
        const dragTab = restoredBar.querySelector('.pagination-drag-tab');
        
        // Ultra-simple drag functionality - direct approach
        if (dragTab) {
            let isDragging = false;
            let offsetX = 0;
            let offsetY = 0;
            
            dragTab.addEventListener('mousedown', function(e) {
                // Skip buttons
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                
                console.log('🎯 [DRAG] Mouse down on drag tab');
                
                isDragging = true;
                
                // Calculate offset
                const rect = restoredBar.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                
                // Add dragging class for CSS styling
                restoredBar.classList.add('dragging');
                
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                console.log('🎯 [DRAG] Moving...');
                
                // Calculate new position
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;
                
                // Apply position
                restoredBar.style.position = 'fixed';
                restoredBar.style.left = newLeft + 'px';
                restoredBar.style.top = newTop + 'px';
                    restoredBar.style.right = 'auto';
                    restoredBar.style.bottom = 'auto';
                
                e.preventDefault();
            });
            
            document.addEventListener('mouseup', function(e) {
                if (!isDragging) return;
                
                console.log('🎯 [DRAG] Mouse up - ending drag');
                
                isDragging = false;
                
                // Remove dragging class
                    restoredBar.classList.remove('dragging');
                
                // Save position
                const rect = restoredBar.getBoundingClientRect();
                localStorage.setItem('restored_paginator_x', rect.left.toString());
                localStorage.setItem('restored_paginator_y', rect.top.toString());
                
                console.log('🎯 [DRAG] Position saved:', rect.left, rect.top);
            });
        }

        // Restore saved position (QuotaMonitor pattern)
        const savedX = localStorage.getItem('restored_paginator_x');
        const savedY = localStorage.getItem('restored_paginator_y');
        if (savedX !== null && savedY !== null) {
            const x = parseInt(savedX);
            const y = parseInt(savedY);
            
            // Ensure position is still within viewport (window might have resized)
            const maxX = window.innerWidth - restoredBar.offsetWidth;
            const maxY = window.innerHeight - restoredBar.offsetHeight;
            
            const constrainedX = Math.min(Math.max(0, x), maxX);
            const constrainedY = Math.min(Math.max(0, y), maxY);
            
            // Apply custom position
            restoredBar.style.left = constrainedX + 'px';
            restoredBar.style.top = constrainedY + 'px';
            restoredBar.style.right = 'auto';
            restoredBar.style.bottom = 'auto';
            
            console.log('🎯 [DRAG] Restored paginator position:', constrainedX, constrainedY);
        }

        // Add button event listeners

        restoredBar.querySelector('.back-btn').addEventListener('click', async () => {
            console.log('🌐 [BACK] ⬅️ Back button clicked');
            if (this.pagination.currentPage > 1) {
                this.pagination.currentPage--;
                
                // Use the EXACT same cache key format as handleYoutubeRequest for consistency
                const cleanedSubject = this.cleanQueryForDisplay(subject);
                const type = this.pagination.searchType || 'search';
                const primaryKey = `yt_${type}_${cleanedSubject.toLowerCase().replace(/\s+/g, '_')}_p${this.pagination.currentPage}_none`;
                
                console.log('🌐 [BACK] 🔍 Checking primary cache key:', primaryKey);
                
                // Also check fallback formats for backward compatibility
                const fallbackKeys = [
                    `yt_${cleanedSubject}_${type}_${this.pagination.currentPage}`, // Old format 1
                    `yt_${subject}_${type}_${this.pagination.currentPage}`,       // Old format 2
                    `yt_Youtube search ${cleanedSubject}_search_${this.pagination.currentPage}`, // Legacy format
                ];
                
                let cachedResult = null;
                let foundKey = null;
                
                // Check primary key first
                cachedResult = localStorage.getItem(primaryKey);
                if (cachedResult) {
                    foundKey = primaryKey;
                } else {
                    // Check fallback keys
                    for (const cacheKey of fallbackKeys) {
                        cachedResult = localStorage.getItem(cacheKey);
                        if (cachedResult) {
                            foundKey = cacheKey;
                            break;
                        }
                    }
                }
                
                console.log('🌐 [BACK] 🔍 Cache search result - found key:', foundKey);
                
                if (cachedResult) {
                    try {
                        const data = JSON.parse(cachedResult);
                        console.log('🌐 [BACK] 🎯 Found cached results for back navigation');
                        console.log('🌐 [BACK] 🔍 Cache data structure:', Object.keys(data));
                        
                        let videos = [];
                        // Handle nested data structure: {data: {success: true, videos: [...]}}
                        const actualData = data.data || data; // Support both nested and flat structures
                        
                        switch (true) {
                            case !!actualData.video:
                                videos = [actualData.video];
                                console.log('🌐 [BACK] 📹 Found single video in cache');
                                break;
                            case !!actualData.videos:
                                videos = actualData.videos;
                                console.log('🌐 [BACK] 📹 Found', videos.length, 'videos in cache');
                                break;
                            default:
                                console.log('🌐 [BACK] ❌ No videos found in cached data structure');
                                console.log('🌐 [BACK] 🔍 Top-level properties:', Object.keys(data));
                                console.log('🌐 [BACK] 🔍 Nested data properties:', actualData ? Object.keys(actualData) : 'actualData is null');
                                // Clear corrupted cache and make fresh API call
                                localStorage.removeItem(foundKey);
                                console.log('🌐 [BACK] 🗑️ Cleared corrupted cache, making fresh API call');
                                await this.handleYoutubeRequest(subject, true, null, { 
                                    action: 'back', 
                                    isOverwrite: true, 
                                    skipCache: true,
                                    forcePage: this.pagination.currentPage 
                                });
                                return;
                        }
                        
                        // If we have videos, check they're valid
                        if (!videos || videos.length === 0) {
                            console.log('🌐 [BACK] ❌ Cache contains 0 videos, clearing and making fresh API call');
                            localStorage.removeItem(foundKey);
                            await this.handleYoutubeRequest(subject, true, null, { 
                                action: 'back', 
                                isOverwrite: true, 
                                skipCache: true,
                                forcePage: this.pagination.currentPage 
                            });
                            return;
                        }
                        
                        console.log('🌐 [BACK] 🎬 About to render', videos.length, 'videos for page', this.pagination.currentPage);
                        
                        // Render the cached results
                        this.renderRealYoutubeResults(videos, this.pagination.currentPage, 'many', subject, type, true, null, true);
                    } catch (parseError) {
                        console.error('🌐 [BACK] ❌ Error parsing cached data:', parseError);
                        // Fall back to fresh API call
                        await this.handleYoutubeRequest(subject, true, null, { 
                            action: 'back', 
                            isOverwrite: true, 
                            skipCache: true,
                            forcePage: this.pagination.currentPage 
                        });
                    }
                } else {
                    console.log('🌐 [BACK] ❌ No cached results found for page', this.pagination.currentPage, '- making fresh API call');
                    // Make fresh API call for this page
                    await this.handleYoutubeRequest(subject, true, null, { 
                        action: 'back', 
                        isOverwrite: true, 
                        skipCache: true,
                        forcePage: this.pagination.currentPage 
                    });
                }
            }
        });

        restoredBar.querySelector('.next-btn').addEventListener('click', async () => {
            console.log('🌐 [NEXT] ➡️ Next/More button clicked (cache-first, then fresh API)');
            
            // NEXT button: Check for cached results first, then make fresh API call if needed
            const nextPageNumber = this.pagination.currentPage + 1;
            
            // Use the EXACT same cache key format as handleYoutubeRequest for consistency
            const cleanedSubject = this.cleanQueryForDisplay(subject);
            const type = this.pagination.searchType || 'search';
            const primaryKey = `yt_${type}_${cleanedSubject.toLowerCase().replace(/\s+/g, '_')}_p${nextPageNumber}_none`;
            
            console.log('🌐 [NEXT] 🔍 Checking primary cache key:', primaryKey);
            
            // Also check fallback formats for backward compatibility
            const fallbackKeys = [
                `yt_${cleanedSubject}_${type}_${nextPageNumber}`, // Old format 1
                `yt_${subject}_${type}_${nextPageNumber}`,       // Old format 2
                `yt_Youtube search ${cleanedSubject}_search_${nextPageNumber}`, // Legacy format
            ];
            
            let cachedResult = null;
            let foundKey = null;
            
            // Check primary key first
            cachedResult = localStorage.getItem(primaryKey);
            if (cachedResult) {
                foundKey = primaryKey;
            } else {
                // Check fallback keys
                for (const cacheKey of fallbackKeys) {
                    cachedResult = localStorage.getItem(cacheKey);
                    if (cachedResult) {
                        foundKey = cacheKey;
                        break;
                    }
                }
            }
            
            console.log('🌐 [NEXT] 🔍 Cache search result - found key:', foundKey);
            
            if (cachedResult) {
                try {
                    // Use cached results if available
                    this.pagination.currentPage = nextPageNumber;
                    
                    const data = JSON.parse(cachedResult);
                    console.log('🌐 [NEXT] 🎯 Found cached results for next navigation');
                    console.log('🌐 [NEXT] 🔍 Cache data structure:', Object.keys(data));
                    
                    let videos = [];
                    // Handle nested data structure: {data: {success: true, videos: [...]}}
                    const actualData = data.data || data; // Support both nested and flat structures
                    
                    switch (true) {
                        case !!actualData.video:
                            videos = [actualData.video];
                            console.log('🌐 [NEXT] 📹 Found single video in cache');
                            break;
                        case !!actualData.videos:
                            videos = actualData.videos;
                            console.log('🌐 [NEXT] 📹 Found', videos.length, 'videos in cache');
                            break;
                        default:
                            console.log('🌐 [NEXT] ❌ No videos found in cached data structure');
                            console.log('🌐 [NEXT] 🔍 Top-level properties:', Object.keys(data));
                            console.log('🌐 [NEXT] 🔍 Nested data properties:', actualData ? Object.keys(actualData) : 'actualData is null');
                            // Clear corrupted cache and make fresh API call
                            localStorage.removeItem(foundKey);
                            console.log('🌐 [NEXT] 🗑️ Cleared corrupted cache, making fresh API call');
                            this.pagination.currentPage = nextPageNumber;
                            await this.handleYoutubeRequest(subject, true, null, { 
                                action: 'next', 
                                isOverwrite: true, 
                                skipCache: true,
                                forcePage: this.pagination.currentPage 
                            });
                            return;
                    }
                    
                    // If we have videos, check they're valid
                    if (!videos || videos.length === 0) {
                        console.log('🌐 [NEXT] ❌ Cache contains 0 videos, clearing and making fresh API call');
                        localStorage.removeItem(foundKey);
                        this.pagination.currentPage = nextPageNumber;
                        await this.handleYoutubeRequest(subject, true, null, { 
                            action: 'next', 
                            isOverwrite: true, 
                            skipCache: true,
                            forcePage: this.pagination.currentPage 
                        });
                        return;
                    }
                    
                    console.log('🌐 [NEXT] 🎬 About to render', videos.length, 'videos for page', this.pagination.currentPage);
                    
                    // Render the cached results
                    this.renderRealYoutubeResults(videos, this.pagination.currentPage, 'many', subject, type, true, null, true);
                } catch (parseError) {
                    console.error('🌐 [NEXT] ❌ Error parsing cached data:', parseError);
                    // Fall back to fresh API call
                    this.pagination.currentPage = nextPageNumber;
                    await this.handleYoutubeRequest(subject, true, null, { 
                        action: 'next', 
                        isOverwrite: true, 
                        skipCache: true,
                        forcePage: this.pagination.currentPage 
                    });
                }
            } else {
                // No cached results - make fresh API call
                console.log('🌐 [NEXT] ❌ No cached results found for page', nextPageNumber, '- making fresh API call');
                this.pagination.currentPage = nextPageNumber;
                
                await this.handleYoutubeRequest(subject, true, null, { 
                    action: 'next', 
                    isOverwrite: true, 
                    skipCache: true,
                    forcePage: this.pagination.currentPage 
                });
            }
        });

        restoredBar.querySelector('.query-start-btn').addEventListener('click', async () => {
            console.log('🌐 [START] |<< Query start button clicked (cache-first, then fresh API)');
            this.pagination.currentPage = 1;
            
            // Use the EXACT same cache key format as handleYoutubeRequest for consistency
            const cleanedSubject = this.cleanQueryForDisplay(subject);
            const type = this.pagination.searchType || 'search';
            const primaryKey = `yt_${type}_${cleanedSubject.toLowerCase().replace(/\s+/g, '_')}_p1_none`;
            
            console.log('🌐 [START] 🔍 Checking primary cache key:', primaryKey);
            
            // Also check fallback formats for backward compatibility
            const fallbackKeys = [
                `yt_${cleanedSubject}_${type}_1`, // Old format 1
                `yt_${subject}_${type}_1`,       // Old format 2
                `yt_Youtube search ${cleanedSubject}_search_1`, // Legacy format
            ];
            
            let cachedResult = null;
            let foundKey = null;
            
            // Check primary key first
            cachedResult = localStorage.getItem(primaryKey);
            if (cachedResult) {
                foundKey = primaryKey;
            } else {
                // Check fallback keys
                for (const cacheKey of fallbackKeys) {
                    cachedResult = localStorage.getItem(cacheKey);
                    if (cachedResult) {
                        foundKey = cacheKey;
                        break;
                    }
                }
            }
            
            console.log('🌐 [START] 🔍 Cache search result - found key:', foundKey);
            
            if (cachedResult) {
                try {
                    const data = JSON.parse(cachedResult);
                    console.log('🌐 [START] 🎯 Found cached results for start navigation');
                    console.log('🌐 [START] 🔍 Cache data structure:', Object.keys(data));
                    
                    let videos = [];
                    // Handle nested data structure: {data: {success: true, videos: [...]}}
                    const actualData = data.data || data; // Support both nested and flat structures
                    
                    switch (true) {
                        case !!actualData.video:
                            videos = [actualData.video];
                            console.log('🌐 [START] 📹 Found single video in cache');
                            break;
                        case !!actualData.videos:
                            videos = actualData.videos;
                            console.log('🌐 [START] 📹 Found', videos.length, 'videos in cache');
                            break;
                        default:
                            console.log('🌐 [START] ❌ No videos found in cached data structure');
                            console.log('🌐 [START] 🔍 Top-level properties:', Object.keys(data));
                            console.log('🌐 [START] 🔍 Nested data properties:', actualData ? Object.keys(actualData) : 'actualData is null');
                            // Clear corrupted cache and make fresh API call
                            localStorage.removeItem(foundKey);
                            console.log('🌐 [START] 🗑️ Cleared corrupted cache, making fresh API call');
                            await this.handleYoutubeRequest(subject, true, null, { 
                                action: 'start', 
                                isOverwrite: true, 
                                skipCache: true,
                                forcePage: 1 
                            });
                            return;
                    }
                    
                    // If we have videos, check they're valid
                    if (!videos || videos.length === 0) {
                        console.log('🌐 [START] ❌ Cache contains 0 videos, clearing and making fresh API call');
                        localStorage.removeItem(foundKey);
                        await this.handleYoutubeRequest(subject, true, null, { 
                            action: 'start', 
                            isOverwrite: true, 
                            skipCache: true,
                            forcePage: 1 
                        });
                        return;
                    }
                    
                    console.log('🌐 [START] 🎬 About to render', videos.length, 'videos for page 1');
                    
                    // Render the cached results
                    this.renderRealYoutubeResults(videos, 1, 'many', subject, type, true, null, true);
                } catch (parseError) {
                    console.error('🌐 [START] ❌ Error parsing cached data:', parseError);
                    // Fall back to fresh API call
                    await this.handleYoutubeRequest(subject, true, null, { 
                        action: 'start', 
                        isOverwrite: true, 
                        skipCache: true,
                        forcePage: 1 
                    });
                }
            } else {
                console.log('🌐 [START] ❌ No cached results found for page 1 - making fresh API call');
                await this.handleYoutubeRequest(subject, true, null, { 
                    action: 'start', 
                    isOverwrite: true, 
                    skipCache: true,
                    forcePage: 1 
                });
            }
        });

        restoredBar.querySelector('.back-to-top-btn').addEventListener('click', async () => {
            console.log('🌐 [TOP] << Back to top button clicked - FORCE SCROLLING TO TOP FIRST!');
            
            // CRITICAL: FORCE SCROLL TO TOP IMMEDIATELY FIRST!
            this.forceScrollToTop();
            console.log('🌐 [TOP] ✅ Forced scroll to top completed');
            
            this.pagination.currentPage = 1;
            
            // Use the EXACT same cache key format as handleYoutubeRequest for consistency
            const cleanedSubject = this.cleanQueryForDisplay(subject);
            const type = this.pagination.searchType || 'search';
            const primaryKey = `yt_${type}_${cleanedSubject.toLowerCase().replace(/\s+/g, '_')}_p1_none`;
            
            console.log('🌐 [TOP] 🔍 Checking primary cache key:', primaryKey);
            
            // Also check fallback formats for backward compatibility
            const fallbackKeys = [
                `yt_${cleanedSubject}_${type}_1`, // Old format 1
                `yt_${subject}_${type}_1`,       // Old format 2
                `yt_Youtube search ${cleanedSubject}_search_1`, // Legacy format
            ];
            
            let cachedResult = null;
            let foundKey = null;
            
            // Check primary key first
            cachedResult = localStorage.getItem(primaryKey);
            if (cachedResult) {
                foundKey = primaryKey;
            } else {
                // Check fallback keys
                for (const cacheKey of fallbackKeys) {
                    cachedResult = localStorage.getItem(cacheKey);
                    if (cachedResult) {
                        foundKey = cacheKey;
                        break;
                    }
                }
            }
            
            console.log('🌐 [TOP] 🔍 Cache search result - found key:', foundKey);
            
            if (cachedResult) {
                try {
                    const data = JSON.parse(cachedResult);
                    console.log('🌐 [TOP] 🎯 Found cached results for top navigation');
                    console.log('🌐 [TOP] 🔍 Cache data structure:', Object.keys(data));
                    
                    let videos = [];
                    // Handle nested data structure: {data: {success: true, videos: [...]}}
                    const actualData = data.data || data; // Support both nested and flat structures
                    
                    switch (true) {
                        case !!actualData.video:
                            videos = [actualData.video];
                            console.log('🌐 [TOP] 📹 Found single video in cache');
                            break;
                        case !!actualData.videos:
                            videos = actualData.videos;
                            console.log('🌐 [TOP] 📹 Found', videos.length, 'videos in cache');
                            break;
                        default:
                            console.log('🌐 [TOP] ❌ No videos found in cached data structure');
                            console.log('🌐 [TOP] 🔍 Top-level properties:', Object.keys(data));
                            console.log('🌐 [TOP] 🔍 Nested data properties:', actualData ? Object.keys(actualData) : 'actualData is null');
                            // Clear corrupted cache and make fresh API call
                            localStorage.removeItem(foundKey);
                            console.log('🌐 [TOP] 🗑️ Cleared corrupted cache, making fresh API call');
                            await this.handleYoutubeRequest(subject, true, null, { 
                                action: 'top', 
                                isOverwrite: true, 
                                skipCache: true,
                                forcePage: 1 
                            });
                            return;
                    }
                    
                    // If we have videos, check they're valid
                    if (!videos || videos.length === 0) {
                        console.log('🌐 [TOP] ❌ Cache contains 0 videos, clearing and making fresh API call');
                        localStorage.removeItem(foundKey);
                        await this.handleYoutubeRequest(subject, true, null, { 
                            action: 'top', 
                            isOverwrite: true, 
                            skipCache: true,
                            forcePage: 1 
                        });
                        return;
                    }
                    
                    console.log('🌐 [TOP] 🎬 About to render', videos.length, 'videos for page 1');
                    
                    // Render the cached results
                    this.renderRealYoutubeResults(videos, 1, 'many', subject, type, true, null, true);
                } catch (parseError) {
                    console.error('🌐 [TOP] ❌ Error parsing cached data:', parseError);
                    // Fall back to fresh API call
                    await this.handleYoutubeRequest(subject, true, null, { 
                        action: 'top', 
                        isOverwrite: true, 
                        skipCache: true,
                        forcePage: 1 
                    });
                }
            } else {
                console.log('🌐 [TOP] ❌ No cached results found for page 1 - making fresh API call');
                await this.handleYoutubeRequest(subject, true, null, { 
                    action: 'top', 
                    isOverwrite: true, 
                    skipCache: true,
                    forcePage: 1 
                });
            }
        });

        // Query history dropdown functionality
        const queryHistoryBtn = restoredBar.querySelector('.query-history-btn');
        const queryHistoryDropdown = restoredBar.querySelector('.query-history-dropdown');
        
        if (queryHistoryBtn && queryHistoryDropdown) {
            queryHistoryBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isVisible = queryHistoryDropdown.classList.toggle('show');
                if (isVisible) {
                    // Get queries from localStorage and render them with fresh sorting
                    const queries = this.getAllQueriesForDropdown();
                    console.log('📝 [DROPDOWN] Found', queries.length, 'queries for dropdown');
                    // Ensure current query appears at top with fresh timestamp ordering
                    const sortedQueries = this.sortQueriesWithCurrentFirst(queries, subject);
                    await this.renderQueryDropdown(sortedQueries, subject);
                }
            });

            document.addEventListener('click', (e) => {
                if (!queryHistoryDropdown.contains(e.target) && !queryHistoryBtn.contains(e.target)) {
                    queryHistoryDropdown.classList.remove('show');
                }
            });
        }

        console.log('✅ [PAGINATION] Restored paginator bar created and functional');
    }

    renderMinimizedPaginatorBar() {
        console.log('🎯 [PAGINATION] Rendering minimized paginator bar');
        
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
                if (this.pagination.restoreLastSearch) {
                    this.pagination.restoreLastSearch();
                }
            };
            document.body.appendChild(minimizedBar);
        }
        
        minimizedBar.style.display = 'block';
        this.hideAllPaginationBars();
        
        console.log('✅ [PAGINATION] Minimized paginator bar created and functional');
    }

    hideAllPaginationBars() {
        console.log('🎯 [PAGINATION] Hiding all pagination bars');
        document.querySelectorAll('.restored-paginator-bar, .mock-pagination-bar').forEach(el => {
            el.style.display = 'none';
        });
        setTimeout(() => this.updatePaginatorToggleIcon(), 50);
    }

    togglePaginatorBar() {
        console.log('🎯 [PAGINATION] Toggling paginator bar');
        const restoredBar = document.querySelector('.restored-paginator-bar');
        if (restoredBar) {
            restoredBar.style.display = restoredBar.style.display === 'none' ? 'flex' : 'none';
        }
        this.updatePaginatorToggleIcon();
    }

    updatePaginatorToggleIcon() {
        console.log('🎯 [PAGINATION] Updating paginator toggle icon');
        const restoredBar = document.querySelector('.restored-paginator-bar');
        let toggleIcon = document.querySelector('.show-paginator-bar');
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble');
        
        if (youtubeContainers.length === 0) {
            if (toggleIcon) toggleIcon.remove();
            return;
        }
        
        if (!toggleIcon) {
            toggleIcon = this.createPaginatorToggleIcon();
        }
        
        const paginationBarVisible = restoredBar && restoredBar.style.display !== 'none';
        if (toggleIcon) {
            toggleIcon.style.display = paginationBarVisible ? 'none' : 'flex';
        }
    }

    createPaginatorToggleIcon() {
        console.log('🎯 [PAGINATION] Creating paginator toggle icon');
        const youtubeContainers = document.querySelectorAll('.youtube-multi-bubble, .youtube-single-bubble');
        if (youtubeContainers.length === 0) return null;
        
        const latestContainer = youtubeContainers[youtubeContainers.length - 1];
        if (latestContainer.querySelector('.show-paginator-bar')) {
            return latestContainer.querySelector('.show-paginator-bar');
        }
        
        const toggleIcon = document.createElement('div');
        toggleIcon.className = 'show-paginator-bar';
        toggleIcon.innerHTML = '🔥';
        toggleIcon.title = 'Show/Hide YouTube Paginator';
        toggleIcon.onclick = () => this.togglePaginatorBar();
        
        latestContainer.appendChild(toggleIcon);
        this.updatePaginatorToggleIcon();
        return toggleIcon;
    }

    findFallbackCachedResults(query, type) {
        console.log('🔍 [FALLBACK] Looking for fallback cached results for:', query, type);
        // Check localStorage for any cached results for this query
        const fallbackVideos = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`yt_${query}_${type}_`)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.data && item.data.videos) {
                        fallbackVideos.push(...item.data.videos);
                    }
                } catch (error) {
                    console.error('Error parsing cached item:', error);
                }
            }
        }
        return fallbackVideos.slice(0, 10); // Return max 10 videos
    }

    /**
     * Add event handlers for video interaction buttons
     */
    addVideoEventHandlers() {
        console.log('🎯 [EVENTS] Adding video event handlers');
        
        // Handle play in popup button clicks (updated for new CSS classes)
        const popupButtons = document.querySelectorAll('.popup-btn');
        console.log('🎯 [EVENTS] Found', popupButtons.length, 'popup buttons');
        popupButtons.forEach((btn, index) => {
            console.log('🎯 [EVENTS] Popup button', index, ':', btn.className, btn.getAttribute('onclick'));
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎬 [CLICK] Popup button clicked!', btn);
                // Extract video ID from onclick attribute
                const onclickAttr = btn.getAttribute('onclick');
                const videoIdMatch = onclickAttr && onclickAttr.match(/openYoutubePopup\('([^']+)'\)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : null;
                if (videoId) {
                    console.log('🎬 [CLICK] Play in popup button clicked for video:', videoId);
                    this.openYoutubePopup(videoId);
                } else {
                    console.warn('🎬 [CLICK] No video ID found in onclick:', onclickAttr);
                }
            });
        });

        // Handle thumbnail clicks (updated for new CSS classes)
        const thumbnailLinks = document.querySelectorAll('.youtube-thumb-link');
        console.log('🎯 [EVENTS] Found', thumbnailLinks.length, 'thumbnail links');
        thumbnailLinks.forEach((link, index) => {
            console.log('🎯 [EVENTS] Thumbnail link', index, ':', link.className, link.getAttribute('onclick'));
            link.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎬 [CLICK] Thumbnail clicked!', link);
                // Extract video ID from onclick attribute
                const onclickAttr = link.getAttribute('onclick');
                const videoIdMatch = onclickAttr && onclickAttr.match(/openYoutubePopup\('([^']+)'\)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : null;
                if (videoId) {
                    console.log('🎬 [CLICK] Thumbnail clicked for video:', videoId);
                    this.openYoutubePopup(videoId);
                } else {
                    console.warn('🎬 [CLICK] No video ID found in thumbnail onclick:', onclickAttr);
                }
            });
        });

        // Handle add to playlist button clicks (updated for new CSS classes)
        document.querySelectorAll('.add-to-playlist-MULTI-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const videoDataStr = btn.getAttribute('data-video');
                if (videoDataStr) {
                    try {
                        // Decode the URI encoded video data
                        const decodedData = decodeURIComponent(videoDataStr);
                        const videoData = JSON.parse(decodedData);
                        console.log('📝 [CLICK] Add to playlist clicked for video:', videoData.id, videoData.title);
                        if (window.playlistManager && typeof window.playlistManager.show === 'function') {
                            window.playlistManager.show(videoData);
                        } else {
                            console.log('Playlist functionality not available');
                        }
                    } catch (error) {
                        console.error('Error parsing video data:', error, 'Raw data:', videoDataStr);
                    }
                }
            });
        });

        // Handle view playlists button click
        document.querySelectorAll('.view-playlists-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📋 [CLICK] View playlists button clicked');
                if (window.playlistManager && typeof window.playlistManager.show === 'function') {
                    window.playlistManager.show();
                } else {
                    console.log('Playlist manager not available');
                }
            });
        });

        // Handle YouTube direct link buttons (updated for new CSS classes)
        document.querySelectorAll('.youtube-direct-link-improved').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Extract video URL from onclick attribute
                const onclickAttr = btn.getAttribute('onclick');
                const urlMatch = onclickAttr && onclickAttr.match(/window\.open\('([^']+)'/);
                const url = urlMatch ? urlMatch[1] : null;
                if (url) {
                    console.log('🔗 [CLICK] YouTube direct link clicked:', url);
                    window.open(url, '_blank');
                }
            });
        });
    }

    /**
     * Video playback methods
     */
    openYoutubePopup(videoId) {
        console.log('🎬 [VIDEO] Opening YouTube popup for video:', videoId);
        
        // Track the video click and save to MongoDB
        this.trackVideoClick(videoId);
        
        this.showVideo(videoId);
    }

    /**
     * Track video clicks and save to MongoDB
     */
    async trackVideoClick(videoId) {
        try {
            // Find the video data from current cache or search results
            const videoData = this.findVideoData(videoId);
            
            if (!videoData) {
                console.warn('⚠️ [CLICK-TRACK] Video data not found for:', videoId);
                return;
            }

            const clickData = {
                videoId: videoData.id,
                title: videoData.title,
                description: videoData.description || '',
                thumbnail: videoData.thumbnail || '',
                channelTitle: videoData.channelTitle || videoData.channel || '',
                publishedAt: videoData.publishedAt || '',
                duration: videoData.duration || '',
                query: this.currentQuery || 'unknown',
                userId: 'default-user'
            };

            console.log('💾 [CLICK-TRACK] Saving clicked video:', clickData.title, 'for query:', clickData.query);

            const response = await fetch('/api/youtube/clicked-videos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clickData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ [CLICK-TRACK] Successfully saved video click:', result);
            } else {
                console.error('❌ [CLICK-TRACK] Failed to save video click:', response.statusText);
            }

        } catch (error) {
            console.error('❌ [CLICK-TRACK] Error tracking video click:', error);
        }
    }

    /**
     * Find video data from current search results or cache
     */
    findVideoData(videoId) {
        // Check if we have current search results in memory
        if (this.currentSearchResults) {
            const video = this.currentSearchResults.find(v => v.id === videoId);
            if (video) return video;
        }

        // Check DOM for video data
        const videoElements = document.querySelectorAll(`[data-video-id="${videoId}"]`);
        if (videoElements.length > 0) {
            const element = videoElements[0];
            return {
                id: videoId,
                title: element.dataset.title || element.querySelector('.video-title')?.textContent || 'Unknown Title',
                description: element.dataset.description || '',
                thumbnail: element.dataset.thumbnail || element.querySelector('img')?.src || '',
                channelTitle: element.dataset.channel || element.querySelector('.video-channel')?.textContent || '',
                publishedAt: element.dataset.published || '',
                duration: element.dataset.duration || ''
            };
        }

        // Check localStorage cache
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('yt_')) {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (cached && cached.data && cached.data.videos) {
                        const video = cached.data.videos.find(v => v.id === videoId);
                        if (video) return video;
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ [CLICK-TRACK] Error checking localStorage cache:', error);
        }

        return null;
    }

    showVideo(videoId) {
        // Use the exact working implementation from reference repo
        this.createVideoContainer();
        const videoWrapper = document.getElementById('youtube-video');
        
        // Add debugging to see what's happening
        console.log('🎬 [VIDEO] Video wrapper found:', !!videoWrapper);
        console.log('🎬 [VIDEO] Container exists:', !!document.getElementById('youtube-container'));
        
        if (!videoWrapper) {
            console.error('❌ [VIDEO] Video wrapper not found! Cannot show video.');
            return;
        }
        
        videoWrapper.innerHTML = '';

        // Create iframe with enhanced parameters
        const iframe = document.createElement('iframe');
        iframe.width = "100%";
        iframe.height = "100%";
        
        // Build URL with all necessary parameters
        const params = new URLSearchParams({
            autoplay: '1',
            rel: '0',
            modestbranding: '1',
            enablejsapi: '1',
            origin: window.location.origin,
            widget_referrer: window.location.href,
            hl: 'en',
            controls: '1',
            fs: '1',
            playsinline: '1',
            iv_load_policy: '3',
            vq: 'hd1080',  // Request 1080p quality
            hd: '1'        // Enable HD
        });
        
        // Set proper sandbox attributes to allow necessary features while maintaining security
        iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-presentation allow-forms';
        
        // Set referrer policy
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        
        // Use nocookie domain with enhanced parameters
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
        iframe.frameBorder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'youtube-loading';
        loadingDiv.innerHTML = 'Loading video...';
        videoWrapper.appendChild(loadingDiv);

        // Handle iframe load event
        iframe.onload = () => {
            loadingDiv.remove();
            // Check if the video is actually playing after a short delay
            setTimeout(() => {
                try {
                    // If we detect the verification message, show fallback
                    if (iframe.contentDocument && 
                        (iframe.contentDocument.body.innerHTML.includes('Sign in') || 
                         iframe.contentDocument.body.innerHTML.includes('confirm you\'re not a bot'))) {
                        this.showFallbackMessage(videoId);
                    }
                } catch (e) {
                    // If we can't access the iframe content (due to CORS), assume it's working
                    console.log('Cannot check iframe content due to CORS, continuing playback');
                }
            }, 2000);
        };

        // Handle load errors
        iframe.onerror = () => {
            this.showFallbackMessage(videoId);
        };

        videoWrapper.appendChild(iframe);
        document.getElementById('youtube-container').classList.remove('hidden');
        this.isPlaying = true;

        // Update app state - simplified from reference repo
        if (typeof stopListening === 'function') {
            stopListening();
        }
        if (typeof updateStatus === 'function') {
            updateStatus('🎬 Playing video...');
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

    createVideoContainer() {
        // Use the exact working implementation from reference repo
        let container = document.getElementById('youtube-container');
        
        if (!container) {
            console.log('🎬 [VIDEO] Creating new video container...');
            this.buildVideoContainer();
        } else {
            console.log('🎬 [VIDEO] Found existing video container');
            console.log('🎬 [VIDEO] Existing container children:', container.children.length);
            
            // Check if container has the required children (close button and video wrapper)
            const hasCloseBtn = container.querySelector('.youtube-close-btn');
            const hasVideoWrapper = container.querySelector('#youtube-video');
            
            if (!hasCloseBtn || !hasVideoWrapper || container.children.length === 0) {
                console.log('🎬 [VIDEO] Existing container is missing children, rebuilding...');
                container.remove(); // Remove broken container
                this.buildVideoContainer(); // Create fresh one
            } else {
                console.log('🎬 [VIDEO] Existing container is complete, using it');
            }
        }
        
        // Double-check the video wrapper exists
        const videoWrapper = document.getElementById('youtube-video');
        console.log('🎬 [VIDEO] Final check - video wrapper exists:', !!videoWrapper);
        
        return document.getElementById('youtube-container');
    }
    
    buildVideoContainer() {
        console.log('🎬 [VIDEO] Building fresh video container structure...');
        
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

        console.log('🎬 [VIDEO] Fresh video container built successfully');
        console.log('🎬 [VIDEO] Container children count:', container.children.length);
        console.log('🎬 [VIDEO] Close button exists:', !!container.querySelector('.youtube-close-btn'));
        console.log('🎬 [VIDEO] Video wrapper exists:', !!container.querySelector('#youtube-video'));
    }

    /**
     * Setup additional keyboard and click handlers for the controlled video player
     */
    createCloseButtons(container) {
        console.log('🎬 [VIDEO] Setting up keyboard and click handlers for controlled player');

        // 1. ESC KEY LISTENER
        const escKeyHandler = (e) => {
            if (e.key === 'Escape' && !container.classList.contains('hidden')) {
                console.log('🎬 [VIDEO] ESC key pressed - closing video');
                this.hideVideo();
            }
        };
        document.addEventListener('keydown', escKeyHandler);
        
        // Store the handler so we can remove it later
        container.escKeyHandler = escKeyHandler;

        // 2. CLICK OUTSIDE TO CLOSE (click on dark overlay)
        const clickOutsideHandler = (e) => {
            if (e.target === container && !container.classList.contains('hidden')) {
                console.log('🎬 [VIDEO] Clicked outside video - closing');
                this.hideVideo();
            }
        };
        container.addEventListener('click', clickOutsideHandler);

        console.log('🎬 [VIDEO] Keyboard ESC and click-outside handlers setup complete');
    }

    hideVideo() {
        // Use the exact working implementation from reference repo
        const container = document.getElementById('youtube-container');
        if (container) {
            const videoWrapper = document.getElementById('youtube-video');
            if (videoWrapper) {
                videoWrapper.innerHTML = '';
            }
            container.classList.add('hidden');
            this.isPlaying = false;
            if (typeof updateStatus === 'function') {
                updateStatus('Ready');
            }
        }
    }

    /**
     * Clear old cache entries when localStorage quota is exceeded
     */
    clearOldCacheEntries() {
        console.log('🧹 [CACHE-CLEANUP] Clearing old cache entries due to quota exceeded');
        
        try {
            // Get all YouTube cache keys with timestamps
            const cacheKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('yt_')) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item && item.timestamp) {
                            cacheKeys.push({
                                key: key,
                                timestamp: item.timestamp
                            });
                        }
                    } catch (error) {
                        // If we can't parse it, it's probably corrupt, so add it for removal
                        cacheKeys.push({
                            key: key,
                            timestamp: 0 // Will be removed first
                        });
                    }
                }
            }
            
            // Sort by timestamp (oldest first)
            cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest 25% of cache entries
            const toRemove = Math.max(1, Math.floor(cacheKeys.length * 0.25));
            console.log(`🧹 [CACHE-CLEANUP] Removing ${toRemove} oldest cache entries out of ${cacheKeys.length} total`);
            
            for (let i = 0; i < toRemove; i++) {
                localStorage.removeItem(cacheKeys[i].key);
                console.log(`🗑️ [CACHE-CLEANUP] Removed cache key: ${cacheKeys[i].key}`);
            }
            
            console.log('✅ [CACHE-CLEANUP] Cache cleanup completed');
            
        } catch (error) {
            console.error('❌ [CACHE-CLEANUP] Error during cache cleanup:', error);
        }
    }
} 

