# Script Manager - Admin Panel Feature

## Overview

The Script Manager is a comprehensive tool integrated into the Admin Panel that provides a user-friendly interface to view, categorize, and execute all scripts in the `/scripts` folder. It replaces the basic script runner with a more organized and feature-rich system.

## Features

### 📁 Categorized Script Management
Scripts are automatically categorized into logical groups:
- **🎬 Movies**: Movie-related scripts (posters, scanning, etc.)
- **📺 TV Shows**: TV show scripts (posters, season/episode images, etc.)
- **⚙️ System**: System maintenance scripts (backup, cleanup, etc.)
- **🎵 Audio**: Audio processing scripts
- **📹 YouTube**: YouTube-related scripts
- **🔧 Fixes**: Bug fix scripts
- **💻 Development**: Development and utility scripts

### 🔍 Script Information
Each script displays:
- Script name and category
- File size and modification date
- Description of what the script does
- Category icon and color coding

### ▶️ Script Execution
- One-click script execution
- Real-time output logging
- Error handling and status reporting
- Execution history

### 👁️ Script Viewing
- View script source code
- Syntax highlighting
- Modal-based code viewer
- Security-protected access

## Access

1. Open the Admin Panel
2. Navigate to the "Script Runner" tab
3. Click the "Open Script Manager" button
4. The Script Manager modal will open with all categorized scripts

## Usage

### Running Scripts
1. Open the Script Manager
2. Browse scripts by category or view all scripts
3. Click the "▶️ Run" button on any script
4. Monitor execution in the script log
5. View results and any error messages

### Viewing Script Code
1. Click the "👁️ View" button on any script
2. A modal will open showing the script's source code
3. Close the modal when finished

### Filtering Scripts
1. Use the category buttons on the left sidebar
2. Click "📁 All Scripts" to view all scripts
3. Each category shows only relevant scripts

## API Endpoints

The Script Manager uses several backend API endpoints:

### GET `/api/admin/scripts`
Returns a list of all scripts with metadata:
```json
{
  "script_name.js": {
    "name": "script_name.js",
    "size": "1.2 KB",
    "modified": "2025-01-01T00:00:00.000Z",
    "category": "tv-shows",
    "description": "Script description"
  }
}
```

### GET `/api/admin/script-content/:scriptName`
Returns the source code of a specific script:
```json
{
  "success": true,
  "content": "// Script source code here..."
}
```

### POST `/api/admin/run-script`
Executes a script and returns the output:
```json
{
  "script": "script_name.js"
}
```

## Security Features

- **Path Validation**: Script execution is restricted to the `/scripts` directory
- **Real Path Checking**: Prevents directory traversal attacks
- **Admin Authentication**: Requires admin privileges to access
- **Input Sanitization**: Script names are validated before execution

## Script Categories

### Movies 🎬
- `scan_media_library_movies.js` - Scan movie library for new content
- `fetch_tv_posters.js` - Fetch movie posters
- `convert_tv_posters.js` - Convert poster formats

### TV Shows 📺
- `scan_media_library_tv-shows.js` - Scan TV show library
- `fetch_tmdb_posters_tv-shows.js` - Fetch TV show posters from TMDb
- `fetch_tmdb_tv-show_season_images.js` - Fetch season poster image URLs
- `fetch_tmdb_tv-show_episode_images.js` - Fetch episode still image URLs
- `download_tv_images.js` - Download actual image files
- `setup_tmdb.js` - Setup TMDb API configuration
- `test_tv_images.js` - Test TV show image integration

### System ⚙️
- `BACKUP_APP.js` - Create application backup
- `RESTORE_BACKUP.js` - Restore from backup
- `RESTORE_APP.js` - Restore application
- `AI_BKUP.js` - AI backup functionality
- `scan_media_library.js` - General media library scan
- `scan_emby_posters.js` - Scan Emby posters
- `generate-superadmin-code.js` - Generate admin access codes
- `test-auth.js` - Test authentication
- `check_video_player_setup.js` - Check video player configuration
- `start-with-config.js` - Start with configuration
- `start-frontend-with-config.js` - Start frontend with config

### Audio 🎵
- `convert_audio_to_aac.js` - Convert audio to AAC format
- `scan_audio_codecs.js` - Scan audio codecs
- `check_audio_codecs.js` - Check audio codec compatibility
- `convert_incompatible_audio.js` - Convert incompatible audio

### YouTube 📹
- `repopulate-youtube-cache.js` - Repopulate YouTube cache
- `refresh-youtube-cache.js` - Refresh YouTube cache
- `migrate-youtube-queries.js` - Migrate YouTube queries
- `clear-youtube-cache.js` - Clear YouTube cache
- `migrate_playlist_videos.js` - Migrate playlist videos

### Fixes 🔧
- `fix_json_linebreaks.js` - Fix JSON line break issues
- `fix-joke-audio-syntax.js` - Fix joke audio syntax
- `fix-playNextInQueue-placement.js` - Fix queue placement
- `fix-joke-audio-mode.js` - Fix audio mode issues
- `fix-joke-audio-playback-v2.js` - Fix audio playback v2
- `fix-joke-audio-playback.js` - Fix audio playback
- `fix-enterAISpeakingMode-error.js` - Fix AI speaking mode
- `fix-duplicate-appjs.js` - Fix duplicate app.js
- `fix-duplicate-function-code.js` - Fix duplicate functions
- `fix-api-urls.js` - Fix API URLs

### Development 💻
- `playlist-duration-backfill.js` - Backfill playlist durations
- `merge-santana-json.js` - Merge Santana JSON data
- `merge-playlist-duplicates.js` - Merge duplicate playlists
- `convert_old_to_new_cachekeys_for_santanta.js` - Convert cache keys
- `clean-localStorage-cache.js` - Clean localStorage cache
- `update_release-notes_readme.mjs` - Update release notes
- `update_headers.mjs` - Update headers
- `see_colors.js` - Color utility
- `refactor-api-calls.js` - Refactor API calls
- `download-icons.js` - Download icons
- `download-mock-thumbs.js` - Download mock thumbnails
- `VALIDATE_FUNCTIONS.js` - Validate functions
- `test_script_manager.js` - Test ScriptManager integration

## Technical Implementation

### Frontend Components
- `ScriptManager.js` - Main component logic
- `ScriptManager.html` - HTML template
- `ScriptManager.css` - Styling

### Integration
- Integrated into `AdminPanel.js`
- Loads dynamically when Admin Panel opens
- Uses existing admin authentication system

### Error Handling
- Graceful fallback if API is unavailable
- Detailed error messages for debugging
- Timeout handling for long-running scripts

## Future Enhancements

- Script scheduling and automation
- Script dependencies and prerequisites
- Script execution history and logs
- Script performance metrics
- Custom script creation interface
- Script templates and wizards

## Troubleshooting

### Script Not Appearing
- Check if the script file exists in `/scripts` directory
- Verify the script has `.js` or `.mjs` extension
- Check server logs for any errors

### Script Execution Fails
- Verify script has proper Node.js syntax
- Check script dependencies are installed
- Review script output for error messages
- Ensure proper file permissions

### API Errors
- Check server is running
- Verify admin authentication
- Review server logs for detailed errors
- Check network connectivity

## Support

For issues with the Script Manager:
1. Check the browser console for JavaScript errors
2. Review server logs for backend errors
3. Test individual scripts manually
4. Verify Admin Panel authentication is working 