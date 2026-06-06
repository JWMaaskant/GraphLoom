const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// One persistent shell per terminal node: nodeId -> { shell, buffer, callbacks, ws }
const sessions = new Map();

function createSession(nodeId, ws) {
  const shell = spawn('/bin/bash', ['--login'], {
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', PS1: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const session = { shell, buffer: '', callbacks: [], ws, nodeId };
  sessions.set(nodeId, session);

  shell.stdout.on('data', (data) => {
    session.buffer += data.toString();
    flush(session);
  });
  shell.stderr.on('data', (data) => {
    session.buffer += data.toString();
    flush(session);
  });
  shell.on('exit', () => sessions.delete(nodeId));

  return session;
}

wss.on('connection', (ws) => {
  let nodeId = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    switch (msg.type) {

      case 'init': {
        nodeId = msg.nodeId;
        console.log(`init: nodeId=${nodeId}`);
        createSession(nodeId, ws);
        ws.send(JSON.stringify({ type: 'ready', nodeId }));
        break;
      }

      case 'transfer': {
        console.log(`transfer: ${msg.oldNodeId} -> ${msg.newNodeId} sessions=[${[...sessions.keys()].join(',')}]`);
        const session = sessions.get(msg.oldNodeId);
        if (session) {
          session.ws = ws;
          session.nodeId = msg.newNodeId;  // keep nodeId current so flush sends to correct listener
          sessions.set(msg.newNodeId, session);
          sessions.delete(msg.oldNodeId);
          nodeId = msg.newNodeId;
          console.log(`transfer OK: sessions=[${[...sessions.keys()].join(',')}]`);
        } else {
          console.log(`transfer FAILED: session not found for ${msg.oldNodeId}`);
        }
        ws.send(JSON.stringify({ type: 'ready', nodeId }));
        break;
      }

      case 'run': {
        const { command, runId } = msg;
        // Use nodeId from message for robustness with shared socket
        const runNodeId = msg.nodeId || nodeId;
        const session = sessions.get(runNodeId);
        console.log(`run: nodeId=${runNodeId} command="${command}" session=${!!session} sessions=[${[...sessions.keys()].join(',')}]`);
        if (!session) break;

        const SENTINEL = `__GL_${runId}__`;

        session.callbacks.push({ sentinel: SENTINEL, runId, command, output: '' });

        // Run the command, then print the sentinel and current directory
        session.shell.stdin.write(
          `${command}\necho "${SENTINEL}:$(pwd)"\n`
        );
        break;
      }

      case 'kill': {
        const session = sessions.get(nodeId);
        if (session) {
          session.shell.kill();
          sessions.delete(nodeId);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    // Don't kill the session on close — it may be transferred
    // Only kill if this ws still owns the session
    const session = sessions.get(nodeId);
    if (session && session.ws === ws) {
      session.shell.kill();
      sessions.delete(nodeId);
    }
  });
});

function flush(session) {
  const nodeId = session.nodeId; // always use current nodeId, updated on transfer
  if (session.callbacks.length === 0) return;

  const pending = session.callbacks[0];
  const idx = session.buffer.indexOf(pending.sentinel);
  console.log(`flush: sentinel="${pending.sentinel}" found=${idx !== -1} buflen=${session.buffer.length} buf=${JSON.stringify(session.buffer.slice(0, 200))}`);
  if (idx === -1) return;

  // Everything before the sentinel is the output
  const raw = session.buffer.slice(0, idx);

  // The sentinel line looks like: __GL_xxx__:/path/to/cwd\n
  const afterSentinel = session.buffer.slice(idx + pending.sentinel.length + 1); // skip ':'
  const newlineIdx = afterSentinel.indexOf('\n');
  const cwd = newlineIdx !== -1 ? afterSentinel.slice(0, newlineIdx).trim() : '';
  session.buffer = newlineIdx !== -1 ? afterSentinel.slice(newlineIdx + 1) : '';

  session.callbacks.shift();

  // Clean output: remove echoed command if present, trim whitespace
  const lines = raw.split('\n');
  const cleaned = lines
    .filter((l, i) => !(i === 0 && l.trim() === pending.command.trim()))
    .join('\n')
    .trim();

  // Format cwd for display (~  instead of /Users/name)
  const home = os.homedir();
  const displayCwd = cwd.startsWith(home) ? cwd.replace(home, '~') : cwd;

  const ws = session.ws;
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({
      type: 'result',
      nodeId,
      runId: pending.runId,
      command: pending.command,
      output: cleaned,
      cwd: displayCwd,
    }));
  }

  flush(session);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`GraphLoom backend running on http://localhost:${PORT}`);
});
