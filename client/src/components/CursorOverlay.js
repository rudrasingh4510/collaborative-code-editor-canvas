import React, { useEffect, useRef, useState } from 'react';

const CursorOverlay = ({ editorRef, cursors, currentUserSocketId }) => {
  const overlayRef = useRef(null);
  const [overlayStyle, setOverlayStyle] = useState({});
  const [forceUpdate, setForceUpdate] = useState(0);

  // Color palette for different users
  const userColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
    '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
  ];

  const getCursorColor = (socketId) => {
    const index = socketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return userColors[index % userColors.length];
  };

  const updateOverlayPosition = () => {
    if (!editorRef.current || !overlayRef.current) return;

    const editor = editorRef.current;
    const overlay = overlayRef.current;
    
    // Get the CodeMirror editor's display element (the actual text area)
    const editorElement = editor.getWrapperElement();
    const displayElement = editor.getScrollerElement();
    const rect = displayElement.getBoundingClientRect();
    
    setOverlayStyle({
      position: 'fixed',
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      pointerEvents: 'none',
      zIndex: 10
    });
  };

  useEffect(() => {
    updateOverlayPosition();
    
    const handleResize = () => updateOverlayPosition();
    const handleScroll = () => updateOverlayPosition();
    
    window.addEventListener('resize', handleResize);
    
    // Listen for scroll events on the editor
    if (editorRef.current) {
      const editor = editorRef.current;
      const scroller = editor.getScrollerElement();
      scroller.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        scroller.removeEventListener('scroll', handleScroll);
      };
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [editorRef.current]);

  // Force re-render when cursors change
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [cursors]);

  const renderCursor = (cursor) => {
    if (!editorRef.current || cursor.socketId === currentUserSocketId) return null;

    const editor = editorRef.current;
    const { position, selection, username } = cursor;
    
    console.log('Rendering cursor:', { socketId: cursor.socketId, username, position, selection });
    console.log('All cursors:', cursors);
    
    try {
      // Get cursor position in pixels relative to the editor's display area
      const coords = editor.charCoords(position, 'page');
      const lineHeight = editor.defaultTextHeight();
      
      // Get the editor's display area position
      const displayElement = editor.getScrollerElement();
      const displayRect = displayElement.getBoundingClientRect();
      
      // Calculate relative position within the display area
      const relativeLeft = coords.left - displayRect.left;
      const relativeTop = coords.top - displayRect.top;
      
      const cursorStyle = {
        position: 'absolute',
        left: relativeLeft,
        top: relativeTop,
        width: '2px',
        height: lineHeight,
        backgroundColor: getCursorColor(cursor.socketId),
        zIndex: 11,
        pointerEvents: 'none',
        animation: 'blink 1s infinite'
      };

      const labelStyle = {
        position: 'absolute',
        left: relativeLeft + 4,
        top: relativeTop - 20,
        backgroundColor: getCursorColor(cursor.socketId),
        color: 'white',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '12px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        zIndex: 12,
        pointerEvents: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
      };

      return (
        <div key={cursor.socketId}>
          {/* Cursor line */}
          <div style={cursorStyle} />
          
          {/* Username label */}
          <div style={labelStyle}>
            {username}
          </div>
          
          {/* Selection highlight */}
          {(() => {
            const hasSelection = selection && selection.from && selection.to && 
              (selection.from.line !== selection.to.line || selection.from.ch !== selection.to.ch);
            console.log('Selection check for', username, ':', { selection, hasSelection });
            if (hasSelection) {
              console.log('Rendering selection for', username, ':', selection);
            }
            return hasSelection;
          })() ? (
            <>
              <SelectionHighlight 
                editor={editor}
                selection={selection}
                color={getCursorColor(cursor.socketId)}
                username={username}
              />
              {/* Selection label */}
              <div style={{
                position: 'absolute',
                left: relativeLeft + 4,
                top: relativeTop + lineHeight + 2,
                backgroundColor: getCursorColor(cursor.socketId),
                color: 'white',
                padding: '1px 4px',
                borderRadius: '2px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                zIndex: 13,
                pointerEvents: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                opacity: 0.9
              }}>
                {username} selected
              </div>
            </>
          ) : null}
        </div>
      );
    } catch (error) {
      console.warn('Error rendering cursor:', error);
      return null;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
      <div ref={overlayRef} style={overlayStyle} key={forceUpdate}>
        {Object.values(cursors).map(renderCursor)}
      </div>
    </>
  );
};

const SelectionHighlight = ({ editor, selection, color, username }) => {
  const [highlightElements, setHighlightElements] = useState([]);

  useEffect(() => {
    console.log('SelectionHighlight useEffect called with:', { editor: !!editor, selection, color, username });
    if (!editor || !selection) return;

    try {
      const fromLine = selection.from.line;
      const toLine = selection.to.line;
      const fromCh = selection.from.ch;
      const toCh = selection.to.ch;
      
      // Get the editor's display area position
      const displayElement = editor.getScrollerElement();
      const displayRect = displayElement.getBoundingClientRect();
      const lineHeight = editor.defaultTextHeight();
      
      const elements = [];
      
      if (fromLine === toLine) {
        // Single line selection
        const fromCoords = editor.charCoords(selection.from, 'page');
        const toCoords = editor.charCoords(selection.to, 'page');
        
        const fromLeft = fromCoords.left - displayRect.left;
        const fromTop = fromCoords.top - displayRect.top;
        const toLeft = toCoords.left - displayRect.left;
        
        elements.push({
          key: 'single-line',
          style: {
            position: 'absolute',
            left: fromLeft,
            top: fromTop,
            width: toLeft - fromLeft,
            height: lineHeight,
            backgroundColor: color + '25', // 25% opacity for better visibility
            border: `1px solid ${color}`,
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: `0 0 4px ${color}40`
          }
        });
      } else {
        // Multi-line selection
        for (let line = fromLine; line <= toLine; line++) {
          const lineStart = line === fromLine ? fromCh : 0;
          const lineEnd = line === toLine ? toCh : editor.getLine(line).length;
          
          if (lineStart < lineEnd) {
            const fromCoords = editor.charCoords({ line, ch: lineStart }, 'page');
            const toCoords = editor.charCoords({ line, ch: lineEnd }, 'page');
            
            const fromLeft = fromCoords.left - displayRect.left;
            const fromTop = fromCoords.top - displayRect.top;
            const toLeft = toCoords.left - displayRect.left;
            
            elements.push({
              key: `line-${line}`,
              style: {
                position: 'absolute',
                left: fromLeft,
                top: fromTop,
                width: toLeft - fromLeft,
                height: lineHeight,
                backgroundColor: color + '25',
                border: `1px solid ${color}`,
                borderRadius: line === fromLine ? '3px 3px 0 0' : 
                           line === toLine ? '0 0 3px 3px' : '0',
                pointerEvents: 'none',
                zIndex: 10,
                boxShadow: `0 0 4px ${color}40`
              }
            });
          }
        }
      }
      
      console.log('SelectionHighlight elements created:', elements);
      setHighlightElements(elements);
    } catch (error) {
      console.warn('Error rendering selection:', error);
    }
  }, [editor, selection, color]);

  return (
    <>
      {highlightElements.map(element => (
        <div key={element.key} style={element.style} />
      ))}
    </>
  );
};

export default CursorOverlay;
