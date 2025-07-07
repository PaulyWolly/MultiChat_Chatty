/*
  MEDIALIBRARYMANAGER.JS
  Version: 5
  AppName: MultiChat_Chatty [v5]
  Updated: 7/5/2025 @8:45PM
  Created by Paul Welby
*/

// Import the shared VideoPlayer
import VideoPlayer from '../VideoPlayer/VideoPlayer.js';

class MediaLibraryManager {
    constructor() {
        this.mediaLibrary = [];
        this.embyPosters = [];
        this.moviePosters = {};
        this.tvPosters = {};
        this.currentTab = 'movies';
        this.isLoading = false;
        this.videoPlayer = null;
        this.currentVideo = null;
        this.nextVideo = null;
        this.isModalOpen = false;
        this.currentCollectionView = null;
        
        // Search and sort properties
        this.searchTerm = '';
        this.sortBy = 'asc';
        this.selectedGenre = 'All Genres';
        
        // Voice command patterns for media library
        this.voiceCommands = [
            'open media library',
            'show media library',
            'media library',
            'open movies',
            'show movies',
            'movie library',
            'open tv shows',
            'show tv shows',
            'tv show library',
            'browse movies',
            'browse tv shows',
            'view media',
            'media browser',
            'open media browser',
            'show media browser',
            'movie listings',
            'tv show listings',
            'media listings',
            'view movie listings',
            'view tv show listings',
            'view media listings'
        ];
        
        this.init();
        this.cacheBusters = {}; // Add cacheBusters map for poster cache-busting
    }

    async init() {
        this.isLoading = false;
        
        // Wait for the global VideoPlayer to be available
        if (window.videoPlayer) {
            this.videoPlayer = window.videoPlayer;
        } else {
            // Wait for it to be created
            const checkVideoPlayer = () => {
                if (window.videoPlayer) {
                    this.videoPlayer = window.videoPlayer;
                    this.continueInit();
                } else {
                    setTimeout(checkVideoPlayer, 100);
                }
            };
            checkVideoPlayer();
            return;
        }
        
        this.continueInit();
    }

    async continueInit() {
        await this.loadMediaLibrary();
        await this.loadEmbyPosters();
        await this.loadMoviePosters();
        await this.loadTVPosters();
        await this.loadSeasonEpisodeImages();
        this.setupEventListeners();
        this.setupVoiceCommandIntegration();
        this.setupTextCommandIntegration();
        console.log('🎬 [MEDIA-LIBRARY] Media library manager initialized with voice/text command support');
    }

    async loadMediaLibrary() {
        this.isLoading = true;
        this.renderSpinner();
        try {
            let endpoint = '/api/media-library';
            if (this.currentTab === 'movies') {
                endpoint = '/api/media-library-movies';
            } else if (this.currentTab === 'tvshows') {
                endpoint = '/api/media-library-tv-shows';
            }
            console.log('🎬 [MEDIA-LIBRARY] Loading media library from:', endpoint);
            const response = await fetch(endpoint);
            const result = await response.json();
            
            // --- FLEXIBLE FORMAT HANDLING ---
            // Try to extract the main library array from various possible formats
            let raw = null;
            if (Array.isArray(result)) {
                // Legacy: array at top level
                raw = { folders: result };
            } else if (result && Array.isArray(result.folders)) {
                // Legacy: folders at top level
                raw = result;
            } else if (result && result.library && Array.isArray(result.library.folders)) {
                // New: wrapped in { success, library: { folders: [...] } }
                raw = result.library;
            } else if (result && result.tvShows && Array.isArray(result.tvShows)) {
                // Optional: tvShows array at top level
                raw = { folders: result.tvShows };
            } else {
                throw new Error('Unrecognized media library format');
            }

            this.mediaLibraryRaw = raw;
            this.mediaLibrary = this.flattenMediaLibrary(this.mediaLibraryRaw);
            console.log('🎬 [MEDIA-LIBRARY] Loaded', this.mediaLibrary.length, 'media items');
        } catch (error) {
            console.error('🎬 [MEDIA-LIBRARY] Failed to load media library:', error);
            this.mediaLibrary = [];
            this.showError('Failed to load media library.');
        } finally {
            this.isLoading = false;
            this.removeSpinner();
        }
    }

