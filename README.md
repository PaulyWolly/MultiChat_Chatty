# AI Chat Application with Memory and Voice Interaction
#### v1.0.0

## Overview

A sophisticated AI chat application featuring voice interaction, persistent memory storage, and multi-modal communication capabilities. Built with Node.js, Express, MongoDB, and modern web technologies.

## Core Features

### 1. Session Management

#### Structured Session IDs

- Structured session handling using persistent IDs
- Format: `{type}-{id}-{version}` (e.g., `global-persistent-storage-001-v1`)
- Session validation and verification
- Support for multiple session types (global, user, admin)

### 2. Memory System

#### Hierarchical Storage

- Short-term memory (SLM) for immediate context
- localStorage for quick client-side access
- MongoDB for persistent long-term storage
- Automatic data synchronization between layers

#### Memory Categories

- Personal Information (name, preferences)
- Secret Words
- Favorites
- General Memories
- Timestamps and versioning for all stored data

### 3. Voice Interaction

#### Speech Recognition

- Real-time voice input processing
- Continuous listening mode
- Command recognition
- Error handling and recovery

#### Text-to-Speech (TTS)

- Azure TTS integration
- Multiple voice options
- Queue-based audio playback
- Interrupt and resume capabilities

### 4. Conversation Management

- Inactivity detection and timeout
- Conversation mode toggle
- Context preservation
- Exit command handling

### 5. User Interface

- Clean, responsive design
- Real-time status updates
- Audio controls
- Model selection
- Voice selection
- Microphone toggle

## Technical Features

### 1. API Integration

- OpenAI GPT integration
- Azure Speech Services
- Google Image Search
- Bing Search capabilities

### 2. Database Structure

```bash
  PersonalInfo Schema:
  {
  userId: String,
  sessionId: String,
  sessionType: String,
  sessionVersion: String,
  type: String,
  value: String,
  timestamp: Date,
  created: Date,
  updated: Date
  }
```

```bash
Memory Keywords:
Secret Word: /(?:the )?secret word (?:is|=) (.+)/i
Favorites: /(?:my )?favorite (\w+) (?:is|=) (.+)/i
Remember: /remember (?:that )?(.+)/i
```

### 4. Error Handling

- Speech recognition error recovery
- Network failure handling
- Invalid session detection
- Data validation
- Audio playback error management

## API Endpoints

### Personal Information

GET /api/personal-info/:type
POST /api/personal-info
GET /api/personal-info/all

### Voice Services

GET /api/google-image-search
POST /api/bing-search

### Search Services

## Environment Configuration

Required environment variables:

- `MONGODB_URI`
- `SPEECH_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`

## Usage Examples

### 1. Setting Information

```bash
// Store a secret word
"The secret word is nebula"
// Set user name
"My name is Paul"
// Store a favorite
"My favorite color is blue"
```

### 2. Retrieving Information

```bash
// Get secret word
"What is the secret word?"
// Get name
"What is my name?"
// Get a favorite
"What is my favorite color?"
```

## State Management

The application maintains various states:

- Audio playback state
- Speech recognition state
- Processing state
- Conversation mode state
- Session state
- Memory state

## Security Features

- Session validation
- Input sanitization
- API key protection
- Error message sanitization
- Rate limiting (TODO)

## Future Enhancements (TODO)

- User authentication
- Multiple session support
- Enhanced error recovery
- Data migration tools
- Memory expiration
- Rate limiting
- Enhanced security features

## Dependencies

- express
- cors
- mongoose
- axios
- microsoft-cognitiveservices-speech-sdk
- openai
- dotenv

## Development

