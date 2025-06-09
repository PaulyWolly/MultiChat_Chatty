// Configuration loader for backend (Node.js)
const fs = require('fs');
const path = require('path');

class ServerConfig {
    constructor() {
        this.config = null;
        this.environment = process.env.NODE_ENV || 'development';
        this.loaded = false;
    }

    load() {
        if (this.loaded) return this.config;

        try {
            const configPath = path.join(__dirname, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            const fullConfig = JSON.parse(configData);
            
            this.config = fullConfig[this.environment];
            this.loaded = true;
            
            console.log(`📁 [CONFIG] Server loaded configuration for environment: ${this.environment}`);
            return this.config;
        } catch (error) {
            console.error('❌ [CONFIG] Failed to load server configuration:', error);
            // Fallback configuration
            this.config = {
                backend: { port: 5301, host: 'localhost' },
                youtube: {
                    database: { defaultUserId: 'default-user', collection: 'youtubesearches' }
                }
            };
            this.loaded = true;
            return this.config;
        }
    }

    getPort() {
        if (!this.config) this.load();
        return process.env.PORT || this.config.backend.port;
    }

    getHost() {
        if (!this.config) this.load();
        return this.config.backend.host;
    }

    getYouTubeConfig() {
        if (!this.config) this.load();
        return this.config.youtube;
    }

    getDatabaseConfig() {
        if (!this.config) this.load();
        return this.config.youtube.database;
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
}

module.exports = new ServerConfig(); 