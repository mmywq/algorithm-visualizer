import '@fontsource-variable/nunito';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/tiny5';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './lib/pwa';
import './index.css';

// старые ссылки вида /#/sorting/player переводятся на обычные адреса
if (window.location.hash.startsWith('#/')) {
  const legacyPath = window.location.hash.slice(1);
  window.history.replaceState(null, '', legacyPath);
}

const rootElement = document.getElementById('root');
if (rootElement === null) throw new Error('Не найден корневой элемент #root');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
