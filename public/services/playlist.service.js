class PlaylistService {
  constructor() {
    this.baseUrl = '/api/playlists';
  }

  async getPlaylists() {
    try {
      const response = await fetch(`${this.baseUrl}?sessionId=${window.sessionId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch playlists');
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  async createPlaylist(name) {
    try {
      const response = await fetch(`${this.baseUrl}?sessionId=${window.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playlist');
      }
      return response.json();
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async addVideoToPlaylist(playlistId, video) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/videos?sessionId=${window.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(video)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add video to playlist');
      }
      return response.json();
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw error;
    }
  }

  async removeVideoFromPlaylist(playlistId, videoEntryId) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/videos/${videoEntryId}?sessionId=${window.sessionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove video from playlist');
      }
      return response.json();
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      throw error;
    }
  }

  async renamePlaylist(playlistId, newName) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}?sessionId=${window.sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename playlist');
      }
      return response.json();
    } catch (error) {
      console.error('Error renaming playlist:', error);
      throw error;
    }
  }

  async moveVideo(playlistId, videoEntryId, targetPlaylistId) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/move?sessionId=${window.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoEntryId, targetPlaylistId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move video');
      }
      return response.json();
    } catch (error) {
      console.error('Error moving video:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}?sessionId=${window.sessionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete playlist');
      }
      return response.json();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  async renameVideoTitle(playlistId, videoEntryId, newTitle) {
    try {
      const response = await fetch(`${this.baseUrl}/${playlistId}/videos/${videoEntryId}/title?sessionId=${window.sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename video title');
      }
      return response.json();
    } catch (error) {
      console.error('Error renaming video title:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const playlistService = new PlaylistService();

export default playlistService; 