# Google OAuth Setup Guide

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Session Configuration
SESSION_SECRET=your_session_secret_key_here

# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# JDoodle API (existing)
jDoodle_clientId=your_jdoodle_client_id
jDoodle_clientSecret=your_jdoodle_client_secret
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set the application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5001/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)
7. Copy the Client ID and Client Secret to your `.env` file

## Installation

1. Install dependencies:
   ```bash
   cd server
   npm install
   
   cd ../client
   npm install
   ```

2. Start the development servers:
   ```bash
   # Terminal 1 - Server
   cd server
   npm start
   
   # Terminal 2 - Client
   cd client
   npm start
   ```

## Features Implemented

- ✅ Google OAuth authentication
- ✅ User profile pictures from Google accounts
- ✅ Automatic username from Google profile
- ✅ Session management with JWT tokens
- ✅ Updated UI for authenticated users
- ✅ Profile persistence across sessions
- ✅ Logout functionality

## How It Works

1. **Authentication Flow**: Users click "Sign in with Google" → redirected to Google → callback with JWT token → stored in localStorage
2. **Room Joining**: Authenticated users can join rooms using just the Room ID (no manual username entry)
3. **Profile Display**: User avatars and names are automatically pulled from Google accounts
4. **Real-time Updates**: User profiles are shared across all connected clients in a room

## Security Notes

- JWT tokens expire after 24 hours
- Sessions are managed server-side with express-session
- CORS is configured for your client URL
- All OAuth data is validated server-side before storage
