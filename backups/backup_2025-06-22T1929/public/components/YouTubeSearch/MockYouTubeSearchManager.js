// ═══════════════════════════════════════════════════════════════════════════════════════
// ██████████████████████████ MOCK YOUTUBE MODULE ██████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════════════════════
// This module handles all MOCK YouTube functionality (SINGLE-MOCK, MULTI-MOCK)
// Uses demo data, mock pagination, and totalPages logic
// Complete segregation from REAL YouTube module - NO BLEEDING ALLOWED
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * MockYouTubeSearchManager Component
 * 
 * Handles MOCK YouTube functionality for development when API limits are hit
 * COMPLETELY SEGREGATED from real YouTube functionality - NO BLEEDING ALLOWED
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

class MockYouTubeSearchManager {
    constructor() {
        this.isInitialized = false;
        this.template = null;
        this.mockPaginationState = null;
        this.initMockPaginationState();
    }

    /**
     * Initialize the MockYouTubeSearchManager
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🎭 [MOCK] Initializing MockYouTubeSearchManager');
            await this.loadTemplate();
            this.isInitialized = true;
            console.log('🎭 [MOCK] MockYouTubeSearchManager initialized successfully');
        } catch (error) {
            console.error('🎭 [MOCK] Initialization error:', error);
        }
    }

    /**
     * Load mock template (if needed)
     */
    async loadTemplate() {
        try {
            // For now, we'll use inline templates, but could load from external file
            console.log('🎭 [MOCK] Mock templates loaded');
        } catch (error) {
            console.error('🎭 [MOCK] Failed to load mock template:', error);
        }
    }

    /**
     * 🎭 MOCK: Initialize mock pagination state
     */
    initMockPaginationState() {
        this.mockPaginationState = {
            currentPage: 1,
            totalPages: 1,
            originalQuery: '',
            isMock: true,
            isActive: false,
            navigationHistory: [],
            currentHistoryIndex: -1,
            allQueriesHistory: []
        };
        console.log('🎭 [MOCK] Mock pagination state initialized');
    }

    /**
     * 🎭 MOCK: Check if we're in mock mode
     */
    isMockMode() {
        return this.mockPaginationState && this.mockPaginationState.isMock && this.mockPaginationState.isActive;
    }

    /**
     * 🎭 MOCK: Switch to mock mode
     */
    enableMockMode() {
        this.initMockPaginationState();
        this.mockPaginationState.isActive = true;
        console.log('🎭 [MOCK] Mock mode enabled');
    }

    /**
     * 🎭 MOCK: Switch to real mode
     */
    disableMockMode() {
        if (this.mockPaginationState) {
            this.mockPaginationState.isActive = false;
        }
        console.log('🎭 [MOCK] Mock mode disabled');
    }

    /**
     * 🎭 MOCK: Handle YouTube search request (mock version)
     */
    async handleYoutubeRequest(subject, isPagination = false, messageText = null, options = {}) {
        console.log('🎭 [MOCK] Handling YouTube request:', { subject, isPagination, options });
        
        // MOCK SYSTEM: Enable mock mode
        this.enableMockMode();
        
        // MOCK SYSTEM: Generate mock videos
        const mockVideos = this.generateMockVideos(subject, 1);
        
        // MOCK SYSTEM: Render mock results
        this.renderMockYoutubeResults(mockVideos, 1, 5, subject, 'search', false);
        
        // MOCK SYSTEM: Add to query history
        this.addToMockQueryHistory(subject);
        
        return {
            success: true,
            isMock: true,
            videos: mockVideos,
            totalPages: 5,
            currentPage: 1
        };
    }

