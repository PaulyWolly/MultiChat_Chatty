// Unified Configuration loader for both server and client
const fs = require('fs');
const path = require('path');

class Config {
    constructor() {
        this.config = null;
        this.environment = process.env.NODE_ENV || 'development';
        this.loaded = false;
        this.isServer = typeof window === 'undefined';
    }

    load() {
        if (this.loaded) return this.config;

        try {
            if (this.isServer) {
                // Server-side loading
                const configPath = path.join(__dirname, 'config.json');
                const configData = fs.readFileSync(configPath, 'utf8');
                const fullConfig = JSON.parse(configData);
                this.config = fullConfig[this.environment];
            } else {
                // Client-side loading
                const urlParams = new URLSearchParams(window.location.search);
                this.environment = urlParams.get('env') || 
                                 window.localStorage.getItem('app_environment') || 
                                 (window.location.hostname === 'localhost' ? 'development' : 'production');
                
                // Load config via fetch
                fetch('/config/config.json')
                    .then(response => response.json())
                    .then(fullConfig => {
                        this.config = fullConfig[this.environment];
                        this.loaded = true;
                        console.log(`📁 [CONFIG] Loaded configuration for environment: ${this.environment}`);
                    })
                    .catch(error => {
                        console.error('❌ [CONFIG] Failed to load configuration:', error);
                        this.loadFallbackConfig();
                    });
            }
            
            this.loaded = true;
            console.log(`📁 [CONFIG] Loaded configuration for environment: ${this.environment}`);
            return this.config;
        } catch (error) {
            console.error('❌ [CONFIG] Failed to load configuration:', error);
            this.loadFallbackConfig();
            return this.config;
        }
    }

    loadFallbackConfig() {
        // Fallback configuration
        this.config = {
            frontend: {
                port: 5400,
                host: 'localhost'
            },
            backend: {
                port: 5401,
                host: 'localhost'
            },
            api: {
                baseUrl: 'http://localhost:5401',
                endpoints: {
                    youtube: {
                        search: '/api/youtube/search',
                        saveSearch: '/api/youtube/save-search',
                        checkSaved: '/api/youtube/check-saved'
                    }
                }
            },
            youtube: {
                cache: { maxAgeHours: 24, keyPrefix: 'yt_' },
                database: { defaultUserId: 'default-user' },
                ui: {
                    ledIndicators: { saved: '🟢', unsaved: '' },
                    saveButton: '💾',
                    deleteButton: '❌'
                }
            }
        };
        this.loaded = true;
    }

    // Server-specific methods
    getPort() {
        if (!this.config) this.load();
        return process.env.PORT || this.config.backend.port;
    }

    getHost() {
        if (!this.config) this.load();
        return this.config.backend.host;
    }

    // Client-specific methods
    getApiUrl(endpoint = '') {
        if (!this.config) this.load();
        return this.config.api.baseUrl + endpoint;
    }

    getYouTubeApiUrl(type) {
        if (!this.config) this.load();
        const endpoint = this.config.api.endpoints.youtube[type];
        if (!endpoint) throw new Error(`Unknown YouTube endpoint: ${type}`);
        return this.getApiUrl(endpoint);
    }

    // Common methods
    getYouTubeConfig() {
        if (!this.config) this.load();
        return this.config.youtube;
    }

    getCacheConfig() {
        if (!this.config) this.load();
        return this.config.youtube.cache;
    }

    getDatabaseConfig() {
        if (!this.config) this.load();
        return this.config.youtube.database;
    }

    getUIConfig() {
        if (!this.config) this.load();
        return this.config.youtube.ui;
    }

    getEnvironment() {
        return this.environment;
    }

    isProduction() {
        return this.environment === 'production';
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    getTTSVoice() {
        if (this.config && this.config.audio && this.config.audio.tts && this.config.audio.tts.defaultVoice) {
            return this.config.audio.tts.defaultVoice;
        }
        return 'en-US-AndrewNeural';
    }
}

// Create and export instance
const config = new Config();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.appConfig = config;
} 