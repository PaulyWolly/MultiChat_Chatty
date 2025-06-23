#!/usr/bin/env node

/**
 * BACKUP_APP.js - Automated Backup Script for MultiChat_Chatty
 * 
 * Creates timestamped backups of all critical files in mirrored directory structure
 * Automatically cleans up old backups to maintain only the most recent ones
 * Saves backups to both local filesystem and MongoDB for redundancy
 * 
 * Usage: node BACKUP_APP.js
 * Or:    npm run backup (if added to package.json scripts)
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
const envPath = path.join(__dirname, '..', 'server', '.env');
dotenv.config({ path: envPath });

// Import Backup model
const Backup = require('../server/models/Backup');

// Configuration
const MAX_BACKUPS_PER_FILE = 3; // Keep only the 3 most recent backups of each file
const MAX_MONGODB_BACKUPS = 10; // Keep only the 10 most recent backups in MongoDB

// MongoDB connection function
async function connectToMongoDB() {
    if (!process.env.MONGODB_URI) {
        console.log('⚠️  MONGODB_URI not found in environment variables. MongoDB backup will be skipped.');
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for backup storage');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        return false;
    }
}

// Function to save backup to MongoDB
async function saveBackupToMongoDB(backupData) {
    try {
        const backup = new Backup({
            timestamp: backupData.timestamp,
            localPath: backupData.backupPath,
            appName: 'MultiChat_Chatty',
            version: 'DEV1a',
            files: backupData.files,
            fileCount: backupData.fileCount,
            totalSize: backupData.totalSize,
            directories: backupData.directories,
            notes: backupData.notes,
            metadata: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                backupScript: 'BACKUP_APP.js'
            }
        });

        await backup.save();
        console.log('💾 Backup saved to MongoDB successfully');
        
        // Cleanup old MongoDB backups
        await cleanupOldMongoDBBackups();
        
        return true;
    } catch (error) {
        console.error('❌ Failed to save backup to MongoDB:', error.message);
        return false;
    }
}

// Function to cleanup old MongoDB backups
async function cleanupOldMongoDBBackups() {
    try {
        const backups = await Backup.find()
            .sort({ createdAt: -1 })
            .limit(MAX_MONGODB_BACKUPS + 1);

        if (backups.length > MAX_MONGODB_BACKUPS) {
            const toDelete = backups.slice(MAX_MONGODB_BACKUPS);
            const deleteIds = toDelete.map(backup => backup._id);
            
            await Backup.deleteMany({ _id: { $in: deleteIds } });
            console.log(`🗑️  Cleaned up ${toDelete.length} old MongoDB backup(s)`);
        }
    } catch (error) {
        console.error('❌ Error during MongoDB cleanup:', error.message);
    }
}

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
function cleanupOldBackups(directory, prefix, maxKeep = MAX_BACKUPS_PER_FILE) {
    try {
        if (!fs.existsSync(directory)) return [];

        const backups = fs.readdirSync(directory)
            .filter(file => file.startsWith(prefix))
            .map(file => ({
                name: file,
                path: path.join(directory, file),
                timestamp: file.match(/_(\d{8}_\d{6})/)?.[1] || '00000000_000000'
            }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const toDelete = backups.slice(maxKeep);
        let deletedCount = 0;

        toDelete.forEach(backup => {
            try {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Error deleting ${backup.name}:`, error.message);
            }
        });

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backup(s)`);
        }

        return backups.slice(0, maxKeep).map(b => b.name);
    } catch (error) {
        console.error(`❌ Error during cleanup:`, error.message);
        return [];
    }
}

// Function to scan directory recursively
function scanDirectory(dir, baseDir) {
    const files = [];
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (fs.statSync(fullPath).isDirectory()) {
            // Recursively scan subdirectories
            files.push(...scanDirectory(fullPath, baseDir));
        } else {
            // Add file to backup list
            files.push({
                source: relativePath,
                destination: relativePath
            });
        }
    }
    
    return files;
}

function generateBackupTree(backupPath) {
    const tree = [];
    tree.push('Backup Structure:');
    
    function scanDirectory(dir, prefix = '', isLast = true) {
        const entries = fs.readdirSync(dir).sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        entries.forEach((entry, index) => {
            const fullPath = path.join(dir, entry);
            const isLastEntry = index === entries.length - 1;
            const isDirectory = fs.statSync(fullPath).isDirectory();
            
            const marker = isLastEntry ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            
            const size = isDirectory ? '' : ` (${(fs.statSync(fullPath).size / 1024).toFixed(2)} KB)`;
            const icon = isDirectory ? '📁' : '📄';
            
            tree.push(`${prefix}${marker}${icon} ${entry}${size}`);
            
            if (isDirectory) {
                scanDirectory(fullPath, newPrefix, isLastEntry);
            }
        });
    }

    scanDirectory(backupPath);
    return tree.join('\n');
}

// Function to prompt for a required note
async function promptForNote() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    function ask() {
        return new Promise(resolve => {
            rl.question('Enter a REQUIRED note/description for this backup: ', answer => {
                resolve(answer.trim());
            });
        });
    }
    let note = '';
    while (!note) {
        note = await ask();
        if (!note) {
            console.log('⚠️  A note is required. Please enter a description for this backup.');
        }
    }
    rl.close();
    return note;
}

// Function to create backup
async function createBackup() {
    console.log('📦 Starting backup process...');
    console.log('📦 Retention policy: Keeping 3 most recent backups');

    // Prompt for required note
    const notes = await promptForNote();

    // Connect to MongoDB
    const mongoConnected = await connectToMongoDB();

    // Get local time in 24-hour format
    const now = new Date();
    
    // Use local time instead of UTC to avoid date offset issues
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const localDate = `${year}-${month}-${day}`; // YYYY-MM-DD in local time
    const localTime = `${hours}${minutes}`; // HHMM in 24-hour format
    const timestamp = `${localDate}T${localTime}`;

    const backupDir = path.join(__dirname, '..', 'backups');
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    const baseDir = path.join(__dirname, '..');

    // Create backup root directory
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(backupPath, { recursive: true });

    // Scan directories to find files to backup
    const directoriesToScan = [
        'config',
        'server',
        'public',
        'scripts'
    ];

    let filesToBackup = [];
    for (const dir of directoriesToScan) {
        const dirPath = path.join(baseDir, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`📂 Scanning directory: ${dir}`);
            filesToBackup.push(...scanDirectory(dirPath, baseDir));
        } else {
            console.log(`⚠️ Directory not found: ${dir}`);
        }
    }

    // Add root-level files that are important for the project
    const rootFilesToBackup = [
        'package.json',
        'package-lock.json',
        'eslint.config.js'
    ];

    for (const file of rootFilesToBackup) {
        const filePath = path.join(baseDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`📄 Adding root file: ${file}`);
            filesToBackup.push({
                source: file,
                destination: file
            });
        } else {
            console.log(`⚠️ Root file not found: ${file}`);
        }
    }

    let successCount = 0;
    let failCount = 0;
    let totalSize = 0;
    const backupFiles = [];
    const directories = new Set();

    // Backup each file
    for (const file of filesToBackup) {
        const sourcePath = path.join(baseDir, file.source);
        const destPath = path.join(backupPath, file.destination);
        
        try {
            // Ensure destination directory exists
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            
            // Copy the file
            fs.copyFileSync(sourcePath, destPath);
            const stats = fs.statSync(destPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ Backed up: ${file.source} (${sizeKB} KB)`);
            successCount++;
            totalSize += stats.size;

            // Collect file data for MongoDB
            try {
                const content = fs.readFileSync(sourcePath, 'utf8');
                backupFiles.push({
                    path: file.source,
                    content: content,
                    size: stats.size,
                    lastModified: stats.mtime
                });
            } catch (readError) {
                console.log(`⚠️  Could not read file content for MongoDB: ${file.source}`);
            }

            // Track directories
            const dirPath = path.dirname(file.source);
            if (dirPath && dirPath !== '.') {
                directories.add(dirPath);
            }
        } catch (error) {
            console.error(`❌ Failed to backup ${file.source}:`, error);
            failCount++;
        }
    }

    // Cleanup old backups
    cleanupOldBackups(backupDir);

    // Generate and display backup tree
    const backupTree = generateBackupTree(backupPath);
    console.log('\n' + backupTree);

    // Save to MongoDB if connected
    if (mongoConnected) {
        const notesFilePath = path.join(backupPath, 'bkup_notes.txt');
        fs.writeFileSync(notesFilePath, notes, 'utf8');
        const notesStats = fs.statSync(notesFilePath);
        const notesFileEntry = {
            path: 'bkup_notes.txt',
            content: notes,
            size: notesStats.size,
            lastModified: notesStats.mtime
        };
        const backupData = {
            timestamp,
            backupPath,
            files: [...backupFiles, notesFileEntry],
            successCount,
            totalSize,
            directories: Array.from(directories),
            notes,
            fileCount: backupFiles.length + 1,
            successCount: successCount,
            failCount: failCount,
            totalSize: totalSize + notesStats.size
        };
        
        await saveBackupToMongoDB(backupData);
    }

    // Summary
    console.log('\n📊 Backup Summary:');
    console.log(`✅ Successfully backed up: ${successCount} files`);
    if (failCount > 0) {
        console.log(`❌ Failed to backup: ${failCount} files`);
    }
    console.log(`📁 Backup location: ${backupPath}`);
    console.log(`💾 MongoDB backup: ${mongoConnected ? '✅ Saved' : '❌ Skipped'}`);

    // Close MongoDB connection
    if (mongoConnected) {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }

    return {
        success: failCount === 0,
        timestamp,
        successCount,
        failCount,
        backupPath: backupPath,
        tree: backupTree,
        mongoDBSaved: mongoConnected
    };
}

// Run the backup
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup, getTimestamp }; 