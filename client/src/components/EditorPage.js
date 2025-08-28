import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import CanvasBoard from "./CanvasBoard";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [socketReady, setSocketReady] = useState(false);
  const codeRef = useRef(null);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const s = await initSocket();
      socketRef.current = s;

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, try again later");
        navigate("/");
      };

      s.on("connect_error", handleErrors);
      s.on("connect_failed", handleErrors);

      setSocketReady(true);

      s.emit(ACTIONS.JOIN, {
        roomId,
        username: Location.state?.username,
      });

      s.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        if (username !== Location.state?.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
        s.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId,
        });
      });

      s.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((c) => c.socketId !== socketId));
      });
    };

    init();

    return () => {
      setSocketReady(false);
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.disconnect();
      }
    };
  }, []); // eslint-disable-line

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => navigate("/");

  // Base button style
  const buttonStyle = {
    flex: "0 1 auto",
    minWidth: "70px",
    height: "32px",
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
    fontSize: "12px",
    width: "100%",
    marginBottom: "8px",
  };

  const copyButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(90deg,#3b82f6,#1e40af)",
  };

  const leaveButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(90deg,#dc3545,#c82333)",
    marginBottom: "0",
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#343a40",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "200px",
          backgroundColor: "#343a40",
          color: "white",
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
          borderRight: "1px solid #495057",
        }}
      >
        <span style={{ marginBottom: "1rem", fontWeight: "bold" }}>
          Members
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflowY: "auto",
            marginBottom: "1rem",
          }}
        >
          {clients.map((client) => (
            <Client key={client.socketId} username={client.username} />
          ))}
        </div>
        <hr style={{ margin: "1rem 0", borderColor: "#495057" }} />
        <div>
          <button
            style={copyButtonStyle}
            onClick={copyRoomId}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "none";
            }}
          >
            Copy Room ID
          </button>
          <button
            style={leaveButtonStyle}
            onClick={leaveRoom}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "none";
            }}
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          height: "100%",
        }}
      >
        {/* Code Editor Section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #495057",
          }}
        >
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#343a40",
              color: "white",
              fontWeight: "bold",
              borderBottom: "1px solid #495057",
            }}
          >
            Code Editor
          </div>
          <div
            style={{
              flex: 1,
              height: "calc(100vh - 40px)",
              overflow: "hidden",
            }}
          >
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              onCodeChange={(code) => (codeRef.current = code)}
            />
          </div>
        </div>

        {/* Canvas Section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#343a40",
              color: "white",
              fontWeight: "bold",
              borderBottom: "1px solid #495057",
            }}
          >
            Canvas
          </div>
          <div
            style={{
              flex: 1,
              height: "calc(100vh - 40px)",
              overflow: "hidden",
            }}
          >
            <CanvasBoard
              socketRef={socketRef}
              roomId={roomId}
              socketReady={socketReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
