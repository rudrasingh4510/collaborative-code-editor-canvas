import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import config from "../config";

function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useUser();

  const generateRoomId = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("Room ID generated");
  };

  const joinRoom = () => {
    if (!roomId) {
      toast.error("Room ID is required");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Please log in first");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { 
        username: user.name,
        userProfile: user
      },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

  const handleGoogleLogin = () => {
    window.location.href = `${config.SERVER_URL}/auth/google`;
  };
  const { logout } = useUser();

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1f1f1f",
        color: "white"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading...</p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  // Base button style
  const baseButton = {
    flex: "0 1 auto",
    minWidth: "70px",
    height: "38px",
    borderRadius: "6px",
    border: "none",
    background: "rgba(255,255,255,0.04)",
    color: "#f1f1f1",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    transition: "transform .12s ease",
    fontSize: "14px",
    width: "100%",
    marginBottom: "10px",
  };

  const primaryButton = {
    ...baseButton,
    background: "linear-gradient(90deg,#3b82f6,#1e40af)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1f1f1f",
      }}
    >
      <div
        style={{
          background: "#2a2a2a",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "white", marginBottom: "0.5rem" }}>CodeCollab</h2>
        <p style={{ color: "#aaa", marginBottom: "2rem", fontSize: "14px" }}>
          Real-time collaborative coding & drawing
        </p>

        {isAuthenticated ? (
          <>
            {/* User Profile Section */}
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1.5rem",
              padding: "10px",
              backgroundColor: "#1f1f1f",
              borderRadius: "8px",
              border: "1px solid #444"
            }}>
              <img 
                src={user.picture} 
                alt={user.name}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  marginRight: "12px",
                  objectFit: "cover"
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontWeight: "bold" }}>{user.name}</div>
                <div style={{ color: "#aaa", fontSize: "12px" }}>{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "1px solid #dc3545",
                  color: "#dc3545",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Logout
              </button>
            </div>

            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID"
              onKeyUp={handleInputEnter}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "20px",
                borderRadius: "6px",
                border: "1px solid #444",
                backgroundColor: "#1f1f1f",
                color: "white",
              }}
            />

            <button
              style={primaryButton}
              onClick={joinRoom}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "none";
              }}
            >
              Join Room
            </button>

            <button
              style={primaryButton}
              onClick={generateRoomId}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "none";
              }}
            >
              Generate New Room
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <p style={{ color: "#aaa", marginBottom: "1rem" }}>
                Please sign in with Google to start collaborating
              </p>
              <button
                onClick={handleGoogleLogin}
                style={{
                  ...primaryButton,
                  background: "linear-gradient(90deg,#4285f4,#34a853)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "none";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <p
        style={{
          color: "#aaa",
          marginTop: "20px",
          fontSize: "13px",
        }}
      >
        Made with ❤️ by{" "}
        <a
          href="https://github.com/rudrasingh4510"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#3b82f6", textDecoration: "none" }}
        >
          Rudra Singh
        </a>
      </p>
    </div>
  );
}

export default Home;
