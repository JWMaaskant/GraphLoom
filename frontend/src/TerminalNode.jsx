import { useState, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphSocket, initShell, transferShell } from './useGraphSocket';

export default function TerminalNode({ id, data, selected }) {
  const [input, setInput]     = useState('');
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [cwd, setCwd]         = useState('~');

  const { send } = useGraphSocket(id, (msg) => {
    if (msg.type === 'result') {
      setCwd(msg.cwd || '~');
      data.onResult?.({ command: msg.command, output: msg.output, cwd: msg.cwd });
      setRunning(false);
    }
  });

  // On mount: either init a fresh shell or transfer an existing one
  useEffect(() => {
    if (data.previousTerminalId) {
      transferShell(data.previousTerminalId, id);
    } else {
      initShell(id);
    }
  }, []);

  const run = useCallback(() => {
    const cmd = input.trim();
    if (!cmd || running) return;
    setRunning(true);
    setHistory(h => [cmd, ...h]);
    setHistIdx(-1);
    setInput('');
    send({ type: 'run', nodeId: id, command: cmd, runId: `${id}-${Date.now()}` });
  }, [input, running, id, send]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx(i => {
        const next = Math.min(i + 1, history.length - 1);
        setInput(history[next] || '');
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx(i => {
        const next = Math.max(i - 1, -1);
        setInput(next === -1 ? '' : history[next]);
        return next;
      });
    }
  }, [run, history]);

  return (
    <div
      style={{
        border: selected ? '2px solid #00ff88' : '2px solid #333',
        borderRadius: 8,
        background: '#1a1a2e',
        width: 340,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 13,
        boxShadow: selected ? '0 0 20px rgba(0,255,136,0.25)' : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: 'text',
      }}
    >
      <div style={{
        padding: '6px 12px',
        background: '#16213e',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ color: '#00ff88', fontSize: 11 }}>⬡ terminal</span>
        <span style={{ color: '#446', fontSize: 10, marginLeft: 4 }}>{cwd}</span>
        {running && <span style={{ color: '#666', fontSize: 10, marginLeft: 'auto' }}>running…</span>}
      </div>

      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#555', userSelect: 'none' }}>$</span>
        <input
          autoFocus={selected}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={running}
          placeholder={running ? '' : 'type a command…'}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#00ff88',
            fontFamily: 'inherit',
            fontSize: 13,
            caretColor: '#00ff88',
          }}
        />
      </div>

      <Handle type="target" position={Position.Left}  style={{ background: '#00ff88' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#00ff88' }} />
    </div>
  );
}
