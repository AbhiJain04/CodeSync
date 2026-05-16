const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const vm = require('vm'); // Built-in Node.js module, no install needed
const { exec } = require('child_process');  // Runs terminal commands from Node
const fs = require('fs');                    // Reads and writes files
const path = require('path');               // Handles file paths safely

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://code-sync-roan-eta.vercel.app"
  ]
}));
app.use(express.json()); // Must be before routes so we can read request body

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://code-sync-roan-eta.vercel.app"
    ],
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
        warn: (...args) => { output += '⚠️ ' + args.join(' ') + '\n'; },
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
  // PYTHON
  // ----------------------------------------
  if (language === 'python') {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const uniqueId = Date.now();
    const sourceFile = path.join(tempDir, `${uniqueId}_main.py`);
    fs.writeFileSync(sourceFile, code);

    exec(`python3 "${sourceFile}"`, { timeout: 5000 }, (error, stdout, stderr) => {
      cleanup(sourceFile);
      if (error && !stdout) return res.json({ output: '❌ Error:\n' + stderr });
      return res.json({ output: stdout || stderr || 'No output produced.' });
    });
    return;
  }

  // ----------------------------------------
  // C++
  // ----------------------------------------
  if (language === 'cpp') {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const uniqueId = Date.now();
    const sourceFile = path.join(tempDir, `${uniqueId}_main.cpp`);
    const outputFile = path.join(tempDir, `${uniqueId}_output`);
    fs.writeFileSync(sourceFile, code);

    exec(`g++ "${sourceFile}" -o "${outputFile}"`, { timeout: 10000 }, (compileError, _, compileStderr) => {
      if (compileError) {
        cleanup(sourceFile, outputFile);
        return res.json({ output: '❌ Compilation Error:\n' + compileStderr });
      }

      exec(`"${outputFile}"`, { timeout: 5000 }, (runError, stdout, stderr) => {
        cleanup(sourceFile, outputFile);
        if (runError && !stdout) return res.json({ output: '❌ Runtime Error:\n' + stderr });
        return res.json({ output: stdout || stderr || 'No output produced.' });
      });
    });
    return;
  }

  // ----------------------------------------
  // JAVA
  // ----------------------------------------
  if (language === 'java') {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const uniqueId = Date.now();
    // Java folder — each java program needs its own folder
    const javaDir = path.join(tempDir, `java_${uniqueId}`);
    fs.mkdirSync(javaDir);
    const sourceFile = path.join(javaDir, 'Main.java');
    fs.writeFileSync(sourceFile, code);

    exec(`javac "${sourceFile}"`, { timeout: 10000 }, (compileError, _, compileStderr) => {
      if (compileError) {
        cleanup(sourceFile);
        fs.rmdirSync(javaDir, { recursive: true });
        return res.json({ output: '❌ Compilation Error:\n' + compileStderr });
      }

      exec(`java -cp "${javaDir}" Main`, { timeout: 5000 }, (runError, stdout, stderr) => {
        fs.rmdirSync(javaDir, { recursive: true });
        if (runError && !stdout) return res.json({ output: '❌ Runtime Error:\n' + stderr });
        return res.json({ output: stdout || stderr || 'No output produced.' });
      });
    });
    return;
  }

  // ----------------------------------------
  // TYPESCRIPT
  // ----------------------------------------
  if (language === 'typescript') {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const uniqueId = Date.now();
    const sourceFile = path.join(tempDir, `${uniqueId}_main.ts`);
    fs.writeFileSync(sourceFile, code);

    // Use local ts-node installed in node_modules
    const tsNode = path.join(__dirname, 'node_modules', '.bin', 'ts-node');

    // Add --skipLibCheck and --esModuleInterop to avoid common TS errors
    exec(`"${tsNode}" --skipLibCheck --esModuleInterop "${sourceFile}"`,
      { timeout: 10000 },
      (error, stdout, stderr) => {
        cleanup(sourceFile);
        // Log for debugging
        console.log('TS stdout:', stdout);
        console.log('TS stderr:', stderr);
        console.log('TS error:', error?.message);

        if (stdout) return res.json({ output: stdout });
        if (stderr) return res.json({ output: '❌ Error:\n' + stderr });
        return res.json({ output: 'No output produced.' });
      }
    );
    return;
  }

  return res.json({ output: 'Language not supported.' });
});

// Cleanup helper
function cleanup(...files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) { }
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