// Universal config loader that works in both browser and Node.js
class Config {
    constructor() {
        this.config = null;
        this.environment = typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'development';
        this.loaded = false;
        this.isServer = typeof process !== 'undefined';
    }

    async load() {
        if (this.isServer) {
            try {
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, 'config.json');
                const configData = fs.readFileSync(configPath, 'utf8');
                this.config = JSON.parse(configData)[this.environment];
                this.loaded = true;
                return this.config;
            } catch (error) {
                console.error('Error loading server config:', error);
                this.loadFallbackConfig();
                return this.config;
            }
        } else {
            try {
                const response = await fetch('/config/config.json');
                if (!response.ok) {
                    throw new Error('Failed to load config');
                }
                const data = await response.json();
                this.config = data[this.environment];
                this.loaded = true;
                return this.config;
            } catch (error) {
                console.error('Error loading browser config:', error);
                this.loadFallbackConfig();
                return this.config;
            }
        }
    }

    loadFallbackConfig() {
        this.config = {
            frontend: {
                port: 5500,
                host: 'localhost'
            },
            backend: {
                port: 5501,
                host: 'localhost'
            },
            api: {
                baseUrl: 'http://localhost:5501',
                endpoints: {
                    chat: '/api/chat',
                    tts: '/api/tts',
                    youtube: '/api/youtube',
                    jokes: '/api/jokes',
                    personalInfo: '/api/personal-info'
                }
            },
            youtube: {
                apiKey: '',
                maxResults: 10,
                cacheExpiration: 24
            },
            audio: {
                defaultVoice: 'en-US-AndrewNeural',
                fallbackVoice: 'en-US-GuyNeural',
                maxRetries: 3,
                retryDelay: 1000
            }
        };
        this.loaded = true;
    }

    getApiUrl(endpoint) {
        if (!this.config?.api?.baseUrl) {
            return null;
        }
        
        // Handle nested endpoints like 'youtube.search'
        const endpointParts = endpoint.split('.');
        let endpointPath = this.config?.api?.endpoints;
        
        for (const part of endpointParts) {
            if (endpointPath && endpointPath[part]) {
                endpointPath = endpointPath[part];
            } else {
                return null;
            }
        }
        
        if (typeof endpointPath !== 'string') {
            return null;
        }
        
        return `${this.config.api.baseUrl}${endpointPath}`;
    }

    getYouTubeConfig() {
        return this.config?.youtube || null;
    }

    getAudioConfig() {
        return this.config?.audio || null;
    }

    getFrontendConfig() {
        return this.config?.frontend || null;
    }

    getBackendConfig() {
        return this.config?.backend || null;
    }

    getPort() {
        return this.isServer ? this.config?.backend?.port : this.config?.frontend?.port;
    }

    getHost() {
        return this.isServer ? this.config?.backend?.host : this.config?.frontend?.host;
    }
}

// Create and export the config instance
const config = new Config();

// For Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// For browser
if (typeof window !== 'undefined') {
    window.appConfig = config;
    window.configExport = { default: config };
}

// Load the config immediately
config.load(); 