    async loadEmbyPosters() {
        this.isLoading = true;
        this.renderSpinner();
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading Emby posters...');
            const response = await fetch('/emby-posters.json');
            this.embyPosters = await response.json();
            console.log('🎬 [MEDIA-LIBRARY] Loaded', this.embyPosters.length, 'poster entries');
        } catch (error) {
            console.error('🎬 [MEDIA-LIBRARY] Failed to load Emby posters:', error);
            this.embyPosters = [];
            this.showError('Failed to load poster images.');
        } finally {
            this.isLoading = false;
            this.removeSpinner();
        }
    }

    async loadMoviePosters() {
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading movie posters...');
            const response = await fetch('/components/MediaLibrary/data/movie_posters.json');
            if (response.ok) {
                this.moviePosters = await response.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded ${Object.keys(this.moviePosters).length} movie posters`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load movie posters');
                this.moviePosters = {};
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading movie posters:', error);
            this.moviePosters = {};
        }
    }

    async loadTVPosters() {
        try {
            console.log('📺 [MEDIA-LIBRARY] Loading TV show posters...');
            const response = await fetch('/components/MediaLibrary/data/tv_posters.json');
            if (response.ok) {
                this.tvPosters = await response.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded ${Object.keys(this.tvPosters).length} TV show posters`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load TV show posters');
                this.tvPosters = {};
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading TV show posters:', error);
            this.tvPosters = {};
        }
    }

    async loadSeasonEpisodeImages() {
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading season and episode images...');
            
            // Load season images
            const seasonResponse = await fetch('/components/MediaLibrary/data/tmdb_tv-show_season_images.json');
            let seasonData = {};
            if (seasonResponse.ok) {
                seasonData = await seasonResponse.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded season images for ${Object.keys(seasonData).length} shows`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load season images');
            }
            
            // Load episode images
            const episodeResponse = await fetch('/components/MediaLibrary/data/tmdb_tv-show_episode_images.json');
            let episodeData = {};
            if (episodeResponse.ok) {
                episodeData = await episodeResponse.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded episode images for ${Object.keys(episodeData).length} shows`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load episode images');
            }
            
            // Merge the data into a single structure for compatibility
            this.seasonEpisodeImages = {};
            for (const showName in seasonData) {
                this.seasonEpisodeImages[showName] = { seasons: {} };
                if (seasonData[showName].seasons) {
                    for (const seasonNum in seasonData[showName].seasons) {
                        this.seasonEpisodeImages[showName].seasons[seasonNum] = {
                            poster: seasonData[showName].seasons[seasonNum].poster || null,
                            episodes: {}
                        };
                        
                        // Add episode data if available
                        if (episodeData[showName] && 
                            episodeData[showName].seasons && 
                            episodeData[showName].seasons[seasonNum] &&
                            episodeData[showName].seasons[seasonNum].episodes) {
                            this.seasonEpisodeImages[showName].seasons[seasonNum].episodes = episodeData[showName].seasons[seasonNum].episodes;
                        }
                    }
                }
            }
            
            console.log(`✅ [MEDIA-LIBRARY] Merged season/episode images for ${Object.keys(this.seasonEpisodeImages).length} shows`);
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading season episode images:', error);
            this.seasonEpisodeImages = {};
        }
    }

    renderSpinner() {
        let modal = document.getElementById('mediaLibraryModal');
        if (!modal) return;
        if (!document.getElementById('mediaLibrarySpinner')) {
            const spinnerOverlay = document.createElement('div');
            spinnerOverlay.className = 'media-library-spinner-overlay';
            spinnerOverlay.id = 'mediaLibrarySpinner';
            spinnerOverlay.innerHTML = `<div class="media-library-spinner"></div>`;
            modal.appendChild(spinnerOverlay);
        }
    }

    removeSpinner() {
        const spinner = document.getElementById('mediaLibrarySpinner');
        if (spinner) spinner.remove();
    }

    showError(msg) {
        let modal = document.getElementById('mediaLibraryModal');
        if (!modal) return;
        let errDiv = document.getElementById('mediaLibraryError');
        if (!errDiv) {
            errDiv = document.createElement('div');
            errDiv.id = 'mediaLibraryError';
            errDiv.style.cssText = 'color: red; text-align: center; margin: 20px; font-weight: bold;';
            modal.appendChild(errDiv);
        }
        errDiv.textContent = msg;
    }

    setupEventListeners() {
        // Add event listeners for media library button
        const mediaLibraryBtn = document.getElementById('mediaLibraryBtn');
        if (mediaLibraryBtn) {
            mediaLibraryBtn.addEventListener('click', () => this.openMediaBrowser()); // ensure arrow function
        }
    }

    openMediaBrowser() {
        this.isModalOpen = true;
        this.renderModal();
    }

    closeMediaBrowser() {
        this.isModalOpen = false;
        this.removeModal();
        // Stop video playback if open
        if (this.videoPlayer && typeof this.videoPlayer.pause === 'function') {
            this.videoPlayer.pause();
            if (typeof this.videoPlayer.currentTime === 'function') {
                this.videoPlayer.currentTime(0); // Optionally reset to start
            } else if (typeof this.videoPlayer.currentTime === 'number') {
                this.videoPlayer.currentTime = 0;
            }
        }
    }

    // Dedicated function to render the tab bar/header
    renderTabBar() {
        const tabs = [
            { id: 'movies', label: 'Movies' },
            { id: 'tvshows', label: 'TV Shows' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'collections', label: 'Collections' },
            { id: 'suggestions', label: 'Suggestions' },
            { id: 'watchlater', label: 'Watch Later' }
        ];
        return `
          <div class="media-library-modal-tabs">
            ${tabs.map(tab =>
                `<button class="media-library-tab-btn${this.currentTab === tab.id ? ' active' : ''}"
                  onclick="mediaLibraryManager.switchTab('${tab.id}')">${tab.label}</button>`
            ).join('')}
          </div>
        `;
    }

    renderModal() {
        // Remove existing modal if any
        this.removeModal();

        // --- Ensure correct tab is highlighted based on navigation state ---
        // Only override currentTab if navigating within TV shows or collections
        if (this.currentTab === 'tvshows' && this.currentTVShow) {
            this.currentTab = 'tvshows';
        } else if (this.currentTab === 'collections' && this.currentCollectionView) {
            this.currentTab = 'collections';
        }
        
        console.log('[DEBUG - RenderModal] currentTab:', this.currentTab);
        console.log('[DEBUG - RenderModal] currentTVShow:', this.currentTVShow);
        console.log('[DEBUG - RenderModal] currentTVSeason:', this.currentTVSeason);

        // Create only the modal, no overlay
        const modal = document.createElement('div');
        modal.id = 'mediaLibraryModal';
        modal.className = 'media-library-modal';
        modal.innerHTML = `
            <div class="media-library-modal-header">
            <div class="media-library-header-overlay"></div>
            <h2 class="media-library-header-title media-library-header-title-glow">Media Library</h2>
            <button class="media-library-close-btn" id="mediaLibraryCloseBtn">&times;</button>
            </div>
            <div class="media-library-modal-content">
              ${this.renderTabBar()}
              <div class="media-library-top-bar">
                <span class="media-library-count" id="mediaLibraryCount"></span>
                <div class="media-library-search-container">
                  <input type="text" id="mediaLibrarySearch" class="media-library-search" placeholder="Search movies..." oninput="mediaLibraryManager.handleSearchInput(event)">
                  <button id="mediaLibraryClearSearch" class="media-library-clear-search">&times;</button>
                </div>
                <select id="mediaLibraryGenre" class="media-library-genre" onchange="mediaLibraryManager.handleGenreChange(event)"></select>
                <select id="mediaLibrarySort" class="media-library-sort" onchange="mediaLibraryManager.handleSortChange(event)">
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>
                <button class="media-library-shuffle-btn" onclick="mediaLibraryManager.shuffleMovies()">Shuffle</button>
              </div>
              <div class="media-library-content-wrapper">
                <div class="media-library-flex-row">
                  <div class="media-library-az-sidebar" id="mediaLibraryAZSidebar"></div>
                  <div id="mediaGrid" class="media-library-movie-grid media-library-movie-grid-scroll">
                    ${this.renderTabContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        // Add tab-specific class to modal content for CSS targeting
        const modalContent = modal.querySelector('.media-library-modal-content');
        if (modalContent) {
            // Remove all possible tab classes first
            modalContent.classList.remove('movies', 'tvshows', 'favorites', 'collections', 'suggestions', 'watchlater');
            modalContent.classList.add(this.currentTab);
        }
        document.body.appendChild(modal);
        document.getElementById('mediaLibraryCloseBtn').onclick = () => this.closeMediaBrowser();
        if (this.isLoading) this.renderSpinner();
        this.renderAZSidebar();
        this.updateCount();
        this.restoreSearchSortUI();
        if (this.currentTab === 'watchlater') {
            const grid = document.getElementById('mediaGrid');
            if (grid) grid.innerHTML = this.renderWatchLaterContent();
        }
        // Defer collections rendering until grid exists
        if (this.currentTab === 'collections') {
            setTimeout(() => this.renderCollectionsTab(), 0);
        }
        // --- Add clear search button logic ---
        const searchInput = document.getElementById('mediaLibrarySearch');
        const clearBtn = document.getElementById('mediaLibraryClearSearch');
        const updateClearBtn = () => {
            if (searchInput.value) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
        };
        searchInput.addEventListener('input', updateClearBtn);
        updateClearBtn();
        clearBtn.onclick = (e) => {
            e.preventDefault();
            searchInput.value = '';
            this.handleSearchInput({ target: searchInput });
            updateClearBtn();
            searchInput.focus();
        };
        // --- Add genre dropdown logic ---
        const genreDropdown = document.getElementById('mediaLibraryGenre');
        genreDropdown.innerHTML = '';
        this.getCommonGenres().forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            genreDropdown.appendChild(opt);
        });
        genreDropdown.value = this.selectedGenre || 'All Genres';
        genreDropdown.onchange = (e) => this.handleGenreChange(e);

        // --- Attach click handlers to movie cards if present ---
        setTimeout(() => {
            const cards = document.querySelectorAll('.media-library-movie-card');
            cards.forEach(card => {
                // Remove any previous click handler
                card.onclick = null;
                card.addEventListener('click', (e) => { // ensure arrow function
                    // Ignore clicks on action buttons
                    if (
                        e.target.closest('.favorite-btn') ||
                        e.target.closest('.collection-btn') ||
                        e.target.closest('.poster-selector-btn') ||
                        e.target.closest('.refresh-poster-btn')
                    ) return;
                    const title = card.querySelector('.media-info h3')?.textContent;
                    const items = this.getFilteredAndSortedItems();
                    const item = items.find(i => this.cleanMovieTitle(i.title) === title);
                    if (item) this.showMovieDetailsModal(item);
                });
            });
        }, 0);

        // --- Attach click handlers to movie cards if present ---
        setTimeout(() => {
            const cards = document.querySelectorAll('.media-library-movie-card');
            cards.forEach(card => {
                // Main card click opens details, but ignore action buttons
                card.onclick = (e) => { // ensure arrow function
                    if (
                        e.target.closest('.favorite-btn') ||
                        e.target.closest('.collection-btn') ||
                        e.target.closest('.poster-selector-btn')
                    ) return;
                    const title = card.querySelector('.media-info h3')?.textContent;
                    const items = this.getFilteredAndSortedItems();
                    const item = items.find(i => this.cleanMovieTitle(i.title) === title);
                    if (item) this.showMovieDetailsModal(item);
                };
                // Favorite button
                const favBtn = card.querySelector('.favorite-btn');
                if (favBtn) {
                    favBtn.onclick = (e) => { // ensure arrow function
                        e.stopPropagation();
                        const title = card.querySelector('.media-info h3')?.textContent;
                        const items = this.getFilteredAndSortedItems();
                        const item = items.find(i => this.cleanMovieTitle(i.title) === title);
                        if (item) this.toggleFavorite(item.path);
                    };
                }
                // Collection button
                const colBtn = card.querySelector('.collection-btn');
                if (colBtn) {
                    colBtn.onclick = (e) => { // ensure arrow function
                        e.stopPropagation();
                        const title = card.querySelector('.media-info h3')?.textContent;
                        const items = this.getFilteredAndSortedItems();
                        const item = items.find(i => this.cleanMovieTitle(i.title) === title);
                        if (item) this.showAddToCollectionModal(item);
                    };
                }
            });
        }, 0);

        // --- Attach click handlers to poster-selector-btn after rendering ---
        setTimeout(() => {
            document.querySelectorAll('.poster-selector-btn').forEach(btn => {
                btn.onclick = (e) => { // ensure arrow function
                    e.preventDefault();
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card');
                    let itemPath = card ? card.getAttribute('data-path') : '';
                    let item = null;
                    let errorDetails = '';
                    if (this.currentTab === 'tvshows') {
                        const tvShows = this.getTVShows();
                        item = tvShows.find(show =>
                            (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = tvShows.find(show => (show.name || show.title || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    } else {
                        const items = this.getFilteredAndSortedItems();
                        item = items.find(i =>
                            (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = items.find(i => (i.title || i.name || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    }
                    if (window.PosterSelector) {
                        const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                        const selector = new window.PosterSelector(mode);
                        selector.getMediaContext = () => {
                            if (item) {
                                return {
                                    mediaId: item.path,
                                    name: item.name || item.title,
                                    path: item.path,
                                    type: mode
                                };
                            } else {
                                // Minimal fallback context
                                return {
                                    mediaId: itemPath || '[unknown]',
                                    name: card?.querySelector('h3')?.textContent || '[unknown]',
                                    path: itemPath || '[unknown]',
                                    type: mode
                                };
                            }
                        };
                        selector.onPosterSelected = ({filePath, posterType, poster}) => {
                            if (mode === 'movie' && this.moviePosters && item) {
                                this.moviePosters[item.path] = filePath;
                                this.cacheBusters[item.path] = Date.now();
                                this.renderMediaGrid();
                                this.showToast('Poster updated!');
                            } else if (mode === 'tv' && this.tvPosters && item) {
                                this.tvPosters[item.name || item.title] = filePath;
                                this.renderMediaGrid();
                                this.showToast('Poster updated!');
                            }
                        };
                        selector.init();
                        if (!item) {
                            // Show a warning toast if fallback was used
                            this.showToast('Warning: Movie/Show not found by path. Fallback context used.');
                        }
                    } else {
                        // Show detailed error info in the alert/toast
                        let details = `PosterSelector is not available or item not found.\n`;
                        details += `itemPath: ${itemPath}\n`;
                        details += `card: ${card ? card.outerHTML : '[none]'}\n`;
                        details += `errorDetails: ${errorDetails}`;
                        this.showToast(details);
                    }
                    return false;
                };
            });
        }, 0);

        // After rendering the modal, attach click handlers to TV show posters
        setTimeout(() => {
            document.querySelectorAll('.tvshow-poster-img').forEach(img => {
                img.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = img.closest('.media-library-movie-card');
                    if (card) window.mediaLibraryManager.openTVShowFromData(card);
                };
            });
        }, 0);
    }

    removeModal() {
        const existingModal = document.getElementById('mediaLibraryModal');
        if (existingModal) {
            existingModal.remove();
        }
    }

    switchTab(tab) {
        console.log('[TAB DEBUG] Switching to tab:', tab);

        if (this.currentTab === 'collections') {
            setTimeout(() => this.renderCollectionsTab(), 0);
        }

        this.currentTab = tab;
        this.currentTVShow = null;
        this.currentTVSeason = null;
        // Reload the correct media library data for the selected tab
        this.loadMediaLibrary().then(() => {
            this.renderModal();
            // Force a re-render of the grid if Movies tab is opened
            if (this.currentTab === 'movies') {
                setTimeout(() => this.renderMediaGrid(), 0);
            }
        });
    }

    updateModalContent() {
        const modalContent = document.querySelector('.media-library-modal-content');
        if (!modalContent) return;

        // Always render the full modal layout (header, search, filters, etc.)
        // Only update the grid area depending on the tab
        // Find the grid wrapper and grid
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;

        // Handle TV Shows navigation (show, season, episode views)
        if (this.currentTab === 'tvshows') {
            if (this.currentTVShow && this.currentTVSeason) {
                grid.innerHTML = this.renderEpisodesView();
            } else if (this.currentTVShow) {
                grid.innerHTML = this.renderSeasonsView(this.currentTVShow);
            } else {
                grid.innerHTML = this.renderTVShowsTab();
            }
        } else {
            // For all other tabs, use the existing renderMediaGrid logic
            this.renderMediaGrid();
        }
    }

    renderMediaGrid() {
        console.log('>> 1. >>>>[MOVIE-LIBRARY] renderMediaGrid called');

        if (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason) {
            const grid = document.getElementById('mediaGrid');
            if (grid) grid.innerHTML = this.renderTVShowsTab();
            return;
        }

        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        const items = this.getFilteredAndSortedItems();
        grid.innerHTML = '';
        
        // Track which letters we've already added anchors for
        const addedAnchors = new Set();
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-library-movie-card';
            card.style.position = 'relative';
            
            // Get the first letter of the movie title for anchor
            const cleanTitle = this.cleanMovieTitle(item.title || a.name || a.filename || a.path || '').toLowerCase();
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            
            // Add anchor if this is the first movie starting with this letter
            let anchorHTML = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorHTML = `<a name="${firstLetter}" id="anchor-${firstLetter}"></a>`;
                addedAnchors.add(firstLetter);
            }
            
            // For movies, use the HTML string method
            card.innerHTML = `
                ${anchorHTML}
                <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                    <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                </div>
                <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                <div class="media-info"></div>
                    <h3>${cleanTitle}</h3>
                </div>
            `;

            // Ensure favorite and collection buttons do not trigger card click
            card.querySelector('.favorite-btn').onclick = (e) => {
                e.stopPropagation();
                this.toggleFavorite(item.path);
            };
            card.querySelector('.collection-btn').onclick = (e) => {
                e.stopPropagation();
                this.showAddToCollectionModal(item);
            };
            // Main card click opens details
            console.log('>>> 2. >>>[MOVIE-LIBRARY] Attaching click handler to:', item.title);
            card.addEventListener('click', (e) => {
                console.log('>>> 3. >>>[MOVIE-LIBRARY] Movie card clicked:', item);
                this.showMovieDetailsModal(item);
            });
            card.setAttribute('data-path', item.path);
            grid.appendChild(card);
        });
        // After rendering the grid, attach poster selector handlers
        this.attachPosterSelectorHandlers();
    }

    getItemsForCurrentTab() {
        if (this.currentTab === 'favorites') {
            return this.getFavoritesList();
        }
        // Filter items based on current tab
        if (this.currentTab === 'movies') {
            // Only show items that are in the movies directory
            return this.mediaLibrary.filter(item => 
                item.path && (
                    item.path.includes('\\movies\\') || 
                    item.path.includes('/movies/') ||
                    item.path.includes('\\MOVIES\\') ||
                    item.path.includes('/MOVIES/')
                )
            );
        } else if (this.currentTab === 'tvshows') {
            // Only show items that are in the TV-SHOWS directory
            return this.mediaLibrary.filter(item => 
                item.path && (
                    item.path.includes('\\TV-SHOWS\\') || 
                    item.path.includes('/TV-SHOWS/') ||
                    item.path.includes('\\tv-shows\\') ||
                    item.path.includes('/tv-shows/')
                )
            );
        }
        return [];
    }

    getPosterPath(mediaItem) {
        // Try TMDb poster mapping by show name for TV shows
        if (this.currentTab === 'tvshows' && mediaItem.name && this.tvPosters) {
            // Try exact match
            if (this.tvPosters[mediaItem.name]) {
                return this.tvPosters[mediaItem.name];
            }
            // Try case-insensitive match
            const lowerName = mediaItem.name.toLowerCase();
                    for (const [key, value] of Object.entries(this.tvPosters)) {
                if (key.toLowerCase() === lowerName) {
                            return value;
                        }
                    }
                }
        // Fallback to old logic for movies or if not found
        if (mediaItem.path) {
            const pathVariants = [
                mediaItem.path,
                mediaItem.path.replace(/\\/g, '/'),
                mediaItem.path.replace(/\//g, '\\')
            ];
            if (this.moviePosters) {
                for (const variant of pathVariants) {
                    if (this.moviePosters[variant]) {
                        let url = this.moviePosters[variant];
                        // Add cache-busting if available
                        if (this.cacheBusters[variant]) {
                            url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[variant];
                        }
                        return url;
                    }
                    const lowerVariant = variant.toLowerCase();
                    for (const [key, value] of Object.entries(this.moviePosters)) {
                        if (key.toLowerCase() === lowerVariant) {
                            let url = value;
                            if (this.cacheBusters[key]) {
                                url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                            }
                            return url;
                        }
                    }
                }
            }
        }
        return '/assets/img/placeholder-poster.jpg';
    }

    playMedia(mediaItem, startTime = 0) {
        console.log('[MEDIA-LIBRARY] playMedia called:', {mediaItem, startTime});
        this.closeMediaBrowser();
        if (!this.videoPlayer) {
            console.error('🎬 [MEDIA-LIBRARY] VideoPlayer not available');
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '❌ Video player not available. Please try again.');
            }
            return;
        }
        // Check if path is already URL encoded to avoid double encoding
        let pathParam = mediaItem.path;
        if (!pathParam.includes('%')) {
            // Only encode if not already encoded
            pathParam = encodeURIComponent(pathParam);
        }
        const videoUrl = `/api/video?path=${pathParam}`;
        this.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime, mediaItem);
        this.currentVideo = mediaItem;
        this.findNextVideo(mediaItem);
        // Attach resume event listeners
        this.attachResumeEvents(mediaItem);
    }

    createVideoPlayer() {
        const playerContainer = document.createElement('div');
        playerContainer.id = 'videoPlayerContainer';
        playerContainer.className = 'video-player-container';
        playerContainer.innerHTML = `
            <video id="videoPlayer" class="video-js vjs-default-skin" controls>
                <p class="vjs-no-js">To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5 video.</p>
            </video>
            <div id="upNextOverlay" class="up-next-overlay" style="display: none;">
                <div class="up-next-content">
                    <h3>Up Next</h3>
                    <div id="nextVideoInfo"></div>
                    <div class="up-next-buttons">
                        <button id="playNextBtn" class="btn btn-primary">Play Now</button>
                        <button id="cancelNextBtn" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            </div>
            <button id="skipIntroBtn" class="skip-intro-btn" style="display: none;">Skip Intro</button>
        `;

        document.body.appendChild(playerContainer);
        
        // Initialize Video.js
        const player = videojs('videoPlayer', {
            fluid: true,
            responsive: true
        });

        // Set up event listeners
        this.setupVideoPlayerEvents(player);
        
        return player;
    }

    setupVideoPlayerEvents(player) {
        let skipIntroTimeout;
        let upNextTimeout;

        player.on('loadedmetadata', () => {
            // Show skip intro button after 5 seconds
            setTimeout(() => {
                const skipBtn = document.getElementById('skipIntroBtn');
                if (skipBtn) {
                    skipBtn.style.display = 'block';
                    skipBtn.onclick = () => {
                        player.currentTime(90); // Skip to 90 seconds
                        skipBtn.style.display = 'none';
                    };
                }
            }, 5000);
        });

        player.on('timeupdate', () => {
            const currentTime = player.currentTime();
            const duration = player.duration();
            
            // Show "Up Next" overlay 30 seconds before end
            if (duration && currentTime > duration - 30) {
                this.showUpNextOverlay();
            }
        });

        player.on('ended', () => {
            // Auto-play next episode after 5 seconds
            if (this.nextVideo) {
                upNextTimeout = setTimeout(() => {
                    this.playNextVideo();
                }, 5000);
            }
        });
    }

    findNextVideo(currentVideo) {
        if (currentVideo.type === 'tvshow' && currentVideo.season && currentVideo.episode) {
            // Find next episode in the same season
            this.nextVideo = this.mediaLibrary.find(item => 
                item.type === 'tvshow' &&
                item.title === currentVideo.title &&
                item.season === currentVideo.season &&
                item.episode === currentVideo.episode + 1
            );

            // If no next episode in same season, try next season
            if (!this.nextVideo) {
                this.nextVideo = this.mediaLibrary.find(item => 
                    item.type === 'tvshow' &&
                    item.title === currentVideo.title &&
                    item.season === currentVideo.season + 1 &&
                    item.episode === 1
                );
            }
        }
    }

    showUpNextOverlay() {
        if (!this.nextVideo) return;

        const overlay = document.getElementById('upNextOverlay');
        const nextInfo = document.getElementById('nextVideoInfo');
        
        if (overlay && nextInfo) {
            nextInfo.innerHTML = `
                <h4>${this.nextVideo.title}</h4>
                <p>Season ${this.nextVideo.season}, Episode ${this.nextVideo.episode}</p>
            `;
            overlay.style.display = 'flex';
            
            // Set up button events
            document.getElementById('playNextBtn').onclick = () => this.playNextVideo();
            document.getElementById('cancelNextBtn').onclick = () => overlay.style.display = 'none';
        }
    }

    playNextVideo() {
        if (this.nextVideo) {
            this.playMedia(this.nextVideo);
        }
    }

    setupVoiceCommandIntegration() {
        // Listen for voice commands from the main app
        document.addEventListener('voiceCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [MEDIA-LIBRARY] Voice command detected:', command);
                this.openMediaBrowser();
                
                // Add a message to the chat about the voice command
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
                }
            }
        });

        // Also listen for speech recognition results directly
        if (window.speechRecognition) {
            const originalOnResult = window.speechRecognition.onresult;
            window.speechRecognition.onresult = (event) => {
                if (originalOnResult) {
                    originalOnResult.call(window.speechRecognition, event);
                }
                
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (this.voiceCommands.some(pattern => transcript.includes(pattern))) {
                    console.log('🎬 [MEDIA-LIBRARY] Direct speech recognition detected:', transcript);
                    this.openMediaBrowser();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
                    }
                }
            };
        }
    }

    setupTextCommandIntegration() {
        // Listen for text input commands
        document.addEventListener('textCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [MEDIA-LIBRARY] Text command detected:', command);
                this.openMediaBrowser();
                
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
                }
            }
        });

        // Hook into the main sendMessage function if available
        if (window.sendMessage) {
            const originalSendMessage = window.sendMessage;
            window.sendMessage = (message, isGreeting = false) => {
                const lowerMessage = message.toLowerCase();
                if (this.voiceCommands.some(pattern => lowerMessage.includes(pattern))) {
                    console.log('🎬 [MEDIA-LIBRARY] Text input command detected:', message);
                    this.openMediaBrowser();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
                    }
                    return; // Don't send the command to the AI
                }
                
                // Call the original function
                return originalSendMessage(message, isGreeting);
            };
        }
    }

    // Method to check if a command should trigger the media library
    shouldTriggerMediaLibrary(command) {
        const lowerCommand = command.toLowerCase();
        return this.voiceCommands.some(pattern => lowerCommand.includes(pattern));
    }

    // Method to handle media library commands
    handleMediaLibraryCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        if (this.shouldTriggerMediaLibrary(lowerCommand)) {
            console.log('🎬 [MEDIA-LIBRARY] Command handled:', command);
            this.openMediaBrowser();
            
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
            }
            return true; // Command was handled
        }
        
        return false; // Command was not handled
    }

    // Public method to register with the main app's command system
    registerWithCommandSystem() {
        if (window.registerCommandHandler) {
            window.registerCommandHandler('mediaLibrary', (command) => {
                return this.handleMediaLibraryCommand(command);
            });
            console.log('🎬 [MEDIA-LIBRARY] Registered with command system');
        }
    }

    // Recursively flatten the media library tree into a flat array of video items
    flattenMediaLibrary(node, parentTitle = '', parentPath = '') {
        let items = [];
        if (!node) return items;
        // Add files in this node
        if (Array.isArray(node.files)) {
            for (const file of node.files) {
                items.push({
                    ...file,
                    title: file.name || parentTitle,
                    path: file.absPath || file.relPath || '',
                    parent: parentTitle,
                    folder: parentPath
                });
            }
        }
        // Recurse into folders
        if (Array.isArray(node.folders)) {
            for (const folder of node.folders) {
                const folderTitle = folder.path || parentTitle;
                items = items.concat(this.flattenMediaLibrary(folder, folderTitle, folder.path));
            }
        }
        return items;
    }

    // Utility to clean up movie titles for display
    cleanMovieTitle(filename) {
        if (!filename || typeof filename !== 'string') return '';
        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");
        // Remove bracketed/parenthetical tags
        name = name.replace(/\[[^\]]*\]|\([^\)]*\)/g, "");
        // Remove years
        name = name.replace(/\b(19|20)\d{2}\b/g, "");
        // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
        // Remove common tags (only as whole words or after separators)
        name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
        // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)\b.*$/i, "");
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = name.replace(/\b\w/g, c => c.toUpperCase());
        return name;
    }

    // Add/Update: Top bar count
    updateCount() {
        const countSpan = document.getElementById('mediaLibraryCount');
        if (!countSpan) return;
        // Hide count on Watch Later tab
        if (this.currentTab === 'watchlater') {
            countSpan.textContent = '';
            countSpan.style.display = 'none';
            return;
        }
        const items = this.getFilteredAndSortedItems();
        countSpan.textContent = `${items.length} Items`;
        countSpan.style.display = '';
    }

    // Add/Update: Search and sort UI state
    restoreSearchSortUI() {
        const searchInput = document.getElementById('mediaLibrarySearch');
        if (searchInput) searchInput.value = this.searchQuery || '';
        const sortSelect = document.getElementById('mediaLibrarySort');
        if (sortSelect) sortSelect.value = this.sortOrder || 'asc';
    }

    // Add: Search and sort state
    searchQuery = '';
    sortOrder = 'asc';

    handleSearchInput(event) {
        this.searchQuery = event.target.value;
        this.renderMediaGrid();
        this.updateCount();
    }

    handleSortChange(event) {
        this.sortOrder = event.target.value;
        this.renderMediaGrid();
        this.updateCount();
    }

    shuffleMovies() {
        this.shuffle = true;
        this.renderMediaGrid();
        this.updateCount();
        this.shuffle = false;
    }

    // Add: A-Z sidebar rendering
    renderAZSidebar() {
        const azSidebar = document.getElementById('mediaLibraryAZSidebar');
        if (!azSidebar) return;
        azSidebar.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(letter => {
            const btn = document.createElement('div');
            btn.className = 'media-library-az-letter';
            btn.textContent = letter;
            btn.setAttribute('data-letter', letter);
            azSidebar.appendChild(btn);
        });
        
        // Use event delegation - single listener on the sidebar
        azSidebar.onclick = (e) => { // ensure arrow function
            const letterElement = e.target.closest('.media-library-az-letter');
            if (letterElement) {
                const letter = letterElement.getAttribute('data-letter');
                if (letter) {
                    this.scrollToLetter(letter);
                }
            }
        };
    }

    scrollToLetter(letter) {
        console.log('🔤 [A-Z] scrollToLetter called with letter:', letter);
        
        // Find the anchor for this letter
        const anchor = document.getElementById(`anchor-${letter}`);
        
        if (anchor) {
            console.log('🔤 [A-Z] Found anchor for letter:', letter);
            
            // Scroll to the anchor smoothly
            anchor.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
            
            // Highlight the card containing the anchor
            const card = anchor.closest('.media-library-movie-card');
            if (card) {
                card.style.transition = 'background 0.3s';
                const originalBg = card.style.background;
                card.style.background = '#fff9c4'; // light yellow
                setTimeout(() => {
                    card.style.background = originalBg || '';
                }, 600);
            }
            
            console.log('🔤 [A-Z] Navigation to anchor completed');
        } else {
            console.warn('🔤 [A-Z] No anchor found for letter:', letter);
        }
    }

    // Update: renderMediaGrid to use search, sort, shuffle
    getFilteredAndSortedItems() {
        let items = this.getItemsForCurrentTab();
        // Search filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            items = items.filter(item => (item.title || '').toLowerCase().includes(q));
        }
        // Genre filter
        if (this.selectedGenre && this.selectedGenre !== 'All Genres') {
            const genre = this.selectedGenre.toLowerCase();
            items = items.filter(item => this.getMovieGenres(item).includes(genre));
        }
        // Sort
        items = items.slice().sort((a, b) => {
            const titleA = this.cleanMovieTitle(a.title || a.name || a.filename || a.path || '').toLowerCase();
            const titleB = this.cleanMovieTitle(b.title || b.name || b.filename || b.path || '').toLowerCase();
            if (titleA < titleB) return this.sortOrder === 'asc' ? -1 : 1;
            if (titleA > titleB) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        // Shuffle
        if (this.shuffle) {
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
        }
        return items;
    }

    // Format time for resume info
    formatTime(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    renderGrid(items, labelFn) {
        let grid = '<div class="media-library-movie-grid">';
        items.forEach((item, index) => {
            grid += `
                <div class="media-library-movie-card" data-item-index="${index}" data-item-path="${item.path}">
                    <img src="${item.poster}" alt="${labelFn(item)}">
                    <div class="media-info"><h3>${labelFn(item)}</h3></div>
                    <div class="media-library-resume-info" style="margin-bottom:6px;">Resume at ${this.formatTime(item.currentTime)} / ${this.formatTime(item.duration)}</div>
                    <div style="display:flex;justify-content:center;gap:8px;">
                        <button class="resume-btn" style="margin-top: 0; padding: 6px 14px; border-radius: 6px; background: #007bff; color: #fff; border: none; cursor: pointer; font-size: 1em;">Watch</button>
                        <button class="delete-btn" title="Remove from Watch Later" style="margin-top: 0; padding: 6px 10px; border-radius: 6px; background: #e53935; color: #fff; border: none; cursor: pointer; font-size: 1em;">🗑️</button>
                    </div>
                </div>
            `;
        });
        grid += '</div>';
        
        // Add event listeners after the HTML is inserted into the DOM
        setTimeout(() => {
            const cards = document.querySelectorAll('.media-library-movie-grid .media-library-movie-card');
            cards.forEach(card => {
                const resumeBtn = card.querySelector('.resume-btn');
                const deleteBtn = card.querySelector('.delete-btn');
                const itemPath = card.getAttribute('data-item-path');
                
                // Find the corresponding item from the resume list
                const resumeList = this.getResumeList();
                const item = resumeList.find(resumeItem => resumeItem.path === itemPath);
                
                if (item) {
                    // Resume button click handler
                    resumeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('[WATCH-LATER] Resume clicked for:', item);
                        this.playMedia(item, item.currentTime);
                    });
                    
                    // Delete button click handler
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('[WATCH-LATER] Delete clicked for:', item);
                        this.removeResumeProgress(item.path);
                        this.renderWatchLaterContent();
                        this.showToast('Removed from Watch Later');
                    });
                    
                    // Card click handler (resume from saved position)
                    card.addEventListener('click', () => {
                        console.log('[WATCH-LATER] Card clicked for:', item);
                        this.playMedia(item, item.currentTime);
                    });
                }
            });
        }, 100);
        
        return grid;
    }

    renderWatchLaterContent() {
        const resumeList = this.getResumeList();
        console.log('[WATCH-LATER DEBUG] Full resumeList:', JSON.stringify(resumeList, null, 2));
        // Robust filter: use type if present, else path heuristic
        const movies = resumeList.filter(item => {
            if (item.type) return item.type.toLowerCase().includes('movie');
            // Heuristic: treat as movie if path or title looks like a movie
            return item.path && /movies?/i.test(item.path);
        });
        console.log('[WATCH-LATER DEBUG] Filtered movies list:', JSON.stringify(movies, null, 2));
        // Helper to clean TV show label
        function getTvShowLabel(item) {
            let path = decodeURIComponent(item.path || '');
            let match = path.match(/Media\/(.*?)\/Season ?(\d+)\/(.*?)S(\d+)E(\d+)/i);
            if (match) {
                const show = match[1].replace(/_/g, ' ');
                const season = match[2];
                const episode = match[5];
                return `${show} | Season ${season} | Episode ${episode}`;
            }
            return item.title || item.name || 'Episode';
        }

        const tvshows = resumeList.filter(item => {
            if (item.type) return item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('show');
            if (item.path) return /season\s*\d+|s\d+e\d+/i.test(item.path);
            return false;
        });

        let html = '';
        // Movies section (full width, stacked)
        html += '<div style="margin-bottom:32px;width:100%;">';
        html += '<div style="font-size:1.4em;font-weight:600;margin-bottom:4px;">Movies</div>';
        html += '<hr style="margin:0 0 18px 0;">';
        html += this.renderGrid(movies, item => this.cleanMovieTitle(item.title || item.name || 'Movie'));
        if (movies.length === 0) html += '<div style="color:#888;margin:16px 0 0 8px;">(No items)</div>';
        html += '</div>';
        // TV Shows section (full width, stacked)
        html += '<div style="margin-bottom:12px;width:100%;">';
        html += '<div style="font-size:1.4em;font-weight:600;margin-bottom:4px;">TV Shows</div>';
        html += '<hr style="margin:0 0 18px 0;">';
        html += this.renderGrid(tvshows, getTvShowLabel);
        if (tvshows.length === 0) html += '<div style="color:#888;margin:16px 0 0 8px;">(No items)</div>';
        html += '</div>';
        // Add debug log for each movie rendered
        movies.forEach((movie, idx) => {
            console.log(`[WATCH-LATER DEBUG] Rendering movie card idx=${idx}:`, movie);
        });
        
        // Update the modal content if the modal is open
        const mediaGrid = document.getElementById('mediaGrid');
        if (mediaGrid) {
            mediaGrid.innerHTML = html;

            // Attach robust PosterSelector handler for movies
            setTimeout(() => {
                const items = this.getFilteredAndSortedItems();
                document.querySelectorAll('.poster-selector-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card');
                    const itemPath = card ? card.getAttribute('data-path') : null;
                    const item = items.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').toLowerCase());
                    if (window.PosterSelector && item) {
                    const selector = new window.PosterSelector('movie');
                    selector.getMediaContext = () => ({
                        mediaId: item.path,
                        name: item.name || item.title,
                        path: item.path,
                        type: 'movie'
                    });
                    selector.onPosterSelected = ({filePath, posterType, poster}) => {
                        if (this.moviePosters) {
                        this.moviePosters[item.path] = filePath;
                        this.cacheBusters[item.path] = Date.now();
                        this.renderMediaGrid();
                        this.showToast('Poster updated!');
                        }
                    };
                    selector.init();
                    } else {
                    this.showToast('PosterSelector is not available.');
                    }
                };
                });
                // Restore click-to-details for movie cards
                document.querySelectorAll('.media-library-movie-card').forEach(card => {
                card.onclick = (e) => {
                    if (
                    e.target.closest('.favorite-btn') ||
                    e.target.closest('.collection-btn') ||
                    e.target.closest('.poster-selector-btn')
                    ) return;
                    const titleElem = card.querySelector('h3');
                    const cardTitle = titleElem ? titleElem.textContent : '';
                    const item = items.find(i => this.cleanMovieTitle(i.title || i.name || i.filename || i.path || '').toLowerCase() === cardTitle.toLowerCase());
                    if (item) this.showMovieDetailsModal(item);
                };
                });
            }, 0);
        }
        
        return html;
    }

    // --- UTILITY METHODS ---
    filterItems(items, searchTerm) {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item => 
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.title && item.title.toLowerCase().includes(term))
        );
    }

    sortItems(items, sortBy, field = 'name') {
        if (!items || items.length === 0) return items;
        
        return items.slice().sort((a, b) => {
            const aValue = (a[field] || '').toString().toLowerCase();
            const bValue = (b[field] || '').toString().toLowerCase();
            
            if (sortBy === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }

    renderTVShowsTab() {
        const tvShows = this.getTVShows();
        console.log('[TV DEBUG] renderTVShowsTab: tvShows.length =', tvShows.length);
        const filteredShows = this.filterItems(tvShows, this.searchTerm);
        const sortedShows = this.sortItems(filteredShows, this.sortBy, 'name');
        // Debug: print all show.path values
        console.log('[TV DEBUG] show.path values:', sortedShows.map(s => s.path));
        let lastLetter = '';
        const html = `
            <div class="media-library-movie-grid">
                ${sortedShows.map(show => {
                    const seasonCount = this.getSeasonsForShow(show).length;
                    const seasonLabel = seasonCount === 1 ? '1 Season' : `${seasonCount} Seasons`;
                    const title = show.name || show.title || '';
                    const firstLetter = title.charAt(0).toUpperCase();
                    let anchor = '';
                    if (firstLetter !== lastLetter) {
                        anchor = `<div id="anchor-${firstLetter}" class="media-library-anchor"></div>`;
                        lastLetter = firstLetter;
                    }
                    return `
                    ${anchor}
                    <div class="media-library-movie-card" data-path="${show.path}" data-show-name="${show.name || show.title || ''}">
                      <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(show.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                      </div>
                      <div class="media-library-card-poster" style="position:relative;">
                        <img class="tvshow-poster-img" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'" style="cursor:pointer;">
                        </div>
                        <div class="media-library-card-info">
                            <h3>${show.name}</h3>
                            <p>${seasonLabel}</p>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        console.log('[TV DEBUG] renderTVShowsTab: html =', html);
        return html;
    }

    closeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // --- FAVORITES LOGIC ---
    isFavorite(path) {
        const favs = JSON.parse(localStorage.getItem('mediaLibraryFavorites') || '[]');
        return favs.includes(path);
    }
    toggleFavorite(path) {
        let favs = JSON.parse(localStorage.getItem('mediaLibraryFavorites') || '[]');
        if (favs.includes(path)) {
            favs = favs.filter(p => p !== path);
        } else {
            favs.push(path);
        }
        localStorage.setItem('mediaLibraryFavorites', JSON.stringify(favs));
        this.renderMediaGrid();
    }
    getFavoritesList() {
        const favs = JSON.parse(localStorage.getItem('mediaLibraryFavorites') || '[]');
        return this.mediaLibrary.filter(item => favs.includes(item.path));
    }

    // --- COLLECTIONS LOGIC ---
    getCollections() {
        return JSON.parse(localStorage.getItem('mediaLibraryCollections') || '{}');
    }
    saveCollections(collections) {
        localStorage.setItem('mediaLibraryCollections', JSON.stringify(collections));
    }
    showAddToCollectionModal(movie) {
        // Remove any existing modal
        const existing = document.getElementById('addToCollectionModal');
        if (existing) existing.remove();
        // Modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'addToCollectionModal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.25);z-index:99999;display:flex;align-items:center;justify-content:center;';
        // Modal box
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:28px 28px 20px 28px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.18);min-width:320px;max-width:90vw;position:relative;';
        modal.innerHTML = `
            <h3 style="margin-top:0;margin-bottom:18px;font-size:1.2em;">Add to Collection</h3>
            <label style="font-size:1em;">Choose collection:</label><br>
            <select id="collectionDropdown" style="width:100%;margin:8px 0 12px 0;padding:6px 8px;font-size:1em;">
                <option value="">-- Select --</option>
            </select>
            <div style="margin:10px 0 8px 0;text-align:center;color:#888;">or</div>
            <input id="newCollectionInput" type="text" placeholder="New collection name" style="width:100%;padding:6px 8px;font-size:1em;margin-bottom:16px;">
            <div style="display:flex;justify-content:flex-end;gap:12px;">
                <button id="cancelCollectionBtn" style="padding:7px 18px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">Cancel</button>
                <button id="addCollectionBtn" style="padding:7px 18px;border-radius:6px;background:#1976d2;color:#fff;border:none;cursor:pointer;font-size:1em;">Add</button>
            </div>
            <button id="closeCollectionModal" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.3em;cursor:pointer;color:#888;">&times;</button>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // Populate dropdown
        const collections = this.getCollections();
        const dropdown = modal.querySelector('#collectionDropdown');
        Object.keys(collections).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            dropdown.appendChild(opt);
        });
        // Close modal logic
        const closeModal = () => { overlay.remove(); };
        modal.querySelector('#closeCollectionModal').onclick = closeModal;
        modal.querySelector('#cancelCollectionBtn').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
        // Add logic
        modal.querySelector('#addCollectionBtn').onclick = () => {
            let collectionName = dropdown.value.trim();
            const newName = modal.querySelector('#newCollectionInput').value.trim();
            if (newName) collectionName = newName;
            if (!collectionName) {
                alert('Please select or enter a collection name.');
                return;
            }
            // Save to localStorage
            const collections = this.getCollections();
            if (!collections[collectionName]) collections[collectionName] = [];
            if (collections[collectionName].includes(movie.path)) {
                this.showToast('Already in this collection!');
                closeModal();
                return;
            }
            collections[collectionName].push(movie.path);
            this.saveCollections(collections);
            this.showToast(`Added to "${collectionName}"!`);
            closeModal();
        };
    }

    // --- COLLECTIONS TAB RENDERING ---
    renderCollectionsTab() {
        try {
        const grid = document.getElementById('mediaGrid');
            if (!grid) {
                const modalContent = document.querySelector('.media-library-modal-content');
                if (modalContent) {
                    modalContent.innerHTML += '<div style="color:red;font-size:2em;">[COLLECTIONS ERROR] mediaGrid not found</div>';
                }
                console.error('[COLLECTIONS ERROR] mediaGrid not found');
                return '';
            }
        grid.innerHTML = '';
            grid.style.display = 'block'; // Ensure block layout, not flex row
            const collections = this.getCollections();
            const names = Object.keys(collections);
        // If viewing a specific collection, show its movies
        if (this.currentCollectionView) {
            const moviePaths = collections[this.currentCollectionView] || [];
                const normalize = p => (p || '').replace(/\\/g, '/').toLowerCase();
                const normalizedMoviePaths = moviePaths.map(normalize);
                const movies = this.mediaLibrary.filter(item => normalizedMoviePaths.includes(normalize(item.path)));
                
            // Header with back and delete (refactored layout)
            const header = document.createElement('div');
            header.style.cssText = `
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding: 12px 18px 12px 0;
              border-bottom: 1px solid #eee;
              background: #fafbfc;
              border-radius: 10px 10px 0 0;
            `;
            header.innerHTML = `
              <div style="display: flex; align-items: center; gap: 14px;">
                <button id="backToCollectionsBtn" style="padding:6px 16px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">← Back</button>
                <h3 style="margin:0;font-size:1.2em;">${this.currentCollectionView}</h3>
              </div>
              <button id="deleteCollectionBtn" style="padding:6px 16px;border-radius:6px;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:1em;">Delete Collection</button>
            `;
            
            grid.appendChild(header);
            header.querySelector('#backToCollectionsBtn').onclick = () => {
                this.currentCollectionView = null;
                this.renderCollectionsTab();
            };
            header.querySelector('#deleteCollectionBtn').onclick = async () => {
                await window.ConfirmModal.init();
                window.ConfirmModal.open({
                    message: `Are you sure you want to delete the collection "${this.currentCollectionView}"? This cannot be undone.`,
                    onConfirm: () => {
                        delete collections[this.currentCollectionView];
                        this.saveCollections(collections);
                        this.currentCollectionView = null;
                        this.showToast('Collection deleted!');
                        this.renderCollectionsTab();
                    }
                });
            };

            // Movie grid
            const movieGrid = document.createElement('div');
            movieGrid.className = 'media-library-movie-grid';
            movies.forEach(item => {
                const card = document.createElement('div');
                card.className = 'media-library-movie-card';
                card.style.position = 'relative';
                card.innerHTML = `
                    ${anchorHTML}
                    <div class="media-library-movie-card" data-path="${(item.path || '').replace(/\\/g, '/').toLowerCase().trim()}" data-show-name="${item.title || item.name || ''}" style="position:relative;">
                      <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                      </div>
                      <div class="media-library-card-poster" style="position:relative;">
                        <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                      </div>
                      <div class="media-library-card-info">
                        <h3>${this.cleanMovieTitle(item.title)}</h3>
                      </div>
                    </div>
                `;
                card.querySelector('.remove-from-collection-btn').onclick = async (e) => {
                    e.stopPropagation();
                    await window.ConfirmModal.init();
                    window.ConfirmModal.open({
                        message: 'Are you sure you want to remove this item from the collection?',
                        onConfirm: () => {
                            collections[this.currentCollectionView] = collections[this.currentCollectionView].filter(p => p !== item.path);
                            this.saveCollections(collections);
                            this.showToast('Removed from collection!');
                            this.renderCollectionsTab();
                        }
                    });
                };
                card.onclick = () => this.playMedia(item);
                movieGrid.appendChild(card);
            });
            grid.appendChild(movieGrid);
            if (movies.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:40px;text-align:center;color:#888;font-size:1.1em;';
                empty.textContent = 'No movies in this collection yet.';
                grid.appendChild(empty);
            }
        } else {
                // Always show all collections if not viewing a specific one
            if (names.length === 0) {
                grid.innerHTML = '<div style="padding:40px;text-align:center;color:#888;font-size:1.1em;">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
                    return grid.innerHTML;
            }
            const list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;';
            names.forEach(name => {
                const btn = document.createElement('button');
                btn.textContent = name;
                btn.style.cssText = 'padding:28px 36px;border-radius:12px;background:#f5f5f5;color:#1976d2;font-size:1.1em;font-weight:bold;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:background 0.2s;';
                btn.onclick = () => {
                    this.currentCollectionView = name;
                    this.renderCollectionsTab();
                };
                list.appendChild(btn);
            });
            grid.appendChild(list);
            }
            return grid.innerHTML;
        } catch (e) {
            console.error('[COLLECTIONS FATAL ERROR]', e);
            document.body.innerHTML += '<div style="color:red;font-size:2em;">[COLLECTIONS FATAL ERROR] ' + e.message + '</div>';
        }
    }

    // --- GENRE FILTER LOGIC ---
    getCommonGenres() {
        // You can expand this list as needed
        return [
            'All Genres',
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
            'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
            'Sci-Fi', 'Science Fiction', 'Thriller', 'War', 'Western'
        ];
    }
    getMovieGenres(movie) {
        // Try to get genres from movie.genre or movie.genres (array or string)
        if (Array.isArray(movie.genre)) return movie.genre.map(g => g.toLowerCase());
        if (Array.isArray(movie.genres)) return movie.genres.map(g => g.toLowerCase());
        if (typeof movie.genre === 'string') return movie.genre.toLowerCase().split(/[,/]/).map(g => g.trim());
        if (typeof movie.genres === 'string') return movie.genres.toLowerCase().split(/[,/]/).map(g => g.trim());
        // Fallback: try to guess from title
        const title = (movie.title || '').toLowerCase();
        const genres = this.getCommonGenres().slice(1).map(g => g.toLowerCase());
        return genres.filter(g => title.includes(g));
    }

    selectedGenre = 'All Genres';
    handleGenreChange(event) {
        this.selectedGenre = event.target.value;
        this.renderMediaGrid();
        this.updateCount();
    }

    showMovieDetailsModal(movie) {
        // Only replace the grid area, not the whole modal content
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        // Poster
        const poster = `<img src="${this.getPosterPath(movie)}" alt="${movie.title}" style="width:180px;max-width:40vw;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`;
        // Details
        const genres = (movie.genre || movie.genres || []).toString();
        const year = movie.year || (movie.releaseDate ? ('' + movie.releaseDate).slice(0,4) : '');
        const cast = Array.isArray(movie.cast) ? movie.cast.join(', ') : (movie.cast || '');
        const desc = movie.description || movie.overview || movie.plot || '';
        grid.innerHTML = `
            <div style="background:#fff;padding:32px 32px 24px 32px;border-radius:14px;box-shadow:0 6px 32px rgba(0,0,0,0.22);min-width:340px;max-width:95vw;max-height:90vh;overflow-y:auto;position:relative;display:flex;gap:32px;align-items:flex-start;">
            <div>${poster}</div>
            <div style="flex:1;min-width:220px;">
                    <button id="backToGridBtn" style="margin-bottom:18px;padding:7px 18px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">← Back</button>
                <h2 style="margin-top:0;margin-bottom:10px;">${this.cleanMovieTitle(movie.title)}</h2>
                <div style="color:#888;font-size:1.05em;margin-bottom:8px;">${year ? year + ' • ' : ''}${genres}</div>
                <div style="margin-bottom:16px;">${desc ? desc : '<span style=\'color:#bbb\'>No description available.</span>'}</div>
                    ${cast ? `<div style=\"margin-bottom:16px;\"><b>Cast:</b> ${cast}</div>` : ''}
                <div style="display:flex;gap:16px;align-items:center;margin-bottom:10px;">
                    <button id="playMovieBtn" style="padding:10px 28px;border-radius:7px;background:#1976d2;color:#fff;border:none;cursor:pointer;font-size:1.1em;font-weight:bold;">▶ Play</button>
                    <button id="detailsFavoriteBtn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(movie.path) ? '❤️' : '🤍'}</button>
                    <button id="detailsCollectionBtn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.3em;line-height:1;">➕</button>
                    </div>
                </div>
            </div>
        `;
        // Back button
        document.getElementById('backToGridBtn').onclick = () => this.renderMediaGrid();
        // Play button
        document.getElementById('playMovieBtn').onclick = () => {
            this.closeModal();
            this.playMedia(movie);
        };
        // Favorite button
        document.getElementById('detailsFavoriteBtn').onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite(movie.path);
            this.showMovieDetailsModal(movie); // Re-render to update icon
        };
        // Collection button
        document.getElementById('detailsCollectionBtn').onclick = (e) => {
            e.stopPropagation();
            this.showAddToCollectionModal(movie);
        };
    }

    // --- TV SHOW NAVIGATION ---
    currentTVShow = null;
    currentTVSeason = null;

    // --- TV SHOW STRUCTURE ---
    getTVShows() {
        // Returns array of main TV show objects from the nested structure
        const tvShows = [];
        let folders = [];
        let parentPath = 'TV-SHOWS';
        if (this.mediaLibraryRaw) {
            // Try to find the TV-SHOWS folder or treat all folders as shows if not present
            if (Array.isArray(this.mediaLibraryRaw.folders)) {
                // Look for a folder named TV-SHOWS (case-insensitive)
            const tvShowsFolder = this.mediaLibraryRaw.folders.find(f => /tv[-_ ]shows/i.test(f.path));
                if (tvShowsFolder && Array.isArray(tvShowsFolder.folders) && tvShowsFolder.folders.length > 0) {
                    folders = tvShowsFolder.folders;
                    parentPath = tvShowsFolder.path || 'TV-SHOWS';
                } else {
                    // If no TV-SHOWS folder, treat all as shows
                    folders = this.mediaLibraryRaw.folders;
                }
            } else if (Array.isArray(this.mediaLibraryRaw)) {
                folders = this.mediaLibraryRaw;
            }
        }
        folders.forEach(folder => {
                    const showName = this.extractShowName(folder.path);
            // If folder.path already includes the parent, don't double it
            let fullPath = folder.path;
            if (parentPath && fullPath && !fullPath.startsWith(parentPath)) {
                fullPath = parentPath.replace(/\/+$/,'') + '/' + fullPath.replace(/^\+/,'');
            }
                    tvShows.push({
                        name: showName,
                path: fullPath,
                        data: folder
                    });
                });
                console.log('[TV DEBUG] Total TV shows detected:', tvShows.length);
        return tvShows;
    }

    extractShowName(path) {
        // Handles both 'TV-SHOWS/Show Name' and just 'Show Name' formats
        if (!path || typeof path !== 'string') return 'Unknown Show';
        const parts = path.split(/[\/]/).filter(Boolean);
        // Try to find after TV-SHOWS
        const tvShowsIndex = parts.findIndex(part => 
            part.toLowerCase() === 'tv-shows' || part.toLowerCase() === 'tv_shows'
        );
        if (tvShowsIndex !== -1 && tvShowsIndex + 1 < parts.length) {
            return parts[tvShowsIndex + 1];
        }
        // Otherwise, just use the last part (should be the show name)
        return parts[parts.length - 1] || 'Unknown Show';
    }

    getSeasonsForShow(showOrPath) {
        // Accepts either a show object or a show path
        let show = null;
        if (typeof showOrPath === 'object' && showOrPath && showOrPath.data && Array.isArray(showOrPath.data.folders)) {
            show = showOrPath.data;
        } else if (typeof showOrPath === 'object' && showOrPath && Array.isArray(showOrPath.folders)) {
            show = showOrPath;
        } else {
            show = this.findShowByPath(showOrPath);
        }

        function findSeasons(folders, parentPath, showPath) {
            let seasons = [];
            if (!Array.isArray(folders)) return seasons;
            for (const folder of folders) {
                const name = (folder.name || folder.path.split(/[\\/]/).pop() || '').toLowerCase();
                // Debug: print every folder name being checked
                console.log('[SEASON DETECTION DEBUG] Checking folder name:', name);
                // Match any folder containing 'season' or 'series' or 's' followed by a number (with optional separators)
                if (/^(season[ _-]?\d+|s\d+|series[ _-]?\d+)$/i.test(name) ||
                    /season[ _-]?\d+/i.test(name) ||
                    /^s\d+/i.test(name) ||
                    /series[ _-]?\d+/i.test(name) ||
                    /^season\d+$/i.test(name) ||
                    /^s\d+$/i.test(name)) {
                    // Force full path
                    let fullPath = folder.path;
                    if (showPath && fullPath && !fullPath.startsWith(showPath)) {
                        fullPath = showPath.replace(/\/+$/, '') + '/' + fullPath.replace(/^\/+/, '');
                    }
                    fullPath = fullPath.replace(/\\/g, '/'); // Normalize to forward slashes
                    console.log('[SEASON DETECTION DEBUG] Computed fullPath for season:', fullPath);
                    seasons.push({ ...folder, path: fullPath });
                }
                // Recurse into subfolders
                if (Array.isArray(folder.folders) && folder.folders.length > 0) {
                    seasons = seasons.concat(findSeasons(folder.folders, folder.path, showPath));
                }
            }
            return seasons;
        }

        // Deduplicate by season number (normalize to 'season N')
        function dedupeSeasons(seasons) {
            const seen = new Set();
            return seasons.filter(folder => {
                const name = (folder.name || folder.path.split(/[\\/]/).pop() || '').toLowerCase();
                // Match season number in various patterns
                const match = name.match(/season[ _-]?(\d+)/i) || name.match(/^s(\d+)/i) || name.match(/series[ _-]?(\d+)/i);
                if (match) {
                    const seasonNum = match[1].padStart(2, '0');
                    if (seen.has(seasonNum)) return false;
                    seen.add(seasonNum);
                    return true;
                }
                return false;
            });
        }

        if (show && Array.isArray(show.folders)) {
            const allSeasons = findSeasons(show.folders, show.path, show.path);
            console.log('[SEASON DETECTION DEBUG] All detected season folders:', allSeasons.map(f => f.name || f.path));
            return dedupeSeasons(allSeasons);
        }
        return [];
    }

    getEpisodesForSeason(showPath, seasonPath) {
        if (!showPath || !seasonPath) return [];
        // Returns array of episodes for a given season
        let show = null;
        console.log('[EPISODE DEBUG] getEpisodesForSeason called with showPath:', showPath, 'seasonPath:', seasonPath);
        if (typeof showPath === 'object' && showPath && showPath.data && Array.isArray(showPath.data.folders)) {
            show = showPath.data;
        } else if (typeof showPath === 'object' && showPath && Array.isArray(showPath.folders)) {
            show = showPath;
        } else {
            show = this.findShowByPath(showPath);
        }
        console.log('[EPISODE DEBUG] show object:', show);
        // Patch: use show.data if present
        if (show && show.data && Array.isArray(show.data.folders)) {
            show = show.data;
            console.log('[EPISODE DEBUG] Using show.data for folder search:', show);
        }
        if (!show) {
            console.log('[EPISODE DEBUG] show is null or undefined');
            return [];
        }
        if (!Array.isArray(show.folders)) {
            console.log('[EPISODE DEBUG] show.folders is not an array:', show.folders);
            return [];
        }
        if (show.folders.length === 0) {
            console.log('[EPISODE DEBUG] show.folders is empty');
            return [];
        }
        console.log('[EPISODE DEBUG] show.folders length:', show.folders.length, 'sample:', show.folders.slice(0,2));

        // Normalize seasonPath for matching
        const normalizedSeasonPath = (seasonPath || '').replace(/\\/g, '/').toLowerCase().trim();
        console.log('[EPISODE DEBUG] Normalized seasonPath:', normalizedSeasonPath);

            // Recursively search for the season folder
        function findSeasonFolder(folders, parentPath = '') {
                for (const folder of folders) {
                let folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase().trim();
                console.log('[EPISODE DEBUG] Checking folderPath:', folderPath);
                if (folderPath === normalizedSeasonPath) {
                    console.log('[EPISODE DEBUG] Found matching season folder:', folderPath);
                    console.log('[EPISODE DEBUG] season.files:', folder.files);
                        return folder;
                    }
                if (folder.folders && folder.folders.length) {
                    const found = findSeasonFolder(folder.folders, folderPath);
                        if (found) return found;
                    }
                }
                return null;
            }

        const seasonFolder = findSeasonFolder(show.folders);
        if (!seasonFolder) {
            console.log('[EPISODE DEBUG] No matching season folder found for:', normalizedSeasonPath);
            return [];
        }
        if (!Array.isArray(seasonFolder.files)) {
            console.log('[EPISODE DEBUG] seasonFolder.files is not an array:', seasonFolder.files);
        return [];
        }
        // Filter for video files (basic check)
        const episodes = seasonFolder.files.filter(f => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name));
        console.log('[EPISODE DEBUG] Detected episodes:', episodes);
        return episodes;
    }

    findShowByPath(showPath) {
        if (!showPath) return null;
        const target = (showPath || '').replace(/\\/g, '/').toLowerCase();
        console.log('[FIND SHOW DEBUG] Searching for showPath:', showPath, 'normalized:', target);
        // 1. Search top-level TV show objects
        const tvShows = this.getTVShows();
        for (const show of tvShows) {
            const showObjPath = (show.path || '').replace(/\\/g, '/').toLowerCase();
            if (showObjPath === target) {
                console.log('[FIND SHOW DEBUG] Found top-level show:', show);
                return show;
            }
        }
        // 2. Optionally, search recursively in folders (legacy/edge cases)
        function recursiveSearch(folders) {
            if (!Array.isArray(folders)) return null;
            for (const folder of folders) {
                const folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase();
                if (folderPath === target) {
                    console.log('[FIND SHOW DEBUG] Found nested folder:', folder);
                    return folder;
                }
                const found = recursiveSearch(folder.folders);
            if (found) return found;
            }
            return null;
        }
        for (const show of tvShows) {
            const found = recursiveSearch(show.folders);
            if (found) return found;
        }
        console.log('[FIND SHOW DEBUG] No show found for path:', showPath);
        return null;
    }

    cleanEpisodeName(filename) {
        // Clean episode name from filename
        // Remove file extension and common patterns
        let name = filename.replace(/\.[^/.]+$/, ''); // Remove extension
        name = name.replace(/\.(mkv|mp4|avi|mov|wmv)$/i, ''); // Remove video extensions
        name = name.replace(/\.(720p|1080p|480p)/i, ''); // Remove quality indicators
        name = name.replace(/\.(BluRay|WEBRip|HDTV|AMZN|Netflix)/i, ''); // Remove source indicators
        name = name.replace(/\.(x264|x265|HEVC)/i, ''); // Remove codec indicators
        name = name.replace(/\.(DDP5\.1|AAC|AC3)/i, ''); // Remove audio indicators
        name = name.replace(/\.(GalaxyTV|ProLover|d3g|FENiX)/i, ''); // Remove release group names
        name = name.replace(/\[.*?\]/g, ''); // Remove anything in brackets
        name = name.replace(/\(.*?\)/g, ''); // Remove anything in parentheses
        name = name.replace(/\.+/g, ' '); // Replace multiple dots with spaces
        name = name.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
        return name;
    }

    getSeasonImage(showName, seasonPath) {
        try {
            // Use the loaded season episode images data
            if (!this.seasonEpisodeImages) {
                return '/assets/img/season-default.jpg';
            }
            // Extract season number from path
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
            if (!seasonMatch) return '/assets/img/season-default.jpg';
            // Normalize season number (remove leading zeros)
            const seasonNumber = String(parseInt(seasonMatch[1], 10));
            const showData = this.seasonEpisodeImages[showName];
            if (showData && showData.seasons && showData.seasons[seasonNumber] && showData.seasons[seasonNumber].poster) {
                return showData.seasons[seasonNumber].poster;
            }
            return '/assets/img/season-default.jpg';
        } catch (error) {
            console.error('Error getting season image:', error);
            return '/assets/img/season-default.jpg';
        }
    }

    getEpisodeImage(showName, seasonName, episode) {
        try {
            // Use the loaded season episode images data
            if (!this.seasonEpisodeImages) {
                return '/assets/img/episode-default.jpg';
            }
            // Extract season number from season name
            const seasonMatch = seasonName.match(/season[ _-]?(\d+)/i);
            if (!seasonMatch) return '/assets/img/episode-default.jpg';
            const seasonNumber = String(parseInt(seasonMatch[1], 10));
            // Extract episode number from episode filename
            const episodeMatch = episode.name.match(/E(\d{1,2})/i) || episode.path.match(/E(\d{1,2})/i);
            if (!episodeMatch) return '/assets/img/episode-default.jpg';
            const episodeNumber = String(parseInt(episodeMatch[1], 10));
            const showData = this.seasonEpisodeImages[showName];
            if (showData && showData.seasons && showData.seasons[seasonNumber] && 
                showData.seasons[seasonNumber].episodes && showData.seasons[seasonNumber].episodes[episodeNumber] &&
                showData.seasons[seasonNumber].episodes[episodeNumber].still) {
                return showData.seasons[seasonNumber].episodes[episodeNumber].still;
            }
            return '/assets/img/episode-default.jpg';
        } catch (error) {
            console.error('Error getting episode image:', error);
            return '/assets/img/episode-default.jpg';
        }
    }

    // --- TV SHOW UI METHODS ---
    renderSeasonsView(showPath) {
        const show = this.findShowByPath(showPath);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView for showPath:', showPath);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView show:', show);
        console.log('[DEBUG - RenderSeasonsView] typeof show:', typeof show);
        if (show) {
            console.log('[DEBUG - RenderSeasonsView] Object.keys(show):', Object.keys(show));
            if (show.data) {
                console.log('[DEBUG - RenderSeasonsView] show.data:', show.data);
                if (show.data.name) {
                    console.log('[DEBUG - RenderSeasonsView] show.data.name:', show.data.name);
                }
            }
        }
        const seasons = this.getSeasonsForShow(show && show.data ? show.data : show);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView seasons:', seasons);
        // Robust show name extraction
        let showName = 'Unknown Show';
        if (show && show.name) {
            showName = show.name;
        } else if (show && show.data && show.data.name) {
            showName = show.data.name;
        } else if (showPath) {
            showName = this.extractShowName(showPath);
        }

        return `
            <div class="media-library-breadcrumbs">
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV Shows</span>
                <span class="breadcrumb-separator"> > </span>
                <span>${showName}</span>
            </div>
            <div class="media-library-show-info">
                <h2>${showName}</h2>
                <p>${seasons.length} ${seasons.length === 1 ? 'Season' : 'Seasons'}</p>
            </div>
            <div class="media-library-grid">
                ${seasons.map(season => {
                    const seasonImage = this.getSeasonImage(showName, season.path);
                    return `
                        <div class="media-library-card" onclick="mediaLibraryManager.openTVSeason('${season.path.replace(/\\/g, '/')}')">
                        <div class="media-library-card-poster">
                                <img src="${seasonImage}" alt="${season.path.split(/[\\/]/).pop()}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                        </div>
                        <div class="media-library-card-info">
                                <h3>${season.path.split(/[\\/]/).pop()}</h3>
                            <p>${this.getEpisodesForSeason(this.currentTVShow, season.path).length} Episodes</p>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    openTVShowFromData(element) {
        const showPath = element.getAttribute('data-path');
        console.log('[DEBUG - OpenTVShowFromData] openTVShowFromData called with path from data attribute:', showPath);
        this.openTVShow(showPath);
    }

    openTVShow(showPath) {
        console.log('[DEBUG - OpenTVShow] openTVShow called with:', showPath);
        this.currentTVShow = showPath;
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    openTVSeason(seasonPath) {
        this.currentTVSeason = seasonPath;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    renderEpisodesView() {
        const showName = this.extractShowName(this.currentTVShow);
        const seasonName = this.currentTVSeason.split(/[\/]/).pop();
        const episodes = this.getEpisodesForSeason(this.currentTVShow, this.currentTVSeason);

        console.log('[DEBUG] episode:', episodes);

        return `
            <div class="media-library-breadcrumbs">
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV Shows</span>
                <span class="breadcrumb-separator"> > </span>
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToSeasons()">${showName}</span>
                <span class="breadcrumb-separator"> > </span>
                <span>${seasonName}</span>
            </div>
            <div class="media-library-season-info">
                <h2>${seasonName}</h2>
                <p>${episodes.length} Episodes</p>
            </div>
            <div class="media-library-episodes-scroll">
            <div class="media-library-grid">
                ${episodes.map(episode => {
                    const episodeImage = this.getEpisodeImage(showName, seasonName, episode);
                    // Robust relPath for playback
                    const relPath = ((episode.relPath) ? episode.relPath : (this.currentTVSeason.replace(/\\/g, '/') + '/' + episode.name.replace(/\\/g, '/'))).replace(/\\/g, '/');
                    return `
                    <div class="media-library-card" onclick="mediaLibraryManager.playEpisode('${relPath}')">
                        <div class="media-library-card-poster">
                            <img src="${episodeImage}" alt="${episode.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                            <div class="media-library-play-overlay">▶</div>
                        </div>
                        <div class="media-library-card-info">
                                <h3 style="font-size:1em;line-height:1.2;margin-bottom:2px;">
                                    ${showName} - ${seasonName} - ${(() => {
                                        const match = (episode.name || episode.path).match(/E(\d{1,2})/i);
                                        return match ? `E${match[1].padStart(2, '0')}` : '';
                                    })()}
                                </h3>
                                <div style="font-size:0.98em;line-height:1.2;white-space:normal;">
                                    ${this.extractEpisodeTitle(episode.name || episode.path.split(/[\\/]/).pop())}
                        </div>
                    </div>
                    </div>
                `;
                }).join('')}
                </div>
            </div>
        `;
    }

    backToTVShows() {
        this.currentTVShow = null;
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    backToSeasons() {
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    playEpisode(episodePath) {
        this.closeModal();
        // Always normalize to forward slashes for URL
        const normalizedPath = (episodePath || '').replace(/\\/g, '/');
        const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
        const url = `/media/${encodedPath}`;
        if (window.videoPlayer) {
            window.videoPlayer.playUrl(url);
        }
    }

    // --- TAB RENDERING ---
    renderTabContent() {
        console.log('[DEBUG - RenderTabContent] currentTab:', this.currentTab);
        console.log('[DEBUG - RenderTabContent] currentTVShow:', this.currentTVShow);
        console.log('[DEBUG - RenderTabContent] currentTVSeason:', this.currentTVSeason);
        
        switch (this.currentTab) {
            case 'movies':
                console.log('[DEBUG - RenderTabContent] Rendering movies tab');
                return this.renderMoviesContent();
            case 'tvshows':
                if (this.currentTVShow) {
                    if (this.currentTVSeason) {
                        console.log('[DEBUG - RenderTabContent] Rendering episodes view');
                        return this.renderEpisodesView();
                    } else {
                        console.log('[DEBUG - RenderTabContent] Rendering seasons view');
                        return this.renderSeasonsView(this.currentTVShow);
                    }
                } else {
                    console.log('[DEBUG - RenderTabContent] Rendering TV shows tab');
                    return this.renderTVShowsTab();
                }
            case 'favorites':
                return this.renderFavoritesContent();
            case 'collections':
                return this.renderCollectionsTab();
            case 'suggestions':
                return this.renderSuggestionsContent();
            case 'watchlater':
                return this.renderWatchLaterContent();
            default:
                return this.renderMoviesContent();
        }
    }

    // --- TAB CONTENT RENDERING METHODS ---
    renderMoviesContent() {
        const items = this.getFilteredAndSortedItems();
        // Track which letters we've already added anchors for
        const addedAnchors = new Set();
        return items.map(item => {
            const cleanTitle = this.cleanMovieTitle(item.title);
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            let anchorHTML = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorHTML = `<a name="${firstLetter}" id="anchor-${firstLetter}"></a>`;
                addedAnchors.add(firstLetter);
            }
            return `
                <div class="media-library-movie-card" style="position: relative;">
                    ${anchorHTML}
                    <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                    <div class="media-info">
                        <h3>${cleanTitle}</h3>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderFavoritesContent() {
        const favorites = this.getFavoritesList();
        // Track which letters we've already added anchors for
        const addedAnchors = new Set();
        return favorites.map(item => {
            const cleanTitle = this.cleanMovieTitle(item.title);
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            let anchorHTML = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorHTML = `<a name="${firstLetter}" id="anchor-${firstLetter}"></a>`;
                addedAnchors.add(firstLetter);
            }
            return `
                <div class="media-library-movie-card" style="position: relative;">
                    ${anchorHTML}
                    <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">❤️</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                    <div class="media-info">
                        <h3>${cleanTitle}</h3>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSuggestionsContent() {
        return '<div class="media-library-suggestions-placeholder"><h3>Suggestions coming soon...</h3></div>';
    }

    // --- UTILITY METHODS ---
    filterItems(items, searchTerm) {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item => 
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.title && item.title.toLowerCase().includes(term))
        );
    }

    sortItems(items, sortBy, field = 'name') {
        if (!items || items.length === 0) return items;
        
        return items.slice().sort((a, b) => {
            const aValue = (a[field] || '').toString().toLowerCase();
            const bValue = (b[field] || '').toString().toLowerCase();
            
            if (sortBy === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }

    renderTVShowsTab() {
        const tvShows = this.getTVShows();
        console.log('[TV DEBUG] renderTVShowsTab: tvShows.length =', tvShows.length);
        const filteredShows = this.filterItems(tvShows, this.searchTerm);
        const sortedShows = this.sortItems(filteredShows, this.sortBy, 'name');
        // Debug: print all show.path values
        console.log('[TV DEBUG] show.path values:', sortedShows.map(s => s.path));
        let lastLetter = '';
        const html = `
            <div class="media-library-movie-grid">
                ${sortedShows.map(show => {
                    const seasonCount = this.getSeasonsForShow(show).length;
                    const seasonLabel = seasonCount === 1 ? '1 Season' : `${seasonCount} Seasons`;
                    const title = show.name || show.title || '';
                    const firstLetter = title.charAt(0).toUpperCase();
                    let anchor = '';
                    if (firstLetter !== lastLetter) {
                        anchor = `<div id="anchor-${firstLetter}" class="media-library-anchor"></div>`;
                        lastLetter = firstLetter;
                    }
                    return `
                    ${anchor}
                    <div class="media-library-movie-card" data-path="${show.path}" data-show-name="${show.name || show.title || ''}">
                      <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(show.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                      </div>
                      <div class="media-library-card-poster" style="position:relative;">
                        <img class="tvshow-poster-img" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'" style="cursor:pointer;">
                        </div>
                        <div class="media-library-card-info">
                            <h3>${show.name}</h3>
                            <p>${seasonLabel}</p>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        console.log('[TV DEBUG] renderTVShowsTab: html =', html);
        return html;
    }

    closeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // --- WATCH LATER / RESUME LOGIC ---
    saveResumeProgress(movie, currentTime, duration, isManualSave = false) {
        console.log('[MEDIA-LIBRARY] saveResumeProgress called:', {movie, currentTime, duration, isManualSave});
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Remove any existing entry for this path
        resumeList = resumeList.filter(item => item.path !== movie.path);
        
        // For manual saves (Save for Later button), always save regardless of position
        // For automatic saves (pause events), only save if not near the end
        if (isManualSave || (duration - currentTime > 60)) {
            resumeList.push({
                path: movie.path,
                title: movie.title,
                poster: this.getPosterPath(movie),
                currentTime,
                duration,
                lastWatched: Date.now()
            });
        }
        
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        console.log('[MEDIA-LIBRARY] Updated resumeList:', resumeList);
        this.renderWatchLaterContent();
        
        // Only show toast for manual saves
        if (isManualSave) {
            this.showToast('Saved to Watch Later!');
        }
    }

    removeResumeProgress(path) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        resumeList = resumeList.filter(item => item.path !== path);
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        console.log('[MEDIA-LIBRARY] Removed from resume list:', path);
        // Refresh the Watch Later content if we're currently on that tab
        if (this.currentTab === 'watchlater') {
            this.renderWatchLaterContent();
        }
    }

    getResumeList() {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        console.log('[MEDIA-LIBRARY] getResumeList returns:', resumeList);
        // Sort by lastWatched desc (most recent first)
        return resumeList.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }

    showToast(msg) {
        let toast = document.getElementById('mediaLibraryToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mediaLibraryToast';
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1976d2;color:#fff;padding:12px 28px;border-radius:8px;font-size:1.1em;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.18);opacity:0.95;transition:opacity 0.3s;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1800);
    }

    attachResumeEvents(mediaItem) {
        // This method is called when a video starts playing
        // It sets up automatic saving of progress when the video is paused
        console.log('[MEDIA-LIBRARY] attachResumeEvents called for:', mediaItem);
        
        // The actual pause event handling is now done in the VideoPlayer component
        // This method is kept for compatibility and future enhancements
    }

    extractEpisodeTitle(filename) {
        // Remove show name, season/episode codes, and return only the episode title
        let name = filename;
        // Remove extension
        name = name.replace(/\.[^/.]+$/, '');
        // Remove show name (if present)
        const showNamePattern = new RegExp('^' + this.escapeRegExp(this.extractShowName(this.currentTVShow)) + '[ ._-]*', 'i');
        name = name.replace(showNamePattern, '');
        // Remove season/episode codes
        name = name.replace(/S\d{1,2}E\d{1,2}/i, '');
        name = name.replace(/Season[ _-]?\d{1,2}/i, '');
        name = name.replace(/Episode[ _-]?\d{1,2}/i, '');
        name = name.replace(/^[ ._-]+/, '');
        name = name.replace(/[ ._-]+$/, '');
        return name.trim();
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async reloadMoviePostersAndRefreshGrid() {
        try {
            const response = await fetch('/components/MediaLibrary/data/movie_posters.json?_=' + Date.now());
            if (response.ok) {
                this.moviePosters = await response.json();
            }
        } catch (e) {
            console.warn('[MediaLibrary] Failed to reload movie_posters.json:', e);
        }
        this.renderMediaGrid();
        this.attachPosterSelectorHandlers();
    }

    attachPosterSelectorHandlers() {
        setTimeout(() => {
            document.querySelectorAll('.poster-selector-btn').forEach(btn => {
                btn.onclick = (e) => { // ensure arrow function
                    e.preventDefault();
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card');
                    let itemPath = card ? card.getAttribute('data-path') : '';
                    let item = null;
                    let errorDetails = '';
                    if (this.currentTab === 'tvshows') {
                        const tvShows = this.getTVShows();
                        item = tvShows.find(show =>
                            (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = tvShows.find(show => (show.name || show.title || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    } else {
                        const items = this.getFilteredAndSortedItems();
                        item = items.find(i =>
                            (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = items.find(i => (i.title || i.name || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    }
                    if (window.PosterSelector) {
                        const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                        const selector = new window.PosterSelector(mode);
                        selector.getMediaContext = () => {
                            if (item) {
                                return {
                                    mediaId: item.path,
                                    name: item.name || item.title,
                                    path: item.path,
                                    type: mode
                                };
                            } else {
                                // Minimal fallback context
                                return {
                                    mediaId: itemPath || '[unknown]',
                                    name: card?.querySelector('h3')?.textContent || '[unknown]',
                                    path: itemPath || '[unknown]',
                                    type: mode
                                };
                            }
                        };
                        selector.onPosterSelected = ({filePath, posterType, poster}) => {
                            if (mode === 'movie' && this.moviePosters && item) {
                                this.moviePosters[item.path] = filePath;
                                this.cacheBusters[item.path] = Date.now();
                                this.renderMediaGrid();
                                this.showToast('Poster updated!');
                            } else if (mode === 'tv' && this.tvPosters && item) {
                                this.tvPosters[item.name || item.title] = filePath;
                                this.renderMediaGrid();
                                this.showToast('Poster updated!');
                            }
                        };
                        selector.init();
                        if (!item) {
                            // Show a warning toast if fallback was used
                            this.showToast('Warning: Movie/Show not found by path. Fallback context used.');
                        }
                    } else {
                        // Show detailed error info in the alert/toast
                        let details = `PosterSelector is not available or item not found.\n`;
                        details += `itemPath: ${itemPath}\n`;
                        details += `card: ${card ? card.outerHTML : '[none]'}\n`;
                        details += `errorDetails: ${errorDetails}`;
                        this.showToast(details);
                    }
                    return false;
                };
            });
        }, 0);
    }
}

// Initialize the media library manager
window.mediaLibraryManager = new MediaLibraryManager(); 

// After rendering the TV shows grid in renderTVShowsTab or after renderModal, attach click handlers to .tvshow-poster-img
setTimeout(() => {
  document.querySelectorAll('.tvshow-poster-img').forEach(img => {
    img.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const card = img.closest('.media-library-movie-card');
      if (card) window.mediaLibraryManager.openTVShowFromData(card);
    };
  });
}, 0);