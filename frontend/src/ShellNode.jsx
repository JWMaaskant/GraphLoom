import { useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useShellSocket } from './useShellSocket';
import '@xterm/xterm/css/xterm.css';

export default function ShellNode({ id, data, selected }) {
  const termRef = useRef(null);
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);

  const handleOutput = useCallback((data) => {
    terminalRef.current?.write(data);
  }, []);

  const handleReady = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  const { sendInput, resize } = useShellSocket(id, handleOutput, handleReady);

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#00ff88',
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => sendInput(data));

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = term;
      resize(cols, rows);
    });
    observer.observe(termRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
    };
  }, []);

  // Focus terminal when node is selected
  useEffect(() => {
    if (selected) terminalRef.current?.focus();
  }, [selected]);

  return (
    <div
      style={{
        border: selected ? '2px solid #00ff88' : '2px solid #333',
        borderRadius: 8,
        background: '#1a1a2e',
        width: 500,
        minHeight: 200,
        boxShadow: selected ? '0 0 20px rgba(0,255,136,0.3)' : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Node header */}
      <div style={{
        padding: '6px 12px',
        background: '#16213e',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid #333',
      }}>
        <span style={{ color: '#00ff88', fontSize: 11, fontFamily: 'monospace' }}>
          ⬡ {data.label || `node:${id.slice(0, 6)}`}
        </span>
        <span style={{ color: '#666', fontSize: 10, marginLeft: 'auto' }}>bash</span>
      </div>

      {/* Terminal area */}
      <div
        ref={termRef}
        style={{ padding: 8, height: 220 }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Handles for connecting nodes */}
      <Handle type="target" position={Position.Left} style={{ background: '#00ff88' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#00ff88' }} />
    </div>
  );
}
