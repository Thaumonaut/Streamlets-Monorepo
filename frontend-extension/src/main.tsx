/**
 * Twitch Extension Entry Point
 * 
 * Initializes React app for the Twitch Extension.
 * This runs in the Twitch Extension iframe context.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
