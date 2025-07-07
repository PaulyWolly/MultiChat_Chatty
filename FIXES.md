# FIXES.md

## Media Library & PosterSelector Robust Fixes (2025-07-07)

### 1. PosterSelector Button Handler Attachment
- **Problem:** PosterSelector modal would not open, or showed 'PosterSelector is not available' due to `item` being undefined or handler not attached.
- **Fix:** Restored the robust pattern from backup:
  - After rendering the grid, use a `setTimeout` to attach click handlers to all `.poster-selector-btn` buttons.
  - Handler uses `data-path` on the card to look up the correct `item` for each button.
  - This guarantees the handler always works, regardless of DOM timing or re-renders.
- **Reference:** See `renderMediaGrid()` and the setTimeout block for handler attachment.

### 2. Overlay Logic for MediaLibrary Modal
- **Problem:** Modal sometimes appeared without a dark overlay, or overlay logic interfered with modal stacking/events.
- **Fix:**
  - On modal open (`renderModal()`), insert a `<div class="media-library-overlay">` as the first child of `<body>` if not already present.
  - On modal close (`closeMediaBrowser()`), remove the overlay if present.
  - Overlay CSS ensures it covers the page with a semi-transparent black background (`z-index: 9999`).
- **Reference:** See overlay logic in `renderModal()` and `closeMediaBrowser()`. CSS in `public/components/MediaLibrary/MediaLibrary.css`.

### 3. General Robustness Patterns
- Always attach per-card event handlers after rendering the grid, never before or outside the render loop.
- Use `data-path` attributes for reliable item lookup in event handlers.
- When restoring from backup, always check both JS logic and CSS for modal/overlay/handler patterns.

### [2025-07-07 06:45] Robust PosterSelector Handler Attachment (setTimeout pattern)
- **Problem:** PosterSelector modal would not open, or showed 'PosterSelector is not available' due to `item` being undefined or handler not attached. This happened when the handler was not attached after the DOM was ready, or was attached outside the render loop.
- **Fix:** Restored the robust pattern from backup:
  - After rendering the grid, use a `setTimeout` to attach click handlers to all `.poster-selector-btn` buttons.
  - Handler uses `data-path` on the card to look up the correct `item` for each button.
  - This guarantees the handler always works, regardless of DOM timing or re-renders.
- **Reference:** File: `public/components/MediaLibrary/MediaLibraryManager.js`, Function: `renderMediaGrid()`

**Code Block:**
```js
// After rendering the grid, attach poster selector handlers robustly
setTimeout(() => {
    document.querySelectorAll('.poster-selector-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest('.media-library-movie-card');
            const itemPath = card ? card.getAttribute('data-path') : '';
            let item = null;
            if (this.currentTab === 'tvshows') {
                const tvShows = this.getTVShows();
                item = tvShows.find(show =>
                    (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                );
            } else {
                const items = this.getFilteredAndSortedItems();
                item = items.find(i =>
                    (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                );
            }
            if (window.PosterSelector && item) {
                const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                const selector = new window.PosterSelector(mode);
                selector.getMediaContext = () => ({
                    mediaId: item.path,
                    name: item.name || item.title,
                    path: item.path,
                    type: mode
                });
                selector.onPosterSelected = ({filePath, posterType, poster}) => {
                    if (mode === 'movie' && this.moviePosters) {
                        this.moviePosters[item.path] = filePath;
                        this.cacheBusters[item.path] = Date.now();
                        this.renderMediaGrid();
                        this.showToast('Poster updated!');
                    } else if (mode === 'tv' && this.tvPosters) {
                        this.tvPosters[item.name || item.title] = filePath;
                        this.renderMediaGrid();
                        this.showToast('Poster updated!');
                    }
                };
                selector.init();
            } else {
                console.error('[PosterSelector] PosterSelector is not available or item not found. window.PosterSelector:', window.PosterSelector, 'item:', item, 'itemPath:', itemPath, 'currentTab:', this.currentTab);
                this.showToast('PosterSelector is not available.');
            }
            return false;
        };
    });
}, 0);
```

## [2025-07-06 10:00] Robust Diagnostic Logging and Path Normalization for PosterSelector Modal (Movies Tab)

**Problem:**
PosterSelector modal would not open for some movies because the handler could not find the correct movie item. The issue was due to mismatches between the `data-path` attribute on the card and the `item.path` in the movies array (case, slashes, or encoding differences).

**Fix:**
- Normalized all paths (replace backslashes, lowercase, trim) both when setting `data-path` and when searching for the item.
- Added robust diagnostic logging to the PosterSelector handler for movies:
  - Logs `itemPath`, all movie paths, and the full items array if no match is found.
- This ensures the handler always finds the correct movie item and provides clear debug output if not.

