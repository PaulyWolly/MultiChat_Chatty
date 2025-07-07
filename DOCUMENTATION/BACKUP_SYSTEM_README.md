# MultiChat_Chatty Backup System

This project now includes a robust backup system that stores backups both locally and in MongoDB for redundancy and cross-device access.

## Features

- **Dual Storage**: Backups are saved both locally and in MongoDB
- **Automatic Cleanup**: Maintains only the most recent backups (3 local, 10 MongoDB)
- **Cross-Device Access**: Access backups from any device via MongoDB
- **API Integration**: Manage backups through REST API endpoints
- **Command Line Tools**: Direct backup and restore via CLI scripts
- **Interactive Selection**: Choose backups from a numbered list
- **Custom Restore Locations**: Specify where to restore backups

## Prerequisites

1. **MongoDB Connection**: Ensure `MONGODB_URI` is set in your `.env` file
2. **Dependencies**: The system uses `mongoose` and `dotenv` packages

## Usage

### Command Line Backup

```bash
# Create a new backup (saves to both local filesystem and MongoDB)
node scripts/BACKUP_APP.js
```

### Command Line Restore

```bash
# List all available backups
node scripts/RESTORE_APP.js list

# Interactive backup selection (recommended)
node scripts/RESTORE_APP.js interactive

# Restore latest backup
node scripts/RESTORE_APP.js latest

# Restore specific backup by timestamp
node scripts/RESTORE_APP.js restore 2025-01-15T1430

# Restore to custom location
node scripts/RESTORE_APP.js restore 2025-01-15T1430 --location /path/to/restore

# Restore latest to custom location
node scripts/RESTORE_APP.js latest --location /path/to/restore
```

### Interactive Restore Example

```bash
node scripts/RESTORE_APP.js interactive
```

This will show you a numbered list of available backups:

```
📋 Available Backups:
================================================================================
1. 2025-01-15T1430
   App: MultiChat_Chatty vDEV1a
   Files: 150 | Size: 2.45 MB
   Created: 1/15/2025, 2:30:00 PM
   Platform: win32

2. 2025-01-15T1200
   App: MultiChat_Chatty vDEV1a
   Files: 148 | Size: 2.42 MB
   Created: 1/15/2025, 12:00:00 PM
   Platform: win32

Select a backup (1-2) or 'q' to quit: 1

✅ Selected backup: 2025-01-15T1430

Restore location (press Enter for default: /path/to/restore/restore_2025-01-15T1430): 
```

### API Endpoints

#### List All Backups
```http
GET /api/backups
```

#### Get Backup Details
```http
GET /api/backups/{timestamp}
```

#### Create New Backup
```http
POST /api/backups/create
```

#### Restore Latest Backup
```http
POST /api/backups/restore/latest
Content-Type: application/json

{
  "restoreLocation": "/optional/custom/path"
}
```

#### Restore Specific Backup
```http
POST /api/backups/restore/{timestamp}
Content-Type: application/json

{
  "restoreLocation": "/optional/custom/path"
}
```

#### Delete Backup
```http
DELETE /api/backups/{timestamp}
```

#### Get Backup Statistics
```http
GET /api/backups/stats/overview
```

#### Get Backup Selection Data (for UI)
```http
GET /api/backups/selection/list
```

## Backup Structure

### Local Storage
- **Location**: `/backups/backup_YYYY-MM-DDTHHMM/`
- **Retention**: 3 most recent backups
- **Format**: Mirrored directory structure with all project files

### MongoDB Storage
- **Collection**: `backups`
- **Retention**: 10 most recent backups
- **Content**: File metadata, content, and backup information

### Restore Locations
- **Default**: `/restore/restore_YYYY-MM-DDTHHMM/`
- **Custom**: User-specified path via `--location` flag or API parameter
- **Overwrite Protection**: Confirms before overwriting existing directories

### Backup Data Model

```javascript
{
  timestamp: "2025-01-15T1430",
  localPath: "/path/to/local/backup",
  appName: "MultiChat_Chatty",
  version: "DEV1a",
  files: [
    {
      path: "server/server.js",
      content: "file content as string",
      size: 12345,
      lastModified: "2025-01-15T14:30:00.000Z"
    }
  ],
  fileCount: 150,
  totalSize: 1024000,
  directories: ["config", "server", "public", "scripts"],
  metadata: {
    nodeVersion: "v18.17.0",
    platform: "win32",
    arch: "x64",
    backupScript: "BACKUP_APP.js"
  }
}
```

