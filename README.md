# ⚡ CodeSync — Real-Time Collaborative Code Editor

A full-stack web application where multiple users can write and execute code together in real-time, similar to Google Docs but for code.

---

## 🔗 Links

- **Live App:** [code-sync-roan-eta.vercel.app](https://code-sync-roan-eta.vercel.app)
- **Backend:** [codesync-server-zj5l.onrender.com](https://codesync-server-zj5l.onrender.com)
- **GitHub:** [github.com/AbhiJain04/CodeSync](https://github.com/AbhiJain04/CodeSync)

---

## ✨ Features

- **Real-time collaboration** — Multiple users can write code simultaneously in shared rooms
- **Room-based system** — Create or join rooms using a unique Room ID
- **Live users list** — See who is currently in the room, updates instantly
- **Code execution** — Run code directly in the browser and see output
- **Multi-language support** — JavaScript, Python, C++
- **VS Code-style editor** — Powered by Monaco Editor (same engine as VS Code)
- **Language sync** — Changing language updates for all users in the room
- **Late join support** — Joining a room loads the existing code automatically

---

## 🛠️ Tech Stack

### Frontend
- **React** — UI framework
- **Monaco Editor** — VS Code-style code editor
- **Socket.io-client** — Real-time WebSocket communication

### Backend
- **Node.js** — Runtime environment
- **Express** — Web server framework
- **Socket.io** — WebSocket server for real-time sync
- **Node.js VM** — Sandboxed JavaScript execution

### Deployment
- **Vercel** — Frontend hosting
- **Render** — Backend hosting

---

## 🚀 How It Works

```
User joins a room
       ↓
Socket.io connects them to the server
       ↓
Any code change is sent to the server via WebSocket
       ↓
Server broadcasts the change to everyone in the room
       ↓
All users see the update instantly
```

For code execution:
```
User clicks "Run Code"
       ↓
Code is sent to our Express server
       ↓
Server runs it in a sandboxed environment
       ↓
Output is sent back and displayed
```

---

## 💻 Supported Languages

| Language | Status |
|---|---|
| JavaScript | ✅ Fully supported |
| Python | ✅ Fully supported |
| C++ | ✅ Fully supported |
| Java | 🔜 Coming soon |

---

## 🏃 Run Locally

### Prerequisites
- Node.js installed
- G++ compiler installed (for C++ execution)
- Python3 installed (for Python execution)

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/AbhiJain04/CodeSync.git
cd CodeSync
```

**2. Start the backend server**
```bash
cd server
npm install
node index.js
```
Server runs on `http://localhost:5000`

**3. Start the frontend**
```bash
cd client
npm install
npm start
```
App runs on `http://localhost:3000`

**4. Open two browser tabs** at `http://localhost:3000`, create a room in one and join with the same ID in the other. Start coding together!

---

## 📁 Project Structure

```
CodeSync/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.js     # Monaco code editor
│   │   │   ├── Sidebar.js    # Room info + users list
│   │   │   └── Output.js     # Code execution output
│   │   ├── App.js            # Main component + Socket.io logic
│   │   ├── executeCode.js    # Code execution API calls
│   │   └── config.js         # Configuration
│   └── package.json
│
├── server/                   # Node.js backend
│   ├── index.js              # Express server + Socket.io + code execution
│   └── package.json
│
└── .gitignore
```

---

## 🔑 Key Technical Concepts

**WebSockets (Socket.io)** — Unlike regular HTTP requests that close after a response, WebSockets keep a persistent connection open. This allows the server to push updates to all clients instantly when anyone types.

**Room-based Architecture** — Each collaboration session has a unique Room ID. Socket.io rooms act like groups — events sent to a room reach everyone in it.

**Sandboxed Execution** — JavaScript code runs inside Node.js `vm.createContext()` which creates an isolated environment. This prevents user code from accessing the file system or crashing the server.

**Preventing Sync Loops** — A `useRef` flag tracks whether a code change came from the local user or from the server, preventing infinite update loops.

---

## ⚠️ Note

The backend is hosted on Render's free tier which sleeps after 15 minutes of inactivity. The first load may take 20-30 seconds to wake up. After that, everything works normally.

