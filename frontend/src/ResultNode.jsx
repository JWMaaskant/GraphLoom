import { Handle, Position } from '@xyflow/react';

export default function ResultNode({ data }) {
  const lines = (data.output || '').split('\n');

  return (
    <div style={{
      border: '1px solid #2a2a4a',
      borderRadius: 8,
      background: '#12122a',
      width: 340,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {/* Command line */}
      <div style={{
        padding: '6px 12px',
        background: '#1a1a3a',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #2a2a4a',
        color: '#00ff88',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ color: '#555', userSelect: 'none' }}>$</span>
        <span>{data.command}</span>
      </div>

      {/* Output */}
      <div style={{
        padding: '8px 12px',
        color: '#c0c0d0',
        maxHeight: 200,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: 1.5,
      }}>
        {lines.length === 0 || (lines.length === 1 && lines[0] === '')
          ? <span style={{ color: '#444', fontStyle: 'italic' }}>no output</span>
          : lines.map((line, i) => <div key={i}>{line || ' '}</div>)
        }
      </div>

      <Handle type="target" position={Position.Left}  style={{ background: '#00ff88' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#00ff88' }} />
    </div>
  );
}
