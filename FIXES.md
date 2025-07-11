


### [2025-07-10] Added fetch_movie_details_from_filename_SINGLE.js for Seamless Single-Movie Metadata Updates

**Fix:**
Created `scripts/fetch_movie_details_from_filename_SINGLE.js` to allow fetching and merging TMDB movie descriptions and actor images for a single movie by title. The script:
- Accepts a simple movie title as input
- Finds the best-matching movie file in the file server
- Fetches description and cast from TMDB
- Merges results into `movie_descriptions.json` and `movie_cast.json` using the exact file path as the key
- Ensures the DETAILS page instantly displays the new data after running the script

**Usage:**
```bash
node scripts/fetch_movie_details_from_filename_SINGLE.js "Ace Ventura Pet Detective"
```

**Result:**
No manual editing or path lookup required. The DETAILS page will show the new description and actor images immediately after running the script. 