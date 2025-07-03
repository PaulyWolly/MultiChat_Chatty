# Authentication System Documentation

## Overview
This document describes the authentication and authorization system implemented for the MultiChat application, featuring role-based access control with support for regular users, admins, and SuperAdmin access.

## Features

### 🔐 Authentication Features
- **JWT-based authentication** with 24-hour token expiration
- **Password hashing** using bcryptjs with 12 salt rounds
- **Role-based access control** (user, admin, superadmin)
- **SuperAdmin special access** with multiple entry methods
- **One-time codes** for secure SuperAdmin unlock
- **CLI tools** for administrative tasks

### 👥 User Roles
- **user**: Basic access (default for new registrations)
- **admin**: Administrative access to admin panel features
- **superadmin**: Full system access with elevated privileges

## Backend Implementation

### Database Model
**File**: `server/models/User.js`
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  role: String (enum: ['user', 'admin', 'superadmin']),
  isActive: Boolean (default: true),
  oneTimeCode: String (for SuperAdmin unlock),
  created: Date,
  updated: Date
}
```

### Environment Variables
Add these to your `.env` file:
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SUPERADMIN_PASSWORD=superadmin-secret-2025
CLI_SECRET=cli-secret-2025
```

### API Endpoints

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response**: Same as registration

#### 3. SuperAdmin Login
```http
POST /api/auth/superadmin-login
Content-Type: application/json

{
  "password": "superadmin-secret-2025",
  "oneTimeCode": "optional-code-from-cli"
}
```

#### 4. Token Verification
```http
POST /api/auth/verify
Content-Type: application/json

{
  "token": "jwt_token_here"
}
```

#### 5. Generate SuperAdmin Code (CLI)
```http
POST /api/auth/generate-superadmin-code
Content-Type: application/json

{
  "secret": "cli-secret-2025"
}
```

### JWT Middleware

#### Authentication Middleware
```javascript
// Add to protected routes
app.get('/api/protected', authenticateToken, (req, res) => {
  // req.user contains: { id, email, role }
});
```

#### Role-based Middleware
```javascript
// Require admin or superadmin
app.get('/api/admin', authenticateToken, requireAdmin, (req, res) => {
  // Only admins and superadmins can access
});

// Require superadmin only
app.get('/api/superadmin', authenticateToken, requireSuperAdmin, (req, res) => {
  // Only superadmins can access
});
```

## CLI Tools

### Generate SuperAdmin Code
```bash
# Using npm script
npm run generate-superadmin-code

# Direct execution
node scripts/generate-superadmin-code.js

# With custom server URL
SERVER_URL=http://localhost:5501 npm run generate-superadmin-code
```

### Test Authentication System
```bash
# Test all endpoints
npm run test-auth

# Direct execution
node scripts/test-auth.js
```

## SuperAdmin Access Methods

### 1. Direct Password Access
- Use the `SUPERADMIN_PASSWORD` environment variable
- Call `/api/auth/superadmin-login` with the password

### 2. One-Time Code Access
1. Generate a code using the CLI tool
2. Use the code in the SuperAdmin login form
3. Code is automatically cleared after use

### 3. CLI-Triggered Unlock
- Run the CLI tool to generate a temporary code
- Use the code for immediate SuperAdmin access

## Security Features

### Password Security
- Passwords are hashed using bcryptjs with 12 salt rounds
- Original passwords are never stored in the database

### JWT Security
- Tokens expire after 24 hours
- Tokens include user ID, email, and role
- Invalid/expired tokens are rejected

### SuperAdmin Security
- Special password required for SuperAdmin access
- One-time codes expire immediately after use
- CLI access requires a secret key

## Frontend Integration

### LoginManager Component
The frontend includes a `LoginManager` component that:
- Shows login modal when Admin Panel is accessed without authentication
- Supports login, register, and forgot password modes
- Stores JWT tokens in localStorage
- Handles authentication state

### Usage Example
```javascript
// Check if user is authenticated
const token = localStorage.getItem('authToken');
if (!token) {
  // Show login modal
  window.LoginManager.show();
}

// Verify token with backend
const response = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

if (!response.ok) {
  // Token invalid, show login
  window.LoginManager.show();
}
```

## Testing

### Manual Testing
1. Start the server: `npm run start:backend`
2. Run authentication tests: `npm run test-auth`
3. Test SuperAdmin code generation: `npm run generate-superadmin-code`

### API Testing with curl
```bash
# Register a user
curl -X POST http://localhost:4800/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Login
curl -X POST http://localhost:4800/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Generate SuperAdmin code
curl -X POST http://localhost:4800/api/auth/generate-superadmin-code \
  -H "Content-Type: application/json" \
  -d '{"secret":"cli-secret-2025"}'
```

## Next Steps

### Frontend Integration
1. Update AdminPanel to check authentication before showing
2. Integrate LoginManager with AdminPanel
3. Add logout functionality
4. Implement role-based UI (hide SuperAdmin features from regular admins)

### Additional Features
1. Password reset functionality
2. User management endpoints
3. Session management
4. Audit logging
5. Rate limiting

### Security Enhancements
1. HTTPS enforcement
2. CORS configuration
3. Rate limiting on auth endpoints
4. Password complexity requirements
5. Account lockout after failed attempts

## Troubleshooting

### Common Issues

**"Invalid email or password"**
- Check if user exists in database
- Verify password hashing is working
- Check bcryptjs installation

**"Invalid or expired token"**
- Check JWT_SECRET environment variable
- Verify token expiration (24 hours)
- Check if user is still active

**"SuperAdmin code generation failed"**
- Verify CLI_SECRET environment variable
- Check if SuperAdmin user exists in database
- Ensure server is running and accessible

**"Network error"**
- Verify server is running on correct port
- Check SERVER_URL environment variable
- Ensure no firewall blocking connections 