import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("Room ID generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: { username },
    });
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

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

        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          onKeyUp={handleInputEnter}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "6px",
            border: "1px solid #444",
            backgroundColor: "#1f1f1f",
            color: "white",
          }}
        />

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Display Name"
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
