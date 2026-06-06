import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TerminalNode from './TerminalNode';
import ResultNode   from './ResultNode';

// Must be defined OUTSIDE the component so React Flow doesn't remount nodes on every render
const nodeTypes = { terminal: TerminalNode, result: ResultNode };

const NODE_WIDTH   = 340;
const NODE_GAP     = 60;
const STEP         = NODE_WIDTH + NODE_GAP;
const START_X      = 80;
const START_Y      = 300;
const TERMINAL_ID  = 'terminal-1';

const initialNodes = [
  {
    id: TERMINAL_ID,
    type: 'terminal',
    position: { x: START_X, y: START_Y },
    data: {},
  },
];

function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setCenter } = useReactFlow();

  const resultCount = useRef(0);
  const terminalId  = useRef(TERMINAL_ID);

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({
      ...params, animated: true, style: { stroke: '#00ff88', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  const handleResult = useCallback(({ command, output }) => {
    resultCount.current += 1;
    const rc         = resultCount.current;
    const resultId   = `result-${rc}`;
    const newTermId  = `terminal-${rc + 1}`;
    const oldTermId  = terminalId.current;

    let newTermX = START_X + (rc + 1) * STEP;
    let newTermY = START_Y;

    setNodes(prev => {
      const termNode = prev.find(n => n.id === oldTermId);
      const tx = termNode?.position.x ?? START_X + rc * STEP;
      const ty = termNode?.position.y ?? START_Y;
      newTermX = tx + STEP;
      newTermY = ty;

      const resultNode = {
        id: resultId,
        type: 'result',
        position: { x: tx, y: ty },
        data: { command, output },
      };

      const newTermNode = {
        id: newTermId,
        type: 'terminal',
        position: { x: newTermX, y: newTermY },
        data: { previousTerminalId: oldTermId },
        selected: true,
      };

      return [
        ...prev.filter(n => n.id !== oldTermId),
        resultNode,
        newTermNode,
      ];
    });

    setEdges(prev => {
      const newEdges = [
        ...prev,
        {
          id: `e-${resultId}-${newTermId}`,
          source: resultId,
          target: newTermId,
          animated: true,
          style: { stroke: '#00ff88', strokeWidth: 2 },
        },
      ];
      if (rc > 1) {
        newEdges.push({
          id: `e-result-${rc - 1}-${resultId}`,
          source: `result-${rc - 1}`,
          target: resultId,
          animated: true,
          style: { stroke: '#00ff88', strokeWidth: 2 },
        });
      }
      return newEdges;
    });

    terminalId.current = newTermId;

    // Pan canvas to keep the new terminal centred in view
    setTimeout(() => {
      setCenter(
        newTermX + NODE_WIDTH / 2,
        newTermY + 40,
        { zoom: 1, duration: 400 }
      );
    }, 50);
  }, [setNodes, setEdges, setCenter]);

  const nodesWithHandlers = nodes.map(n =>
    n.type === 'terminal'
      ? { ...n, data: { ...n.data, onResult: handleResult } }
      : n
  );

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f0f1a' }}>
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{ animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} color="#222240" gap={24} size={1.5} />
        <Controls style={{ background: '#16213e', border: '1px solid #333' }} />
        <MiniMap
          style={{ background: '#16213e', border: '1px solid #333' }}
          nodeColor={n => n.type === 'terminal' ? '#00ff88' : '#334'}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      <div style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
        background: '#16213e', border: '1px solid #333', borderRadius: 8,
        padding: '8px 20px', zIndex: 10,
        color: '#00ff88', fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold',
        pointerEvents: 'none',
      }}>
        ⬡ GraphLoom
      </div>
    </div>
  );
}

// ReactFlowProvider must wrap the component that uses useReactFlow()
export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
