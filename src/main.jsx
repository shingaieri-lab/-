import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';
import { DemoApp } from './DemoApp.jsx';

const isDemo = window.location.pathname.startsWith('/demo/kanri-preview');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isDemo ? <DemoApp /> : <App />}
  </React.StrictMode>
);