## Configuration

### Environment Variables
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

### Backup Settings
- **Local Retention**: 3 backups (configurable in `BACKUP_APP.js`)
- **MongoDB Retention**: 10 backups (configurable in `BACKUP_APP.js`)
- **Directories Backed Up**: `config`, `server`, `public`, `scripts`
- **Root Files**: `package.json`, `package-lock.json`, `eslint.config.js`

## Benefits

1. **Redundancy**: Local + cloud storage ensures data safety
2. **Cross-Device**: Access backups from any device with MongoDB access
3. **Version Control**: Track changes over time with timestamped backups
4. **Easy Restoration**: One-command restore from any backup
5. **Interactive Selection**: User-friendly backup selection interface
6. **Flexible Locations**: Restore to any location you choose
7. **API Integration**: Programmatic backup management
8. **Automatic Cleanup**: Prevents storage bloat

## Error Handling

- **MongoDB Unavailable**: Backup continues with local storage only
- **File Read Errors**: Individual files are skipped, backup continues
- **Connection Issues**: Automatic retry with exponential backoff
- **Storage Limits**: Automatic cleanup of old backups
- **Invalid Selections**: Interactive prompts for valid input
- **Directory Conflicts**: Confirmation before overwriting existing data

## Security Considerations

- **File Content**: All file content is stored as plain text in MongoDB
- **Sensitive Data**: Ensure no sensitive information (API keys, passwords) is in backed-up files
- **Access Control**: MongoDB access should be properly secured
- **Backup Encryption**: Consider encrypting sensitive backup data if needed
- **Custom Paths**: Validate custom restore locations for security

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check `MONGODB_URI` in `.env` file
   - Verify network connectivity
   - Check MongoDB Atlas IP whitelist

2. **Backup Fails**
   - Check file permissions
   - Ensure sufficient disk space
   - Verify all required directories exist

3. **Restore Fails**
   - Verify backup timestamp exists
   - Check restore directory permissions
   - Ensure MongoDB connection is available

4. **Interactive Selection Issues**
   - Ensure terminal supports readline interface
   - Check for proper input validation
   - Verify backup list is not empty

### Logs

The backup system provides detailed logging:
- ✅ Success operations
- ❌ Error conditions
- ⚠️ Warnings and skipped operations
- 📊 Summary statistics
- 🔄 Interactive prompts and selections

## Future Enhancements

- [ ] Backup compression
- [ ] Incremental backups
- [ ] Backup encryption
- [ ] Scheduled backups
- [ ] Backup verification
- [ ] Cross-platform compatibility improvements
- [ ] Web-based backup management interface
- [ ] Backup comparison tools
- [ ] Automated backup testing

## Restore from Backup (RESTORE_BACKUP.js)

**Updated: 7/6/2025**

### Usage

You can now restore from any backup folder by providing a full or relative path to the backup directory. The script no longer assumes the backup is in `/backups`—you can restore from subfolders (like `AI_BKUP`) or any location.

**Command:**
```
node scripts/RESTORE_BACKUP.js <backup_folder_path>
```

**Examples:**
- Restore from main backups folder:
  ```
  node scripts/RESTORE_BACKUP.js backup_2025-07-06T0949
  ```
- Restore from a subfolder (e.g., AI_BKUP):
  ```
  node scripts/RESTORE_BACKUP.js backups/AI_BKUP/backup_2025-07-06T0946
  ```
- Restore from an absolute path:
  ```
  node scripts/RESTORE_BACKUP.js /full/path/to/backup_2025-07-06T0949
  ```

### What Gets Restored
- Only the `public`, `server`, and `config` directories are restored by default.
- The `scripts` directory is **not** restored to avoid overwriting the restore script itself.

### Notes
- The script will validate the provided path and abort if the directory does not exist.
- Always restart your server and hard refresh your browser after restoring.

---

(For restoring from MongoDB, see `RESTORE_APP_FROM_MONGODB.js`.) 