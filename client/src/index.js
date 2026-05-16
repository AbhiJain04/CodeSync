// index.js
// This is the entry point of our React app
// It simply renders our App component into the HTML page

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);