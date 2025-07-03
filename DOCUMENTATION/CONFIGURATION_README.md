# Configuration System Documentation

## Overview

The MultiChat_Chatty application now uses a centralized configuration system that allows for easy environment management, dynamic API endpoints, and customizable UI elements. This system eliminates hardcoded values and provides a clean separation between development and production settings.

## 📁 Configuration Files

### 1. `config.json` - Central Configuration
```json
{
  "development": {
    "frontend": { "port": 5300, "host": "localhost" },
    "backend": { "port": 5301, "host": "localhost" },
    "api": {
      "baseUrl": "http://localhost:5301",
      "endpoints": {
        "youtube": {
          "search": "/api/youtube/search",
          "saveSearch": "/api/youtube/save-search",
          "checkSaved": "/api/youtube/check-saved",
          "deleteSaved": "/api/youtube/saved-searches"
        },
        "chat": "/api/chat",
        "tts": "/api/tts"
      }
    },
    "youtube": {
      "cache": { "maxAgeHours": 24, "keyPrefix": "yt_" },
      "database": { "defaultUserId": "default-user", "collection": "youtubesearches" },
      "ui": {
        "ledIndicators": { "saved": "🟢", "unsaved": "" },
        "saveButton": "💾",
        "deleteButton": "❌"
      }
    }
  },
  "production": {
    // Production environment settings...
  }
}
```

### 2. `public/config.js` - Frontend Configuration Loader
**Purpose**: Loads configuration on the client-side and provides helper methods.

**Key Features**:
- Automatic environment detection (localhost = development)
- Fallback configuration if loading fails
- Helper methods for common config access patterns
- Global `window.appConfig` instance

### 3. `config.js` - Backend Configuration Loader  
**Purpose**: Loads configuration on the server-side for Node.js applications.

**Key Features**:
- Environment detection via `NODE_ENV`
- Synchronous configuration loading
- Server-specific helper methods
- Exported as singleton instance

## 🚀 Usage Examples

### Frontend (Client-side)
```javascript
// Load configuration (async)
await window.appConfig.load();

// Get API URLs
const searchUrl = window.appConfig.getYouTubeApiUrl('search');
const saveUrl = window.appConfig.getYouTubeApiUrl('saveSearch');

// Get configuration sections
const uiConfig = window.appConfig.getUIConfig();
const cacheConfig = window.appConfig.getCacheConfig();
const dbConfig = window.appConfig.getDatabaseConfig();

// Environment checks
if (window.appConfig.isDevelopment()) {
    console.log('Running in development mode');
}

// Use UI elements from config
const saveButton = uiConfig.saveButton; // "💾"
const greenLed = uiConfig.ledIndicators.saved; // "🟢"
```

### Backend (Server-side)
```javascript
const config = require('./config');

// Get server settings
const port = config.getPort(); // Uses env PORT or config value
const host = config.getHost();

// Get configuration sections
const ytConfig = config.getYouTubeConfig();
const dbConfig = config.getDatabaseConfig();

// Environment checks
if (config.isProduction()) {
    // Production-specific logic
}
```

## 🔧 Configuration Sections

### Frontend Settings
- **port**: Port where frontend is served
- **host**: Hostname for frontend

### Backend Settings  
- **port**: Port where API server runs
- **host**: Hostname for API server

### API Configuration
- **baseUrl**: Base URL for all API calls
- **endpoints**: Object containing all API endpoint paths

### YouTube Configuration
- **cache**: Cache settings (expiry time, key prefix)
- **database**: Database settings (default user ID, collection name)
- **ui**: UI element configuration (emojis, button text)

## 🌍 Environment Management

### Development Environment
- **Frontend**: Served on port 5300
- **Backend**: API server on port 5301
- **Detection**: Automatic when hostname is 'localhost'

### Production Environment
- **Frontend**: Served on port 80
- **Backend**: API server on port 3000
- **Detection**: When hostname is not 'localhost'

### Manual Environment Override
```javascript
// URL parameter
http://localhost:5300?env=production

// Local storage
localStorage.setItem('app_environment', 'production');
```

## 🔄 Migration from Hardcoded Values

### Before (Hardcoded)
```javascript
// ❌ Old way
const response = await fetch('http://localhost:5301/api/youtube/save-search', {...});
const userId = 'default-user';
const ledIcon = '🟢';
```

### After (Configured)  
```javascript
// ✅ New way
await window.appConfig.load();
const response = await fetch(window.appConfig.getYouTubeApiUrl('saveSearch'), {...});
const userId = window.appConfig.getDatabaseConfig().defaultUserId;
const ledIcon = window.appConfig.getUIConfig().ledIndicators.saved;
```

## 🛡️ Error Handling

### Frontend Fallback
If `config.json` cannot be loaded, the frontend falls back to:
```javascript
{
  api: { baseUrl: 'http://localhost:5301', endpoints: {...} },
  youtube: {
    cache: { maxAgeHours: 24, keyPrefix: 'yt_' },
    database: { defaultUserId: 'default-user' },
    ui: { ledIndicators: { saved: '🟢', unsaved: '' }, saveButton: '💾', deleteButton: '❌' }
  }
}
```

### Backend Fallback
If `config.json` cannot be loaded, the backend falls back to:
```javascript
{
  backend: { port: 5301, host: 'localhost' },
  youtube: { database: { defaultUserId: 'default-user', collection: 'youtubesearches' } }
}
```

## 📋 Best Practices

### 1. Always Load Configuration First
```javascript
// Frontend
await window.appConfig.load();
// Now safe to use config methods

// Backend  
const config = require('./config'); // Auto-loads on first require
```

### 2. Use Helper Methods
```javascript
// ✅ Good
const url = window.appConfig.getYouTubeApiUrl('search');

// ❌ Avoid
const url = window.appConfig.config.api.baseUrl + window.appConfig.config.api.endpoints.youtube.search;
```

### 3. Check Environment When Needed
```javascript
if (window.appConfig.isDevelopment()) {
    console.log('Debug info...');
}
```

### 4. Cache Configuration Values
```javascript
// If using config values in loops or frequently
const uiConfig = window.appConfig.getUIConfig();
for (let item of items) {
    item.icon = uiConfig.saveButton;
}
```

## 🔒 Security Considerations

- **No Secrets**: Never put API keys, passwords, or secrets in `config.json`
- **Environment Variables**: Use `.env` files for sensitive configuration
- **Public Access**: `config.json` is publicly accessible via HTTP
- **GitHub Safe**: Configuration contains only non-sensitive settings

## 🧪 Testing Configuration

Test the configuration system:
```bash
# Test backend config loading
node -e "const config = require('./config'); console.log('Port:', config.getPort());"
```

## 🚀 Deployment Notes

### Development
- Uses ports 5300 (frontend) and 5301 (backend)
- Environment auto-detected as 'development'

### Production
- Update ports in production config section
- Set `NODE_ENV=production` for backend
- Ensure config.json is deployed with application

## 🔄 Future Enhancements

- **Dynamic User ID**: Replace default user with actual authentication
- **Feature Flags**: Add feature toggle configuration
- **Localization**: Add language/locale configuration
- **Themes**: Add UI theme configuration
- **API Versioning**: Add API version configuration

---

*This configuration system provides a solid foundation for managing application settings across different environments while maintaining flexibility and security.* 