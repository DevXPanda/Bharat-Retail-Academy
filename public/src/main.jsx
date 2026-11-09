import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders, createClient } from '@ecomedu/ui';
import App from './App.jsx';
import './index.css';

const client = createClient({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1', tokenKey: 'ecomedu_student_token' });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders client={client} portal="student">
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