```bash
Install dependencies
npm install
Start the server
npm start
Default port: 3335
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Notes

- Speech recognition requires HTTPS in production
- Some features require specific browser permissions
- Local storage must be enabled
- Stable internet connection required for API features
<<<<<<< HEAD
=======
# TEST2-MultiChat
>>>>>>> new-history
# MultiChat_Chatty


## What's new

- [2025-05-24 10:31:34 -0700] Commit: Initial commit to newly FIXED 'MultiChat_Chatty' app with all the previous merged histories
- [2025-05-24 10:13:54 -0700] Commit: Update code structure to match working MultiChat_v2 while preserving history
- [2025-05-24 09:52:33 -0700] Commit: Restore working MultiChat_v2 code while preserving history
- [2025-05-24 09:48:52 -0700] Commit: Initial commit with working MultiChat_v2 code
- [2025-05-24 08:30:07 -0700] Commit: first commit to new MultiChat_Chatty combined repo
- [2025-05-24 08:16:30 -0700] Commit: Adding all MERGED files from the two older repos - DEBUG_778400e_MultiChat-v22.0.2 and MultiChat_v2 into this new repo - MultiChat_Chatty
- [2025-05-24 05:50:41 -0700] Commit: Merge pull request #7 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-24 05:49:46 -0700] Commit: Latest UI changes to the Playlist Manager 'success' EMOJI animation
- [2025-05-23 22:54:29 -0700] Commit: UI Fixes: - Moved completion message: 'Video has been added to Playlist!' under the RIGHT BLUE DIV, absolutely positioned - Add an animation with EMOJIs to the RIGHT of the completion message, acknowledging to the user that their addition was cool!
- [2025-05-23 15:18:15 -0700] Commit: Merge pull request #6 from PaulyWolly/fix/various-ui-fixes
- [2025-05-23 15:17:09 -0700] Commit: Various UI fixes for Playlist Manager and SLIDE OUT menu
- [2025-05-23 03:26:16 -0700] Commit: Merge pull request #5 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-23 03:25:22 -0700] Commit: Various UI fixes for the SLIDE OUT menu, Prompt Examples menu text link, and UI
- [2025-05-22 21:04:25 -0700] Commit: Merge pull request #4 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-22 21:03:31 -0700] Commit: various UI fixes related to Playlist Manager and 'Processing...' alert
- [2025-05-22 10:52:12 -0700] Commit: Merge pull request #3 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-22 10:50:26 -0700] Commit: Updates/Fixes: - Fixed time and date queries, and removed query intercepts for time in general queries - Added left SLIDE OUT Advanced MENU that activates on mouse-over, via a blue bar on the left of the UI - Advanced MENU features:     -  Temperature slider     - top_p slider     - Style Prompt - Reworked the UI for the Playlist Manager to better fit PENDING video objects - Added abilty to use the ENTER key to create a playlist, as well as the 'Create Playlist' button - Updated the 'update_headers.mjs' script to allow all time entries
- [2025-05-22 05:25:37 -0700] Commit: Merge pull request #2 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-22 05:24:52 -0700] Commit: Updates to Playlist Manager layout and header alignment
- [2025-05-22 05:22:29 -0700] Commit: removed .env from MultiChat_v2.zip
- [2025-05-22 05:16:32 -0700] Commit: Remove ZIP file containing sensitive .env
- [2025-05-21 23:54:25 -0700] Commit: Merge pull request #1 from PaulyWolly/feature/Playlist-Manager-updates+fixes
- [2025-05-21 23:50:26 -0700] Commit: Updated the Playlist Manager (PM) to handle editing playlist entries; Edit/Delete Playlist name; Fixed the ability to VIEW videos from the PM; Edit the Title of a video entry, Delete a video from the Playlist with a new Custom COnfirm module created, MOVE a video from one Playlist to another Playlist
- [2025-05-21 05:48:50 -0700] Commit: Initial commit
- [2025-05-16 02:27:38 -0700] Commit: Bump version to v23.0.0 and update all header comments
- [2025-05-16 01:03:31 -0700] Commit: Merge pull request #4 from PaulyWolly/feature/new-modular-layout+fixes
- [2025-05-16 00:50:54 -0700] Commit: Initial modular layout and fixes
- [2025-05-13 16:48:47 -0700] Commit: Merge pull request #3 from PaulyWolly/feature/audio-updates+fixes
- [2025-05-13 16:47:16 -0700] Commit: Updated all code release numbers and dates to current release v22.0.2
- [2025-05-13 16:42:03 -0700] Commit: Merge pull request #2 from PaulyWolly/feature/audio-updates+fixes
- [2025-05-13 16:40:10 -0700] Commit: - Audio greetings now play fully and reliably, with no cut-off or truncation. - Only one user and one assistant bubble appear for greetings. - Greeting is dynamic and time-appropriate (uses random and time-of-day logic). - Code is refactored for maintainability and robust logging. - No more duplicate or race condition bugs for greetings.
- [2025-05-13 15:13:54 -0700] Commit: Merge pull request #1 from PaulyWolly/feature/audio-updates+fixes
- [2025-05-13 15:11:58 -0700] Commit: feat(audio): Improve audio playback system, fix greeting truncation, and add release notes