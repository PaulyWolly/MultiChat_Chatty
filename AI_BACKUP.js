#!/usr/bin/env node

/**
 * AI_BACKUP.js - Improved backup script
 * Usage: node AI_BACKUP.js <file1> <file2> ...
 * Example: node AI_BACKUP.js public/app.js server/server.js
 *
 * - Preserves folder structure inside ai_bkup
 * - Appends timestamp to each backup file
 * - Creates needed subdirectories automatically
 */

const fs = require('fs');
const path = require('path');

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

const files = process.argv.slice(2);
if (files.length === 0) {
    console.log('Usage: node AI_BACKUP.js <file1> <file2> ...');
    process.exit(0);
}

const timestamp = getTimestamp();

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`⚠️  File not found: ${file}`);
        return;
    }
    // Preserve folder structure inside ai_bkup
    const relPath = path.relative(process.cwd(), file);
    const dirName = path.dirname(relPath);
    const baseName = path.basename(file);
    const backupDir = path.join(__dirname, 'ai_bkup', dirName);
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        //console.log(`📁 Created directory: ${backupDir}`);
    }
    const backupName = `${baseName}.backup.${timestamp}`;
    const dest = path.join(backupDir, backupName);
    fs.copyFileSync(file, dest);
    const sizeKB = Math.round(fs.statSync(dest).size / 1024);
    console.log(`✅ Backed up: ${file} → ${dest} (${sizeKB}KB)`);
}); 