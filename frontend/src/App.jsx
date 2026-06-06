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

const nodeTypes = { terminal: TerminalNode, result: ResultNode };

const NODE_WIDTH  = 340;
const NODE_GAP    = 60;
const STEP        = NODE_WIDTH + NODE_GAP;
const START_X     = 80;
const START_Y     = 300;
const TERMINAL_ID = 'terminal';

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

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({
      ...params, animated: true, style: { stroke: '#00ff88', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  const handleResult = useCallback(({ command, output }) => {
    const rc       = ++resultCount.current;
    const resultId = `result-${rc}`;
    const prevResultId = rc > 1 ? `result-${rc - 1}` : null;

    setNodes(prev => {
      // Find current terminal position
      const term = prev.find(n => n.id === TERMINAL_ID);
      const tx = term?.position.x ?? START_X + rc * STEP;
      const ty = term?.position.y ?? START_Y;

      // Result node: placed where the terminal currently sits
      const resultNode = {
        id: resultId,
        type: 'result',
        position: { x: tx, y: ty },
        data: { command, output },
      };

      // Move the terminal one step to the right — same node, new position
      const movedTerminal = {
        ...term,
        position: { x: tx + STEP, y: ty },
        selected: true,
      };

      return [
        ...prev.filter(n => n.id !== TERMINAL_ID),
        resultNode,
        movedTerminal,
      ];
    });

    setEdges(prev => {
      const newEdges = [...prev,
        // result → terminal
        {
          id: `e-${resultId}-terminal`,
          source: resultId,
          target: TERMINAL_ID,
          animated: true,
          style: { stroke: '#00ff88', strokeWidth: 2 },
        },
      ];
      // previous result → this result
      if (prevResultId) {
        newEdges.push({
          id: `e-${prevResultId}-${resultId}`,
          source: prevResultId,
          target: resultId,
          animated: true,
          style: { stroke: '#00ff88', strokeWidth: 2 },
        });
      }
      return newEdges;
    });

    // Pan to keep terminal in view
    setTimeout(() => {
      const newX = START_X + rc * STEP + NODE_WIDTH / 2;
      const newY = START_Y + 40;
      setCenter(newX, newY, { zoom: 1, duration: 400 });
    }, 50);

  }, [setNodes, setEdges, setCenter]);

  // Inject callback — only the terminal node needs it
  const nodesWithHandlers = nodes.map(n =>
    n.id === TERMINAL_ID
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

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
