/*
  MEDIAMANAGER.JS
  Version: 1
  AppName: MultiChat_Chatty [v7]
  Created by Paul Welby and co-designed with AI for MediaManager modal UI
*/

class MediaManager {
  constructor() {
    this.isInitialized = false;
    this.htmlTemplate = null;
    this.containerElement = null;
    this.currentCastData = []; // Store full cast data including profile URLs
  }

  async init() {
    if (this.isInitialized) return;
    await Promise.all([
      this.loadCSS(),
      this.loadHTML()
    ]);
    this.createFromTemplate();
    this.setupElements();
    this.setupEventListeners();
    this.isInitialized = true;
    this.show();
  }

  async loadCSS() {
    return new Promise((resolve, reject) => {
      const existingLink = document.querySelector('link[href*="MediaManager.css"]');
      if (existingLink) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = './components/MediaManager/MediaManager.css';
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  async loadHTML() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('./components/MediaManager/MediaManager.html');
        if (!response.ok) throw new Error('Failed to fetch MediaManager.html');
        this.htmlTemplate = await response.text();
        resolve();
      } catch (err) { reject(err); }
    });
  }

  createFromTemplate() {
    const existing = document.querySelector('.media-manager-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
  }

  setupElements() {
    this.containerElement = document.querySelector('.media-manager-overlay');
    this.closeBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-close-btn') : null;
    this.tabMovie = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-movie') : null;
    this.tabTV = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-tv') : null;
    this.modeSingle = this.containerElement ? this.containerElement.querySelector('.media-manager-mode-single') : null;
    this.modeAll = this.containerElement ? this.containerElement.querySelector('.media-manager-mode-all') : null;
    this.contentSingle = this.containerElement ? this.containerElement.querySelector('.media-manager-content-single') : null;
    this.contentAll = this.containerElement ? this.containerElement.querySelector('.media-manager-content-all') : null;
    this.inputTitle = this.containerElement ? this.containerElement.querySelector('#media-manager-title') : null;
    this.inputPath = this.containerElement ? this.containerElement.querySelector('#media-manager-path') : null;
    this.fetchBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-fetch-btn') : null;
    this.posterImg = this.containerElement ? this.containerElement.querySelector('.media-manager-poster-img') : null;
    this.descInput = this.containerElement ? this.containerElement.querySelector('#media-manager-description') : null;
    this.castList = this.containerElement ? this.containerElement.querySelector('.media-manager-cast-list') : null;
    this.confirmBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-confirm-btn') : null;
    this.viewJsonBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-view-json-btn') : null;
    
    // Validation elements
    this.titleError = this.containerElement ? this.containerElement.querySelector('#title-error') : null;
    this.pathError = this.containerElement ? this.containerElement.querySelector('#path-error') : null;
    
    // JSON Editor elements
    this.jsonEditorOverlay = this.containerElement ? this.containerElement.querySelector('.json-editor-overlay') : null;
    this.jsonEditorTextarea = this.containerElement ? this.containerElement.querySelector('.json-editor-textarea') : null;
    this.jsonEditorCloseBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-close-btn') : null;
    this.jsonEditorCopyBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-copy-btn') : null;
    this.jsonEditorSaveBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-save-btn') : null;
    this.jsonEditorCancelBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-cancel-btn') : null;
  }

  setupEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.handleClose();
    }
    if (this.tabMovie && this.tabTV) {
      this.tabMovie.onclick = () => this.switchTab('movie');
      this.tabTV.onclick = () => this.switchTab('tv');
    }
    if (this.modeSingle && this.modeAll) {
      this.modeSingle.onclick = () => this.switchMode('single');
      this.modeAll.onclick = () => this.switchMode('all');
    }
    if (this.fetchBtn) {
      this.fetchBtn.onclick = () => this.handleFetchInfo();
    }
    if (this.confirmBtn) {
      this.confirmBtn.onclick = () => this.handleConfirm();
    }
    if (this.viewJsonBtn) {
      this.viewJsonBtn.onclick = () => this.handleViewJson();
    }
    
    // Add real-time validation
    if (this.inputTitle) {
      this.inputTitle.addEventListener('input', () => this.validateForm());
      this.inputTitle.addEventListener('blur', () => this.validateField('title'));
    }
    if (this.inputPath) {
      this.inputPath.addEventListener('input', () => this.validateForm());
      this.inputPath.addEventListener('blur', () => this.validateField('path'));
    }
    
    // JSON Editor event listeners
    if (this.jsonEditorCloseBtn) {
      this.jsonEditorCloseBtn.onclick = () => this.closeJsonEditor();
    }
    if (this.jsonEditorCopyBtn) {
      this.jsonEditorCopyBtn.onclick = () => this.copyJsonToClipboard();
    }
    if (this.jsonEditorSaveBtn) {
      this.jsonEditorSaveBtn.onclick = () => this.saveJsonChanges();
    }
    if (this.jsonEditorCancelBtn) {
      this.jsonEditorCancelBtn.onclick = () => this.closeJsonEditor();
    }
    
    // Add click outside to close for JSON editor
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.onclick = (e) => {
        if (e.target === this.jsonEditorOverlay) {
          this.closeJsonEditor();
        }
      };
    }
    
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // If JSON editor is open, close it first
      if (this.jsonEditorOverlay && this.jsonEditorOverlay.style.display === 'flex') {
        this.closeJsonEditor();
      } else {
        this.destroy();
      }
    }
  }

  handleClose() {
    this.destroy();
    if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
      setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
    }
  }

  async handleFetchInfo() {
    const title = this.inputTitle ? this.inputTitle.value.trim() : '';
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    if (!title) {
      if (window.showToast) {
        window.showToast('Please enter a title or TMDB ID.', 'error');
        console.error('[MediaManager] Please enter a title or TMDB ID.');
      }
      return;
    }
    try {
      if (window.showToast) {
        window.showToast('Fetching info from TMDB...', 'info');
        console.info('[MediaManager] Fetching info from TMDB...');
      }
      // If input is all digits, treat as TMDB ID
      const isId = /^\d+$/.test(title);
      const body = isId ? { type, tmdbId: title } : { type, title };
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch info');
      // Populate UI fields
      if (this.posterImg) this.posterImg.src = data.data.poster || '';
      if (this.descInput) this.descInput.value = data.data.description || '';
      if (this.castList) {
        this.castList.innerHTML = '';
        // Store the full cast data including profile URLs
        this.currentCastData = data.data.cast || [];
        
        this.currentCastData.forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item';
          
          // Create cast item with profile image if available
          if (actor.profile) {
            div.innerHTML = `
              <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
              <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
            `;
          } else {
            div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
          }
          
          this.castList.appendChild(div);
        });
      }
      if (window.showToast) {
        window.showToast('Fetched info from TMDB.', 'success');
        console.info('[MediaManager] Fetched info from TMDB.');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error: ' + err.message, 'error');
        console.error('[MediaManager] Error:', err.message);
      }
    }
  }

  async handleConfirm() {
    // Gather all modal data
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    const title = this.inputTitle ? this.inputTitle.value.trim() : '';
    const absPath = this.inputPath ? this.inputPath.value.trim() : '';
    const poster = this.posterImg ? this.posterImg.src : '';
    const description = this.descInput ? this.descInput.value.trim() : '';
    // Use the stored cast data that includes profile URLs
    let cast = this.currentCastData || [];
    // Try to extract year from title or description if possible
    let year = '';
    const yearMatch = title.match(/(19|20)\d{2}/);
    if (yearMatch) year = yearMatch[0];
    // Validate form before proceeding
    if (!this.validateForm()) {
      console.error('[MediaManager] Form validation failed.');
      return;
    }
    try {
      const res = await fetch('/api/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, absPath, poster, description, cast, title, year })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save info');
      if (window.showToast) {
        window.showToast('Saved info successfully.', 'success');
        console.info('[MediaManager] Saved info successfully.');
        console.info('[MediaManager] Key saved:', data.keySaved || '');
      }
      this.destroy();
      // Optionally refresh DETAILS page or media library
      if (window.mediaLibraryManager && typeof window.mediaLibraryManager.refresh === 'function') {
        window.mediaLibraryManager.refresh();
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error saving: ' + err.message, 'error');
        console.error('[MediaManager] Error saving:', err.message);
      }
    }
  }

  switchTab(tab) {
    if (tab === 'movie') {
      this.tabMovie.classList.add('active');
      this.tabTV.classList.remove('active');
    } else {
      this.tabMovie.classList.remove('active');
      this.tabTV.classList.add('active');
    }
    // Optionally update content for each tab
  }

  switchMode(mode) {
    if (mode === 'single') {
      this.modeSingle.classList.add('active');
      this.modeAll.classList.remove('active');
      if (this.contentSingle) this.contentSingle.style.display = 'block';
      if (this.contentAll) this.contentAll.style.display = 'none';
    } else {
      this.modeSingle.classList.remove('active');
      this.modeAll.classList.add('active');
      if (this.contentSingle) this.contentSingle.style.display = 'none';
      if (this.contentAll) this.contentAll.style.display = 'block';
    }
  }

  handleViewJson() {
    // Use the stored cast data that includes profile URLs
    let cast = this.currentCastData || [];
    
    // Populate the JSON editor with current cast data
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.value = JSON.stringify(cast, null, 2);
    }
    
    // Show the JSON editor modal
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'flex';
    }
  }

  closeJsonEditor() {
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'none';
    }
  }

  copyJsonToClipboard() {
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.select();
      document.execCommand('copy');
      if (window.showToast) {
        window.showToast('JSON copied to clipboard!', 'success');
        console.info('[MediaManager] JSON copied to clipboard');
      }
    }
  }

  saveJsonChanges() {
    if (!this.jsonEditorTextarea) return;
    
    try {
      const jsonText = this.jsonEditorTextarea.value.trim();
      if (!jsonText) {
        if (window.showToast) {
          window.showToast('Please enter valid JSON data.', 'error');
          console.error('[MediaManager] Empty JSON data');
        }
        return;
      }
      
      const cast = JSON.parse(jsonText);
      
      // Validate the structure
      if (!Array.isArray(cast)) {
        throw new Error('Cast data must be an array');
      }
      
      // Validate each cast member
      for (let i = 0; i < cast.length; i++) {
        const member = cast[i];
        if (typeof member !== 'object' || !member.name) {
          throw new Error(`Cast member ${i + 1} must have a "name" field`);
        }
      }
      
      // Update the stored cast data
      this.currentCastData = cast;
      
      // Update the cast list in the main modal
      if (this.castList) {
        this.castList.innerHTML = '';
        cast.forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item';
          
          // Create cast item with profile image if available
          if (actor.profile) {
            div.innerHTML = `
              <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
              <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
            `;
          } else {
            div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
          }
          
          this.castList.appendChild(div);
        });
      }
      
      // Close the JSON editor
      this.closeJsonEditor();
      
      if (window.showToast) {
        window.showToast('Cast data updated successfully!', 'success');
        console.info('[MediaManager] Cast data updated from JSON editor');
      }
      
    } catch (error) {
      if (window.showToast) {
        window.showToast('Invalid JSON: ' + error.message, 'error');
        console.error('[MediaManager] JSON validation error:', error.message);
      }
    }
  }

  validateField(fieldName) {
    const field = fieldName === 'title' ? this.inputTitle : this.inputPath;
    const errorElement = fieldName === 'title' ? this.titleError : this.pathError;
    const value = field ? field.value.trim() : '';
    
    if (!value) {
      if (field) field.classList.add('error');
      if (errorElement) errorElement.textContent = fieldName === 'title' ? 'Title or TMDB ID is required' : 'File/Folder Path is required';
      if (errorElement) errorElement.style.display = 'block';
      return false;
    }
    // For path, require a full file path ending in .mp4, .mkv, .avi, or .mov
    if (fieldName === 'path') {
      if (!/\.(mp4|mkv|avi|mov)$/i.test(value)) {
        if (field) field.classList.add('error');
        if (errorElement) errorElement.textContent = 'Please enter the full file path, including the filename and extension (e.g., .mp4)';
        if (errorElement) errorElement.style.display = 'block';
        return false;
      }
    }
    if (field) field.classList.remove('error');
    if (errorElement) errorElement.style.display = 'none';
    return true;
  }

  validateForm() {
    const titleValid = this.validateField('title');
    const pathValid = this.validateField('path');
    const isFormValid = titleValid && pathValid;
    
    // Enable/disable submit button
    if (this.confirmBtn) {
      this.confirmBtn.disabled = !isFormValid;
      this.confirmBtn.style.opacity = isFormValid ? '1' : '0.5';
      this.confirmBtn.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
    }
    
    return isFormValid;
  }

  show() {
    if (this.containerElement) this.containerElement.style.display = 'flex';
    // Initialize form validation
    this.validateForm();
  }

  destroy() {
    if (this.containerElement) this.containerElement.remove();
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
} 