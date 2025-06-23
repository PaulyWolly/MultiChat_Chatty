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
        this.paginationState = {
            queryHistory: [],       // An array of query strings
            currentQueryIndex: -1,  // Index for queryHistory
            currentQuery: null,     // The current search term object
            pageHistory: [],        // Pages visited for the currentQuery
            currentPageIndex: -1    // Index for pageHistory
        };
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
            lastNextPageToken: null // Store the nextPageToken for MORE button
        };
        this.minimizedPaginator = null;
        this.restoredPaginator = null;
        this.isPaginatorMinimized = true; 
        this.youtubeSearchInitiated = false; // NEW: Track if a search has ever happened
    }

    /**
     * Initialize the YouTubeSearchManager
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📚 [YOUTUBE-DB] Initializing YouTubeSearchManager');
            this.initializePaginator();
            await this.loadSavedQueries();
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
                window.showToast('✅ Search saved to database', 'success');
                this.updateUI();
            } else {
                throw new Error(data.error || 'Failed to save search');
            }
        } catch (error) {
            console.error('💾 [YOUTUBE-DB] Error saving query:', error);
            window.showToast('❌ Failed to save search', 'error');
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

    extractCleanQuery(query) {
        return query.replace(/^(youtube search|youtube|search for|play|search)\s+/i, '').trim();
    }

    getCurrentYouTubeQuery() {
        return window.youtubePagination.originalQuery || null;
    }

    async handleYoutubeRequest(messageText, patterns, options = {}) {
        const { overwrite = false, page: requestedPage = 1 } = options;

        const isPlay = patterns.youtube.playVideo.test(messageText);
        let query = messageText.toLowerCase()
            .replace(/youtube/i, '').replace(/play/i, '').replace(/search/i, '')
            .replace(/for/i, '').replace(/videos?/i, '').replace(/about/i, '').trim();
        
        // STEP 0: Check cache before making API call
        const cacheKey = `yt_${query}_search_${requestedPage}`;
        const cachedResult = localStorage.getItem(cacheKey);
        if (cachedResult && !overwrite) {
            const data = JSON.parse(cachedResult);
            if (data && data.videos && data.videos.length > 0) {
                console.log('⚡ [CACHE] Using cached YouTube results for:', query, 'page:', requestedPage);
                this.renderRealYoutubeResults(data.videos, requestedPage, data.totalPages || 'many', query, patterns, isPlay ? 'play' : 'search', options.isPagination);
                this.showRestoredPaginator();
                if (window.toastManager && window.toastManager.showToast) {
                    window.toastManager.showToast('⚡ Loaded from cache (no API call)', 'cache', 3000);
                }
                return true;
            }
        }
        
        // STEP 1: Check quota before making API call
        if (window.QuotaMonitor && window.QuotaMonitor.shouldBlockAPICall()) {
            console.log('❌ [QUOTA-EXCEEDED] YouTube API quota exceeded - blocking request');
            if (window.showToast) {
                window.showToast('⚠️ YouTube API quota exceeded. Please try again later.', 'warning', 5000);
            }
            return false;
        }
        
        console.log('🌐 [API-CALL] Quota check passed - fetching from YouTube API for:', query);
        
        // Show API call toast notification
        if (window.showToast) {
            window.showToast('🌐 Making YouTube API call...', 'api', 3000);
        }
        
        try {
            const response = await fetch(`${window.appConfig.getApiUrl('/api/youtube/search')}?q=${encodeURIComponent(query)}&p=${requestedPage}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    type: isPlay ? 'play' : 'search'
                })
            });

            // Check for quota exceeded error
            if (response.status === 403) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {}
                if (errorData && errorData.error && errorData.error.errors && errorData.error.errors[0] && errorData.error.errors[0].reason === 'quotaExceeded') {
                    if (window.QuotaMonitor && typeof window.QuotaMonitor.setToExceeded === 'function') {
                        window.QuotaMonitor.setToExceeded();
                    }
                    if (window.showToast) {
                        window.showToast('❌ YouTube API quota has been exceeded. Please try again later.', 'error', 8000);
                    }
                    return false;
                }
            }
            
            const data = await response.json();
            
            // STEP 2: Increment quota counter after successful API call
            if (window.QuotaMonitor) {
                const usage = window.QuotaMonitor.incrementUsage();
                console.log(`📊 [QUOTA] API call successful - updated usage: ${usage.used}/${usage.limit}`);
            }
            
            if (data.success && data.videos && data.videos.length > 0) {
                // CRITICAL: For new searches (not pagination), reset pagination state completely
                if (!options.isPagination) {
                    console.log('NEW-SEARCH: Resetting pagination state for new query:', query);
                    window.youtubePagination.currentPage = 1;
                    window.youtubePagination.originalQuery = query;
                    window.youtubePagination.searchType = isPlay ? 'play' : 'search';
                    this.youtubeSearchInitiated = true; // A search has now been made
                    
                    // Add to query history
                    this.addToQueriesHistory(query);
                }
                
                // Render results
                this.renderRealYoutubeResults(data.videos, requestedPage, data.totalPages || 'many', query, patterns, isPlay ? 'play' : 'search', options.isPagination);
                this.showRestoredPaginator();
                
                return true;
            } else {
                console.error('YouTube search failed:', data.error || 'No videos found');
                return false;
            }
        } catch (error) {
            console.error('Error in YouTube search:', error);
            return false;
        }
    }

    renderRealYoutubeResults(videos, page, totalPages, subject, patterns, type = 'search', isPagination = false, originalMessageText = null, isOverwrite = false) {
        console.log('🌐 [REAL] renderRealYoutubeResults called with:', { videos, page, totalPages, subject, type, isPagination });

        const validVideos = videos.filter(video => video && video.id && video.title);
        if (validVideos.length === 0) {
            console.log('🌐 [REAL] ❌ No videos with valid properties found, skipping render');
            return;
        }

        this.updateRestoredPaginator(page, totalPages, subject);
        this.showRestoredPaginator();

        this.cleanupBrokenYouTubeElements();

        // Create main bubble container
        const youtubeMultiBubble = document.createElement('div');
        youtubeMultiBubble.className = 'youtube-multi-bubble';

        // Create header section
        const headerSection = document.createElement('div');
        headerSection.className = 'youtube-header-section';
        
        const cleanSubject = this.extractCleanQuery(subject);
        const dynamicHeaderTitle = `📺 YouTube Results: "${cleanSubject}"`;
        const cacheBadge = '<span class="youtube-cache-badge" style="background: #2196f3;">🌐 Real API</span>';
            
        headerSection.innerHTML = `
             <div class="youtube-header-container">
                <div class="youtube-header-left">
                    <h3 class="youtube-header-title"><span class="youtube-header-title-text">${dynamicHeaderTitle}</span></h3>
                </div>
                <div class="youtube-header-right">
                    <button class="view-playlists-btn" onclick="window.playlistManager?.show(this.getCurrentYouTubeQuery()); return false;" title="View Playlists">
                        <span class="view-playlists-icon">📋</span><span class="view-playlists-text">View Playlists</span>
                    </button>
                    <span class="youtube-page-info">Page ${page}${totalPages !== 'many' ? ` of ${totalPages}` : ' of many'}</span>
                    ${cacheBadge}
                </div>
            </div>
        `;

        // Create video list container (grid)
        const videoList = document.createElement('ul');
        videoList.className = 'video-list';

        validVideos.forEach(video => {
            const videoItem = document.createElement('li');
            videoItem.className = 'video-item';
            
            const videoDataEncoded = encodeURIComponent(JSON.stringify({
                id: video.id,
                title: video.title,
                channelTitle: video.channelTitle,
                thumbnail: video.thumbnail
            }));

            videoItem.innerHTML = `
                <div class="button-thumb-group-MULTI top-buttons">
                    <button class="youtube-action-btn popup-btn" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}'); return false;" title="Play in Popup">Play in Popup</button>
                    <button class="add-to-playlist-MULTI-btn" data-video="${videoDataEncoded}" data-playlist="${encodeURIComponent(subject)}" title="Add to Playlist"><span class="plus-sign">+</span></button>
                </div>
                <span class="youtube-thumb-link youtube-popup-thumb" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}'); return false;" title="Play video">
                    <img class="youtube-thumb-img" src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                </span>
                <div class="video-title">${video.title}</div>
                <div class="button-thumb-group-MULTI bottom-buttons">
                    <button class="youtube-action-btn youtube-direct-link-improved" onclick="window.open('https://www.youtube.com/watch?v=${video.id}', '_blank'); return false;" title="Watch on YouTube">
                        <span class="watch-on-youtube-icon">🎬</span>
                        <span class="watch-on-youtube-text">Watch on YouTube</span>
                    </button>
                </div>
                <div class="video-channel">${video.channelTitle || ''}</div>
            `;
            
            videoList.appendChild(videoItem);
        });

        // Assemble and add to chat
        youtubeMultiBubble.appendChild(headerSection);
        youtubeMultiBubble.appendChild(videoList);

        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant';
        messageElement.innerHTML = youtubeMultiBubble.outerHTML; // Use outerHTML to pass the whole structure

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(messageElement);

        this.scrollToYouTubeResults();
        this.showRestoredPaginator();
    }

    cleanupBrokenYouTubeElements() {
        console.log('🧹 Starting cleanup of YouTube elements...');
        const selectors = [
            '.youtube-multi-bubble-mock',
            '.mock-youtube-results',
            '.youtube-results-wrapper-mock',
            '.youtube-multi-bubble',
            '.youtube-single-bubble',
            '.youtube-results' // Also remove the old, simple container
        ];
        document.querySelectorAll(selectors.join(', ')).forEach(el => el.remove());
        console.log('✅ Cleanup complete');
    }

    updateRestoredPaginator(page, totalPages, subject) {
        if (!this.restoredPaginator) {
            console.error('Restored paginator not found!');
            return;
        }

        const cleanSubject = this.extractCleanQuery(subject);
        const titleElement = this.restoredPaginator.querySelector('.youtube-paginator-title');
        const pageInfoElement = this.restoredPaginator.querySelector('.youtube-page-info');

        if (titleElement) {
            titleElement.textContent = `YouTube Results: "${cleanSubject}"`;
        }

        if (pageInfoElement) {
            pageInfoElement.textContent = `Page ${page}${totalPages !== 'many' ? ` of ${totalPages}` : ' of many'}`;
        }
    }

    #setupPaginationEventListeners(bar, subject, patterns) {
        bar.querySelector('.back-to-top-btn').addEventListener('click', () => {
            if (this.paginationState.queryHistory.length > 0) {
                this.paginationState.currentQueryIndex = 0;
                const firstQuery = this.paginationState.queryHistory[0];
                this.paginationState.currentQuery = firstQuery;
                this.paginationState.pageHistory = firstQuery.pages;
                this.paginationState.currentPageIndex = 0;
                this.handleYoutubeRequest(firstQuery.query, patterns, { page: firstQuery.pages[0], overwrite: true });
            }
        });

        bar.querySelector('.query-start-btn').addEventListener('click', () => {
            if (this.paginationState.currentQuery && this.paginationState.pageHistory.length > 0) {
                this.paginationState.currentPageIndex = 0;
                const firstPage = this.paginationState.pageHistory[0];
                this.handleYoutubeRequest(this.paginationState.currentQuery.query, patterns, { page: firstPage, overwrite: true });
            }
        });

        bar.querySelector('.back-btn').addEventListener('click', () => {
            if (this.paginationState.currentPageIndex > 0) {
                this.paginationState.currentPageIndex--;
                const prevPage = this.paginationState.pageHistory[this.paginationState.currentPageIndex];
                this.handleYoutubeRequest(this.paginationState.currentQuery.query, patterns, { page: prevPage, overwrite: true });
            }
        });

        bar.querySelector('.next-btn').addEventListener('click', () => {
            if (this.paginationState.currentPageIndex < this.paginationState.pageHistory.length - 1) {
                this.paginationState.currentPageIndex++;
                const nextPage = this.paginationState.pageHistory[this.paginationState.currentPageIndex];
                this.handleYoutubeRequest(this.paginationState.currentQuery.query, patterns, { page: nextPage, overwrite: true });
            }
        });

        bar.querySelector('.more-page-btn').addEventListener('click', () => {
            const currentPage = this.paginationState.pageHistory[this.paginationState.currentPageIndex] || 1;
            const nextPage = currentPage + 1;
             // Add to history *before* fetching
            if (!this.paginationState.pageHistory.includes(nextPage)) {
                this.paginationState.pageHistory.push(nextPage);
            }
            this.paginationState.currentPageIndex = this.paginationState.pageHistory.length - 1;
            this.handleYoutubeRequest(subject, patterns, { page: nextPage, overwrite: true });
        });
    }

    #updateButtonStates() {
        const bar = document.querySelector('.real-youtube-pagination-bar');
        if (!bar) return;

        const { queryHistory, currentQueryIndex, pageHistory, currentPageIndex } = this.paginationState;

        const btnBackToTop = bar.querySelector('.back-to-top-btn');
        const btnQueryStart = bar.querySelector('.query-start-btn');
        const btnBack = bar.querySelector('.back-btn');
        const btnNext = bar.querySelector('.next-btn');

        // Back to Top (of all queries)
        btnBackToTop.disabled = queryHistory.length <= 1 && currentQueryIndex <= 0;

        // Back to Query Start
        btnQueryStart.disabled = pageHistory.length <= 1 || currentPageIndex === 0;

        // Back a page
        btnBack.disabled = currentPageIndex <= 0;

        // Next page
        btnNext.disabled = currentPageIndex >= pageHistory.length - 1;
    }

    async fetchYoutubeResults(query, pageToken) {
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/youtube/search'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query, pageToken: pageToken })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching YouTube results:', error);
            return null;
        }
    }

    appendYoutubeResults(videos) {
        const lastContainer = document.querySelector('.youtube-multi-bubble:last-of-type');
        if (!lastContainer) return;

        const videoList = lastContainer.querySelector('.video-list');
        if (videoList) {
            const lastItemBeforeAppend = videoList.lastElementChild;
            const subject = this.getCurrentYouTubeQuery(); // Get current subject for playlist data

            videos.forEach(video => {
                const videoItem = document.createElement('li');
                videoItem.className = 'video-item';
                const videoData = { id: video.id, title: video.title, channelTitle: video.channelTitle, thumbnail: video.thumbnail };
                const videoDataEncoded = encodeURIComponent(JSON.stringify(videoData));

                videoItem.innerHTML = `
                    <div class="button-thumb-group-MULTI top-buttons">
                        <a href="#" class="youtube-action-btn youtube-popup-btn" onclick="window.youtubeSearchManager.openYoutubePopup('${video.id}'); return false;" title="Popup">
                            <img src="/assets/img/popup.svg" alt="Open in Popup" class="popup-icon">
                        </a>
                        <button class="add-to-playlist-MULTI-btn" data-video='${videoDataEncoded}' data-playlist="${encodeURIComponent(subject)}" title="Add to Playlist">
                            <span class="plus-sign">+</span>
                            <span class="view-playlists-btn-text">Add to..</span>
                        </button>
                </div>
                    <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="youtube-thumb-link" title="Watch on YouTube">
                        <img src="${video.thumbnail}" alt="${video.title}" class="youtube-thumb-img-MULTI">
                    </a>
                    <div class="button-thumb-group-MULTI bottom-buttons">
                        <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="youtube-action-btn youtube-direct-link" title="Watch on YouTube">
                           <img src="/assets/img/youtube-logo-v2.png" alt="Watch on YouTube" class="watch-on-youtube-icon">
                           <span class="watch-on-youtube-text">YouTube</span>
                        </a>
                    </div>
                    <div class="video-info">
                         <div class="video-title-MULTI" title="${video.title}">${video.title}</div>
                         <div class="video-channel" title="Channel: ${video.channelTitle || 'N/A'}">${video.channelTitle || 'N/A'}</div>
            </div>`;
                videoList.appendChild(videoItem);
            });

            // Scroll to the first new item that was added
            const targetToScroll = lastItemBeforeAppend ? lastItemBeforeAppend.nextElementSibling : videoList.firstElementChild;
            if (targetToScroll) {
                targetToScroll.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
    }

    updatePageInfo(page, totalPages) {
        const lastContainer = document.querySelector('.youtube-multi-bubble:last-of-type');
        if (!lastContainer) return;

        const pageInfo = lastContainer.querySelector('.youtube-page-info');
        if (pageInfo) {
            pageInfo.textContent = `Page ${page || 1} of ${totalPages || 1}`;
        }
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

    scrollToYouTubeResults() {
        const youtubeContainer = document.getElementById('youtube-container');
        if (youtubeContainer) {
            const headerOffset = YOUTUBE_HEADER_HEIGHT + YOUTUBE_SCROLL_PADDING;
            const elementPosition = youtubeContainer.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    renderMinimizedPaginatorBar() {
        const minimizedPaginator = document.getElementById('minimized-paginator-bar');
        const restoredPaginator = document.getElementById('youtube-pagination-bar');

        if (!minimizedPaginator || !restoredPaginator) {
            console.warn('[Paginator] Paginator bars not found, skipping render.');
            return;
        }

        if (window.youtubePagination.isMinimized) {
            minimizedPaginator.classList.add('visible');
            restoredPaginator.classList.remove('visible');
        } else {
            minimizedPaginator.classList.remove('visible');
            restoredPaginator.classList.add('visible');
        }
    }

    isYouTubeQuery(query) {
        if (typeof query !== 'string') {
            return false;
        }
        const patterns = [/youtube/i, /video/i, /search for/i, /play/i];
        return patterns.some(pattern => pattern.test(query.toLowerCase()));
    }

    cleanup() {
        // ... existing code ...
    }

    createVideoContainer() {
        if (!window.elements.videoContainer) {
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

            window.elements.videoContainer = container;
        }
    }

    showVideo(videoId) {
        this.createVideoContainer();
        const videoWrapper = document.getElementById('youtube-video');

        // Create iframe with event listener
        const iframe = document.createElement('iframe');
        iframe.width = "100%";
        iframe.height = "100%";
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        iframe.frameBorder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;

        // When iframe loads, update status and mic state
        iframe.onload = () => {
            // Force stop listening and update states
            window.stopListening();
            window.state.isListening = false;
            // Store previous conversation mode state
            this.previousConversationMode = window.state.isConversationMode;
            window.state.isConversationMode = false;  // Temporarily disable conversation mode

            // Update status and mic visual state
            window.updateStatus(window.MESSAGES.STATUS.VIDEO_PLAYING);
            if (window.elements.microphoneButton) {
                window.elements.microphoneButton.classList.remove('active');
            }
        };

        videoWrapper.innerHTML = '';
        videoWrapper.appendChild(iframe);
        window.elements.videoContainer.classList.remove('hidden');
        this.isPlaying = true;
    }

    hideVideo() {
        if (window.elements.videoContainer) {
            const videoWrapper = document.getElementById('youtube-video');
            videoWrapper.innerHTML = '';
            window.elements.videoContainer.classList.add('hidden');
            this.isPlaying = false;

            // Restore previous conversation mode state
            if (this.previousConversationMode) {
                window.state.isConversationMode = true;
                window.state.isListening = true;
                // Ensure recognition is restarted
                if (window.state.recognition) {
                    window.state.recognition.start();
                } else {
                    window.initializeSpeechRecognition();
                    window.state.recognition.start();
                }
                window.updateStatus(window.MESSAGES.STATUS.LISTENING);
                // Update mic visual state
                if (window.elements.microphoneButton) {
                    window.elements.microphoneButton.classList.add('active');
                    window.elements.microphoneButton.textContent = '🔴';  // Active mic indicator
                }
            } else {
                window.updateStatus(window.MESSAGES.STATUS.DEFAULT);
            }
            // Clear stored state
            this.previousConversationMode = null;
        }
    }

    // --- Query History Methods ---

    normalizeQuery(query) {
        return query.replace(/^youtube\s+search\s+/i, '').replace(/^youtube\s+/i, '').replace(/^search\s+/i, '').trim();
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    countCachedPages(query) {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`yt_${query}_search_`)) {
                count++;
            }
        }
        return count;
    }

    async deleteQueryFromHistory(query) {
        console.log('🗑️ [DELETE] Deleting query and cached data for:', query);
        let deletedCount = 0;
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`yt_${query}_search_`)) {
                keysToDelete.push(key);
                deletedCount++;
            }
        }
        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
        });
        // Always remove from allQueriesHistory
        if (window.youtubePagination.allQueriesHistory) {
            window.youtubePagination.allQueriesHistory = window.youtubePagination.allQueriesHistory.filter(
                item => item.query !== query
            );
        }
        // Always update the UI
        this.updateQueryHistoryDisplay();

        const displaySubject = this.extractSubject(query);
        window.showToast(`🗑️ Deleted "${displaySubject}" and ${deletedCount} cached page${deletedCount !== 1 ? 's' : ''}`, 'success');
    }
    
    navigateToQuery(query) {
        console.log('🔍 [HISTORY] Navigating to query:', query);
        const cacheKey = `yt_${query}_search_1`;
        const cachedResult = localStorage.getItem(cacheKey);
        if (cachedResult) {
            const data = JSON.parse(cachedResult);
            console.log('🌐 [HISTORY] 🎯 Found cached results for query navigation');
            window.youtubePagination.currentPage = 1;
            window.youtubePagination.originalQuery = query;
            let videos = [];
            if (data.video) {
                videos = [data.video];
            } else if (data.videos) {
                videos = data.videos;
            }
            this.renderRealYoutubeResults(videos, 1, 'many', query, 'search', true);
            this.setInitialButtonStates();
            window.showToast(`📚 Switched to: ${query}`, 'info');
            this.updateAllYouTubeHeaders(query);
        } else {
            console.log('🌐 [HISTORY] ❌ No cached results found for query:', query);
            window.showToast('No cached results for this query', 'warning');
        }
    }

    // Helper function to track new YouTube queries for navigation history
    addToQueriesHistory(query) {
        // Check if this is a new query
        const lastQuery = window.youtubePagination.allQueriesHistory[window.youtubePagination.allQueriesHistory.length - 1];
        if (!lastQuery || lastQuery.query !== query) {
            window.youtubePagination.allQueriesHistory.push({
                query: query,
                timestamp: Date.now()
            });
            // Mark the start of this query in navigation history
            window.youtubePagination.currentQueryStartIndex = window.youtubePagination.navigationHistory.length;
            console.log('🔍 Added new query to history:', query);
            console.log('🔍 Total queries in history:', window.youtubePagination.allQueriesHistory.length);
        }
    }

    // Function to update the query history display
    async updateQueryHistoryDisplay() {
        let savedStatus = {}; // Always define it at the top of the function
    
        console.log('🔍 [HISTORY] Scanning ALL cached queries in localStorage...');
        const cachedQueries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_') && key.includes('_search_1')) {
                const query = key.replace('yt_', '').replace('_search_1', '');
                const cachedData = localStorage.getItem(key);
                if (cachedData) {
                    try {
                        const data = JSON.parse(cachedData);
                        if (data.timestamp) {
                            cachedQueries.push({
                                query: query,
                                timestamp: data.timestamp
                            });
                            console.log('🔍 [HISTORY] Found cached query:', query, 'from', new Date(data.timestamp).toLocaleString());
                        }
                    } catch (e) {
                        console.log('🔍 [HISTORY] Failed to parse cached data for key:', key);
                    }
                }
            }
        }
        console.log('🔍 [HISTORY] Total cached queries found:', cachedQueries.length);
        if (cachedQueries.length === 0) {
            const historyList = document.querySelector('.query-history-list');
            if (historyList) {
                historyList.innerHTML = '<div class="query-history-empty">No query history available</div>';
            }
            return;
        }
        // Sort queries by timestamp (newest first)
        let sortedHistory = cachedQueries.sort((a, b) => b.timestamp - a.timestamp);

        // De-duplicate: keep only the most recent entry for each unique query (ignoring trailing numbers)
        const seen = new Set();
        sortedHistory = sortedHistory.filter(item => {
            const baseQuery = this.extractSubject(item.query).toLowerCase();
            if (seen.has(baseQuery)) return false;
            seen.add(baseQuery);
            return true;
        });

        // Filter out entries with 0 cached pages
        sortedHistory = sortedHistory.filter(item => this.countCachedPages(item.query) > 0);

        // Check which queries are saved in database
        const queryList = sortedHistory.map(item => this.normalizeQuery(item.query));
        
        try {
            const payload = {
                queries: queryList,
                userId: window.sessionId
            };
            console.log('[DEBUG] Payload:', payload);
    
            console.log('[DEBUG] Checking saved status for queries:', queryList);
            const response = await fetch(window.appConfig.getApiUrl('/api/youtube/check-saved'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            console.log('[DEBUG] Saved status "data" from backend:', data);
    
            try {
                if (data && data.results) {
                    savedStatus = data.results;
                    console.log('[DEBUG] Saved status "savedStatus" from backend:', savedStatus);
                }
            } catch (e) {
                console.error('Failed to check saved status:', e);
            }
        } catch (e) {
            console.error('Failed to check saved status:', e);
        }
        
        // CRITICAL: Ensure CURRENT query is at the top
        const currentQuery = window.youtubePagination.originalQuery || this.getCurrentYouTubeQuery();
        if (currentQuery) {
            // Remove current query from sorted history if it exists
            sortedHistory = sortedHistory.filter(item => item.query !== currentQuery);
            // Add current query at the top
            sortedHistory.unshift({
                query: currentQuery,
                timestamp: Date.now(),
                isCurrent: true
            });
        }

        const historyList = document.querySelector('.query-history-list');
        if (!historyList) return;

        historyList.innerHTML = '';
        
        sortedHistory.forEach((item, index) => {
            const query = item.query;
            const normalizedQuery = this.normalizeQuery(query);
            const isCurrent = item.isCurrent || query === currentQuery;
            const isSaved = savedStatus[normalizedQuery] || false;
            
            const displaySubject = this.extractSubject(query);
            const timeAgo = this.formatTimeAgo(item.timestamp);
            const cachedPages = this.countCachedPages(query);
            
            const historyItem = document.createElement('div');
            historyItem.className = `query-history-item ${isCurrent ? 'current' : ''}`;
            historyItem.setAttribute('data-query', query);
            
            historyItem.innerHTML = `
                <div class="query-history-content">
                    <div class="query-history-query">
                        <span class="query-led ${isSaved ? 'green' : ''}">${isSaved ? '🟢' : ''}</span>
                        ${displaySubject}
                        ${isCurrent ? ' <strong>(CURRENT)</strong>' : ''}
                    </div>
                    <div class="query-history-meta">
                        <span class="query-history-time">${timeAgo}</span>
                        <span class="query-history-pages">${cachedPages} page${cachedPages !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <button class="query-history-delete" onclick="window.youtubeSearchManager.deleteQueryFromHistory('${query}')" title="Delete this query and all cached pages">❌</button>
                ${!isSaved ? `<button class="query-history-save" onclick="window.youtubeSearchManager.saveQueryFromHistory('${query}')" title="Save this query to database">💾</button>` : ''}
            `;
            
            // Add click handler for navigation
            historyItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('query-history-delete') && !e.target.classList.contains('query-history-save')) {
                    this.navigateToQuery(query);
                }
            });
            
            historyList.appendChild(historyItem);
        });
    }

    minimize() {
        this.minimizePaginator();
    }

    initializePaginator() {
        this.createRestoredPaginator();
        this.createMinimizedPaginator();
        // Both paginators are now hidden by default on creation.
        // They will be shown only when a YouTube search is made.
    }

    createMinimizedPaginator() {
        if (this.minimizedPaginator) {
            this.minimizedPaginator.remove();
        }

        this.minimizedPaginator = document.createElement('div');
        this.minimizedPaginator.id = 'minimized-paginator-bar';
        this.minimizedPaginator.className = 'minimized-paginator-bar';
        this.minimizedPaginator.innerHTML = '<span>🔄 Restore YouTube Search</span>';
        this.minimizedPaginator.title = 'Click to restore YouTube paginator and last search';
        
        this.minimizedPaginator.onclick = () => {
            this.showRestoredPaginator();
            this.scrollToYouTubeResults();
        };
        
        document.body.appendChild(this.minimizedPaginator);
        this.minimizedPaginator.style.display = 'none'; // Initially hidden
    }

    createRestoredPaginator() {
        if (this.restoredPaginator) {
            this.restoredPaginator.remove();
        }

        this.restoredPaginator = document.createElement('div');
        this.restoredPaginator.className = 'real-youtube-pagination-bar';
        this.restoredPaginator.innerHTML = `
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

        document.body.appendChild(this.restoredPaginator);

        const dragTab = this.restoredPaginator.querySelector('#pagination-drag-tab');
        
        if (dragTab) {
            let offsetX = 0, offsetY = 0;
            
            dragTab.onmousedown = (e) => {
                e.preventDefault();
                offsetX = e.clientX - this.restoredPaginator.getBoundingClientRect().left;
                offsetY = e.clientY - this.restoredPaginator.getBoundingClientRect().top;
                this.restoredPaginator.classList.add('dragging');
                
                const onMouseMove = (e) => {
                    const newLeft = e.clientX - offsetX;
                    const newTop = e.clientY - offsetY;
                    const clampedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - this.restoredPaginator.offsetWidth));
                    const clampedTop = Math.max(0, Math.min(newTop, window.innerHeight - this.restoredPaginator.offsetHeight));
                    this.restoredPaginator.style.left = clampedLeft + 'px';
                    this.restoredPaginator.style.top = clampedTop + 'px';
                    this.restoredPaginator.style.right = 'auto';
                    this.restoredPaginator.style.bottom = 'auto';
                };
                
                const onMouseUp = () => {
                    this.restoredPaginator.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
        }

        // Add event listeners for buttons
        this.restoredPaginator.querySelector('.more-page-btn').addEventListener('click', () => console.log('MORE clicked'));
        this.restoredPaginator.querySelector('.back-btn').addEventListener('click', () => console.log('BACK clicked'));
        this.restoredPaginator.querySelector('.next-btn').addEventListener('click', () => console.log('NEXT clicked'));
        this.restoredPaginator.querySelector('.query-start-btn').addEventListener('click', () => console.log('QUERY START clicked'));
        this.restoredPaginator.querySelector('.back-to-top-btn').addEventListener('click', () => console.log('BACK TO TOP clicked'));
        this.restoredPaginator.querySelector('.query-history-btn').addEventListener('click', () => console.log('Query History clicked'));

        this.restoredPaginator.style.display = 'none'; // Initially hidden
    }

    showRestoredPaginator() {
        if (this.restoredPaginator) {
            this.restoredPaginator.style.display = 'block';
        }
        if (this.minimizedPaginator) {
            this.minimizedPaginator.style.display = 'none';
        }
        this.isPaginatorMinimized = false;
    }

    minimizePaginator() {
        if (this.restoredPaginator) {
            this.restoredPaginator.style.display = 'none';
        }
        if (this.minimizedPaginator) {
            this.minimizedPaginator.style.display = 'block';
        }
        this.isPaginatorMinimized = true;
    }

    // Helper methods for query history
    extractSubject(query) {
        if (typeof query !== 'string') {
            return query;
        }
        // For channel queries
        const channelPattern1 = /^youtube\s+channel\s+(.+)/i;
        const channelPattern2 = /^youtube\s+search\s+channel:(.+)/i;
        let match = query.match(channelPattern1) || query.match(channelPattern2);
        if (match) {
            return match[1].trim() + ' (c)';
        }
        // For normal queries
        let cleanQuery = query
            .replace(/^youtube\s+search\s+/i, '')
            .replace(/^youtube\s+/i, '')
            .replace(/^search\s+/i, '')
            .trim();
        // Remove trailing numbers (e.g., Fender0, Fender1)
        cleanQuery = cleanQuery.replace(/\d+$/, '').trim();
        return cleanQuery || query;
    }

    updateAllYouTubeHeaders(newQuery) {
        // Update all YouTube result headers to show the current query
        const headers = document.querySelectorAll('.youtube-header-title');
        headers.forEach(header => {
            const cleanQuery = this.extractSubject(newQuery);
            header.textContent = `📺 YouTube Results: "${cleanQuery}"`;
        });
    }

    setInitialButtonStates() {
        const realBar = document.querySelector('.real-youtube-pagination-bar');
        if (!realBar) return;

        const currentPage = window.youtubePagination?.currentPage || 1;
        const backToTopBtn = realBar.querySelector('.back-to-top-btn');
        const queryStartBtn = realBar.querySelector('.query-start-btn'); 
        const backBtn = realBar.querySelector('.back-btn');
        const nextBtn = realBar.querySelector('.next-btn');
        const historyBtn = realBar.querySelector('.drag-tab .query-history-btn');
        
        // Back to top button - disable if only one query in history or on first query
        if (backToTopBtn) {
            const queryHistory = window.youtubePagination.allQueriesHistory || [];
            if (queryHistory.length <= 1) {
                backToTopBtn.disabled = true;
                backToTopBtn.style.opacity = '0.5';
                backToTopBtn.title = 'No previous queries to go back to';
            }
        }
        
        // Query start button - disable if on page 1
        if (queryStartBtn) {
            if (currentPage === 1) {
                queryStartBtn.disabled = true;
                queryStartBtn.style.opacity = '0.5';
                queryStartBtn.title = 'Already on page 1';
            }
        }
        
        // Back button - disable if on page 1
        if (backBtn) {
            if (currentPage === 1) {
                backBtn.disabled = true;
                backBtn.style.opacity = '0.5';
                backBtn.title = 'Already on first page';
            }
        }
        
        // Next button - disable if no cached next page
        if (nextBtn) {
            const currentQuery = window.youtubePagination.originalQuery;
            if (currentQuery) {
                const nextPageKey = `yt_${currentQuery}_search_${currentPage + 1}`;
                const hasNextPage = localStorage.getItem(nextPageKey) !== null;
                if (!hasNextPage) {
                    nextBtn.disabled = true;
                    nextBtn.style.opacity = '0.2';
                    nextBtn.title = 'No more cached pages - click MORE for new results';
                }
            }
        }
        
        // Query history button - disable if no query history
        if (historyBtn) {
            let queryHistory = window.youtubePagination.allQueriesHistory || [];
            
            // If history is empty, try to auto-populate from localStorage cache
            if (queryHistory.length === 0) {
                console.log('🔍 [BUTTON-STATE] History empty, checking localStorage for cached queries');
                const cachedQueries = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('yt_') && key.includes('_search_1')) {
                        let query = key.replace(/^yt_/, '').replace(/_(search|channel)_\d+$/, '');
                        const cachedData = localStorage.getItem(key);
                        if (cachedData) {
                            try {
                                const data = JSON.parse(cachedData);
                                if (data.timestamp) {
                                    cachedQueries.push({
                                        query: query,
                                        timestamp: data.timestamp
                                    });
                                }
                            } catch (e) {
                                console.log('🔍 [BUTTON-STATE] Failed to parse cached data for key:', key);
                            }
                        }
                    }
                }
                if (cachedQueries.length > 0) {
                    window.youtubePagination.allQueriesHistory = cachedQueries.sort((a, b) => b.timestamp - a.timestamp);
                    queryHistory = window.youtubePagination.allQueriesHistory;
                    console.log('🔍 [BUTTON-STATE] Auto-populated history for button state:', queryHistory.length, 'queries');
                }
            }
            
            if (queryHistory.length === 0) {
                historyBtn.disabled = true;
                historyBtn.style.opacity = '0.5';
                historyBtn.title = 'No query history available';
            }
        }

        this.restoredPaginator.querySelector('#youtube-next-page-btn').disabled = (window.youtubePagination.currentPage >= window.youtubePagination.totalPages);
    }
}