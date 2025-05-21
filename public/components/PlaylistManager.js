import playlistService from '../services/playlist.service.js';

export class PlaylistManager {
  constructor() {
    this.dialog = null;
    this.currentVideo = null;
    this.playlists = [];
    this.selectedPlaylistId = null;
    this.init();
  }

  async init() {
    console.log('PlaylistManager.init() called');
    // Create dialog element
    this.dialog = document.createElement('div');
    this.dialog.className = 'playlist-manager-dialog';
    this.dialog.style.display = 'none';  // Start hidden
    this.dialog.style.position = 'fixed';
    this.dialog.style.top = '0';
    this.dialog.style.left = '0';
    this.dialog.style.width = '100%';
    this.dialog.style.height = '100%';
    this.dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.dialog.style.zIndex = '9999';
    
    this.dialog.innerHTML = `
      <div class="playlist-manager-content">
        <div class="playlist-manager-header">
          <h2>Playlist Manager</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="playlist-manager-body">
          <div class="playlist-list">
            <div class="playlist-actions">
              <input type="text" class="new-playlist-input" placeholder="New playlist name">
              <button class="create-playlist-btn">Create Playlist</button>
            </div>
            <div class="playlists-container"></div>
          </div>
          <div class="playlist-content">
            <div class="current-playlist-header">
              <h3 class="current-playlist-name">Select a playlist</h3>
            </div>
            <div class="pending-video-container"></div>
            <div class="videos-container"></div>
            <button class="add-to-playlist-btn" disabled>Add to Playlist</button>
          </div>
        </div>
      </div>
    `;

    // Add to DOM immediately
    document.body.appendChild(this.dialog);
    console.log('Dialog added to DOM');

    // Add event listeners
    this.dialog.querySelector('.close-btn').addEventListener('click', () => this.hide());
    this.dialog.querySelector('.create-playlist-btn').addEventListener('click', () => this.createPlaylist());
    this.dialog.querySelector('.add-to-playlist-btn').addEventListener('click', () => this.addCurrentVideoToPlaylist());
    
    console.log('PlaylistManager initialization complete');
  }

  async show(video = null) {
    console.log('PlaylistManager.show() called with video:', video);
    this.currentVideo = video;
    try {
      await this.loadPlaylists();
      this.renderPendingVideo();
      this.dialog.style.display = 'flex';
      this.dialog.style.justifyContent = 'center';
      this.dialog.style.alignItems = 'center';
      console.log('Dialog should now be visible');
    } catch (error) {
      console.error('Error showing playlist manager:', error);
      this.showError('Failed to load playlists. Please try again.');
    }
  }

