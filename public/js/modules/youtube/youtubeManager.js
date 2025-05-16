/*
  YOUTUBE_MANAGER.js
  Version: 22.0.2
  AppName: Multi-Chat [v22.0.2]
  Updated: May 13, 2025 @4:45PM
  Created by Paul Welby
*/

import { elements, addMessageToChat, updateStatus } from '/js/dom.js';
import { MESSAGES } from '/js/config.js';
import { getPatterns } from '../utils/helpers.js';

// YouTube module state
const state = {
    isPlaying: false,
    videoContainer: null
};

/**
 * Handle YouTube-related requests
 */
export async function handleYoutubeRequest(messageText) {
    console.log('handleYoutubeRequest received:', messageText);
    const patterns = getPatterns();

    // Add user's message first
    addMessageToChat('user', messageText);

    // Check for play request first
    const isPlay = patterns.youtube.playVideo.test(messageText);

    // Extract query by removing YouTube-related terms
    let query = messageText.toLowerCase()
        .replace(/youtube/i, '')
        .replace(/play/i, '')
        .replace(/search/i, '')
        .replace(/for/i, '')
        .replace(/videos?/i, '')
        .replace(/about/i, '')
        .trim();

    try {
        const response = await fetch('/api/youtube/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                type: isPlay ? 'play' : 'search'
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success && (data.video || data.videos)) {
            const videos = data.video ? [data.video] : data.videos;
            const messageContent = {
                type: 'youtube',
                html: `
                    <div class="youtube-results">
                        <p>Found ${videos.length > 1 ? 'these videos' : 'this video'} about "${query}":</p>
                        <ol class="video-list">
                            ${videos.map(video => `
                                <li class="video-item">
                                    <div class="video-title">${video.title}</div>
                                    <div class="video-controls">
                                        <button class="youtube-popup-btn" data-video-id="${video.id}">
                                            Play in Popup
                                        </button>
                                        <a href="https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        class="youtube-direct-link">
                                            Watch on YouTube
                                        </a>
                                    </div>
                                </li>
                            `).join('')}
                        </ol>
                    </div>
                `
            };

            addMessageToChat('assistant', messageContent, { type: 'youtube' });

            // Add click handlers for popup buttons
            setTimeout(() => {
                document.querySelectorAll('.youtube-popup-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const videoId = e.target.getAttribute('data-video-id');
                        openYoutubePopup(videoId);
                    });
                });
            }, 100);
        }
        return true;
    } catch (error) {
        console.error('Error with YouTube request:', error);
        addMessageToChat('assistant', 'Sorry, there was an error processing your YouTube request.');
        return true;
    }
}

/**
 * Open a YouTube video in a popup window
 */
export function openYoutubePopup(videoId) {
    // Calculate dimensions for a wider window (90% of screen width, 16:9 aspect ratio)
    const width = Math.floor(window.screen.width * 0.9);
    const height = Math.floor(width * (9/16));
    const left = Math.floor((window.screen.width - width) / 2);
    const top = Math.floor((window.screen.height - height) / 2);

    const popup = window.open(
        `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
        'YouTubePlayer',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no`
    );

    if (popup) {
        popup.focus();
    } else {
        alert('Please allow popups for this site to play videos in a new window.');
    }
}

/**
 * Create or get the video container element
 */
export function createVideoContainer() {
    if (!state.videoContainer) {
        const container = document.createElement('div');
        container.id = 'youtube-container';
        container.className = 'youtube-container hidden';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'youtube-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => hideVideo();

        const videoWrapper = document.createElement('div');
        videoWrapper.id = 'youtube-video';
        videoWrapper.className = 'youtube-video';

        container.appendChild(closeBtn);
        container.appendChild(videoWrapper);
        document.body.appendChild(container);

        state.videoContainer = container;
    }
    return state.videoContainer;
}

/**
 * Show a YouTube video in the container
 */
export function showVideo(videoId) {
    const container = createVideoContainer();
    const videoWrapper = document.getElementById('youtube-video');
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
        iv_load_policy: '3'
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
                    showFallbackMessage(videoId);
                }
            } catch (e) {
                // If we can't access the iframe content (due to CORS), assume it's working
                console.log('Cannot check iframe content due to CORS, continuing playback');
            }
        }, 2000);
    };

    // Handle load errors
    iframe.onerror = () => {
        showFallbackMessage(videoId);
    };

    videoWrapper.appendChild(iframe);
    container.classList.remove('hidden');
    state.isPlaying = true;

    // Update app state
    updateStatus(MESSAGES.STATUS.VIDEO_PLAYING);
}

/**
 * Show fallback message when video can't be embedded
 */
export function showFallbackMessage(videoId) {
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

/**
 * Hide the video container
 */
export function hideVideo() {
    const container = state.videoContainer;
    if (container) {
        const videoWrapper = document.getElementById('youtube-video');
        videoWrapper.innerHTML = '';
        container.classList.add('hidden');
        state.isPlaying = false;
        console.log('[YOUTUBE] Ready');
    }
}

/**
 * Get the current YouTube module state
 */
export function getYoutubeState() {
    return {
        isPlaying: state.isPlaying
    };
} 