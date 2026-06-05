import { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ShellNode from './ShellNode';

const nodeTypes = { shell: ShellNode };

let nodeCount = 1;

const initialNodes = [
  {
    id: 'node-1',
    type: 'shell',
    position: { x: 100, y: 200 },
    data: { label: 'node:1' },
  },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#00ff88' } }, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    nodeCount += 1;
    const id = `node-${nodeCount}`;
    const lastNode = nodes[nodes.length - 1];
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'shell',
        position: { x: lastNode.position.x + 560, y: lastNode.position.y },
        data: { label: `node:${nodeCount}` },
      },
    ]);
  }, [nodes, setNodes]);

  // Keyboard: press 'n' to add a new node
  const onKeyDown = useCallback((e) => {
    if (e.key === 'n' && e.target.tagName !== 'INPUT' && !e.target.closest('.xterm')) {
      addNode();
    }
  }, [addNode]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f0f1a' }} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{ animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#222240"
          gap={24}
          size={1.5}
        />
        <Controls style={{ background: '#16213e', border: '1px solid #333' }} />
        <MiniMap
          style={{ background: '#16213e', border: '1px solid #333' }}
          nodeColor="#00ff88"
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Toolbar */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        background: '#16213e',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '8px 16px',
        zIndex: 10,
      }}>
        <span style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' }}>
          ⬡ GraphLoom
        </span>
        <div style={{ width: 1, height: 20, background: '#333' }} />
        <button
          onClick={addNode}
          style={{
            background: 'transparent',
            border: '1px solid #00ff88',
            color: '#00ff88',
            borderRadius: 4,
            padding: '4px 12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          + node <span style={{ color: '#666' }}>[n]</span>
        </button>
      </div>
    </div>
  );
}
