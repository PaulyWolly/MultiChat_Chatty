# Interactive Poster Selector Tools

## Overview

The Interactive Poster Selector tools provide a visual web-based interface to browse and select the correct poster images for your movies and TV shows from TMDb. Instead of accepting whatever poster the automatic scripts find first, you can now see multiple options and choose the exact poster you want.

## Tools Available

### 🎬 Movie Poster Selector
- **Script**: `interactive_movie_poster_selector.js`
- **Port**: 3001
- **URL**: http://localhost:3001
- **Purpose**: Select correct movie posters

### 📺 TV Show Poster Selector  
- **Script**: `interactive_tv_poster_selector.js`
- **Port**: 3002
- **URL**: http://localhost:3002
- **Purpose**: Select correct TV show posters

## Features

### Visual Selection Interface
- **Multiple Options**: Shows up to 5 different movie/TV show matches from TMDb
- **Alternative Posters**: Displays main poster plus up to 3 alternative poster options for each match
- **Live Preview**: See exactly what each poster looks like before selecting
- **Movie Info**: Shows title, year, rating, and overview for each option
- **Progress Tracking**: Real-time progress bar and statistics during scanning

### Smart Matching
- **Intelligent Search**: Cleans up filenames to improve TMDb search results
- **Year Matching**: Uses release/air date years when available for better accuracy
- **Multiple Results**: Shows different TMDb entries in case the first match isn't correct

### Override System
- **Persistent Storage**: Saves your selections to override files
- **Integration**: Works with existing poster fetching scripts
- **Export/Import**: Export selections as JSON files for backup or sharing

## How to Use

### Step 1: Launch the Tool
Run from ScriptManager or directly:
```bash
# For movies
node scripts/interactive_movie_poster_selector.js

# For TV shows  
node scripts/interactive_tv_poster_selector.js
```

### Step 2: Scan Your Library
1. Click **"Scan Movies"** or **"Scan TV Shows"**
2. The tool will find all video files in your media directories
3. Wait for the scan to complete (shows progress bar)

### Step 3: Fetch Poster Options
- The tool automatically fetches multiple poster options from TMDb
- Shows progress as it processes each title
- Updates the display in real-time

### Step 4: Select Posters
- Browse through your media library
- Each title shows multiple poster options
- Click on the poster you want to use
- Selected posters are highlighted with a colored border
- Statistics show how many selections you've made

### Step 5: Save Selections
1. Click **"Save Selections"** to apply your choices
2. Your selections are saved to override files:
   - Movies: `poster_overrides.json`
   - TV Shows: `tv_poster_overrides.json`

### Step 6: Apply Selections
Run your normal poster fetching scripts - they will now use your selected posters:
- For movies: Run your movie poster script
- For TV shows: Run `fetch_tmdb_posters_tv-shows.js`

## File Locations

### Override Files
```
public/components/MediaLibrary/data/
├── poster_overrides.json          # Movie poster selections
├── tv_poster_overrides.json       # TV show poster selections
├── temp_poster_selections.json    # Temporary movie data
└── temp_tv_poster_selections.json # Temporary TV show data
```

### Media Directories
```
S:/MEDIA/
├── movies/     # Movie files location
└── tv-shows/   # TV show files location
```

## Interface Guide

### Main Controls
- **🔍 Scan**: Scan your media library for files
- **💾 Save Selections**: Save your poster choices
- **📤 Export Overrides**: Download override files as JSON
- **🗑️ Clear All**: Reset all selections

### Statistics Panel
- **Total Found**: Number of movies/TV shows discovered
- **With Posters**: How many have poster options from TMDb
- **Selected**: How many you've chosen posters for

### Poster Cards
Each poster option shows:
- **Poster Image**: Visual preview of the poster
- **Title**: Movie/TV show title from TMDb
- **Year**: Release/air date year
- **Rating**: TMDb user rating (⭐ 0.0-10.0)

### Selection States
- **Default**: Transparent border, clickable
- **Hover**: Gold border, slightly enlarged
- **Selected**: Green/Purple border, highlighted background

## Integration with Existing Scripts

### Movie Posters
The tool creates `poster_overrides.json` which is used by your existing movie poster scripts. The format is:
```json
{
  "S:/MEDIA/movies/Movie Name (2023)/movie.mp4": 12345
}
```
Where `12345` is the TMDb movie ID.

### TV Show Posters
The tool creates `tv_poster_overrides.json` for TV show scripts:
```json
{
  "Show Name (2023)": 67890
}
```
Where `67890` is the TMDb TV show ID.

## Troubleshooting

### No Poster Options Found
- **Check TMDb API Key**: Ensure `TMDB_API_KEY` is set in your `.env` file
- **Network Issues**: Verify internet connection and TMDb API access
- **Title Matching**: Some titles may not match well - try manual TMDb search

### Server Won't Start
- **Port Conflicts**: Make sure ports 3001 and 3002 are available
- **Dependencies**: Ensure `express` and `node-fetch` are installed
- **Permissions**: Check file system permissions for media directories

### Selections Not Saving
- **Directory Permissions**: Ensure write access to `public/components/MediaLibrary/data/`
- **Disk Space**: Check available disk space
- **File Locks**: Make sure override files aren't open in other programs

### Browser Issues
- **JavaScript Disabled**: Enable JavaScript in your browser
- **CORS Errors**: Access via `localhost` not file:// protocol
- **Cache Issues**: Try hard refresh (Ctrl+F5) or incognito mode

## Advanced Usage

### Custom Media Directories
Edit the script files to change media directory paths:
```javascript
// In the script files
const MOVIE_DIR = 'S:/MEDIA/movies/';
const TV_DIR = 'S:/MEDIA/tv-shows/';
```

### Different Ports
Change the port numbers if needed:
```javascript
// In the script files
const PORT = 3001; // or 3002 for TV shows
```

### Batch Operations
- Use **Export Overrides** to backup your selections
- Share override files between different setups
- Import selections by placing JSON files in the data directory

## Tips for Best Results

### Improve Matching
- Keep movie/TV show folder names clean and descriptive
- Include years in folder names when possible
- Remove excessive technical tags from filenames

### Selection Strategy
- Choose posters that match your preferred style/quality
- Consider consistency across your collection
- Select high-resolution options when available

### Workflow Efficiency
- Process movies and TV shows separately
- Work through one media type completely before switching
- Save selections frequently to avoid losing work

## Related Scripts

### Movie Scripts
- `scan_media_library_movies.js` - Scan movie library
- Movie poster fetching scripts (various)

### TV Show Scripts
- `scan_media_library_tv-shows.js` - Scan TV show library
- `fetch_tmdb_posters_tv-shows.js` - Fetch TV show posters
- `fetch_tmdb_tv-show_season_images.js` - Season images
- `fetch_tmdb_tv-show_episode_images.js` - Episode images

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify your TMDb API key is valid
3. Ensure media directories exist and are accessible
4. Check network connectivity to TMDb
5. Review file permissions for data directory

The tools are designed to be user-friendly and provide immediate visual feedback. Most issues can be resolved by checking the basic requirements (API key, network access, file permissions). 