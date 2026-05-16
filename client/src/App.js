// App.js
import React, { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Output from './components/Output';
import { v4 as uuidv4 } from 'uuid';
import { io } from 'socket.io-client';
import { executeCode } from './executeCode';

// Create socket connection OUTSIDE the component
// This ensures only ONE connection is made, not a new one on every render
const socket = io('https://codesync-server-zj5l.onrender.com');

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding here...\n');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // useRef stores a value that does NOT cause re-render when changed
  // We use this to track if a code change came from the server or from typing
  // This prevents an infinite loop:
  // (I type → send to server → server sends back → I update → send again → loop!)
  const isRemoteChange = useRef(false);

  // useEffect runs code AFTER the component renders
  // The [] at the end means "run this only once when the app first loads"
  useEffect(() => {

    // Listen for events FROM the server:

    // When we successfully join a room, load the existing code
    socket.on('room-joined', ({ code, language }) => {
      setCode(code);
      setLanguage(language);
    });

    // When someone else types, update our editor
    socket.on('code-updated', (newCode) => {
      isRemoteChange.current = true; // Flag: this change is from server, not me
      setCode(newCode);
    });

    // When someone changes language, update our selector
    socket.on('language-updated', (newLanguage) => {
      setLanguage(newLanguage);
    });

    // When someone joins or leaves, update the users list
    socket.on('users-updated', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    // Cleanup: remove listeners when component unmounts
    // Prevents memory leaks
    return () => {
      socket.off('room-joined');
      socket.off('code-updated');
      socket.off('language-updated');
      socket.off('users-updated');
    };
  }, []); // Empty array = run once on mount

  // Called when user clicks "Join Room"
  const joinRoom = () => {
    if (!username.trim() || !roomId.trim()) {
      alert('Please enter both username and room ID');
      return;
    }

    // Emit "join-room" event to the server
    socket.emit('join-room', { roomId, username });
    setJoined(true);
  };

  const createRoom = () => {
    setRoomId(uuidv4());
  };

  // Called every time the user types in the editor
  const handleCodeChange = (newCode) => {

    // If this change came from the server (another user typing),
    // just update the display — don't send it back to server!
    if (isRemoteChange.current) {
      isRemoteChange.current = false; // Reset the flag
      setCode(newCode);
      return;
    }

    // Otherwise, it's MY change — update state and tell the server
    setCode(newCode);
    socket.emit('code-change', { roomId, code: newCode });
  };

  // Called when language is changed in the dropdown
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    socket.emit('language-change', { roomId, language: newLanguage });
  };

  // Called when user clicks "Run Code"
  const handleRun = async () => {
    setIsLoading(true);       // Show "Running..." on button
    setOutput('Running...');  // Immediate feedback to user

    const result = await executeCode(code, language);

    setOutput(result);        // Show the output
    setIsLoading(false);      // Re-enable the button
  };

  // Join screen
  if (!joined) {
    return (
      <div style={styles.joinScreen}>
        <div style={styles.joinBox}>
          <h1 style={styles.joinTitle}>⚡ CodeSync</h1>
          <p style={styles.joinSubtitle}>Real-time collaborative code editor</p>

          <input
            style={styles.input}
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="Room ID (or create one below)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button onClick={joinRoom} style={styles.joinBtn}>Join Room</button>
          <button onClick={createRoom} style={styles.createBtn}>✨ Create New Room</button>
        </div>
      </div>
    );
  }

  // Main editor screen
  return (
    <div style={styles.appContainer}>
      <Sidebar
        roomId={roomId}
        users={users}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
      <div style={styles.mainArea}>
        <Editor
          language={language}
          value={code}
          onChange={handleCodeChange}
        />
        <Output
          output={output}
          isLoading={isLoading}
          onRun={handleRun}
        />
      </div>
    </div>
  );
}

const styles = {
  joinScreen: {
    height: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e1e1e',
  },
  joinBox: {
    backgroundColor: '#252526', padding: '40px',
    borderRadius: '12px', display: 'flex',
    flexDirection: 'column', gap: '15px',
    width: '380px', border: '1px solid #3c3c3c',
  },
  joinTitle: { color: '#61dafb', textAlign: 'center', fontSize: '28px' },
  joinSubtitle: { color: '#888', textAlign: 'center', fontSize: '14px', marginTop: '-8px' },
  input: {
    backgroundColor: '#3c3c3c', color: '#fff',
    border: '1px solid #555', borderRadius: '6px',
    padding: '10px 14px', fontSize: '14px', outline: 'none',
  },
  joinBtn: {
    backgroundColor: '#0e639c', color: '#fff',
    border: 'none', borderRadius: '6px', padding: '12px',
    fontSize: '15px', cursor: 'pointer', fontWeight: 'bold',
  },
  createBtn: {
    backgroundColor: 'transparent', color: '#61dafb',
    border: '1px solid #61dafb', borderRadius: '6px',
    padding: '10px', fontSize: '14px', cursor: 'pointer',
  },
  appContainer: {
    display: 'flex', height: '100vh', overflow: 'hidden',
  },
  mainArea: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
};

export default App;