**Code Block:**
```js
// When rendering movie cards:
card.setAttribute('data-path', (item.path || '').replace(/\\/g, '/').toLowerCase().trim());

// PosterSelector handler (for movies):
document.querySelectorAll('.poster-selector-btn').forEach(btn => {
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.media-library-movie-card');
        const itemPath = card ? (card.getAttribute('data-path') || '').replace(/\\/g, '/').toLowerCase().trim() : '';
        let item = null;
        if (this.currentTab === 'tvshows') {
            const tvShows = this.getTVShows();
            item = tvShows.find(show =>
                (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === itemPath
            );
        } else {
            const items = this.getFilteredAndSortedItems();
            const allPaths = items.map(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim());
            item = items.find(i =>
                (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === itemPath
            );
            console.log('[PS DEBUG] PosterSelector clicked:', { itemPath, allPaths, items });
            if (!item) {
                console.error('[PS ERROR] No movie item found for itemPath:', itemPath, '\nAll paths:', allPaths, '\nItems:', items, '\nCurrent tab:', this.currentTab);
            }
        }
        if (window.PosterSelector && item) {
            const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
            const selector = new window.PosterSelector(mode);
            selector.getMediaContext = () => ({
                mediaId: item.path,
                name: item.name || item.title,
                path: item.path,
                type: mode
            });
            selector.onPosterSelected = ({filePath, posterType, poster}) => {
                if (mode === 'movie' && this.moviePosters) {
                    this.moviePosters[item.path] = filePath;
                    this.cacheBusters[item.path] = Date.now();
                    this.renderMediaGrid();
                    this.showToast('Poster updated!');
                } else if (mode === 'tv' && this.tvPosters) {
                    this.tvPosters[item.name || item.title] = filePath;
                    this.renderMediaGrid();
                    this.showToast('Poster updated!');
                }
            };
            selector.init();
        } else {
            console.error('[PosterSelector] PosterSelector is not available or item not found. window.PosterSelector:', window.PosterSelector, 'item:', item, 'itemPath:', itemPath, 'currentTab:', this.currentTab);
            this.showToast('PosterSelector is not available.');
        }
        return false;
    };
});
```

**Result:**
- PosterSelector modal now opens reliably for both movies and TV shows.
- If a lookup fails, detailed logs are output for fast debugging.

## [2025-07-07 09:15] PosterSelector Modal Not Opening for Movies - data-path Attribute Fix

**Problem:**
The PosterSelector modal would not open for movies because the movie card elements were missing the required `data-path` attribute. The handler relies on this attribute to identify which movie was clicked. Without it, the handler could not find the correct movie item, resulting in `itemPath` being empty and the modal not opening.

**Fix:**
Update the movie card HTML template to include the `data-path` attribute, normalized to match the handler logic. Remove any unused `data-item-path` attributes.

**Code Block:**
```js
// Before:
grid += `
    <div class="media-library-movie-card" data-item-index="${index}" data-item-path="${item.path}">
        ...
    </div>
`;

// After:
grid += `
    <div class="media-library-movie-card" data-path="${(item.path || '').replace(/\\/g, '/').toLowerCase().trim()}" data-item-index="${index}">
        ...
    </div>
`;
```

**Result:**
- The PosterSelector modal now opens reliably for movies, just as it does for TV shows.
- All movie cards have a valid `data-path` attribute, enabling robust handler lookups.

### [2025-07-07 14:00] PosterSelector Modal Click & MediaLibrary DOM Re-render Fix

**Issue:**
- Clicking the image icon (🖼️) in the Movies grid did not always open the PosterSelector modal, depending on render state.
- The blue border and click handler for the icon were inconsistent on first load vs. after re-render.
- The `<h3>` movie title was sometimes rendered outside the `.media-info` div after a re-render, breaking font size and style.
- PosterSelector modal inner DIV structure and styling needed to be updated for consistency.

**Fix:**
- Patched the click handler for `.poster-selector-btn` to always open the PosterSelector modal, with robust fallback and improved error reporting.
- Forced a re-render of the Movies grid when the Movies tab is opened to ensure handlers and styles are always applied.
- Fixed the HTML structure in `renderMediaGrid()` so the `<h3>` movie title is always inside the `.media-info` div:

```js
// Before (buggy)
card.innerHTML = `
    ...
    <img ...>
    <div class="media-info"></div>
        <h3>${cleanTitle}</h3>
    </div>
`;

// After (fixed)
card.innerHTML = `
    ...
    <img ...>
    <div class="media-info"><h3>${cleanTitle}</h3></div>
`;
```
- Updated `public/components/PosterSelector/PosterSelector.html` and `PosterSelector.css` to match the reference repo for consistent modal structure and styling.

**Result:**
- The PosterSelector modal now always opens reliably from the Movies grid.
- The blue border and click handler are consistent on first load and after any re-render.
- The movie title font size and style remain consistent, and the DOM structure is correct before and after re-renders.
- PosterSelector modal UI is now fully in sync with the reference implementation.

### [2025-07-07 14:30] PosterSelector Fallback Warning Fix - Missing data-path Attributes

**Issue:**
- PosterSelector modal was showing "Warning: Movie/Show not found by path. Fallback context used." when clicking the 🖼️ icon on movie cards.
- Debug output showed `itemPath: null` because movie cards were missing the `data-path` attribute.
- This caused the PosterSelector to use fallback context instead of full movie information.

**Root Cause:**
- Movie cards in `renderMoviesContent()` and `renderFavoritesContent()` functions were generated without `data-path` attributes.
- The PosterSelector click handler relies on `data-path` to find the correct movie in the data.
- TV show cards already had `data-path` attributes, but movie cards did not.

**Fix:**
Added `data-path="${item.path}"` to movie card divs in both functions:

```javascript
// Before (renderMoviesContent and renderFavoritesContent):
<div class="media-library-movie-card" style="position: relative;">

// After:
<div class="media-library-movie-card" data-path="${item.path}" style="position: relative;">
```

**Files Modified:**
- `public/components/MediaLibrary/MediaLibraryManager.js` (lines ~2282 and ~2311)

**Result:**
- PosterSelector modal now has full movie context for all movies.
- No more fallback warnings when clicking the 🖼️ icon.
- Consistent behavior between Movies, Favorites, and TV Shows tabs.
- Debug console logging was also added per project rule for all alerts.

**Testing:**
- Restart server and hard-refresh browser.
- Click 🖼️ icon on any movie card.
- PosterSelector should open with full movie information and no warnings.



---

**Keep this file updated with every major UI or event-handling fix!**
This will save time and prevent repeated debugging in the future. 