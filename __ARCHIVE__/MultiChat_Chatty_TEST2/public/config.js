// Configuration loader for frontend
export class AppConfig {
    constructor() {
        this.config = null;
        this.environment = 'development'; // Default to development
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return this.config;

        try {
            const response = await fetch('/config.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status}`);
            }
            
            const fullConfig = await response.json();
            
            // Detect environment (could be set via env variable or URL parameter)
            const urlParams = new URLSearchParams(window.location.search);
            this.environment = urlParams.get('env') || 
                              window.localStorage.getItem('app_environment') || 
                              (window.location.hostname === 'localhost' ? 'development' : 'production');
            
            this.config = fullConfig[this.environment];
            this.loaded = true;
            
            console.log(`📁 [CONFIG] Loaded configuration for environment: ${this.environment}`);
            return this.config;
        } catch (error) {
            console.error('❌ [CONFIG] Failed to load configuration:', error);
            // Fallback to hardcoded development config
            this.config = {
                api: {
                    baseUrl: 'http://localhost:5301',
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
            return this.config;
        }
    }

    // Helper methods for easy access to common config values
    getApiUrl(endpoint = '') {
        if (!this.config) throw new Error('Configuration not loaded');
        return this.config.api.baseUrl + endpoint;
    }

    getYouTubeApiUrl(type) {
        if (!this.config) throw new Error('Configuration not loaded');
        const endpoint = this.config.api.endpoints.youtube[type];
        if (!endpoint) throw new Error(`Unknown YouTube endpoint: ${type}`);
        return this.getApiUrl(endpoint);
    }

    getYouTubeConfig() {
        if (!this.config) throw new Error('Configuration not loaded');
        return this.config.youtube;
    }

    getCacheConfig() {
        if (!this.config) throw new Error('Configuration not loaded');
        return this.config.youtube.cache;
    }

    getDatabaseConfig() {
        if (!this.config) throw new Error('Configuration not loaded');
        return this.config.youtube.database;
    }

    getUIConfig() {
        if (!this.config) throw new Error('Configuration not loaded');
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

// Create global instance
window.appConfig = new AppConfig();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} 