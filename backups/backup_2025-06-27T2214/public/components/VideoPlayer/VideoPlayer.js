class VideoPlayer {
    constructor(containerId = 'video-player-container') {
        this.containerId = containerId;
        this.container = null;
        this.video = null;
        this.controls = null;
        this.isPlaying = false;
        this.currentFile = null;
        this.isFullscreen = false;
        this.isVisible = false;
        
        // Voice command patterns
        this.voiceCommands = [
            'video player open',
            'open video player',
            'play video',
            'video player',
            'show video player',
            'launch video player',
            'start video player',
            'video player start',
            'open video',
            'play local video',
            'local video player',
            'video player launch'
        ];
        
        this.init();
    }

    init() {
        this.createPlayer();
        this.setupEventListeners();
        this.setupVoiceCommandIntegration();
        this.setupTextCommandIntegration();
        console.log('🎬 [VIDEO-PLAYER] Video player initialized with voice/text command support');
    }

    setupVoiceCommandIntegration() {
        // Listen for voice commands from the main app
        document.addEventListener('voiceCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [VIDEO-PLAYER] Voice command detected:', command);
                this.openVideoPlayer();
                
                // Add a message to the chat about the voice command
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
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
                    console.log('🎬 [VIDEO-PLAYER] Direct speech recognition detected:', transcript);
                    this.openVideoPlayer();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
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
                console.log('🎬 [VIDEO-PLAYER] Text command detected:', command);
                this.openVideoPlayer();
                
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                }
            }
        });

        // Hook into the main sendMessage function if available
        if (window.sendMessage) {
            const originalSendMessage = window.sendMessage;
            window.sendMessage = (message, isGreeting = false) => {
                const lowerMessage = message.toLowerCase();
                if (this.voiceCommands.some(pattern => lowerMessage.includes(pattern))) {
                    console.log('🎬 [VIDEO-PLAYER] Text input command detected:', message);
                    this.openVideoPlayer();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                    }
                    return; // Don't send the command to the AI
                }
                
                // Call the original function
                return originalSendMessage(message, isGreeting);
            };
        }
    }

    // Method to check if a command should trigger the video player
    shouldTriggerVideoPlayer(command) {
        const lowerCommand = command.toLowerCase();
        return this.voiceCommands.some(pattern => lowerCommand.includes(pattern));
    }

    // Method to handle video player commands
    handleVideoPlayerCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        if (this.shouldTriggerVideoPlayer(lowerCommand)) {
            console.log('🎬 [VIDEO-PLAYER] Command handled:', command);
            this.openVideoPlayer();
            
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
            }
            return true; // Command was handled
        }
        
        return false; // Command was not handled
    }

    // Public method to register with the main app's command system
    registerWithCommandSystem() {
        if (window.registerCommandHandler) {
            window.registerCommandHandler('videoPlayer', (command) => {
                return this.handleVideoPlayerCommand(command);
            });
            console.log('🎬 [VIDEO-PLAYER] Registered with command system');
        }
    }

    createPlayer() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = this.containerId;
        this.container.className = 'video-player-container';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90vw;
            height: 90vh;
            background: #000;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            display: none;
            flex-direction: column;
            overflow: hidden;
        `;

        // Create Video.js video element
        this.video = document.createElement('video');
        this.video.className = 'video-js vjs-default-skin';
        this.video.setAttribute('controls', '');
        this.video.setAttribute('preload', 'auto');
        this.video.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #000;
        `;

        // Create custom controls
        this.createControls();

        // Create file browser button
        const fileButton = document.createElement('button');
        fileButton.className = 'video-player-file-btn';
        fileButton.innerHTML = '📁 Open Video File';
        fileButton.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            padding: 12px 20px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            z-index: 10001;
            transition: background 0.3s;
        `;
        fileButton.onmouseover = () => fileButton.style.background = 'rgba(0,0,0,0.9)';
        fileButton.onmouseout = () => fileButton.style.background = 'rgba(0,0,0,0.7)';
        fileButton.onclick = () => this.openFileBrowser();

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'video-player-close-btn';
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(255,0,0,0.8);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            z-index: 10001;
            transition: background 0.3s;
        `;
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255,0,0,1)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255,0,0,0.8)';
        closeButton.onclick = () => this.hide();

        // Create file input (hidden)
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = 'video/*';
        this.fileInput.style.display = 'none';
        this.fileInput.onchange = (e) => this.loadVideo(e.target.files[0]);

        // Assemble the player
        this.container.appendChild(this.video);
        this.container.appendChild(this.controls);
        this.container.appendChild(fileButton);
        this.container.appendChild(closeButton);
        this.container.appendChild(this.fileInput);

        // Add to page
        document.body.appendChild(this.container);

        // Initialize Video.js
        this.vjsPlayer = window.videojs(this.video, {
            controls: true,
            autoplay: false,
            preload: 'auto',
            fluid: true,
            aspectRatio: '16:9',
        });
    }

    createControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'video-player-controls';
        this.controls.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        // Play/Pause button
        this.playButton = document.createElement('button');
        this.playButton.innerHTML = '▶️';
        this.playButton.className = 'video-player-play-btn';
        this.playButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.3s;
        `;
        this.playButton.onclick = () => this.togglePlay();
        this.playButton.onmouseover = () => this.playButton.style.background = 'rgba(255,255,255,0.2)';
        this.playButton.onmouseout = () => this.playButton.style.background = 'transparent';

        // Progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'video-player-progress';
        this.progressBar.style.cssText = `
            flex: 1;
            height: 6px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
        `;

        this.progressFill = document.createElement('div');
        this.progressFill.style.cssText = `
            height: 100%;
            background: #ff0000;
            border-radius: 3px;
            width: 0%;
            transition: width 0.1s;
        `;

        this.progressBar.appendChild(this.progressFill);
        this.progressBar.onclick = (e) => this.seek(e);

        // Time display
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'video-player-time';
        this.timeDisplay.innerHTML = '0:00 / 0:00';
        this.timeDisplay.style.cssText = `
            color: white;
            font-size: 14px;
            font-family: monospace;
            min-width: 120px;
        `;

        // Volume control
        this.volumeControl = document.createElement('input');
        this.volumeControl.type = 'range';
        this.volumeControl.min = '0';
        this.volumeControl.max = '100';
        this.volumeControl.value = '100';
        this.volumeControl.className = 'video-player-volume';
        this.volumeControl.style.cssText = `
            width: 80px;
            height: 6px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        `;
        this.volumeControl.oninput = (e) => this.setVolume(e.target.value / 100);

        // Fullscreen button
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.innerHTML = '⛶';
        this.fullscreenButton.className = 'video-player-fullscreen-btn';
        this.fullscreenButton.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.3s;
        `;
        this.fullscreenButton.onclick = () => this.toggleFullscreen();
        this.fullscreenButton.onmouseover = () => this.fullscreenButton.style.background = 'rgba(255,255,255,0.2)';
        this.fullscreenButton.onmouseout = () => this.fullscreenButton.style.background = 'transparent';

        // Add controls to container
        this.controls.appendChild(this.playButton);
        this.controls.appendChild(this.progressBar);
        this.controls.appendChild(this.timeDisplay);
        this.controls.appendChild(this.volumeControl);
        this.controls.appendChild(this.fullscreenButton);
    }

    setupEventListeners() {
        // Video events
        this.video.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => this.onVideoEnd());
        this.video.addEventListener('click', () => this.togglePlay());

        // Container events for showing/hiding controls
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('mouseleave', () => this.hideControls());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Auto-hide controls timer
        this.controlsTimer = null;
    }

    openFileBrowser() {
        this.fileInput.click();
    }

    loadVideo(file) {
        if (!file) return;
        console.log('🎬 [VIDEO-PLAYER] Loading video:', file.name);
        this.currentFile = file;
        const url = URL.createObjectURL(file);
        // Use Video.js API to set the source
        this.vjsPlayer.src({
            src: url,
            type: file.type || 'video/mp4',
        });
        this.vjsPlayer.play();
        this.container.style.display = 'flex';
        this.isVisible = true;
        this.showMessage(`Loaded: ${file.name}`);
    }

    togglePlay() {
        if (this.vjsPlayer.paused()) {
            this.vjsPlayer.play();
            this.playButton.innerHTML = '⏸️';
            this.isPlaying = true;
        } else {
            this.vjsPlayer.pause();
            this.playButton.innerHTML = '▶️';
            this.isPlaying = false;
        }
    }

    seek(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        this.vjsPlayer.currentTime(percent * this.vjsPlayer.duration());
    }

    setVolume(volume) {
        this.vjsPlayer.volume(volume);
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.container.requestFullscreen();
            this.isFullscreen = true;
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    updateProgress() {
        if (this.vjsPlayer.duration()) {
            const percent = (this.vjsPlayer.currentTime() / this.vjsPlayer.duration()) * 100;
            this.progressFill.style.width = percent + '%';
            this.updateTimeDisplay();
        }
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.vjsPlayer.currentTime());
        const total = this.formatTime(this.vjsPlayer.duration());
        this.timeDisplay.innerHTML = `${current} / ${total}`;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showControls() {
        this.controls.style.opacity = '1';
        clearTimeout(this.controlsTimer);
        this.controlsTimer = setTimeout(() => this.hideControls(), 3000);
    }

    hideControls() {
        this.controls.style.opacity = '0';
    }

    onVideoEnd() {
        this.playButton.innerHTML = '▶️';
        this.isPlaying = false;
    }

    handleKeyboard(event) {
        if (!this.isVisible) return;

        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.vjsPlayer.currentTime(this.vjsPlayer.currentTime() - 10);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.vjsPlayer.currentTime(this.vjsPlayer.currentTime() + 10);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.vjsPlayer.volume(Math.min(1, this.vjsPlayer.volume() + 0.1));
                this.volumeControl.value = this.vjsPlayer.volume() * 100;
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.vjsPlayer.volume(Math.max(0, this.vjsPlayer.volume() - 0.1));
                this.volumeControl.value = this.vjsPlayer.volume() * 100;
                break;
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                } else {
                    this.hide();
                }
                break;
        }
    }

    showMessage(message) {
        // Create temporary message
        const msg = document.createElement('div');
        msg.innerHTML = message;
        msg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10002;
            pointer-events: none;
        `;
        
        this.container.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }

    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        console.log('🎬 [VIDEO-PLAYER] Video player shown');
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
        if (this.vjsPlayer.src()) {
            this.vjsPlayer.pause();
            URL.revokeObjectURL(this.vjsPlayer.src());
            this.vjsPlayer.src('');
        }
        console.log('🎬 [VIDEO-PLAYER] Video player hidden');
    }

    // Public method to open video player from external code
    openVideoPlayer() {
        this.show();
        this.openFileBrowser();
    }

    // Public method to toggle video player visibility
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.videoPlayer = new VideoPlayer();
    
    // Register with command system
    window.videoPlayer.registerWithCommandSystem();
    
    // Add keyboard shortcut to open video player (Ctrl+V)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            if (window.videoPlayer) {
                window.videoPlayer.openVideoPlayer();
            }
        }
    });
    
    console.log('🎬 [VIDEO-PLAYER] Auto-initialized with voice/text command support!');
    console.log('🎬 [VIDEO-PLAYER] Voice commands: "video player open", "open video player", "play video", etc.');
    console.log('🎬 [VIDEO-PLAYER] Keyboard shortcut: Ctrl+V');
});

// Export for module usage
export default VideoPlayer; 