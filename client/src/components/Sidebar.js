// Sidebar.js
// Shows room ID, connected users, and language selector

import React from 'react';

// Available languages for our editor
const LANGUAGES = ['javascript', 'python', 'cpp', 'java', 'typescript'];

function Sidebar({ roomId, users, language, onLanguageChange }) {
  // This function copies the room ID to clipboard when clicked
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied! Share it with your friend.');
  };

  return (
    <div style={styles.sidebar}>

      {/* App Title */}
      <h2 style={styles.title}>⚡ CodeSync</h2>

      {/* Room ID Section */}
      <div style={styles.section}>
        <p style={styles.label}>ROOM ID</p>
        <div style={styles.roomIdBox}>
          {/* Show only first 8 characters so it's not too long */}
          <span style={styles.roomId}>{roomId?.slice(0, 8)}...</span>
          <button onClick={copyRoomId} style={styles.copyBtn}>Copy</button>
        </div>
      </div>

      {/* Language Selector */}
      <div style={styles.section}>
        <p style={styles.label}>LANGUAGE</p>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          style={styles.select}
        >
          {/* Loop through languages and create an option for each */}
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Connected Users Section */}
      <div style={styles.section}>
        <p style={styles.label}>CONNECTED USERS ({users.length})</p>
        {users.map((user, index) => (
          <div key={index} style={styles.userBadge}>
            {/* Show a colored circle with first letter of username */}
            <div style={styles.avatar}>{user[0].toUpperCase()}</div>
            <span>{user}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

// Styles written as a JS object (called inline styles in React)
const styles = {
  sidebar: {
    width: '220px',
    backgroundColor: '#252526',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    borderRight: '1px solid #3c3c3c',
  },
  title: { color: '#61dafb', fontSize: '20px' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: '#888', fontSize: '11px', letterSpacing: '1px' },
  roomIdBox: { display: 'flex', alignItems: 'center', gap: '8px' },
  roomId: { color: '#fff', fontSize: '13px', wordBreak: 'break-all' },
  copyBtn: {
    backgroundColor: '#0e639c', color: '#fff',
    border: 'none', borderRadius: '4px',
    padding: '4px 8px', cursor: 'pointer', fontSize: '12px',
  },
  select: {
    backgroundColor: '#3c3c3c', color: '#fff',
    border: '1px solid #555', borderRadius: '4px',
    padding: '6px', width: '100%', cursor: 'pointer',
  },
  userBadge: { display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc' },
  avatar: {
    width: '28px', height: '28px', borderRadius: '50%',
    backgroundColor: '#0e639c', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: 'bold',
  },
};

export default Sidebar;