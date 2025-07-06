# ScriptManager Parameterized Execution System

## Overview

The ScriptManager now supports **parameterized script execution**, allowing you to run scripts with specific command-line arguments through a user-friendly interface. This eliminates the need to manually type command-line parameters and provides clear, labeled buttons for each operation.

## Features

- ✅ **Click-to-Run Parameters** - No more command-line typing
- ✅ **Clear Descriptions** - Hover tooltips explain each parameter
- ✅ **Safe Testing** - Dry run options for all destructive operations
- ✅ **Live Logging** - Real-time script execution feedback
- ✅ **Flexible Execution** - Choose exactly what operations to perform

## How to Use

### 1. Access ScriptManager
- Open your MultiChat application
- Navigate to **Admin Panel** → **Script Manager**
- Or use the keyboard shortcut (if configured)

### 2. Find Parameterized Scripts
Parameterized scripts are marked with **multiple buttons** instead of a single "Run" button. Look for scripts with buttons like:
- "Dry Run"
- "Rename Folders" 
- "Rename Files"
- "Rename Both"

### 3. Choose Your Operation
- **Hover over buttons** to see detailed descriptions
- **Click the appropriate button** for your desired operation
- **Watch the live log** as the script executes

## Available Parameterized Scripts

### 🎬 Movies Category

#### `normalize_movie_names.js`
Normalizes movie folder and file names to clean, consistent formats.

| Button | Parameters | Description |
|--------|------------|-------------|
| **Dry Run** | `--dry-run` | Preview all changes without making them |
| **Rename Folders** | `--rename-folders` | Normalize folder names only |
| **Rename Files** | `--rename-files` | Normalize file names only |
| **Rename Both** | `--rename-folders --rename-files` | Normalize both folders and files |
| **Test Mode** | `--test` | Process first 5 movies only |

#### `update_poster_mapping_dryrun.js`
Preview poster mapping updates for normalized movie files.

| Button | Parameters | Description |
|--------|------------|-------------|
| **Dry Run** | `[]` | Preview which movies will be mapped to posters |

#### `update_poster_mapping_write.js`
Update the poster mapping file to match normalized movie files.

| Button | Parameters | Description |
|--------|------------|-------------|
| **Write Mapping** | `[]` | Update poster mapping (backs up old mapping) |

### 📺 TV Shows Category

#### `normalize_tv_shows.js`
Normalizes TV show folder, season, and episode names.

| Button | Parameters | Description |
|--------|------------|-------------|
| **Dry Run** | `--dry-run` | Preview all changes without making them |
| **Rename Folders** | `--rename-folders` | Normalize folder names only |
| **Rename Files** | `--rename-files` | Normalize file names only |
| **Rename Both** | `--rename-folders --rename-files` | Normalize both folders and files |

### 💻 Development Category

#### `test_parameterized_script.js`
Test script to verify parameterized execution works correctly.

| Button | Parameters | Description |
|--------|------------|-------------|
| **Dry Run** | `--dry-run` | Test dry run mode |
| **Rename Folders** | `--rename-folders` | Test rename folders mode |
| **Rename Files** | `--rename-files` | Test rename files mode |
| **Test Mode** | `--test` | Test mode with limited processing |
| **All Options** | `--dry-run --rename-folders --rename-files` | Test all options together |

## Best Practices

### For Users

1. **Always Start with Dry Run**
   - Use "Dry Run" first to preview changes
   - Review the output carefully
   - Only proceed with actual changes if the preview looks correct

2. **Choose Specific Operations**
   - Use "Rename Folders" or "Rename Files" instead of "Rename Both" when possible
   - This gives you more control and reduces risk

3. **Monitor the Logs**
   - Watch the live execution log
   - Look for any errors or warnings
   - The log shows exactly what the script is doing

### For Developers

1. **Adding New Parameterized Scripts**
   - See the "Developer Guide" section below
   - Follow the established parameter naming conventions
   - Always include a "Dry Run" option for destructive operations

2. **Parameter Naming Conventions**
   - Use `--dry-run` for preview operations
   - Use `--rename-folders` for folder operations
   - Use `--rename-files` for file operations
   - Use `--test` for limited processing modes

## Developer Guide

### Adding Parameterized Scripts

To add parameterized execution to a new script:

#### 1. Update ScriptManager.js

Add your script to the `getScriptParameters()` method:

```javascript
getScriptParameters(scriptName) {
    const parameterSets = {
        // ... existing scripts ...
        'your_new_script.js': [
            { name: 'Dry Run', params: ['--dry-run'], description: 'Preview changes without making them' },
            { name: 'Process Files', params: ['--process-files'], description: 'Process files only' },
            { name: 'Process All', params: ['--process-all'], description: 'Process everything' }
        ]
    };
    
    return parameterSets[scriptName] || [];
}
```

#### 2. Add Script to Categories

Add your script to the appropriate category in `scriptCategories`:

```javascript
this.scriptCategories = {
    'movies': [
        // ... existing scripts ...
        'your_new_script.js'
    ]
};
```

#### 3. Update Script Description

Add a description in `getScriptDescription()`:

```javascript
getScriptDescription(scriptName) {
    const descriptions = {
        // ... existing descriptions ...
        'your_new_script.js': 'Description of what your script does'
    };
    
    return descriptions[scriptName] || 'Script for system maintenance';
}
```

#### 4. Implement Parameter Handling

In your script, handle the parameters:

```javascript
const DRY_RUN = process.argv.includes('--dry-run');
const PROCESS_FILES = process.argv.includes('--process-files');
const PROCESS_ALL = process.argv.includes('--process-all');

// Use these flags to control script behavior
if (DRY_RUN) {
    console.log('Preview mode - no changes will be made');
}
```

### Backend API

The backend API supports parameterized execution through:

**Endpoint:** `POST /api/admin/run-script`

**Request Body:**
```json
{
    "script": "script_name.js",
    "parameters": ["--dry-run", "--rename-folders"]
}
```

**Response:**
```json
{
    "success": true,
    "output": "Script execution output..."
}
```

## Troubleshooting

### Common Issues

1. **Script Not Showing Parameterized Buttons**
   - Check that the script is added to `getScriptParameters()`
   - Verify the script name matches exactly
   - Ensure the script is in the correct category

2. **Parameters Not Being Passed**
   - Check the browser console for errors
   - Verify the backend API is receiving parameters
   - Test with the `test_parameterized_script.js`

3. **Script Execution Fails**
   - Check the live log for error messages
   - Verify the script exists in the `/scripts` directory
   - Ensure the script handles the parameters correctly

### Debug Mode

To debug parameterized execution:

1. Open browser developer tools (F12)
2. Check the Console tab for ScriptManager logs
3. Look for `[ScriptManager]` prefixed messages
4. Test with `test_parameterized_script.js` first

## Future Enhancements

Potential improvements for the parameterized execution system:

- **Custom Parameter Input** - Allow users to enter custom parameters
- **Parameter Templates** - Save and reuse common parameter combinations
- **Batch Operations** - Run multiple scripts with parameters
- **Parameter Validation** - Validate parameters before execution
- **Execution History** - Track and replay previous executions

## Support

For issues or questions about the parameterized script execution system:

1. Check this documentation first
2. Test with `test_parameterized_script.js`
3. Review the browser console for error messages
4. Check the server logs for backend issues

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Author:** MultiChat Development Team 