    /**
     * 🎭 MOCK: Render mock YouTube results (completely segregated from real system)
     */
    renderMockYoutubeResults(videos, page, totalPages, subject, type = 'search', isRealData = false) {
        console.log('🎭 [MOCK] Rendering mock YouTube results:', { videos: videos.length, page, totalPages, subject });
        
        // MOCK SYSTEM: Update mock pagination state
        this.mockPaginationState.currentPage = page;
        this.mockPaginationState.totalPages = totalPages;
        this.mockPaginationState.originalQuery = subject;
        
        // MOCK SYSTEM: Create mock result container
        const mockContainer = document.createElement('div');
        mockContainer.className = 'youtube-multi-bubble-mock';
        mockContainer.innerHTML = `
            <div class="youtube-header">
                <h3 class="youtube-header-title">🎭 Mock YouTube Results <span style="color: black;">"${subject}"</span></h3>
                <div class="youtube-header-meta">
                    <span class="youtube-page-info">Page ${page} of ${totalPages}</span>
                    <span class="youtube-result-count">${videos.length} results</span>
                    <span class="mock-indicator" style="color: #ff6b35; font-weight: bold;">🎭 MOCK DATA</span>
                </div>
            </div>
            <div class="youtube-video-grid">
                ${videos.map(video => this.createMockVideoElement(video)).join('')}
            </div>
        `;
        
        // MOCK SYSTEM: Add to chat without creating user bubble
        if (typeof addMessageToChat === 'function') {
            addMessageToChat('assistant', '', { customElement: mockContainer });
        }
        
        // MOCK SYSTEM: Render mock pagination bar
        this.renderMockPaginationBar(page, totalPages, subject);
        
        // MOCK SYSTEM: Scroll to results
        this.scrollToMockResults();
        
        console.log('🎭 [MOCK] Mock YouTube results rendered successfully');
    }

    /**
     * 🎭 MOCK: Create mock video element
     */
    createMockVideoElement(video) {
        return `
            <div class="youtube-video-item mock-video" data-video-id="${video.id}">
                <div class="youtube-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                    <div class="youtube-duration">${video.duration || '10:30'}</div>
                    <div class="mock-overlay" style="position: absolute; top: 5px; right: 5px; background: #ff6b35; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">MOCK</div>
                </div>
                <div class="youtube-video-info">
                    <h4 class="youtube-video-title">${video.title}</h4>
                    <p class="youtube-channel-name">${video.channelName || 'Mock Channel'}</p>
                    <p class="youtube-video-meta">
                        <span class="youtube-views">${video.viewCount || '1.2M'} views</span>
                        <span class="youtube-date">${video.uploadDate || '2 weeks ago'}</span>
                    </p>
                    <p class="youtube-description">${video.description || 'Mock video description for development purposes.'}</p>
                </div>
                <div class="youtube-video-actions">
                    <button class="play-video-btn" onclick="mockYoutubeManager.openMockYoutubePopup('${video.id}')">▶️ Play</button>
                    <button class="add-to-playlist-btn" data-video-id="${video.id}">📋 Add to Playlist</button>
                </div>
            </div>
        `;
    }

    /**
     * 🎭 MOCK: Render mock single YouTube result
     */
    renderMockSingleYoutubeResult(video, subject, type = 'search') {
        console.log('🎭 [MOCK] Rendering mock single YouTube result:', video.title);
        
        const mockContainer = document.createElement('div');
        mockContainer.className = 'youtube-single-bubble-mock';
        mockContainer.innerHTML = `
            <div class="youtube-header">
                <h3 class="youtube-header-title">🎭 Mock YouTube Result <span style="color: black;">"${subject}"</span></h3>
                <div class="youtube-header-meta">
                    <span class="mock-indicator" style="color: #ff6b35; font-weight: bold;">🎭 MOCK DATA</span>
                </div>
            </div>
            <div class="youtube-single-video">
                ${this.createMockVideoElement(video)}
            </div>
        `;
        
        // MOCK SYSTEM: Add to chat
        if (typeof addMessageToChat === 'function') {
            addMessageToChat('assistant', '', { customElement: mockContainer });
        }
        
        // MOCK SYSTEM: Scroll to results
        this.scrollToMockResults();
        
        console.log('🎭 [MOCK] Mock single YouTube result rendered');
    }

