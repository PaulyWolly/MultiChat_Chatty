const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const AUDIO_REPORT_PATH = path.join(__dirname, 'audio_codec_report.json');
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log.json');

// FFmpeg command template for converting audio to AAC
function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

// Create backup and convert
async function convertFile(inputPath) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        
        // Create backup
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Create temp output path
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        
        // Convert audio to AAC
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Replace original with converted file
        console.log(`✅ [REPLACE] Replacing original with converted file`);
        await execAsync(`del "${inputPath}"`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
        
        return { success: true, backupPath };
    } catch (error) {
        console.error(`❌ [ERROR] Failed to convert ${path.basename(inputPath)}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        console.log('🎵 [AUDIO-CONVERT] Loading audio codec report...');
        
        if (!fs.existsSync(AUDIO_REPORT_PATH)) {
            console.error('❌ [AUDIO-CONVERT] audio_codec_report.json not found!');
            console.log('💡 Run check_audio_codecs.js first to generate the report.');
            return;
        }
        
        const report = JSON.parse(fs.readFileSync(AUDIO_REPORT_PATH, 'utf8'));
        const problematicFiles = report.problematicFiles || [];
        
        if (problematicFiles.length === 0) {
            console.log('✅ [AUDIO-CONVERT] No problematic files found!');
            return;
        }
        
        console.log(`🎵 [AUDIO-CONVERT] Found ${problematicFiles.length} files to convert`);
        console.log('\n⚠️  WARNING: This will create backups and replace original files!');
        console.log('   Make sure you have enough disk space for backups.');
        
        // Ask for confirmation
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        const results = [];
        let converted = 0;
        let failed = 0;
        
        for (const file of problematicFiles) {
            console.log(`\n🎬 [CONVERT] Processing ${converted + failed + 1}/${problematicFiles.length}: ${file.title}`);
            
            if (file.error) {
                console.log(`⚠️  [SKIP] File has error: ${file.error}`);
                results.push({
                    path: file.path,
                    title: file.title,
                    success: false,
                    error: file.error,
                    skipped: true
                });
                failed++;
                continue;
            }
            
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                console.log(`🔧 [CONVERT] Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`);
            }
            
            const result = await convertFile(file.path);
            results.push({
                path: file.path,
                title: file.title,
                ...result
            });
            
            if (result.success) {
                converted++;
            } else {
                failed++;
            }
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Save conversion log
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: problematicFiles.length,
            converted,
            failed,
            results
        };
        
        fs.writeFileSync(CONVERSION_LOG_PATH, JSON.stringify(log, null, 2));
        
        console.log('\n🎉 [AUDIO-CONVERT] Conversion complete!');
        console.log(`📊 Summary:`);
        console.log(`   Total files: ${problematicFiles.length}`);
        console.log(`   Successfully converted: ${converted}`);
        console.log(`   Failed: ${failed}`);
        console.log(`\n📄 Conversion log saved to: ${CONVERSION_LOG_PATH}`);
        
        if (converted > 0) {
            console.log('\n✅ [AUDIO-CONVERT] All converted files now have AAC audio and should play in browsers!');
        }
        
    } catch (error) {
        console.error('❌ [AUDIO-CONVERT] Error:', error);
    }
}

// Run the conversion
main(); 