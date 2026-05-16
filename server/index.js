const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const vm = require('vm'); // Built-in Node.js module, no install needed
const { exec } = require('child_process');  // Runs terminal commands from Node
const fs = require('fs');                    // Reads and writes files
const path = require('path');               // Handles file paths safely

const app = express();
app.use(cors());
app.use(express.json()); // Must be before routes so we can read request body

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// ----------------------------------------
// Room data — stores code + language for each room
// So late joiners get the current code
// ----------------------------------------
const roomData = {};

app.post('/execute', (req, res) => {
  const { code, language } = req.body;

  // ----------------------------------------
  // JAVASCRIPT
  // ----------------------------------------
  if (language === 'javascript') {
    try {
      let output = '';

      const fakeConsole = {
        log: (...args) => {
          output += args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : a
          ).join(' ') + '\n';
        },
        error: (...args) => { output += '❌ ' + args.join(' ') + '\n'; },
        warn:  (...args) => { output += '⚠️ ' + args.join(' ') + '\n'; },
      };

      const context = vm.createContext({
        console: fakeConsole,
        Math, JSON, parseInt, parseFloat,
        isNaN, isFinite, String, Number,
        Boolean, Array, Object, Date, Map, Set,
      });

      vm.runInContext(code, context, { timeout: 5000 });
      return res.json({ output: output || 'No output produced.' });

    } catch (error) {
      return res.json({ output: '❌ Error:\n' + error.message });
    }
  }

  // ----------------------------------------
  // ALL OTHER LANGUAGES
  // Uses the same pattern:
  // 1. Write code to temp file
  // 2. Compile (if needed)
  // 3. Run
  // 4. Return output
  // 5. Cleanup temp files
  // ----------------------------------------

  // Config for each language
  const LANGUAGE_CONFIG = {
    python: {
      filename: 'main.py',
      // On Windows: python, on Linux/Mac: python3
      runCommand: (file) => `python3 "${file}"`,
      compileCommand: null, // Python doesn't need compilation
    },
    cpp: {
      filename: 'main.cpp',
      compileCommand: (source, output) => `g++ "${source}" -o "${output}"`,
      runCommand: (file) => `"${file}"`,
    },
    java: {
      filename: 'Main.java', // Java filename MUST match the class name
      compileCommand: (source) => `javac "${source}"`,
      // Java runs from the directory, not the file directly
      runCommand: (file, dir) => `java -cp "${dir}" Main`,
    },
    typescript: {
      filename: 'main.ts',
      compileCommand: null,
      runCommand: (file) => `ts-node "${file}"`,
    },
  };

  const config = LANGUAGE_CONFIG[language];

  // Language not in our supported list
  if (!config) {
    return res.json({ output: 'Language not supported.' });
  }

  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Unique ID so multiple users don't overwrite each other's files
  const uniqueId = Date.now();
  const sourceFile = path.join(tempDir, `${uniqueId}_${config.filename}`);

  // For compiled languages we need a separate output file
  const outputFile = path.join(tempDir, `${uniqueId}_output`);

  // Step 1: Write code to temp file
  fs.writeFileSync(sourceFile, code);

  // Step 2: If language needs compilation, compile first
  if (config.compileCommand) {
    const compileCmd = config.compileCommand(sourceFile, outputFile);

    exec(compileCmd, { timeout: 10000 }, (compileError, _, compileStderr) => {
      if (compileError) {
        cleanup(sourceFile, outputFile);
        return res.json({ output: '❌ Compilation Error:\n' + compileStderr });
      }

      // Step 3: Run after successful compilation
      const runCmd = config.runCommand(outputFile, tempDir);
      exec(runCmd, { timeout: 5000 }, (runError, stdout, stderr) => {
        cleanup(sourceFile, outputFile);

        if (runError && !stdout) {
          return res.json({ output: '❌ Runtime Error:\n' + stderr });
        }
        return res.json({ output: stdout || stderr || 'No output produced.' });
      });
    });

  } else {
    // Step 3: No compilation needed — just run directly (Python, TypeScript)
    const runCmd = config.runCommand(sourceFile, tempDir);
    exec(runCmd, { timeout: 5000 }, (runError, stdout, stderr) => {
      cleanup(sourceFile);

      if (runError && !stdout) {
        return res.json({ output: '❌ Error:\n' + stderr });
      }
      return res.json({ output: stdout || stderr || 'No output produced.' });
    });
  }

  return; // Prevents "headers already sent" error
});

// Cleanup helper — deletes temp files after execution
function cleanup(...files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      // Ignore cleanup errors
    }
  });
}

// ----------------------------------------
// SOCKET.IO — Real-time collaboration logic
// ----------------------------------------
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins a room
    socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);
        socket.username = username;
        socket.roomId = roomId;

        // Initialize room if first person joining
        if (!roomData[roomId]) {
            roomData[roomId] = {
                code: '// Start coding here...\n',
                language: 'javascript'
            };
        }

        // Send current room state to the person who just joined
        socket.emit('room-joined', {
            code: roomData[roomId].code,
            language: roomData[roomId].language
        });

        // Build and broadcast updated users list to everyone in room
        const clients = io.sockets.adapter.rooms.get(roomId);
        const users = [];
        clients.forEach((clientId) => {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket?.username) {
                users.push(clientSocket.username);
            }
        });
        io.to(roomId).emit('users-updated', users);

        console.log(`${username} joined room ${roomId}`);
    });

    // Someone typed in the editor
    socket.on('code-change', ({ roomId, code }) => {
        if (roomData[roomId]) roomData[roomId].code = code;
        // Send to everyone EXCEPT the person who typed
        socket.to(roomId).emit('code-updated', code);
    });

    // Someone changed the language
    socket.on('language-change', ({ roomId, language }) => {
        if (roomData[roomId]) roomData[roomId].language = language;
        // Send to everyone INCLUDING the person who changed it
        io.to(roomId).emit('language-updated', language);
    });

    // Someone disconnected
    socket.on('disconnect', () => {
        const { roomId, username } = socket;
        if (roomId && username) {
            const clients = io.sockets.adapter.rooms.get(roomId);
            const users = [];
            if (clients) {
                clients.forEach((clientId) => {
                    const clientSocket = io.sockets.sockets.get(clientId);
                    if (clientSocket?.username) users.push(clientSocket.username);
                });
            }
            io.to(roomId).emit('users-updated', users);
            console.log(`${username} left room ${roomId}`);
        }
    });
});

// ----------------------------------------
// TEST ROUTE — visit http://localhost:5000
// ----------------------------------------
app.get('/', (req, res) => res.send('Server is running!'));

// ----------------------------------------
// START SERVER
// ----------------------------------------
server.listen(5000, () => console.log('Server running on http://localhost:5000'));