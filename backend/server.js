const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Track active terminals per node
const terminals = new Map();

wss.on('connection', (ws) => {
  let ptyProcess = null;
  let nodeId = null;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    switch (msg.type) {

      // Create a new terminal session for a node
      case 'create': {
        nodeId = msg.nodeId;
        const shell = msg.shell || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');

        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols: msg.cols || 80,
          rows: msg.rows || 24,
          cwd: os.homedir(),
          env: process.env,
        });

        terminals.set(nodeId, ptyProcess);

        ptyProcess.onData((data) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'output', nodeId, data }));
          }
        });

        ptyProcess.onExit(({ exitCode }) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', nodeId, exitCode }));
          }
          terminals.delete(nodeId);
        });

        ws.send(JSON.stringify({ type: 'ready', nodeId }));
        break;
      }

      // Send keystrokes / input to the terminal
      case 'input': {
        if (ptyProcess) {
          ptyProcess.write(msg.data);
        }
        break;
      }

      // Resize the terminal
      case 'resize': {
        if (ptyProcess) {
          ptyProcess.resize(msg.cols, msg.rows);
        }
        break;
      }

      // Kill the terminal
      case 'kill': {
        if (ptyProcess) {
          ptyProcess.kill();
          terminals.delete(nodeId);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (ptyProcess) {
      ptyProcess.kill();
      terminals.delete(nodeId);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`GraphLoom backend running on http://localhost:${PORT}`);
});
