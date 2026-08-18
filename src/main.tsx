/**
 * main.tsx — React application entry point
 *
 * Mounts the React root into the #root DOM element.
 * Wraps the App with BrowserRouter for client-side routing.
 * Imports global Tailwind CSS styles.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id="root" was not found in the document.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
