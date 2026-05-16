// executeCode.js
// Now calls our own server which forwards to Piston

export const executeCode = async (code, language) => {
  try {
    const response = await fetch('https://codesync-server-zj5l.onrender.com/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    const data = await response.json();
    return data.output;

  } catch (error) {
    return '❌ Error: ' + error.message;
  }
};