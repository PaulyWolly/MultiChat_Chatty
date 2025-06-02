#!/usr/bin/env node

/**
 * BACKUP_APP.js - Automated Backup Script for MultiChat_Chatty
 * 
 * Creates timestamped backups of all critical files in mirrored directory structure
 * Automatically cleans up old backups to maintain only the most recent ones
 * 
 * Usage: node BACKUP_APP.js
 * Or:    npm run backup (if added to package.json scripts)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MAX_BACKUPS_PER_FILE = 3; // Keep only the 3 most recent backups of each file

// Get current timestamp in YYYYMMDD_HHMMSS format
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

// Copy file with error handling
function copyFileWithBackup(source, destination) {
    try {
        if (!fs.existsSync(source)) {
            console.log(`⚠️  Warning: Source file not found: ${source}`);
            return false;
        }
        
        fs.copyFileSync(source, destination);
        const stats = fs.statSync(destination);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`✅ Backed up: ${source} → ${destination} (${sizeKB}KB)`);
        return true;
    } catch (error) {
        console.error(`❌ Error backing up ${source}:`, error.message);
        return false;
    }
}

// Clean up old backups, keeping only the most recent ones
function cleanupOldBackups(directory, filePrefix, maxKeep = MAX_BACKUPS_PER_FILE) {
    try {
        if (!fs.existsSync(directory)) return [];

        // Get all backup files for this file type
        const files = fs.readdirSync(directory)
            .filter(file => file.startsWith(filePrefix) && file.includes('.backup.'))
            .map(file => ({
                name: file,
                path: path.join(directory, file),
                timestamp: file.match(/\.backup\.(\d{8}_\d{6})/)?.[1] || '00000000_000000'
            }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Sort newest first

        const toDelete = files.slice(maxKeep); // Keep only the first N, delete the rest
        let deletedCount = 0;

        toDelete.forEach(file => {
            try {
                fs.unlinkSync(file.path);
                console.log(`🗑️  Cleaned up old backup: ${file.name}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Error deleting ${file.name}:`, error.message);
            }
        });

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backup(s) for ${filePrefix}`);
        }

        return files.slice(0, maxKeep).map(f => f.name); // Return remaining files
    } catch (error) {
        console.error(`❌ Error during cleanup for ${filePrefix}:`, error.message);
        return [];
    }
}

// Main backup function
function createBackup() {
    console.log('🚀 Starting MultiChat_Chatty Backup Process...');
    console.log(`🗂️  Backup retention policy: Keep ${MAX_BACKUPS_PER_FILE} most recent backups per file`);
    console.log('=' .repeat(60));
    
    const timestamp = getTimestamp();
    const backupRoot = 'backups';
    const backupPublic = path.join(backupRoot, 'public');
    
    // Ensure backup directories exist
    ensureDirectoryExists(backupRoot);
    ensureDirectoryExists(backupPublic);
    
    // Files to backup with their source and destination paths
    const filesToBackup = [
        // Root level files
        {
            source: 'server.js',
            destination: path.join(backupRoot, `server.js.backup.${timestamp}`),
            cleanupPrefix: 'server.js'
        },
        {
            source: 'package.json',
            destination: path.join(backupRoot, `package.json.backup.${timestamp}`),
            cleanupPrefix: 'package.json'
        },
        
        // Public directory files
        {
            source: path.join('public', 'app.js'),
            destination: path.join(backupPublic, `app.js.backup.${timestamp}`),
            cleanupPrefix: 'app.js'
        },
        {
            source: path.join('public', 'styles.css'),
            destination: path.join(backupPublic, `styles.css.backup.${timestamp}`),
            cleanupPrefix: 'styles.css'
        },
        {
            source: path.join('public', 'index.html'),
            destination: path.join(backupPublic, `index.html.backup.${timestamp}`),
            cleanupPrefix: 'index.html'
        }
    ];
    
    // Additional files to backup if they exist
    const optionalFiles = [
        {
            source: path.join('public', 'components', 'PlaylistManager.js'),
            destination: path.join(backupPublic, `PlaylistManager.js.backup.${timestamp}`),
            cleanupPrefix: 'PlaylistManager.js'
        },
        {
            source: path.join('public', 'components', 'ToastManager.js'),
            destination: path.join(backupPublic, `ToastManager.js.backup.${timestamp}`),
            cleanupPrefix: 'ToastManager.js'
        },
        {
            source: 'BACKUP_APP.js',
            destination: path.join(backupRoot, `BACKUP_APP.js.backup.${timestamp}`),
            cleanupPrefix: 'BACKUP_APP.js'
        }
    ];
    
    let successCount = 0;
    let totalFiles = 0;
    
    console.log(`📅 Backup timestamp: ${timestamp}`);
    console.log('');
    
    // Backup critical files
    console.log('🔧 Backing up critical files:');
    filesToBackup.forEach(file => {
        totalFiles++;
        if (copyFileWithBackup(file.source, file.destination)) {
            successCount++;
            // Clean up old backups for this file
            const directory = path.dirname(file.destination);
            cleanupOldBackups(directory, file.cleanupPrefix);
        }
    });
    
    console.log('');
    console.log('📂 Backing up optional files:');
    optionalFiles.forEach(file => {
        if (fs.existsSync(file.source)) {
            totalFiles++;
            if (copyFileWithBackup(file.source, file.destination)) {
                successCount++;
                // Clean up old backups for this file
                const directory = path.dirname(file.destination);
                cleanupOldBackups(directory, file.cleanupPrefix);
            }
        } else {
            console.log(`ℹ️  Optional file not found (skipping): ${file.source}`);
        }
    });
    
    console.log('');
    console.log('=' .repeat(60));
    console.log(`🎉 Backup completed! ${successCount}/${totalFiles} files backed up successfully`);
    console.log(`📁 Backup location: ./${backupRoot}/`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`🗂️  Keeping ${MAX_BACKUPS_PER_FILE} most recent backups per file`);
    
    // Show backup directory structure
    console.log('');
    console.log('📋 Current backup directory contents:');
    console.log(`${backupRoot}/`);
    
    try {
        // List root level backups
        const rootFiles = fs.readdirSync(backupRoot).filter(file => 
            fs.statSync(path.join(backupRoot, file)).isFile() && file.includes('.backup.')
        );
        
        // Group files by type
        const fileGroups = {};
        rootFiles.forEach(file => {
            const prefix = file.split('.backup.')[0];
            if (!fileGroups[prefix]) fileGroups[prefix] = [];
            fileGroups[prefix].push(file);
        });
        
        Object.keys(fileGroups).sort().forEach(prefix => {
            const files = fileGroups[prefix].sort().reverse(); // Newest first
            console.log(`├── ${prefix}: ${files.length} backup(s)`);
            files.forEach((file, index) => {
                const isLatest = index === 0;
                const isOldest = index === files.length - 1;
                console.log(`│   ${isOldest ? '└──' : '├──'} ${file}${isLatest ? ' (latest)' : ''}`);
            });
        });
        
        // List public directory backups
        if (fs.existsSync(backupPublic)) {
            const publicFiles = fs.readdirSync(backupPublic).filter(file => 
                file.includes('.backup.')
            );
            
            if (publicFiles.length > 0) {
                console.log(`└── public/`);
                
                // Group public files by type
                const publicGroups = {};
                publicFiles.forEach(file => {
                    const prefix = file.split('.backup.')[0];
                    if (!publicGroups[prefix]) publicGroups[prefix] = [];
                    publicGroups[prefix].push(file);
                });
                
                const groupKeys = Object.keys(publicGroups).sort();
                groupKeys.forEach((prefix, groupIndex) => {
                    const files = publicGroups[prefix].sort().reverse(); // Newest first
                    const isLastGroup = groupIndex === groupKeys.length - 1;
                    console.log(`    ${isLastGroup ? '└──' : '├──'} ${prefix}: ${files.length} backup(s)`);
                    files.forEach((file, index) => {
                        const isLatest = index === 0;
                        const isOldest = index === files.length - 1;
                        const connector = isLastGroup ? '    ' : '│   ';
                        console.log(`${connector}    ${isOldest ? '└──' : '├──'} ${file}${isLatest ? ' (latest)' : ''}`);
                    });
                });
            }
        }
    } catch (error) {
        console.log('📁 (Directory listing unavailable)');
    }
    
    console.log('');
    console.log('💡 To restore the latest backup:');
    console.log(`   cp backups/public/app.js.backup.${timestamp} public/app.js`);
    console.log(`   cp backups/server.js.backup.${timestamp} server.js`);
    console.log('');
    console.log('🔧 To change retention policy, edit MAX_BACKUPS_PER_FILE in this script');
    console.log('');
}

// Run the backup
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup, getTimestamp }; 