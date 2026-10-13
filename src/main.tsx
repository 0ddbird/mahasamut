import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './fonts';
import './styles/fonts.scss';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
