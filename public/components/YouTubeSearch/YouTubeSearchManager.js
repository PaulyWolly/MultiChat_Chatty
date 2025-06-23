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
    }

    /**
     * Initialize the YouTubeSearchManager
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📚 [YOUTUBE-DB] Initializing YouTubeSearchManager');
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
            const response = await fetch(window.appConfig.getApiUrl('youtube.deleteSaved') + `?userId=${window.sessionId}`);
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
            const response = await fetch(window.appConfig.getApiUrl('youtube.saveSearch'), {
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
} 