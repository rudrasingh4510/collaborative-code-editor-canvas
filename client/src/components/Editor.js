/*
 * FOCUS STATE MANAGEMENT ROLLBACK GUIDE
 * 
 * To rollback this focus state implementation, remove/comment out:
 * 
 * 1. Focus state variables (lines 22-26):
 *    - const [isFocused, setIsFocused] = useState(true);
 *    - const [isWindowVisible, setIsWindowVisible] = useState(true);
 *    - const lastValidCursorRef = useRef(null);
 *    - const lastValidSelectionRef = useRef(null);
 * 
 * 2. Focus state logic in cursor tracking (lines 110-122):
 *    - lastValidCursorRef.current = { ...cursor };
 *    - lastValidSelectionRef.current = { ... };
 *    - const shouldSendUpdate = isFocused && isWindowVisible && ...
 * 
 * 3. Focus/blur event handlers (lines 181-203):
 *    - editorRef.current.on("focus", ...)
 *    - editorRef.current.on("blur", ...)
 * 
 * 4. Window visibility handler (lines 302-329):
 *    - Entire useEffect with handleVisibilityChange
 * 
 * 5. Focus checks in selection tracking (line 170):
 *    - && isFocused && isWindowVisible
 * 
 * After rollback, cursor updates will work as before but may jump to beginning on focus loss.
 */

import React, { useEffect, useRef, useState } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";
import CursorOverlay from "./CursorOverlay";

