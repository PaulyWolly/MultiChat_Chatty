# ScriptManager Quick Reference Guide

## 🚀 Most Common Operations

### Movie Library Management

#### **Normalize Movie Names** (`normalize_movie_names.js`)
**When to use:** After downloading movies with messy names like `Movie.Name.2023.1080p.BluRay.x264-[YTS.AM]`

| Operation | When to Use | Risk Level |
|-----------|-------------|------------|
| **Dry Run** | Always first! Preview what will change | 🟢 Safe |
| **Rename Folders** | Clean up folder names only | 🟡 Medium |
| **Rename Files** | Clean up file names only | 🟡 Medium |
| **Rename Both** | Complete cleanup | 🔴 High |
| **Test Mode** | Test on first 5 movies | 🟢 Safe |

#### **Update Poster Mapping** (`update_poster_mapping_*.js`)
**When to use:** After normalizing movie names, to fix missing posters

| Operation | When to Use | Risk Level |
|-----------|-------------|------------|
| **Dry Run** | Check which movies need poster mapping | 🟢 Safe |
| **Write Mapping** | Update poster mapping file | 🟡 Medium |

### TV Show Library Management

#### **Normalize TV Shows** (`normalize_tv_shows.js`)
**When to use:** After downloading TV shows with inconsistent naming

| Operation | When to Use | Risk Level |
|-----------|-------------|------------|
| **Dry Run** | Always first! Preview changes | 🟢 Safe |
| **Rename Folders** | Clean up show/season folder names | 🟡 Medium |
| **Rename Files** | Clean up episode file names | 🟡 Medium |
| **Rename Both** | Complete TV show cleanup | 🔴 High |

## 📋 Step-by-Step Workflows

### **New Movie Library Setup**
1. **Dry Run** `normalize_movie_names.js` → Review changes
2. **Rename Both** `normalize_movie_names.js` → Apply changes
3. **Dry Run** `update_poster_mapping_dryrun.js` → Check poster mapping
4. **Write Mapping** `update_poster_mapping_write.js` → Update posters

### **New TV Show Library Setup**
1. **Dry Run** `normalize_tv_shows.js` → Review changes
2. **Rename Both** `normalize_tv_shows.js` → Apply changes
3. **Run** `fetch_tmdb_posters_tv-shows.js` → Get show posters
4. **Run** `download_tv_images.js` → Download season/episode images

### **Poster Issues Fix**
1. **Dry Run** `update_poster_mapping_dryrun.js` → See what's missing
2. **Write Mapping** `update_poster_mapping_write.js` → Fix mapping
3. **Run** `interactive_movie_poster_selector.js` → Fix remaining issues

## ⚡ Quick Commands

### **Safe Preview (Always First)**
```
🎬 Movies: Dry Run → normalize_movie_names.js
📺 TV Shows: Dry Run → normalize_tv_shows.js
🖼️ Posters: Dry Run → update_poster_mapping_dryrun.js
```

### **Apply Changes**
```
🎬 Movies: Rename Both → normalize_movie_names.js
📺 TV Shows: Rename Both → normalize_tv_shows.js
🖼️ Posters: Write Mapping → update_poster_mapping_write.js
```

### **Test Mode (Limited Processing)**
```
🎬 Movies: Test Mode → normalize_movie_names.js (first 5 movies)
```

## 🛡️ Safety Guidelines

### **Before Any Operation**
- ✅ **Always run Dry Run first**
- ✅ **Backup your media library**
- ✅ **Check the live log during execution**
- ✅ **Verify results before proceeding**

### **Risk Levels**
- 🟢 **Safe:** Dry Run, Test Mode - No changes made
- 🟡 **Medium:** Single operation (folders OR files)
- 🔴 **High:** Multiple operations (folders AND files)

### **Emergency Recovery**
If something goes wrong:
1. **Stop the script** (close browser tab)
2. **Check the backup** created by the script
3. **Restore from backup** if needed
4. **Contact support** if issues persist

## 🔧 Troubleshooting

### **Common Issues**

| Problem | Solution |
|---------|----------|
| Script not showing buttons | Refresh ScriptManager page |
| Parameters not working | Check browser console (F12) |
| Script fails to run | Verify script exists in `/scripts` |
| No output in log | Wait for script to complete |

### **Debug Steps**
1. **Open browser console** (F12)
2. **Look for `[ScriptManager]` messages**
3. **Test with `test_parameterized_script.js`**
4. **Check server logs** for backend errors

## 📞 Support

### **Getting Help**
1. **Check this quick reference**
2. **Read full documentation** (`SCRIPT_MANAGER_PARAMETERS.md`)
3. **Test with test script** first
4. **Check browser console** for errors

### **Useful Test Scripts**
- `test_parameterized_script.js` - Test parameterized execution
- `check_audio_codecs_movies.js` - Check movie audio compatibility
- `check_audio_codecs_tv-shows.js` - Check TV show audio compatibility

---

**Quick Tip:** Bookmark this page for easy access during media library management!

**Last Updated:** January 2025  
**Version:** 1.0.0 