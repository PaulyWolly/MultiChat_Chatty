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
        this.setupEventListeners();
        this.setupVoiceCommandIntegration();
        this.setupTextCommandIntegration();
        console.log('🎬 [MEDIA-LIBRARY] Media library manager initialized with voice/text command support');
    }

    async loadMediaLibrary() {
        this.isLoading = true;
        this.renderSpinner();
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading media library...');
            const response = await fetch('/api/media-library');
            const result = await response.json();
            
            if (result.success) {
                this.mediaLibraryRaw = result.library;
                this.mediaLibrary = this.flattenMediaLibrary(this.mediaLibraryRaw);
                console.log('🎬 [MEDIA-LIBRARY] Loaded', this.mediaLibrary.length, 'media items');
            } else {
                throw new Error(result.error || 'Failed to load media library');
            }
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
            mediaLibraryBtn.addEventListener('click', () => this.openMediaBrowser());
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

    renderModal() {
        // Remove existing modal if any
        this.removeModal();

        const modal = document.createElement('div');
        modal.id = 'mediaLibraryModal';
        modal.className = 'media-library-modal-overlay';
        modal.innerHTML = `
          <div class="media-library-modal">
            <div class="media-library-modal-header" style="background:url('/assets/img/header-1.jpg') center/cover no-repeat;position:relative;height:110px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(180,200,240,0.60);"></div>
              <h2 style="position:relative;z-index:2;color:#111;text-shadow:0 2px 12px rgba(0,0,0,0.18);font-size:2.6em;">Media Library</h2>
              <button class="media-library-close-btn" id="mediaLibraryCloseBtn" style="position:absolute;top:18px;right:24px;z-index:3;">&times;</button>
            </div>
            <div class="media-library-modal-content">
              <div class="media-library-modal-tabs">
                <button class="media-library-tab-btn ${this.currentTab === 'movies' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('movies')">Movies</button>
                <button class="media-library-tab-btn ${this.currentTab === 'tvshows' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('tvshows')">TV Shows</button>
                <button class="media-library-tab-btn ${this.currentTab === 'favorites' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('favorites')">Favorites</button>
                <button class="media-library-tab-btn ${this.currentTab === 'collections' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('collections')">Collections</button>
                <button class="media-library-tab-btn ${this.currentTab === 'suggestions' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('suggestions')">Suggestions</button>
                <button class="media-library-tab-btn ${this.currentTab === 'watchlater' ? 'active' : ''}" onclick="mediaLibraryManager.switchTab('watchlater')">Watch Later</button>
              </div>
              <div class="media-library-top-bar">
                <span class="media-library-count" id="mediaLibraryCount"></span>
                <div style="display:inline-block;position:relative;">
                  <input type="text" id="mediaLibrarySearch" class="media-library-search" placeholder="Search movies..." oninput="mediaLibraryManager.handleSearchInput(event)">
                  <button id="mediaLibraryClearSearch" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:1.2em;color:#888;cursor:pointer;display:none;">&times;</button>
                </div>
                <select id="mediaLibraryGenre" class="media-library-genre" style="margin-left:10px;" onchange="mediaLibraryManager.handleGenreChange(event)"></select>
                <select id="mediaLibrarySort" class="media-library-sort" onchange="mediaLibraryManager.handleSortChange(event)">
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>
                <button class="media-library-shuffle-btn" onclick="mediaLibraryManager.shuffleMovies()">Shuffle</button>
              </div>
              <div id="mediaGridWrapper" class="media-library-media-grid-wrapper">
                <div id="mediaGrid" class="media-library-movie-grid"></div>
                <div class="media-library-az-sidebar" id="mediaLibraryAZSidebar"></div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('mediaLibraryCloseBtn').onclick = () => this.closeMediaBrowser();
        if (this.isLoading) this.renderSpinner();
        this.renderMediaGrid();
        this.renderAZSidebar();
        this.updateCount();
        this.restoreSearchSortUI();
        if (this.currentTab === 'watchlater') {
            this.renderWatchLaterPlaceholder();
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
    }

    removeModal() {
        const existingModal = document.getElementById('mediaLibraryModal');
        if (existingModal) {
            existingModal.remove();
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        if (tab === 'watchlater') {
            this.renderWatchLaterPlaceholder();
        } else if (tab === 'collections') {
            this.currentCollectionView = null;
            this.renderCollectionsTab();
        } else {
            this.renderMediaGrid();
        }
        // Update tab button states
        document.querySelectorAll('.media-library-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    renderMediaGrid() {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        const items = this.getFilteredAndSortedItems();
        grid.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-library-movie-card';
            card.style.position = 'relative';
            card.innerHTML = `
                <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                    <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                    <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                </div>
                <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                <div class="media-info">
                    <h3>${this.cleanMovieTitle(item.title)}</h3>
                </div>
            `;
            card.querySelector('.favorite-btn').onclick = (e) => {
                e.stopPropagation();
                this.toggleFavorite(item.path);
            };
            card.querySelector('.collection-btn').onclick = (e) => {
                e.stopPropagation();
                this.showAddToCollectionModal(item);
            };
            card.onclick = () => this.showMovieDetailsModal(item);
            grid.appendChild(card);
        });
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
        // Try TMDb poster mapping by absolute file path for both movies and TV shows
        if (this.moviePosters && mediaItem.path) {
            // Try all path variations for Windows compatibility
            const pathVariants = [
                mediaItem.path,
                mediaItem.path.replace(/\\/g, '/'),
                mediaItem.path.replace(/\//g, '\\')
            ];

            // Debug logging
            console.log('[POSTER DEBUG] mediaItem.path:', mediaItem.path);

            // Try each path variant
            for (const variant of pathVariants) {
                console.log('[POSTER DEBUG] Trying variant:', variant);
                
                // Try exact match first
                if (this.moviePosters[variant]) {
                    console.log('[POSTER DEBUG] Found exact match:', this.moviePosters[variant]);
                    return this.moviePosters[variant];
                }
                
                // Try case-insensitive match
                const lowerVariant = variant.toLowerCase();
                for (const [key, value] of Object.entries(this.moviePosters)) {
                    if (key.toLowerCase() === lowerVariant) {
                        console.log('[POSTER DEBUG] Found case-insensitive match:', value);
                        return value;
                    }
                }
            }
        }

        // Fallback to Emby poster if available
        if (this.embyPosters && mediaItem.path) {
            const embyPoster = this.embyPosters.find(poster => 
                poster.path && poster.path.toLowerCase() === mediaItem.path.toLowerCase()
            );
            if (embyPoster && embyPoster.posterUrl) {
                console.log('[POSTER DEBUG] Found Emby poster:', embyPoster.posterUrl);
                return embyPoster.posterUrl;
            }
        }

        // Final fallback to placeholder
        console.log('[POSTER DEBUG] getPosterPath: /assets/img/placeholder-poster.jpg');
        return '/assets/img/placeholder-poster.jpg';
    }

    playMedia(mediaItem, startTime = 0) {
        console.log('🎬 [MEDIA-LIBRARY] Playing media item:', mediaItem);
        this.closeMediaBrowser();
        if (!this.videoPlayer) {
            console.error('🎬 [MEDIA-LIBRARY] VideoPlayer not available');
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '❌ Video player not available. Please try again.');
            }
            return;
        }
        const videoUrl = `/api/video?path=${encodeURIComponent(mediaItem.path)}`;
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
        const items = this.getFilteredAndSortedItems();
        countSpan.textContent = `${items.length} Items`;
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
            btn.onclick = () => this.scrollToLetter(letter);
            azSidebar.appendChild(btn);
        });
    }

    scrollToLetter(letter) {
        // Only scroll the movie grid area, not the whole modal
        const gridWrapper = document.getElementById('mediaGridWrapper');
        const grid = document.getElementById('mediaGrid');
        if (!gridWrapper || !grid) return;
        const cards = Array.from(grid.getElementsByClassName('media-library-movie-card'));
        const target = cards.find(card => {
            const title = card.querySelector('.media-info h3')?.textContent?.trim().toUpperCase();
            return title && title.startsWith(letter);
        });
        if (target) {
            // Calculate the offset of the target card relative to the grid
            const gridRect = grid.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const scrollOffset = targetRect.top - gridRect.top + gridWrapper.scrollTop;
            gridWrapper.scrollTo({ top: scrollOffset, behavior: 'smooth' });
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

    renderWatchLaterPlaceholder() {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        const resumeList = this.getResumeList();
        if (!resumeList.length) {
            grid.innerHTML = `<div style="padding: 40px; text-align: center; color: #888; font-size: 1.2em;">No movies saved for later yet.<br>When you pause a movie or click 'Save for Later', it will appear here for quick access.</div>`;
            return;
        }
        grid.innerHTML = '';
        resumeList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-library-movie-card';
            card.innerHTML = `
                <img src="${item.poster}" alt="${item.title}">
                <div class="media-info">
                    <h3>${this.cleanMovieTitle(item.title)}</h3>
                    <div style="font-size: 0.95em; color: #1976d2; margin: 6px 0;">Resume at ${this.formatTime(item.currentTime)} / ${this.formatTime(item.duration)}</div>
                    <button class="resume-btn" style="margin-top: 8px; padding: 6px 14px; border-radius: 6px; background: #007bff; color: #fff; border: none; cursor: pointer; font-size: 1em;">Watch</button>
                    <button class="delete-btn" title="Remove from Watch Later" style="margin-top: 8px; margin-left: 8px; padding: 6px 10px; border-radius: 6px; background: #e53935; color: #fff; border: none; cursor: pointer; font-size: 1em;">🗑️</button>
                </div>
            `;
            card.querySelector('.resume-btn').onclick = (e) => {
                e.stopPropagation();
                this.playMedia(item, item.currentTime);
            };
            card.querySelector('.delete-btn').onclick = (e) => {
                e.stopPropagation();
                this.removeResumeProgress(item.path);
                this.renderWatchLaterPlaceholder();
            };
            card.onclick = () => this.playMedia(item, item.currentTime);
            grid.appendChild(card);
        });
    }

    formatTime(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // --- Resume Functionality ---
    saveResumeProgress(movie, currentTime, duration) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Remove any existing entry for this path
        resumeList = resumeList.filter(item => item.path !== movie.path);
        // Only save if not near the end
        if (duration - currentTime > 60) {
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
    }

    removeResumeProgress(path) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        resumeList = resumeList.filter(item => item.path !== path);
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
    }

    getResumeList() {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Sort by lastWatched desc
        return resumeList.sort((a, b) => b.lastWatched - a.lastWatched);
    }

    attachResumeEvents(mediaItem) {
        const player = videojs('videoPlayer');
        if (!player) return;
        // Remove previous listeners
        player.off('pause');
        player.off('ended');
        // On pause, save progress
        player.on('pause', () => {
            const currentTime = player.currentTime();
            const duration = player.duration();
            if (currentTime && duration) {
                this.saveResumeProgress(mediaItem, currentTime, duration);
            }
        });
        // On ended, remove from resume
        player.on('ended', () => {
            this.removeResumeProgress(mediaItem.path);
        });

        // Add custom 'Save for Later' button if not already present
        if (!player.controlBar.getChild('SaveForLaterButton')) {
            const Button = videojs.getComponent('Button');
            const SaveForLaterButton = videojs.extend(Button, {
                constructor: function() {
                    Button.apply(this, arguments);
                    this.controlText('Save for Later');
                },
                handleClick: () => {
                    const currentTime = player.currentTime();
                    const duration = player.duration();
                    this.saveResumeProgress(mediaItem, currentTime, duration);
                    this.showToast('Saved to Resume!');
                },
            });
            videojs.registerComponent('SaveForLaterButton', SaveForLaterButton);
            player.controlBar.addChild('SaveForLaterButton', {}, player.controlBar.children().length - 1);
            // Style the button (bookmark icon)
            const btn = player.controlBar.getChild('SaveForLaterButton');
            if (btn && btn.el()) {
                btn.el().innerHTML = '<span style="font-size:1.3em;">&#128278;</span>'; // Unicode bookmark icon
                btn.el().title = 'Save for Later';
            }
        }
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
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        grid.innerHTML = '';
        // If viewing a specific collection, show its movies
        if (this.currentCollectionView) {
            const collections = this.getCollections();
            const moviePaths = collections[this.currentCollectionView] || [];
            const movies = this.mediaLibrary.filter(item => moviePaths.includes(item.path));
            // Header with back and delete
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;gap:18px;margin-bottom:18px;';
            header.innerHTML = `
                <button id="backToCollectionsBtn" style="padding:6px 16px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">← Back</button>
                <h3 style="margin:0;font-size:1.2em;">${this.currentCollectionView}</h3>
                <button id="deleteCollectionBtn" style="margin-left:auto;padding:6px 16px;border-radius:6px;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:1em;">Delete Collection</button>
            `;
            grid.appendChild(header);
            header.querySelector('#backToCollectionsBtn').onclick = () => {
                this.currentCollectionView = null;
                this.renderCollectionsTab();
            };
            header.querySelector('#deleteCollectionBtn').onclick = () => {
                if (confirm(`Delete collection "${this.currentCollectionView}"?`)) {
                    const collections = this.getCollections();
                    delete collections[this.currentCollectionView];
                    this.saveCollections(collections);
                    this.currentCollectionView = null;
                    this.showToast('Collection deleted!');
                    this.renderCollectionsTab();
                }
            };
            // Movie grid
            const movieGrid = document.createElement('div');
            movieGrid.className = 'media-library-movie-grid';
            movies.forEach(item => {
                const card = document.createElement('div');
                card.className = 'media-library-movie-card';
                card.style.position = 'relative';
                card.innerHTML = `
                    <img src="${this.getPosterPath(item)}" alt="${item.title}">
                    <button class="remove-from-collection-btn" title="Remove from Collection" style="position:absolute;top:10px;right:10px;background:#e53935;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:1.2em;cursor:pointer;z-index:2;">&times;</button>
                    <div class="media-info"><h3>${this.cleanMovieTitle(item.title)}</h3></div>
                `;
                card.querySelector('.remove-from-collection-btn').onclick = (e) => {
                    e.stopPropagation();
                    const collections = this.getCollections();
                    collections[this.currentCollectionView] = collections[this.currentCollectionView].filter(p => p !== item.path);
                    this.saveCollections(collections);
                    this.showToast('Removed from collection!');
                    this.renderCollectionsTab();
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
            // Show all collections
            const collections = this.getCollections();
            const names = Object.keys(collections);
            if (names.length === 0) {
                grid.innerHTML = '<div style="padding:40px;text-align:center;color:#888;font-size:1.1em;">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
                return;
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
        // Remove any existing modal
        const existing = document.getElementById('movieDetailsModal');
        if (existing) existing.remove();
        // Modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'movieDetailsModal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.32);z-index:99999;display:flex;align-items:center;justify-content:center;';
        // Modal box
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:32px 32px 24px 32px;border-radius:14px;box-shadow:0 6px 32px rgba(0,0,0,0.22);min-width:340px;max-width:95vw;max-height:90vh;overflow-y:auto;position:relative;display:flex;gap:32px;';
        // Poster
        const poster = `<img src="${this.getPosterPath(movie)}" alt="${movie.title}" style="width:180px;max-width:40vw;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`;
        // Details
        const genres = (movie.genre || movie.genres || []).toString();
        const year = movie.year || (movie.releaseDate ? ('' + movie.releaseDate).slice(0,4) : '');
        const cast = Array.isArray(movie.cast) ? movie.cast.join(', ') : (movie.cast || '');
        const desc = movie.description || movie.overview || movie.plot || '';
        modal.innerHTML = `
            <button id="closeMovieDetailsModal" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5em;cursor:pointer;color:#888;">&times;</button>
            <div>${poster}</div>
            <div style="flex:1;min-width:220px;">
                <h2 style="margin-top:0;margin-bottom:10px;">${this.cleanMovieTitle(movie.title)}</h2>
                <div style="color:#888;font-size:1.05em;margin-bottom:8px;">${year ? year + ' • ' : ''}${genres}</div>
                <div style="margin-bottom:16px;">${desc ? desc : '<span style=\'color:#bbb\'>No description available.</span>'}</div>
                ${cast ? `<div style="margin-bottom:16px;"><b>Cast:</b> ${cast}</div>` : ''}
                <div style="display:flex;gap:16px;align-items:center;margin-bottom:10px;">
                    <button id="playMovieBtn" style="padding:10px 28px;border-radius:7px;background:#1976d2;color:#fff;border:none;cursor:pointer;font-size:1.1em;font-weight:bold;">▶ Play</button>
                    <button id="detailsFavoriteBtn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(movie.path) ? '❤️' : '🤍'}</button>
                    <button id="detailsCollectionBtn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.3em;line-height:1;">➕</button>
                </div>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // Close modal logic
        const closeModal = () => { overlay.remove(); };
        modal.querySelector('#closeMovieDetailsModal').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
        // Play button
        modal.querySelector('#playMovieBtn').onclick = () => {
            closeModal();
            this.playMedia(movie);
        };
        // Favorite button
        modal.querySelector('#detailsFavoriteBtn').onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite(movie.path);
            closeModal();
            this.showMovieDetailsModal(movie); // Reopen to update icon
        };
        // Collection button
        modal.querySelector('#detailsCollectionBtn').onclick = (e) => {
            e.stopPropagation();
            closeModal();
            this.showAddToCollectionModal(movie);
        };
    }
}

// Initialize the media library manager
window.mediaLibraryManager = new MediaLibraryManager(); 