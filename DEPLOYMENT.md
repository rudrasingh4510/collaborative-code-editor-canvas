# Deployment Guide

## Prerequisites
- GitHub repository with your code
- Google OAuth credentials configured
- Environment variables set up

## Deployment Options

### 1. Render (Recommended)

#### Steps:
1. **Create a new Web Service on Render**
2. **Connect your GitHub repository**
3. **Configure build settings:**
   - **Build Command:** `cd client && npm install && npm run build`
   - **Start Command:** `cd server && npm install && npm start`
   - **Root Directory:** Leave empty

4. **Set Environment Variables in Render:**
   ```
   NODE_ENV=production
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   CLIENT_URL=https://your-app-name.onrender.com
   ```

5. **Update Google OAuth Settings:**
   - Add `https://your-app-name.onrender.com/auth/google/callback` to authorized redirect URIs

### 2. Vercel

#### Steps:
1. **Deploy the server separately** (Vercel doesn't support Socket.IO well)
2. **Use Railway or Render for the backend**
3. **Deploy frontend to Vercel**

### 3. Railway

#### Steps:
1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

## Environment Variables Required

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT & Session
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key

# URLs
CLIENT_URL=https://your-domain.com
NODE_ENV=production
```

## Pre-deployment Checklist

- [ ] Update Google OAuth redirect URIs
- [ ] Set all environment variables
- [ ] Test locally with production build
- [ ] Ensure CORS is configured for production domain

## Testing Production Build Locally

```bash
# Build the React app
cd client
npm run build

# Start the server (serves both API and React build)
cd ../server
npm start
```

## Important Notes

1. **Socket.IO**: Works well on Render, Railway, and Heroku
2. **CORS**: Already configured for production
3. **Static Files**: Server serves the React build
4. **Environment Variables**: All URLs automatically adjust for production
5. **Google OAuth**: Remember to update redirect URIs in Google Console

## Troubleshooting

- **CORS Issues**: Check that CLIENT_URL matches your domain
- **Socket.IO Connection**: Ensure WebSocket support is enabled
- **Google OAuth**: Verify redirect URIs are correct
- **Build Issues**: Check that all dependencies are in package.json
