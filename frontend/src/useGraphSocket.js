import { useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://localhost:3001';

// A single shared WebSocket for the whole app.
// Terminal nodes send/receive through this via their nodeId.
let sharedWs = null;
let listeners = new Map(); // nodeId -> callback

function getSocket() {
  if (sharedWs && sharedWs.readyState <= 1) return sharedWs;

  sharedWs = new WebSocket(WS_URL);

  sharedWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const cb = listeners.get(msg.nodeId);
    if (cb) cb(msg);
  };

  sharedWs.onerror = (e) => console.error('GraphLoom WS error', e);

  return sharedWs;
}

export function useGraphSocket(nodeId, onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    listeners.set(nodeId, (msg) => onMessageRef.current(msg));
    return () => listeners.delete(nodeId);
  }, [nodeId]);

  const send = useCallback((payload) => {
    const ws = getSocket();
    const doSend = () => ws.send(JSON.stringify(payload));
    if (ws.readyState === WebSocket.OPEN) doSend();
    else ws.addEventListener('open', doSend, { once: true });
  }, []);

  return { send };
}

export function initShell(nodeId) {
  const ws = getSocket();
  const doSend = () => ws.send(JSON.stringify({ type: 'init', nodeId }));
  if (ws.readyState === WebSocket.OPEN) doSend();
  else ws.addEventListener('open', doSend, { once: true });
}

export function transferShell(oldNodeId, newNodeId) {
  const ws = getSocket();
  const doSend = () => ws.send(JSON.stringify({ type: 'transfer', oldNodeId, newNodeId }));
  if (ws.readyState === WebSocket.OPEN) doSend();
  else ws.addEventListener('open', doSend, { once: true });
}