function Editor({ socketRef, roomId, onCodeChange, currentUserSocketId }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [cursors, setCursors] = useState({});
  const cursorTimeoutRef = useRef({});
  const lastCursorPositionRef = useRef(null);
  const typingSessionRef = useRef({ isTyping: false, lastActivity: 0, updateCount: 0 });
  const adaptiveThrottleRef = useRef(25); // Start with 25ms
  const finalPositionTimeoutRef = useRef(null);
  const lastSentPositionRef = useRef(null);
  
  // Focus state management
  const [isFocused, setIsFocused] = useState(true);
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const lastValidCursorRef = useRef(null);
  const lastValidSelectionRef = useRef(null);

  // Helper function to check if cursor moved significantly
  const hasSignificantMovement = (newPos, lastPos) => {
    if (!lastPos) return true;
    
    // Check if line changed
    if (newPos.line !== lastPos.line) return true;
    
    // Check if character position changed (any movement during fast typing)
    if (newPos.ch !== lastPos.ch) return true;
    
    return false;
  };

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );

      editorRef.current = editor;

      // Set size to fill container
      editor.setSize("100%", "100%");

      // Refresh the editor when container size changes
      const resizeObserver = new ResizeObserver(() => {
        editor.refresh();
      });
      
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });

      // Cursor position tracking with adaptive throttling
      editorRef.current.on("cursorActivity", (instance) => {
        const cursor = instance.getCursor();
        const selection = instance.getSelection();
        
        const now = Date.now();
        const lastUpdate = lastCursorPositionRef.current;
        const timeSinceLastUpdate = now - (lastUpdate || 0);
        
        // Adaptive throttling logic
        const typingSession = typingSessionRef.current;
        typingSession.lastActivity = now;
        typingSession.updateCount++;
        
        // Detect fast typing (more than 2 updates in 30ms)
        if (timeSinceLastUpdate < 30) {
          typingSession.updateCount++;
          if (typingSession.updateCount >= 2) {
            // Fast typing detected - reduce throttle to minimum
            adaptiveThrottleRef.current = 10;
          }
        } else {
          // Reset update count if enough time has passed
          if (timeSinceLastUpdate > 80) {
            typingSession.updateCount = 0;
            // Slow typing - increase throttle
            adaptiveThrottleRef.current = 25;
          }
        }
        
        // Store valid cursor position for restoration
        lastValidCursorRef.current = { ...cursor };
        lastValidSelectionRef.current = {
          from: { ...selection.from },
          to: { ...selection.to }
        };
        
        // Check if we should send update based on adaptive throttle and focus state
        // Only send updates when editor is focused and window is visible
        const isFastTyping = adaptiveThrottleRef.current <= 10;
        const shouldSendUpdate = isFocused && isWindowVisible &&
                                 (!lastUpdate || timeSinceLastUpdate > adaptiveThrottleRef.current) &&
                                 (isFastTyping || hasSignificantMovement(cursor, lastSentPositionRef.current));
        
        if (shouldSendUpdate) {
          lastCursorPositionRef.current = now;
          lastSentPositionRef.current = { ...cursor };
          
          if (socketRef.current && roomId) {
            // Check if there's actually a selection (not just cursor position)
            const hasSelection = selection && selection.from && selection.to && 
              (selection.from.line !== selection.to.line || selection.from.ch !== selection.to.ch);
            const selectionData = hasSelection ? {
              from: selection.from,
              to: selection.to
            } : null;
            
            console.log('Sending cursor position with selection:', { position: cursor, selection: selectionData });
            socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
              roomId,
              position: cursor,
              selection: selectionData
            });
          }
        }
        
        // End-of-session correction logic
        if (finalPositionTimeoutRef.current) {
          clearTimeout(finalPositionTimeoutRef.current);
        }
        
        // Set timeout to send final position after typing stops
        finalPositionTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && roomId) {
            const finalCursor = instance.getCursor();
            const finalSelection = instance.getSelection();
            
            // Only send final position if it's different from what we last sent
            if (hasSignificantMovement(finalCursor, lastSentPositionRef.current)) {
              lastSentPositionRef.current = { ...finalCursor };
              
              // Check if there's actually a selection (not just cursor position)
              const hasSelection = finalSelection && finalSelection.from && finalSelection.to && 
                (finalSelection.from.line !== finalSelection.to.line || finalSelection.from.ch !== finalSelection.to.ch);
              const selectionData = hasSelection ? {
                from: finalSelection.from,
                to: finalSelection.to
              } : null;
              
              socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
                roomId,
                position: finalCursor,
                selection: selectionData
              });
            }
          }
        }, 10); // Send final position 10ms after last activity
      });

      // Selection change tracking with throttling
      let selectionTimeout = null;
      editorRef.current.on("beforeSelectionChange", (instance, selection) => {
        // Clear previous timeout
        if (selectionTimeout) {
          clearTimeout(selectionTimeout);
        }
        
        // Throttle selection updates to avoid spam
        selectionTimeout = setTimeout(() => {
          if (socketRef.current && roomId && isFocused && isWindowVisible) {
            const range = selection.ranges[0];
            if (range) {
              // Check if there's actually a selection (not just cursor position)
              const hasSelection = range && range.from && range.to && 
                (range.from.line !== range.to.line || range.from.ch !== range.to.ch);
              
              const selectionData = hasSelection ? {
                from: range.from,
                to: range.to
              } : null;
              
              console.log('Sending selection update:', selectionData);
              console.log('Selection ranges:', selection.ranges);
              console.log('Original selection object:', selection);
              socketRef.current.emit(ACTIONS.CURSOR_SELECTION, {
                roomId,
                selection: selectionData
              });
            }
          }
        }, 50); // 50ms throttle for selection updates
      });

      // Focus and blur event handlers
      editorRef.current.on("focus", () => {
        setIsFocused(true);
        
        // Restore cursor position when focus returns
        if (lastValidCursorRef.current && editorRef.current) {
          const editor = editorRef.current;
          editor.setCursor(lastValidCursorRef.current);
          
          // Send restored position to other users
          if (socketRef.current && roomId) {
            // Check if there's actually a selection (not just cursor position)
            const hasSelection = lastValidSelectionRef.current && 
              lastValidSelectionRef.current.from && lastValidSelectionRef.current.to &&
              (lastValidSelectionRef.current.from.line !== lastValidSelectionRef.current.to.line || 
               lastValidSelectionRef.current.from.ch !== lastValidSelectionRef.current.to.ch);
            const selectionData = hasSelection ? lastValidSelectionRef.current : null;
            
            socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
              roomId,
              position: lastValidCursorRef.current,
              selection: selectionData
            });
          }
        }
      });

      editorRef.current.on("blur", () => {
        setIsFocused(false);
      });

      // Cleanup function
      return () => {
        resizeObserver.disconnect();
        if (finalPositionTimeoutRef.current) {
          clearTimeout(finalPositionTimeoutRef.current);
        }
        if (selectionTimeout) {
          clearTimeout(selectionTimeout);
        }
      };
    };

    const cleanup = init();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null && editorRef.current) {
          editorRef.current.setValue(code);
        }
      });

      // Handle cursor position updates from other users
      socketRef.current.on(ACTIONS.CURSOR_POSITION, ({ socketId, username, position, selection }) => {
        console.log('Received cursor position:', { socketId, username, position, selection });
        if (socketId !== currentUserSocketId) {
          setCursors(prev => ({
            ...prev,
            [socketId]: {
              socketId,
              username,
              position,
              selection,
              timestamp: Date.now()
            }
          }));

          // Clear timeout for this cursor
          if (cursorTimeoutRef.current[socketId]) {
            clearTimeout(cursorTimeoutRef.current[socketId]);
          }

          // Set timeout to remove cursor if inactive
          cursorTimeoutRef.current[socketId] = setTimeout(() => {
            setCursors(prev => {
              const newCursors = { ...prev };
              delete newCursors[socketId];
              return newCursors;
            });
          }, 5000); // Remove cursor after 5 seconds of inactivity
        }
      });

      // Handle cursor selection updates
      socketRef.current.on(ACTIONS.CURSOR_SELECTION, ({ socketId, username, selection }) => {
        console.log('Received selection update:', { socketId, username, selection });
        if (socketId !== currentUserSocketId) {
          setCursors(prev => {
            const newCursors = {
              ...prev,
              [socketId]: {
                ...prev[socketId],
                socketId,
                username: username || prev[socketId]?.username,
                selection,
                timestamp: Date.now()
              }
            };
            console.log('Updated cursors with selection:', newCursors);
            return newCursors;
          });
        }
      });

      // Handle cursor leave events
      socketRef.current.on(ACTIONS.CURSOR_LEAVE, ({ socketId }) => {
        setCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[socketId];
          return newCursors;
        });
        if (cursorTimeoutRef.current[socketId]) {
          clearTimeout(cursorTimeoutRef.current[socketId]);
        }
      });

      // Handle initial cursor states when joining
      socketRef.current.on("cursor-states", (cursorStates) => {
        setCursors(cursorStates);
      });
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.CURSOR_POSITION);
        socketRef.current.off(ACTIONS.CURSOR_SELECTION);
        socketRef.current.off(ACTIONS.CURSOR_LEAVE);
        socketRef.current.off("cursor-states");
      }
    };
  }, [socketRef.current, currentUserSocketId]);

  // Window visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsWindowVisible(isVisible);
      
      // When window becomes visible again, restore cursor position
      if (isVisible && lastValidCursorRef.current && editorRef.current) {
        const editor = editorRef.current;
        editor.setCursor(lastValidCursorRef.current);
        
        // Send restored position to other users
        if (socketRef.current && roomId) {
          // Check if there's actually a selection (not just cursor position)
          const hasSelection = lastValidSelectionRef.current && 
            lastValidSelectionRef.current.from && lastValidSelectionRef.current.to &&
            (lastValidSelectionRef.current.from.line !== lastValidSelectionRef.current.to.line || 
             lastValidSelectionRef.current.from.ch !== lastValidSelectionRef.current.to.ch);
          const selectionData = hasSelection ? lastValidSelectionRef.current : null;
          
          socketRef.current.emit(ACTIONS.CURSOR_POSITION, {
            roomId,
            position: lastValidCursorRef.current,
            selection: selectionData
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socketRef.current, roomId]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: "100%", 
        width: "100%", 
        display: "flex", 
        flexDirection: "column",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <textarea 
        id="realtimeEditor"
        style={{
          width: "100%",
          height: "100%",
          resize: "none",
          border: "none",
          outline: "none"
        }}
      ></textarea>
      <CursorOverlay 
        editorRef={editorRef}
        cursors={cursors}
        currentUserSocketId={currentUserSocketId}
      />
    </div>
  );
}

export default Editor;