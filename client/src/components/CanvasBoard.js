// CanvasBoard.js
import React, { useEffect, useRef, useState } from "react";

export default function CanvasBoard({ socketRef, roomId, socketReady }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const drawingRef = useRef(false);
  const prevRef = useRef({ x: 0, y: 0 });

  // Global-syncable history
  const historyRef = useRef([]);
  const stepRef = useRef(-1);
  const initialStateReceived = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const savingHistoryRef = useRef(false);

  const BG_COLOR = "#171717";

  // --- helpers ---
  const updateUndoRedo = () => {
    setCanUndo(stepRef.current > 0);
    setCanRedo(stepRef.current < historyRef.current.length - 1);
  };

  const getRect = () => canvasRef.current.getBoundingClientRect();

  const getPos = (e) => {
    const r = getRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const norm = ({ x, y }) => {
    const r = getRect();
    return { nx: x / r.width, ny: y / r.height };
  };

  const denorm = ({ nx, ny }) => {
    const r = getRect();
    return { x: nx * r.width, y: ny * r.height };
  };

  const dpr = () => window.devicePixelRatio || 1;

  const styleCtx = (ctx, t = tool, c = color, s = size) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s;
    ctx.strokeStyle = t === "eraser" ? BG_COLOR : c;
    ctx.globalCompositeOperation = "source-over";
  };

  const clearLocal = () => {
    if (!ctxRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    ctxRef.current.clearRect(0, 0, c.clientWidth, c.clientHeight);
    ctxRef.current.fillStyle = BG_COLOR;
    ctxRef.current.fillRect(0, 0, c.clientWidth, c.clientHeight);
  };

  const applySnapshot = (imgData) => {
    if (!imgData || !ctxRef.current || !canvasRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgData;
      img.onload = () => {
        clearLocal();
        const w = canvasRef.current.clientWidth;
        const h = canvasRef.current.clientHeight;
        ctxRef.current.drawImage(img, 0, 0, w, h);
        resolve();
      };
      img.onerror = () => resolve();
    });
  };

  const replaceHistoryAndApply = async (history, step) => {
    if (!Array.isArray(history) || typeof step !== "number") return;
    historyRef.current = history.slice();
    stepRef.current = Math.min(Math.max(step, 0), historyRef.current.length - 1);
    updateUndoRedo();
    const img = historyRef.current[stepRef.current];
    await applySnapshot(img);
  };

  const resizeHiDPI = () => {
    if (!canvasRef.current) return;
    let keep = null;
    try {
      keep = canvasRef.current.toDataURL();
    } catch (_) {}

    const c = canvasRef.current;
    const ratio = dpr();

    c.style.width = "100%";
    c.style.height = "100%";
    const r = c.getBoundingClientRect();

    c.width = Math.round(r.width * ratio);
    c.height = Math.round(r.height * ratio);

    const ctx = c.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctxRef.current = ctx;

    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.restore();

    if (keep && initialStateReceived.current) {
      const img = new Image();
      img.src = keep;
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
    }
  };

  // --- broadcasting ---
  const broadcastHistory = (kind = "state") => {
    if (!socketRef.current || !roomId) return;
    const payload = {
      roomId,
      imgData: historyRef.current[stepRef.current], // back-compat
      history: historyRef.current,
      step: stepRef.current,
      kind, // "push" | "undo" | "redo" | "clear" | "state"
    };
    socketRef.current.emit("canvas-state", payload);
  };

  const saveHistory = (emit = true) => {
    if (!canvasRef.current || savingHistoryRef.current) return;

    savingHistoryRef.current = true;
    try {
      const data = canvasRef.current.toDataURL();

      // Cut any forward states (branch) then push
      const cut = historyRef.current.slice(0, stepRef.current + 1);
      cut.push(data);
      historyRef.current = cut;
      stepRef.current = cut.length - 1;

      updateUndoRedo();

      if (emit) broadcastHistory("push");
    } catch (err) {
      console.error("saveHistory error", err);
    } finally {
      savingHistoryRef.current = false;
    }
  };

  const strokeSegment = (p0, p1, emit = false, opt = {}) => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    styleCtx(ctx, opt.tool ?? tool, opt.color ?? color, opt.size ?? size);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.closePath();

    if (emit && socketRef.current && roomId) {
      const { nx: x0, ny: y0 } = norm(p0);
      const { nx: x1, ny: y1 } = norm(p1);
      socketRef.current.emit("canvas-draw", {
        roomId,
        tool: opt.tool ?? tool,
        color: opt.tool === "eraser" ? BG_COLOR : (opt.color ?? color),
        size: opt.size ?? size,
        x0, y0, x1, y1,
      });
    }
  };

  // --- pointer events ---
  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drawingRef.current = true;
    prevRef.current = getPos(e);
    try { e.target.setPointerCapture?.(e.pointerId); } catch (_) {}
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    strokeSegment(prevRef.current, p, true);
    prevRef.current = p;
  };

  const onPointerUp = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const p = getPos(e);
    strokeSegment(prevRef.current, p, true);
    // Save + broadcast full history after stroke completes
    setTimeout(() => saveHistory(true), 16);
    try { e.target.releasePointerCapture?.(e.pointerId); } catch (_) {}
  };

  // --- global Undo / Redo ---
  const undo = async () => {
    if (!(stepRef.current > 0) || savingHistoryRef.current) return;
    stepRef.current -= 1;
    updateUndoRedo();
    await applySnapshot(historyRef.current[stepRef.current]);
    broadcastHistory("undo");
  };

  const redo = async () => {
    if (!(stepRef.current < historyRef.current.length - 1) || savingHistoryRef.current) return;
    stepRef.current += 1;
    updateUndoRedo();
    await applySnapshot(historyRef.current[stepRef.current]);
    broadcastHistory("redo");
  };

  // Clear becomes an undoable blank snapshot (global)
  const clearAndBroadcast = () => {
    clearLocal();
    saveHistory(true); // broadcast as a "push" of the blank frame
  };

  const initializeHistory = () => {
    if (!canvasRef.current || initialStateReceived.current) return;
    try {
      const blank = canvasRef.current.toDataURL();
      historyRef.current = [blank];
      stepRef.current = 0;
      initialStateReceived.current = true;
      updateUndoRedo();
    } catch (err) {
      console.error("initial blank snapshot error", err);
    }
  };

  // --- effects ---
  useEffect(() => {
    resizeHiDPI();
    const timer = setTimeout(() => initializeHistory(), 100);
    const onResize = () => resizeHiDPI();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!socketReady || !socketRef.current) return;
    const s = socketRef.current;

    s.off("canvas-draw");
    s.off("canvas-clear");
    s.off("canvas-state");

    s.on("canvas-draw", (payload) => {
      if (!payload) return;
      const p0 = denorm({ nx: payload.x0, ny: payload.y0 });
      const p1 = denorm({ nx: payload.x1, ny: payload.y1 });
      strokeSegment(p0, p1, false, {
        tool: payload.tool,
        color: payload.color,
        size: payload.size,
      });
    });

    // Back-compat: if some older client emits "canvas-clear"
    s.on("canvas-clear", () => {
      clearLocal();
      setTimeout(() => { initializeHistory(); }, 16);
    });

    s.on("canvas-state", async (payload) => {
      // Preferred path: full history + step
      if (payload?.history && typeof payload?.step === "number") {
        await replaceHistoryAndApply(payload.history, payload.step);
        initialStateReceived.current = true;
        return;
      }
      // Back-compat: only an image was sent
      const imgData =
        typeof payload === "string" ? payload : payload?.imgData ?? payload;
      if (!imgData) return;

      await applySnapshot(imgData);

      // If no explicit history given, append locally
      if (!savingHistoryRef.current) {
        const cut = historyRef.current.slice(0, stepRef.current + 1);
        cut.push(imgData);
        historyRef.current = cut;
        stepRef.current = cut.length - 1;
        updateUndoRedo();
      }

      initialStateReceived.current = true;
    });

    return () => {
      s.off("canvas-draw");
      s.off("canvas-clear");
      s.off("canvas-state");
    };
  }, [socketReady, socketRef, roomId]);

  useEffect(() => {
    if (ctxRef.current) styleCtx(ctxRef.current);
  }, [tool, color, size]);

  // --- UI ---
  const ColorSwatch = ({ c }) => (
    <button
      className="color-swatch"
      type="button"
      aria-label={c}
      onClick={() => {
        setColor(c);
        setShowColorPicker(false);
        setTool("pencil");
      }}
      style={{ backgroundColor: c }}
    />
  );

  return (
    <div className="canvas-root">
      <style jsx>{`
        .canvas-root { 
          display: flex; 
          flex-direction: column; 
          height: 100%; 
          width: 100%;
          padding: 8px; 
          box-sizing: border-box; 
          overflow: hidden;
        }
        .toolbar { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 8px; 
          align-items: center; 
          background: rgba(20, 20, 20, 0.95); 
          padding: 8px; 
          border-radius: 8px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        .control-button { 
          flex: 0 1 auto; 
          min-width: 70px; 
          height: 32px; 
          border-radius: 6px; 
          border: none; 
          background: rgba(255,255,255,0.04); 
          color: #f1f1f1; 
          font-weight: 600; 
          cursor: pointer; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          padding: 6px 10px; 
          transition: transform .12s ease, background .12s ease;
          font-size: 12px;
        }
        .control-button:hover { 
          transform: translateY(-2px); 
          background: rgba(255,255,255,0.06); 
        }
        .control-button.active { 
          background: linear-gradient(90deg,#3b82f6,#1e40af); 
          box-shadow: 0 4px 12px rgba(30,64,175,0.18); 
        }
        .control-button:disabled { 
          opacity: 0.5; 
          cursor: not-allowed; 
          transform: none; 
        }
        .color-group { 
          display:flex; 
          gap:8px; 
          align-items:center; 
          position: relative; 
        }
        .color-preview { 
          width: 32px; 
          height: 28px; 
          border-radius: 6px; 
          border: 2px solid rgba(255,255,255,0.08); 
          background: #fff; 
          cursor: pointer; 
        }
        .color-dropdown { 
          position: absolute; 
          top: 36px; 
          left: 0; 
          background: rgba(18,18,18,0.98); 
          border-radius: 6px; 
          padding: 8px; 
          display: grid; 
          grid-template-columns: repeat(6, 1fr); 
          gap: 6px; 
          z-index: 60; 
          box-shadow: 0 8px 20px rgba(0,0,0,0.6); 
        }
        .color-swatch { 
          width: 24px; 
          height: 24px; 
          border-radius: 4px; 
          cursor: pointer; 
          border: 2px solid transparent; 
        }
        .size-control { 
          display:flex; 
          gap:8px; 
          align-items:center; 
          color:#ddd; 
          font-size:12px; 
        }
        .size-slider { 
          width: 120px; 
        }
        .action-group { 
          margin-left: auto; 
          display:flex; 
          flex-wrap: wrap; 
          gap: 6px; 
          align-items:center; 
        }
        .canvas-area { 
          flex: 1; 
          margin-top: 8px; 
          min-height: 0;
          overflow: hidden;
        }
        .canvas { 
          width: 100%; 
          height: 100%; 
          display: block; 
          background: ${BG_COLOR}; 
          border-radius: 8px; 
          border: 1px solid rgba(255,255,255,0.03); 
          cursor: crosshair; 
        }
        @media (max-width: 768px) { 
          .control-button { 
            min-width: 60px; 
            padding: 4px 6px;
            font-size: 11px; 
          } 
          .size-slider { 
            width: 100px; 
          } 
          .toolbar {
            padding: 6px;
            gap: 6px;
          }
        }
      `}</style>

      <div className="toolbar">
        <button className={`control-button ${tool === "pencil" ? "active" : ""}`} onClick={() => setTool("pencil")} type="button">Pencil</button>
        <button className={`control-button ${tool === "eraser" ? "active" : ""}`} onClick={() => setTool("eraser")} type="button">Eraser</button>

        <div className="color-group">
          <div className="color-preview" role="button" title="Color" onClick={() => setShowColorPicker((s) => !s)} style={{ backgroundColor: color }} />
          {showColorPicker && (
            <div className="color-dropdown" onMouseLeave={() => setShowColorPicker(false)}>
              {[
                "#ffffff","#000000","#ff0000","#00ff00","#0000ff","#ffff00",
                "#ff00ff","#00ffff","#ff8000","#8000ff","#0080ff","#80ff00",
                "#808080","#400000","#004000"
              ].map((c) => (
                <ColorSwatch key={c} c={c} />
              ))}
            </div>
          )}
        </div>

        <div className="size-control" aria-label="Brush size">
          <div style={{ color: "#ddd", fontSize: 12 }}>Size</div>
          <input className="size-slider" type="range" min="1" max="72" value={size} onChange={(e) => setSize(parseInt(e.target.value, 10))} aria-label="Size slider" />
        </div>

        <div className="action-group">
          <button className="control-button" type="button" onClick={undo} disabled={!canUndo || savingHistoryRef.current}>Undo</button>
          <button className="control-button" type="button" onClick={redo} disabled={!canRedo || savingHistoryRef.current}>Redo</button>
          <button className="control-button" type="button" onClick={clearAndBroadcast}>Clear</button>
        </div>
      </div>

      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          className="canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseLeave={(e) => { if (drawingRef.current) onPointerUp(e); }}
        />
      </div>
    </div>
  );
}