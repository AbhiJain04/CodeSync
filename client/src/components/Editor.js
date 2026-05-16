// Editor.js
// This component renders the Monaco code editor

import React from 'react';
import MonacoEditor from '@monaco-editor/react';

// We receive these "props" (settings) from the parent component:
// - language: which programming language to use (js, python, etc.)
// - value: the current code in the editor
// - onChange: function to call whenever someone types something

function Editor({ language, value, onChange }) {
  return (
    <div style={{ flex: 1, height: '100%' }}>
      <MonacoEditor
        height="100%"           // Fill the full height of its container
        language={language}     // Syntax highlighting based on language
        value={value}           // The actual code content
        theme="vs-dark"         // Dark theme (like VS Code dark mode)
        onChange={onChange}     // Called every time the user types
        options={{
          fontSize: 16,
          minimap: { enabled: false },  // Hide the minimap (right side preview)
          scrollBeyondLastLine: false,  // Don't scroll past the last line
          wordWrap: 'on',               // Wrap long lines
          automaticLayout: true,        // Auto-resize when window changes
        }}
      />
    </div>
  );
}

export default Editor;