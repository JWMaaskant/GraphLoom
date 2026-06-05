import { useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001';

export function useShellSocket(nodeId, onOutput, onReady) {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'create', nodeId, cols: 80, rows: 24 }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output') onOutput(msg.data);
      if (msg.type === 'ready') onReady?.();
    };

    ws.onerror = (err) => console.error('WS error', err);

    return () => {
      ws.send(JSON.stringify({ type: 'kill', nodeId }));
      ws.close();
    };
  }, [nodeId]);

  const sendInput = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', nodeId, data }));
    }
  }, [nodeId]);

  const resize = useCallback((cols, rows) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', nodeId, cols, rows }));
    }
  }, [nodeId]);

  return { sendInput, resize };
}
