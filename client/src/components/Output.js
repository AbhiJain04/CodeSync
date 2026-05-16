// Output.js
// Shows the result after running the code

import React from 'react';

function Output({ output, isLoading, onRun }) {
  return (
    <div style={styles.container}>

      {/* Header with title and Run button */}
      <div style={styles.header}>
        <span style={styles.title}>OUTPUT</span>
        <button
          onClick={onRun}
          disabled={isLoading}  // Disable button while code is running
          style={styles.runBtn}
        >
          {isLoading ? '⏳ Running...' : '▶ Run Code'}
        </button>
      </div>

      {/* Output display area */}
      <div style={styles.outputBox}>
        {/* Show placeholder if no output yet */}
        {output || <span style={{ color: '#666' }}>Run your code to see output here...</span>}
      </div>

    </div>
  );
}

const styles = {
  container: {
    height: '200px',
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #3c3c3c',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '8px 15px',
    backgroundColor: '#252526', borderBottom: '1px solid #3c3c3c',
  },
  title: { color: '#888', fontSize: '12px', letterSpacing: '1px' },
  runBtn: {
    backgroundColor: '#388a34', color: '#fff',
    border: 'none', borderRadius: '4px',
    padding: '6px 16px', cursor: 'pointer',
    fontSize: '13px', fontWeight: 'bold',
  },
  outputBox: {
    flex: 1, padding: '12px 15px',
    color: '#4ec9b0', fontFamily: 'monospace',
    fontSize: '14px', overflowY: 'auto',
    whiteSpace: 'pre-wrap',  // Preserve line breaks in output
  },
};

export default Output;