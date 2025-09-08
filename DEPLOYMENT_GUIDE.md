# Deployment Guide for Real-time Code Editor

## Deploy to Render (Recommended)

### 1. Prepare Your Project
Your project is already configured for Render deployment with:
- ✅ Root `package.json` with build scripts
- ✅ `render.yaml` configuration file
- ✅ Server configured to serve React build
- ✅ Client config handles production URLs

### 2. Update Google OAuth Settings
Before deploying, update your Google OAuth application:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Add these authorized redirect URIs:
   - `https://realtime-code-editor.onrender.com/auth/google/callback`
   - `https://your-app-name.onrender.com/auth/google/callback` (replace with your actual app name)

### 3. Deploy to Render

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create Render Account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Create New Web Service:**
   - Click "New" > "Web Service"
   - Connect your GitHub repository
   - Select the repository

4. **Configure Service:**
   - **Name:** `realtime-code-editor` (or your preferred name)
   - **Environment:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. **Set Environment Variables:**
   In the Render dashboard, add these environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   JWT_SECRET=your_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   CLIENT_URL=https://realtime-code-editor.onrender.com
   SERVER_URL=https://realtime-code-editor.onrender.com
   ```

6. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Wait for deployment to complete (5-10 minutes)

### 4. Update URLs After Deployment
After deployment, update these URLs in your Google OAuth settings:
- Replace `realtime-code-editor` with your actual app name from Render
- Update the redirect URI to match your deployed URL

### 5. Test Your Deployment
- Visit your deployed URL
- Test Google OAuth login
- Test creating/joining rooms
- Test real-time collaboration

## Alternative Deployment Options

### Option 2: Vercel + Railway
- **Frontend:** Deploy to Vercel
- **Backend:** Deploy to Railway
- More complex but gives you more control

### Option 3: Railway (Full-stack)
- Deploy both frontend and backend to Railway
- Similar to Render but different platform

## Troubleshooting

### Common Issues:
1. **Build fails:** Check that all dependencies are in package.json
2. **OAuth not working:** Verify redirect URIs match your deployed URL
3. **CORS errors:** Check that CLIENT_URL and SERVER_URL are set correctly
4. **Socket.io not working:** Ensure both URLs point to the same domain

### Environment Variables Checklist:
- [ ] NODE_ENV=production
- [ ] PORT=10000
- [ ] GOOGLE_CLIENT_ID (from Google Cloud Console)
- [ ] GOOGLE_CLIENT_SECRET (from Google Cloud Console)
- [ ] JWT_SECRET (generate a secure random string)
- [ ] SESSION_SECRET (generate a secure random string)
- [ ] CLIENT_URL (your deployed URL)
- [ ] SERVER_URL (your deployed URL)

## Security Notes:
- Never commit `.env` files to version control
- Use strong, unique secrets for JWT_SECRET and SESSION_SECRET
- Keep your Google OAuth credentials secure
- Consider using Render's environment variable encryption for sensitive data
