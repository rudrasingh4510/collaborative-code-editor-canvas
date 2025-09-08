const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const server = http.createServer(app);

// ---- Compiler Language Config ----
const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// ---- Middleware ----
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = `${process.env.SERVER_URL || 'http://localhost:5001'}/auth/google/callback`;
  console.log('🔗 OAuth Callback URL:', callbackURL);
  console.log('🔗 SERVER_URL env var:', process.env.SERVER_URL);
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  }, (accessToken, refreshToken, profile, done) => {
    // Debug: Log the profile data received from Google
    console.log('Google profile received:', {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos,
      rawProfile: profile
    });
    
    // Store user profile data
    const user = {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null
    };
    
    console.log('Processed user data:', user);
    return done(null, user);
  }));
} else {
  console.warn('⚠️  Google OAuth credentials not found. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware to check for blacklisted JWT tokens
const checkBlacklistedToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (blacklistedTokens.has(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
  }
  next();
};

// ---- OAuth Routes ----
// Google OAuth login
app.get('/auth/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file' 
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res);
});

// Google OAuth callback
app.get('/auth/google/callback', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file' 
    });
  }
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}` 
  })(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication failed' });
    }
    
    // Generate JWT token
    const userData = { 
      id: req.user.id, 
      name: req.user.name, 
      email: req.user.email, 
      picture: req.user.picture 
    };
    
    console.log('JWT token data:', userData);
    
    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret';
    
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set in .env file, using default secret');
    }
    
    const token = jwt.sign(
      userData,
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    console.log('Generated JWT token for user:', req.user.name);
    
    // Redirect to client with token
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  });
});

// Get current user profile
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Test endpoint to check OAuth configuration
app.get('/api/test-oauth', (req, res) => {
  res.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    clientId: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'Not set',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set (using default)',
    sessionSecret: process.env.SESSION_SECRET ? 'Set' : 'Not set (using default)'
  });
});

// Proxy endpoint for Google profile pictures to avoid CORS issues
app.get('/api/profile-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    console.log('🔹 Profile image request received:', { url, userAgent: req.get('User-Agent') });
    
    if (!url) {
      console.log('❌ No URL parameter provided');
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Validate that it's a Google profile picture URL
    if (!url.includes('googleusercontent.com')) {
      console.log('❌ Invalid URL - not a Google profile picture:', url);
      return res.status(400).json({ error: 'Invalid URL - must be a Google profile picture' });
    }
    
    console.log('🔹 Fetching profile image:', url);
    
    // Fetch the image from Google
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(response.data);
  } catch (error) {
    console.error('❌ Error fetching profile image:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile image' });
  }
});

// Logout (GET - for redirects)
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Redirect back to the frontend home page
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });
});

// Logout (POST - for secure token blacklisting)
app.post('/auth/logout', (req, res) => {
  const { token } = req.body;
  
  if (token) {
    blacklistedTokens.add(token);
    console.log('Token blacklisted:', token.substring(0, 20) + '...');
  }
  
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// ---- Socket.IO Setup ----
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*", // in prod, set CLIENT_URL
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
const userProfileMap = {}; // Store user profile data
const roomCanvasHistory = {}; // canvas history per room
const roomCodeState = {}; // code state per room
const roomCursorStates = {}; // cursor states per room
const blacklistedTokens = new Set(); // Store blacklisted JWT tokens

// Clean up old blacklisted tokens every hour
setInterval(() => {
  // In a real application, you'd want to store this in a database
  // and clean up tokens that are past their expiration time
  console.log(`Blacklisted tokens count: ${blacklistedTokens.size}`);
}, 60 * 60 * 1000); // 1 hour

const getAllConnectedClients = (roomId) => {
  const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
      profile: userProfileMap[socketId] || null
    })
  );
  console.log('🔹 getAllConnectedClients result:', clients.map(c => ({ 
    socketId: c.socketId, 
    username: c.username, 
    hasProfile: !!c.profile,
    profilePicture: c.profile?.picture?.substring(0, 50) + '...' || 'none'
  })));
  return clients;
};

io.on("connection", (socket) => {
  // ---- Join Room ----
  socket.on(ACTIONS.JOIN, ({ roomId, username, userProfile }) => {
    console.log('🔹 Received ACTIONS.JOIN:', { roomId, username, userProfile });
    userSocketMap[socket.id] = username;
    if (userProfile) {
      userProfileMap[socket.id] = userProfile;
      console.log('🔹 Stored user profile for', username, ':', userProfile);
    }
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);
    console.log('🔹 All connected clients:', clients.map(c => ({ username: c.username, socketId: c.socketId, profile: c.profile })));

    // Send canvas state to newcomer
    const state = roomCanvasHistory[roomId];
    if (state) {
      socket.emit("canvas-state", {
        history: state.history,
        step: state.step,
        kind: "state",
      });
    }

    // Send code state to newcomer
    if (roomCodeState[roomId]) {
      socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeState[roomId] });
    }

    // Send cursor states to newcomer
    if (roomCursorStates[roomId]) {
      socket.emit("cursor-states", roomCursorStates[roomId]);
    }

    // 🔹 FIX: Notify others about new user
    console.log('🔹 Notifying others about new user:', {
      username,
      socketId: socket.id,
      userProfile: userProfileMap[socket.id],
      clients: clients.map(c => ({ username: c.username, socketId: c.socketId, profile: c.profile }))
    });
    socket.to(roomId).emit(ACTIONS.JOINED, {
      clients,
      username,
      socketId: socket.id,
      userProfile: userProfileMap[socket.id] || null
    });

    // 🔹 Send the full client list only to the new user
    console.log('🔹 Sending to new user:', {
      username,
      socketId: socket.id,
      userProfile: userProfileMap[socket.id],
      clients: clients.map(c => ({ username: c.username, socketId: c.socketId, profile: c.profile }))
    });
    socket.emit(ACTIONS.JOINED, {
      clients,
      username,
      socketId: socket.id,
      userProfile: userProfileMap[socket.id] || null
    });
  });

  // ---- Code Sync ----
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    roomCodeState[roomId] = code;
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // ---- Cursor Sync ----
  socket.on(ACTIONS.CURSOR_POSITION, ({ roomId, position, selection }) => {
    if (!roomCursorStates[roomId]) {
      roomCursorStates[roomId] = {};
    }
    
    roomCursorStates[roomId][socket.id] = {
      socketId: socket.id,
      username: userSocketMap[socket.id],
      position,
      selection,
      timestamp: Date.now()
    };

    socket.to(roomId).emit(ACTIONS.CURSOR_POSITION, {
      socketId: socket.id,
      username: userSocketMap[socket.id],
      position,
      selection
    });
  });

  socket.on(ACTIONS.CURSOR_SELECTION, ({ roomId, selection }) => {
    if (!roomCursorStates[roomId]) {
      roomCursorStates[roomId] = {};
    }
    
    if (roomCursorStates[roomId][socket.id]) {
      roomCursorStates[roomId][socket.id].selection = selection;
      roomCursorStates[roomId][socket.id].timestamp = Date.now();
    }

    socket.to(roomId).emit(ACTIONS.CURSOR_SELECTION, {
      socketId: socket.id,
      username: userSocketMap[socket.id],
      selection
    });
  });

  // ---- Canvas Drawing ----
  socket.on("canvas-draw", ({ roomId, ...data }) => {
    if (roomId) socket.to(roomId).emit("canvas-draw", data);
  });

  // ---- Canvas State ----
  socket.on("canvas-state", ({ roomId, history, step, imgData, kind }) => {
    if (!roomId) return;

    if (Array.isArray(history) && typeof step === "number") {
      roomCanvasHistory[roomId] = { history: [...history], step };
      socket.to(roomId).emit("canvas-state", {
        history,
        step,
        kind: kind || "state",
      });
    } else if (typeof imgData === "string") {
      const prev = roomCanvasHistory[roomId] || { history: [], step: -1 };
      const cut = prev.history.slice(0, prev.step + 1);
      cut.push(imgData);
      roomCanvasHistory[roomId] = { history: cut, step: cut.length - 1 };
      socket.to(roomId).emit("canvas-state", imgData);
    }
  });

  // ---- Clear Canvas ----
  socket.on("canvas-clear", ({ roomId }) => {
    if (roomId) {
      delete roomCanvasHistory[roomId];
      socket.to(roomId).emit("canvas-clear");
    }
  });

  // ---- Disconnect ----
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });

      // Clean up cursor state
      if (roomCursorStates[roomId]) {
        delete roomCursorStates[roomId][socket.id];
        socket.to(roomId).emit(ACTIONS.CURSOR_LEAVE, {
          socketId: socket.id,
          username: userSocketMap[socket.id]
        });
      }
      
      // Clean up user profile
      delete userProfileMap[socket.id];

      const remaining = getAllConnectedClients(roomId);
      if (remaining.length <= 1) {
        delete roomCanvasHistory[roomId];
        delete roomCodeState[roomId];
        delete roomCursorStates[roomId];
      }
    });
    delete userSocketMap[socket.id];
  });
});

// ---- Compiler API Proxy ----
app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.jDoodle_clientId,
      clientSecret: process.env.jDoodle_clientSecret,
    });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to compile code" });
  }
});

// ---- Serve React Frontend ----
app.use(express.static(path.join(__dirname, "..", "client", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "build", "index.html"));
});

// ---- Start Server ----
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