    /**
     * 🎭 MOCK: Render mock pagination bar (completely separate from real pagination)
     */
    renderMockPaginationBar(page, totalPages, subject) {
        console.log('🎭 [MOCK] Rendering mock pagination bar:', { page, totalPages, subject });
        
        // MOCK SYSTEM: Remove any existing mock pagination bars
        document.querySelectorAll('.mock-pagination-bar').forEach(el => el.remove());
        
        // MOCK SYSTEM: Hide real pagination bars to prevent conflicts
        document.querySelectorAll('.real-youtube-pagination-bar').forEach(el => el.style.display = 'none');
        
        const mockBar = document.createElement('div');
        mockBar.className = 'mock-pagination-bar';
        mockBar.innerHTML = `
            <div class="mock-pagination-header">
                <span class="mock-indicator" style="color: #ff6b35; font-weight: bold;">🎭 MOCK PAGINATION</span>
                <span class="pagination-info">Page ${page} of ${totalPages}</span>
            </div>
            <div class="mock-pagination-controls">
                <button class="mock-back-btn" ${page <= 1 ? 'disabled' : ''}>⬅️ Back</button>
                <button class="mock-next-btn" ${page >= totalPages ? 'disabled' : ''}>Next ➡️</button>
                <button class="mock-top-btn">⬆️ Top</button>
            </div>
        `;
        
        // MOCK SYSTEM: Add dragging functionality
        let offsetX = 0, offsetY = 0;
        mockBar.onmousedown = function(e) {
            e.preventDefault();
            offsetX = e.clientX - mockBar.getBoundingClientRect().left;
            offsetY = e.clientY - mockBar.getBoundingClientRect().top;
            mockBar.classList.add('dragging');
            
            function onMouseMove(e) {
                const newLeft = e.clientX - offsetX;
                const newTop = e.clientY - offsetY;
                const clampedLeft = Math.max(0, Math.min(newLeft, window.innerWidth - mockBar.offsetWidth));
                const clampedTop = Math.max(0, Math.min(newTop, window.innerHeight - mockBar.offsetHeight));
                mockBar.style.left = clampedLeft + 'px';
                mockBar.style.top = clampedTop + 'px';
                mockBar.style.right = 'auto';
                mockBar.style.bottom = 'auto';
            }
            
            function onMouseUp() {
                mockBar.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        // MOCK SYSTEM: Add event listeners for mock navigation
        mockBar.querySelector('.mock-back-btn').addEventListener('click', () => {
            if (page > 1) {
                console.log('🎭 [MOCK] Back button clicked - navigating to page', page - 1);
                this.handleMockBackNavigation(subject, page - 1);
            }
        });
        
        mockBar.querySelector('.mock-next-btn').addEventListener('click', () => {
            if (page < totalPages) {
                console.log('🎭 [MOCK] Next button clicked - navigating to page', page + 1);
                this.handleMockNextNavigation(subject, page + 1);
            }
        });
        
        mockBar.querySelector('.mock-top-btn').addEventListener('click', () => {
            console.log('🎭 [MOCK] Top button clicked - navigating to page 1');
            this.handleMockTopNavigation(subject);
        });
        
        document.body.appendChild(mockBar);
        
        // MOCK SYSTEM: Update toggle icon visibility
        this.updateMockPaginatorToggleIcon();
        
        console.log('🎭 [MOCK] Mock pagination bar rendered successfully');
    }

    /**
     * 🎭 MOCK: Handle mock back navigation
     */
    handleMockBackNavigation(subject, newPage) {
        console.log('🎭 [MOCK] Handling back navigation to page', newPage);
        
        // MOCK SYSTEM: Generate mock data for the previous page
        const mockVideos = this.generateMockVideos(subject, newPage);
        
        // MOCK SYSTEM: Render mock results for the new page
        this.renderMockYoutubeResults(mockVideos, newPage, this.mockPaginationState.totalPages, subject, 'search', false);
        
        // MOCK SYSTEM: Update mock pagination state
        this.mockPaginationState.currentPage = newPage;
    }

    /**
     * 🎭 MOCK: Handle mock next navigation
     */
    handleMockNextNavigation(subject, newPage) {
        console.log('🎭 [MOCK] Handling next navigation to page', newPage);
        
        // MOCK SYSTEM: Generate mock data for the next page
        const mockVideos = this.generateMockVideos(subject, newPage);
        
        // MOCK SYSTEM: Render mock results for the new page
        this.renderMockYoutubeResults(mockVideos, newPage, this.mockPaginationState.totalPages, subject, 'search', false);
        
        // MOCK SYSTEM: Update mock pagination state
        this.mockPaginationState.currentPage = newPage;
    }

    /**
     * 🎭 MOCK: Handle mock top navigation
     */
    handleMockTopNavigation(subject) {
        console.log('🎭 [MOCK] Handling top navigation');
        
        // MOCK SYSTEM: Generate mock data for page 1
        const mockVideos = this.generateMockVideos(subject, 1);
        
        // MOCK SYSTEM: Render mock results for page 1
        this.renderMockYoutubeResults(mockVideos, 1, this.mockPaginationState.totalPages, subject, 'search', false);
        
        // MOCK SYSTEM: Update mock pagination state
        this.mockPaginationState.currentPage = 1;
    }

    /**
     * 🎭 MOCK: Generate mock videos for development
     */
    generateMockVideos(subject, page) {
        const mockVideos = [];
        const baseCount = 8; // Number of videos per page
        
        for (let i = 0; i < baseCount; i++) {
            const videoNumber = (page - 1) * baseCount + i + 1;
            mockVideos.push({
                id: `mock_video_${videoNumber}`,
                title: `Mock Video ${videoNumber} - ${subject}`,
                channelName: `Mock Channel ${Math.floor(Math.random() * 10) + 1}`,
                thumbnail: `/assets/img/mock/thumb${Math.floor(Math.random() * 57) + 1}.png`,
                duration: `${Math.floor(Math.random() * 20) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
                viewCount: `${Math.floor(Math.random() * 1000) + 1}K views`,
                uploadDate: `${Math.floor(Math.random() * 30) + 1} days ago`,
                description: `Mock video description for development. This is video ${videoNumber} for the query "${subject}".`
            });
        }
        
        return mockVideos;
    }

    /**
     * 🎭 MOCK: Add to mock query history
     */
    addToMockQueryHistory(query) {
        // Check if this is a new query
        const lastQuery = this.mockPaginationState.allQueriesHistory[this.mockPaginationState.allQueriesHistory.length - 1];
        if (!lastQuery || lastQuery.query !== query) {
            this.mockPaginationState.allQueriesHistory.push({
                query: query,
                timestamp: Date.now()
            });
            
            console.log('🎭 [MOCK] Added new query to mock history:', query);
            console.log('🎭 [MOCK] Total queries in mock history:', this.mockPaginationState.allQueriesHistory.length);
        }
    }

    /**
     * 🎭 MOCK: Scroll to mock results
     */
    scrollToMockResults() {
        const chatContainer = document.querySelector('#chat-messages');
        if (chatContainer) {
            // Find ALL mock YouTube-related messages
            const mockYoutubeMessages = document.querySelectorAll('.message');
            let targetMessage = null;
            
            // Find the LAST message that contains mock YouTube content
            for (let i = mockYoutubeMessages.length - 1; i >= 0; i--) {
                const message = mockYoutubeMessages[i];
                if (message.querySelector('.youtube-multi-bubble-mock, .youtube-single-bubble-mock')) {
                    targetMessage = message;
                    break;
                }
            }
            
            if (targetMessage) {
                const messageTop = targetMessage.offsetTop;
                chatContainer.scrollTop = messageTop - 90;
                console.log('🎭 [MOCK] Scrolled to mock YouTube message container');
                
                // Force the scroll to stick
                setTimeout(() => {
                    chatContainer.scrollTop = messageTop - 90;
                    console.log('🎭 [MOCK] FORCED scroll to stick at TOP');
                }, 50);
                
            } else {
                chatContainer.scrollTop = 0;
                console.log('🎭 [MOCK] No mock YouTube message found');
            }
        }
    }

    /**
     * 🎭 MOCK: Update mock paginator toggle icon visibility
     */
    updateMockPaginatorToggleIcon() {
        console.log('🎭 [MOCK] Updating mock paginator toggle icon');
        
        const mockBar = document.querySelector('.mock-pagination-bar');
        const toggleIcon = document.querySelector('.show-mock-paginator-bar');
        
        // Check if we have mock YouTube results
        const mockYoutubeContainers = document.querySelectorAll('.youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        if (mockYoutubeContainers.length === 0) {
            if (toggleIcon) toggleIcon.remove();
            return;
        }

        // Create icon if missing
        if (!toggleIcon) {
            this.createMockPaginatorToggleIcon();
            return;
        }

        // Toggle visibility based on pagination bar state
        const paginationBarVisible = mockBar && mockBar.style.display !== 'none';
        toggleIcon.style.display = paginationBarVisible ? 'none' : 'flex';
        toggleIcon.style.visibility = paginationBarVisible ? 'hidden' : 'visible';
        
        console.log('🎭 [MOCK] Mock paginator toggle icon updated:', { 
            paginationBarVisible, 
            iconDisplay: toggleIcon.style.display 
        });
    }

    /**
     * 🎭 MOCK: Create and add the mock paginator toggle icon
     */
    createMockPaginatorToggleIcon() {
        console.log('🎭 [MOCK] Creating mock paginator toggle icon...');
        
        // Find mock YouTube containers
        const mockYoutubeContainers = document.querySelectorAll('.youtube-multi-bubble-mock, .youtube-single-bubble-mock');
        console.log('🎭 [MOCK] Found mock YouTube containers:', mockYoutubeContainers.length);
        
        if (mockYoutubeContainers.length === 0) {
            console.log('🎭 [MOCK] ❌ NO mock YouTube containers found - NOT creating icon');
            return;
        }
        
        // Get the latest mock YouTube container
        const latestContainer = mockYoutubeContainers[mockYoutubeContainers.length - 1];
        console.log('🎭 [MOCK] Using mock YouTube container:', latestContainer.className);
        
        // Remove any existing mock icon first
        const existingIcon = document.querySelector('.show-mock-paginator-bar');
        if (existingIcon) {
            console.log('🎭 [MOCK] Removing existing mock icon');
            existingIcon.remove();
        }
        
        const toggleIcon = document.createElement('div');
        toggleIcon.className = 'show-mock-paginator-bar';
        toggleIcon.innerHTML = '🎭';
        toggleIcon.title = 'Show/Hide Mock YouTube Paginator';
        toggleIcon.onclick = () => this.toggleMockPaginatorBar();
        
        // Add to the mock YouTube container
        latestContainer.appendChild(toggleIcon);
        
        console.log('🎭 [MOCK] ✅ MOCK ICON CREATED (hidden by default) INSIDE mock YouTube container!');
        
        // Update visibility based on current state
        this.updateMockPaginatorToggleIcon();
    }

    /**
     * 🎭 MOCK: Toggle mock paginator bar visibility
     */
    toggleMockPaginatorBar() {
        const mockBar = document.querySelector('.mock-pagination-bar');
        if (mockBar && mockBar.style.display !== 'none') {
            mockBar.style.display = 'none';
        } else if (mockBar) {
            mockBar.style.display = '';
        }
        this.updateMockPaginatorToggleIcon();
    }

    /**
     * 🎭 MOCK: Open mock YouTube popup
     */
    openMockYoutubePopup(videoId) {
        console.log('🎭 [MOCK] Opening mock YouTube popup for video:', videoId);
        
        // Create mock popup content
        const popupContent = `
            <div class="mock-youtube-popup">
                <div class="mock-popup-header">
                    <h3>🎭 Mock YouTube Video</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="mock-popup-content">
                    <div class="mock-video-player">
                        <div class="mock-video-placeholder" style="background: #ff6b35; color: white; padding: 40px; text-align: center; border-radius: 8px;">
                            <h4>🎭 Mock Video Player</h4>
                            <p>Video ID: ${videoId}</p>
                            <p>This is a mock video player for development purposes.</p>
                        </div>
                    </div>
                    <div class="mock-video-info">
                        <h4>Mock Video Title - ${videoId}</h4>
                        <p>Mock Channel Name</p>
                        <p>1.2M views • 2 weeks ago</p>
                        <p>This is a mock video description for development purposes.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Create and show popup
        const popup = document.createElement('div');
        popup.className = 'mock-popup-overlay';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        popup.innerHTML = popupContent;
        
        document.body.appendChild(popup);
        
        // Close on overlay click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    }

    /**
     * 🎭 MOCK: Cleanup mock results
     */
    cleanupMockResults() {
        console.log('🎭 [MOCK] Cleaning up mock results');
        
        // Remove mock pagination bars
        document.querySelectorAll('.mock-pagination-bar').forEach(el => el.remove());
        
        // Remove mock toggle icons
        document.querySelectorAll('.show-mock-paginator-bar').forEach(el => el.remove());
        
        // Reset mock pagination state
        this.initMockPaginationState();
    }

    /**
     * 🎭 MOCK: Get mock pagination state
     */
    getMockPaginationState() {
        return this.mockPaginationState;
    }

    /**
     * 🎭 MOCK: Set mock pagination state
     */
    setMockPaginationState(state) {
        this.mockPaginationState = { ...this.mockPaginationState, ...state };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockYouTubeSearchManager;
} 