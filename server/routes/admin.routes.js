const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Script runners
async function runTvShowsScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_media_library_tv-shows.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runMoviesScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_media_library_movies.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runEmbyPostersScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_emby_posters.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runDbCleanup() {
  // TODO: Implement actual DB cleanup logic
  return 'Database cleanup completed (placeholder)';
}
async function runCacheClear() {
  // TODO: Implement actual cache clear logic
  return 'Cache clear completed (placeholder)';
}
async function runSystemBackup() {
  // TODO: Implement actual system backup logic
  return 'System backup completed (placeholder)';
}

router.post('/run-script', async (req, res) => {
  const { script } = req.body;
  try {
    let output;
    switch (script) {
      case 'tv-shows-scan':
        output = await runTvShowsScan();
        break;
      case 'movies-scan':
        output = await runMoviesScan();
        break;
      case 'emby-posters-scan':
        output = await runEmbyPostersScan();
        break;
      case 'db-cleanup':
        output = await runDbCleanup();
        break;
      case 'cache-clear':
        output = await runCacheClear();
        break;
      case 'system-backup':
        output = await runSystemBackup();
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unknown script type' });
    }
    res.json({ success: true, output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System status endpoint
router.get('/system-status', (req, res) => {
  const uptime = process.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const status = {
    serverStatus: 'online',
    uptime,
    totalMem,
    freeMem,
    usedMem,
    memUsagePercent,
    loadAvg,
    cpuCount,
    timestamp: Date.now(),
  };
  res.json({ success: true, status });
});

module.exports = router; 