  hide() {
    this.dialog.style.display = 'none';
    this.currentVideo = null;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.dialog.querySelector('.playlist-manager-content').insertBefore(
      errorDiv,
      this.dialog.querySelector('.playlist-manager-body')
    );
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async loadPlaylists() {
    try {
      const response = await playlistService.getPlaylists();
      this.playlists = response.playlists;
      this.renderPlaylists();
    } catch (error) {
      console.error('Failed to load playlists:', error);
      throw error;
    }
  }

  renderPlaylists() {
    const container = this.dialog.querySelector('.playlists-container');
    container.style.marginTop = '18px';
    container.innerHTML = this.playlists.map(playlist => `
      <div class="playlist-item${playlist._id === this.selectedPlaylistId ? ' active' : ''}" data-id="${playlist._id}" style="cursor:pointer;">
        <span class="playlist-name">${playlist.name}</span>
        <span class="playlist-count">(${playlist.videos.length})</span>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-playlist-btn') || e.target.classList.contains('submit-rename-btn') || e.target.classList.contains('rename-playlist-input')) return;
        this.selectPlaylist(item.dataset.id);
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        try {
          const video = JSON.parse(e.dataTransfer.getData('application/json'));
          await this.addVideoToPlaylistById(item.dataset.id, video);
        } catch (err) {
          this.showError('Failed to add video by drag-and-drop.');
        }
      });
      item.style.cursor = 'pointer';
    });

    // Render the active playlist name with pencil above the table
    const headerContainer = this.dialog.querySelector('.current-playlist-header');
    headerContainer.style.position = 'relative';
    const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
    if (playlist) {
      headerContainer.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <h3 class="current-playlist-name" style="display:inline-block;font-weight:bold;vertical-align:middle;">${playlist.name}</h3>
          <button class="edit-playlist-btn" title="Rename Playlist" data-id="${playlist._id}" style="font-size:1.1em;vertical-align:middle;background:transparent;border:none;cursor:pointer;">&#9998;</button>
          <span class="rename-controls" style="display:none;margin-left:8px;">
            <input type="text" class="rename-playlist-input" value="${playlist.name}" style="font-size:1em;width:120px;">
            <button class="submit-rename-btn" data-id="${playlist._id}" style="font-size:1em;">✔</button>
          </span>
        </div>
      `;
      const btn = headerContainer.querySelector('.edit-playlist-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        headerContainer.querySelector('.current-playlist-name').style.display = 'none';
        btn.style.display = 'none';
        const controls = headerContainer.querySelector('.rename-controls');
        controls.style.display = 'inline-block';
        controls.querySelector('.rename-playlist-input').focus();
      });
      const submitBtn = headerContainer.querySelector('.submit-rename-btn');
      submitBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const input = headerContainer.querySelector('.rename-playlist-input');
        const newName = input.value.trim();
        if (!newName) return;
        await this.renamePlaylist(submitBtn.dataset.id, newName);
        headerContainer.querySelector('.current-playlist-name').textContent = newName;
        headerContainer.querySelector('.current-playlist-name').style.display = '';
        btn.style.display = '';
        headerContainer.querySelector('.rename-controls').style.display = 'none';
      });
    } else {
      headerContainer.innerHTML = '<h3 class="current-playlist-name">Select a playlist</h3>';
    }
    // Always render the pending video in the header area, even if no playlist is selected
    this.renderPendingVideo();
  }

  async selectPlaylist(playlistId) {
    this.selectedPlaylistId = playlistId;
    const playlist = this.playlists.find(p => p._id === playlistId);
    if (playlist) {
      this.dialog.querySelector('.current-playlist-name').textContent = playlist.name;
      this.renderVideos(playlist.videos);
    }
    this.renderPlaylists();
    const addBtn = this.dialog.querySelector('.add-to-playlist-btn');
    addBtn.disabled = !playlistId;
  }

  renderVideos(videos) {
    const container = this.dialog.querySelector('.videos-container');
    container.innerHTML = `
      <table class="playlist-videos-table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Title</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${videos.map(video => `
            <tr class="playlist-video-row">
              <td><img class="video-thumbnail" src="${video.thumbnail}" alt="${video.title}" title="${video.title}" /></td>
              <td>${video.title}</td>
              <td style="text-align:right;">
                <button class="action-btn view-video-btn" title="View/Play" data-local-url="${video.localUrl || ''}">&#128065;</button>
                <button class="action-btn remove-video-btn" title="Remove" data-id="${video.videoId}">&#128465;</button>
                <select class="move-to-playlist">
                  <option value="">Move to...</option>
                  ${this.playlists.filter(p => p._id !== this.selectedPlaylistId).map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Add event listeners for actions
    container.querySelectorAll('.view-video-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.localUrl;
        const title = btn.closest('tr').querySelector('td:nth-child(2)').textContent;
        this.hide();
        setTimeout(() => {
          if (url) showLocalVideoModal(url, title);
        }, 200);
      });
    });
    container.querySelectorAll('.remove-video-btn').forEach(btn => {
      btn.addEventListener('click', () => this.removeVideo(btn.dataset.id));
    });
    container.querySelectorAll('.move-to-playlist').forEach(select => {
      select.addEventListener('change', (e) => {
        if (e.target.value) {
          this.moveVideo(select.closest('tr').querySelector('.remove-video-btn').dataset.id, e.target.value);
          e.target.value = '';
        }
      });
    });
  }

  async createPlaylist() {
    const input = this.dialog.querySelector('.new-playlist-input');
    const name = input.value.trim();
    if (!name) return;

    try {
      await playlistService.createPlaylist(name);
      input.value = '';
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to create playlist. Please try again.');
    }
  }

  async renamePlaylist(playlistId, name) {
    if (!playlistId) return;
    try {
      await playlistService.renamePlaylist(playlistId, name);
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to rename playlist. Please try again.');
    }
  }

  async removeVideo(videoId) {
    if (!this.selectedPlaylistId) return;

    try {
      await playlistService.removeVideoFromPlaylist(this.selectedPlaylistId, videoId);
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to remove video. Please try again.');
    }
  }

  async moveVideo(videoId, targetPlaylistId) {
    if (!this.selectedPlaylistId) return;

    try {
      await playlistService.moveVideo(this.selectedPlaylistId, videoId, targetPlaylistId);
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to move video. Please try again.');
    }
  }

  renderPendingVideo() {
    // Only render the pending video absolutely next to the playlist name header
    const headerContainer = this.dialog.querySelector('.current-playlist-header');
    // Remove any old pending video container
    const oldPending = this.dialog.querySelector('.pending-video-container');
    if (oldPending) oldPending.innerHTML = '';
    // Remove any previous .pending-video-abs
    const prevAbs = headerContainer.querySelector('.pending-video-abs');
    if (prevAbs) prevAbs.remove();
    if (!this.currentVideo || !headerContainer) return;
    // Create and append the absolutely positioned pending video
    const absDiv = document.createElement('div');
    absDiv.className = 'pending-video-abs';
    absDiv.innerHTML = `
      <div class="pending-video" draggable="true" id="pending-video">
        <span class="drag-icon" style="font-size: 2.2em; margin-right: 14px; cursor: grab; color: #2196f3;">&#9776;</span>
        <img src="${this.currentVideo.thumbnail}" alt="" />
        <span style="font-weight:bold; margin-left:10px;">${this.currentVideo.title || 'Untitled Video'}</span>
        <span style="color:#2196f3;margin-left:18px;">Drag to playlist</span>
      </div>
    `;
    headerContainer.appendChild(absDiv);
    const pending = absDiv.querySelector('.pending-video');
    pending.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(this.currentVideo));
    });
  }

  async addCurrentVideoToPlaylist() {
    if (!this.selectedPlaylistId || !this.currentVideo) return;
    try {
      await playlistService.addVideoToPlaylist(this.selectedPlaylistId, {
        videoId: this.currentVideo.id || this.currentVideo.videoId,
        title: this.currentVideo.title && this.currentVideo.title.trim() ? this.currentVideo.title : 'Untitled Video',
        thumbnail: this.currentVideo.thumbnail
      });
      this.showError('Video added to playlist!');
      await this.loadPlaylists();
      this.renderVideos(this.playlists.find(p => p._id === this.selectedPlaylistId)?.videos || []);
      this.currentVideo = null;
      this.renderPendingVideo();
    } catch (error) {
      this.showError('Failed to add video to playlist.');
    }
    this.currentVideo = null;
    this.renderPendingVideo();
  }

  async addVideoToPlaylistById(playlistId, video) {
    try {
      await playlistService.addVideoToPlaylist(playlistId, {
        videoId: video.id || video.videoId,
        title: video.title && video.title.trim() ? video.title : 'Untitled Video',
        thumbnail: video.thumbnail
      });
      this.showError('Video added to playlist!');
      await this.loadPlaylists();
      this.renderVideos(this.playlists.find(p => p._id === playlistId)?.videos || []);
      this.currentVideo = null;
      this.renderPendingVideo();
    } catch (error) {
      this.showError('Failed to add video to playlist.');
    }
  }
}

// Create and export a singleton instance
const playlistManager = new PlaylistManager();

export default playlistManager; 